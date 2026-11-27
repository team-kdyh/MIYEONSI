import type {DialogueGame} from './dialogue.ts';
import type {NarrativeReply} from './narrative.ts';
import {missions} from './office.ts';

// Only a standalone sign-off ends a turn without asking the character to reply.
// Questions, quotations and plans to leave later still belong to the conversation.
const courtesyPrefix=/^(?:(?:네|예|넵|그럼|그러면|저는|전|이만|먼저|이제|오늘은|부장님|감사합니다|고맙습니다|수고하세요|알겠습니다)[\s,.!~…]*)+/u;
const courtesySuffix=/(?:[.!~…\s]+(?:감사합니다|수고하세요|내일 뵙겠습니다))[.!~…\s]*$/u;
const signoffs=new Set([
 '퇴근하겠습니다','퇴근할게요','들어가겠습니다','들어가보겠습니다','들어갈게요',
 '물러가겠습니다','가보겠습니다','가볼게요','일어나겠습니다','안녕히계세요',
 '대화를여기서마치겠습니다','대화를여기서마칠게요','대화를마치겠습니다','대화마칠게요',
 '여기까지하겠습니다','여기까지할게요','내일뵙겠습니다','내일뵐게요',
]);

export function isOfficeFarewell(text:string){
 const phrase=text.trim().replace(courtesyPrefix,'').replace(courtesySuffix,'').replace(/[.!~…]+$/u,'').replace(/\s+/gu,'');
 return signoffs.has(phrase);
}

// A direct, unconditional dismissal from the boss also settles the clock-out
// mission in older conversations that did not record a structured concession.
function releasesNow(line:string){
 if(/[?？“”‘’"'「」]|(?:하면|되면|라면|다면|다면야|거든|끝내고|마치고|하고 나서|후에|기 전에|단,|대신|아직|말고|안 돼|내일은|내일 퇴근)/u.test(line))return false;
 const sentences=line.split(/[.!~]+/u).map(s=>s.trim()).filter(Boolean);
 const permission=/^(?:(?:네|좋아요|그럼|오늘은|오늘|이제|먼저|정시에|지금|여섯 시에|6시에|바로|그냥|편하게)[,\s]+)*퇴근(?:하세요|하시죠|해요|하셔도 (?:돼요|됩니다|좋습니다)|해도 (?:돼요|됩니다))$/u;
 const afterPermission=/^(?:수고(?:했어요| 많았어요|했습니다)|내일 (?:봅시다|봐요)|(?:남은 (?:건|일은) |나머지는 )?(?:내가|제가) (?:보증하죠|맡죠|맡을게요|처리할게요))$/u;
 const index=sentences.findIndex(s=>permission.test(s));
 return index>=0&&sentences.slice(index+1).every(s=>afterPermission.test(s));
}

function close(g:DialogueGame,award:'success'|'agreed'|'closed',reason:string){
 const mission=missions[g.step];
 g.ending=`office-${mission.id}-${award}`;
 if(g.office)g.office.outcome=award==='success'?'success':null;
 g.log.push({speaker:'협상 결과',text:reason});
}

function finishGrantedRelease(g:DialogueGame){
 const line=g.dialogue?.reply;
 if(!g.ending&&g.mode==='office'&&missions[g.step].id==='clockout'&&line&&releasesNow(line))
  close(g,'success',`부장이 퇴근을 허락했습니다. “${line}”`);
}

// A farewell sprite is also used for small concessions. Only a signed change
// and the boss's spoken sign-off together close the scene.
export function finishOfficeReply(g:DialogueGame,reply:NarrativeReply,accepted:NarrativeReply['events']){
 if(g.mode!=='office'||g.ending)return;
 finishGrantedRelease(g);
 if(g.ending||reply.pose!=='farewell'||!/(?:수고(?:했어요|했습니다| 많았어요)|내일 (?:봐요|봅시다)|고생했어요|여기까지(?:입니다| 하죠| 합시다))[.!~\\s]*$/u.test(reply.line))return;
 const decision=accepted.find(e=>e.kind==='concession'&&e.status==='accepted');
 if(decision)close(g,'agreed',`대화에서 정한 내용입니다.\n${decision.text}\n“${reply.line}”`);
}

export function finishOfficeConversation(g:DialogueGame){
 const previous=g.dialogue?.reply;
 finishGrantedRelease(g);
 if(!g.ending){
  const settled=new Map<string,string>();
  for(const e of g.narrative?.events??[]){
   if(e.kind!=='concession')continue;
   if(e.status==='accepted')settled.set(e.value,e.text);
   if(e.status==='refused')settled.delete(e.value);
  }
  if(settled.size)close(g,'agreed',`대화에서 정한 내용입니다.\n${[...settled.values()].join('\n')}`);
  else close(g,'closed',previous&&g.officeMatch?.exchanges.some(e=>e.reply)?`여기서 대화를 마쳤습니다. 부장의 마지막 말은 “${previous}”였습니다.`:'당신이 먼저 대화를 마쳤습니다.');
 }
}
