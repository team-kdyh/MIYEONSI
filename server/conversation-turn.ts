import {isOfficeFarewell} from './office-closing.ts';
import {commitDialogue,commitOfficeFarewell,type DialogueGame,type Reply} from './dialogue.ts';
import {respond,type Provider,type RepairContext} from './provider.ts';
import {ReplyRejectedError} from './reply-error.ts';

export const MAX_GENERATION_ATTEMPTS=2;
const hasChanges=(v:any)=>v?.battle!=null||Array.isArray(v?.events)&&v.events.some((e:any)=>!['detail','complication'].includes(e.kind))||['commitmentOffers','commitmentProgress','commitmentAmendments','commitmentRevisions','revisionProposals','revisionResponses'].some(k=>v?.[k]?.length);
function droppedChangesWithoutRewriting(draft:any,reply:Reply){
 const changes=draft?.changes??draft,utterance=draft?.utterance??draft;
 const eventsDropped=Array.isArray(changes?.events)&&changes.events.some((e:any)=>!['detail','complication'].includes(e.kind))&&(!('events' in reply)||!reply.events.some(e=>!['detail','complication'].includes(e.kind)));
 return (eventsDropped||(hasChanges(changes)||draft?.battle!=null)&&!hasChanges(reply))&&typeof utterance?.line==='string'&&utterance.line.trim()===reply.line.trim();
}
/** A rejected draft is never a turn. Re-author once from the original input and unchanged state. */
export async function conversationTurn(game:DialogueGame,text:string,requestId:string,provider:Provider,signal:AbortSignal,reserve:(attempt:number)=>Promise<void>,fetcher:typeof fetch=fetch){
 signal.throwIfAborted();
 if(!game.ending&&game.mode==='office'&&isOfficeFarewell(text))return commitOfficeFarewell(game,text);
 let repair:RepairContext|undefined;
 for(let attempt=0;attempt<MAX_GENERATION_ATTEMPTS;attempt++){
  signal.throwIfAborted();
  await reserve(attempt); // Durable budget before every attempted request, including repairs.
  signal.throwIfAborted();
  let reply:Reply|undefined;
  try{
   reply=await respond(game,text,provider,signal,fetcher,repair);
   signal.throwIfAborted();
   if(repair&&droppedChangesWithoutRewriting(repair.draft,reply))throw new ReplyRejectedError('검증되지 않은 사건을 삭제했지만 대사를 다시 작성하지 않았습니다.',reply);
   let next:DialogueGame;
   try{next=commitDialogue(game,null,text,reply,requestId);}
   catch(e){throw new ReplyRejectedError(e instanceof Error?e.message:'진행 기록 오류',reply);}
   return {game:next,reply,attempts:attempt+1};
  }catch(e){
   signal.throwIfAborted();
   // Network, storage, limits and explicit refusals are never retried here.
   if(provider!=='openai'||!(e instanceof ReplyRejectedError)||!e.repairable||attempt+1===MAX_GENERATION_ATTEMPTS)throw e;
   const draft=e.draft??reply;
   repair={reason:e.message,draft:draft&&JSON.stringify(draft).length<=12000?draft:undefined};
  }
 }
 throw new ReplyRejectedError('답변 작성 횟수 초과');
}
