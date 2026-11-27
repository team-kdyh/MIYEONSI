import {finishBattle,validateBattleSpeech} from './battle-rules.ts';
import {judgeBattle,type BattleJudgment} from './battle-evaluation.ts';
import {bosses,rushScenes} from './office-match.ts';
import {reconcile,validateNarrative,type NarrativeReply} from './narrative.ts';
import {allowedIntents,manipulation} from './interpretation.ts';
import {advanceRomance} from './romance.ts';
import {advanceOffice, agreementSummary, missionOf} from './office.ts';
import {randomUUID} from 'node:crypto';
import {advance, stories, sceneFor, type Game} from './game.ts';

export const HISTORY_LIMIT=12;
export type Fact={id:string;eventId:string;version:number;confirmedAt:string;kind:'scene'|'agreement'|'relationship'|'clue'|'boundary'|'ending';text:string};
export type LedgerEntry={kind:'user_claim'|'character_conjecture'|'model_dialogue'|'verified_event';text:string;version:number;eventId?:string;recallIds?:string[]};
export type DialogueState={battleEvaluations?:BattleJudgment[];playerStatements?:{turn:number;text:string}[];version:number;facts:Fact[];ledger:LedgerEntry[];reply:string;actionBeats?:string[]};
export type DialogueGame=Game&{dialogue?:DialogueState};
export function canonical(g:DialogueGame):DialogueState {
 if(g.dialogue)return g.dialogue;
 const match=g.officeMatch;
 let text=sceneFor(g)?.text??'이야기가 끝났습니다.';
 if(match){
  const mission=missionOf(g);
  text=[mission.intro.replaceAll('박도현',bosses[match.setup.boss].name),mission.terms[0].objection,match.deadline?rushScenes[mission.id].trigger:'',match.opening].filter(Boolean).join('\n');
 }
 return {version:0,facts:[{id:'scene-0',eventId:'start',version:0,confirmedAt:new Date().toISOString(),kind:'scene',text}],ledger:[],reply:match?.opening??''};
}
export function context(g:DialogueGame,text:string){return {mode:g.mode,scene:sceneFor(g),canonical:canonical(g).facts,version:canonical(g).version,mission:g.mode==='office'?missionOf(g):undefined,agreement:g.office,relationship:g.romance,history:g.log.slice(-HISTORY_LIMIT),userClaim:text};}
// Offline fallback only. Generated speech is untrusted and never becomes an event.
export function repertoire(g:Game){const scene=sceneFor(g);return g.mode==='office'?[
 '그 제안은 들었습니다. 지금 결정할 범위부터 함께 확인하죠.',
 '잠깐, 제가 너무 서둘렀나요? 책임과 기한을 나누어 말해 주세요.',
 `지금은 「${scene.title}」 이야기입니다. 어떤 조건을 원하시나요?`
 ]:[
 '네 말을 듣고 있어요. 내가 이해한 게 맞는지 천천히 확인하고 싶어요.',
 '조금 불안하지만, 네 선택을 대신 정할 수는 없겠죠. 어떤 경계가 필요해요?',
 `지금은 「${scene.title}」에 머물러 있어요. 조금 더 이야기해 줄래요?`
 ];}
export type Reply={line:string;recall:string[];conjecture:string;intent?:string;actionBeats?:string[]} | NarrativeReply;
export function schema(g:DialogueGame){return {type:'object',additionalProperties:false,required:['line','recall','conjecture','intent'],properties:{intent:{type:'string',enum:['none',...allowedIntents(g).map(i=>i.id)]},line:{type:'string',minLength:1,maxLength:600},recall:{type:'array',items:{type:'string',enum:canonical(g).facts.map(f=>f.id)},maxItems:2},conjecture:{type:'string',enum:['','아직 당신의 뜻을 다 이해하지 못한 것 같습니다.']}}};}
export function validateReply(value:unknown,g:DialogueGame):Reply {
 if(value&&typeof value==='object'&&'actionBeats' in value)return validateNarrative(value);
 const r=value as Exclude<Reply,NarrativeReply>;
 if(!r||typeof r!=='object'||!['conjecture,line,recall','conjecture,intent,line,recall'].includes(Object.keys(r).sort().join(','))||r.intent!==undefined&&!['none',...allowedIntents(g).map(i=>i.id)].includes(r.intent)||!(typeof r.line==='string'&&r.line.trim().length>0&&r.line.length<=600)||!Array.isArray(r.recall)||r.recall.length>2||r.recall.some(id=>!canonical(g).facts.some(f=>f.id===id))||!['','아직 당신의 뜻을 다 이해하지 못한 것 같습니다.'].includes(r.conjecture))throw Error('AI 응답이 장면 또는 정본 검증을 통과하지 못했습니다. 다시 시도하거나 오프라인으로 전환하세요.');
 return r;
}
export function commitDialogue(game:DialogueGame,choice:number|null,text:string,response:Reply,requestId?:string):DialogueGame {
 if(game.ending)throw Error('이미 끝난 미션입니다.');
 if('events' in response){
  validateBattleSpeech(game,response);
  const before=canonical(game),version=before.version+1;
  const {game:next,accepted}=reconcile(game,text,response,requestId);const g:DialogueGame=next;
  const judgment=judgeBattle(game,text,response,accepted);
  const d=structuredClone(before);if(judgment)d.battleEvaluations=[...(before.battleEvaluations??[]),judgment];d.version=version;d.playerStatements=[...(before.playerStatements??before.ledger.filter(e=>e.kind==='user_claim').map(e=>({turn:e.version,text:e.text}))),{turn:version,text}].slice(-100);d.reply=response.line;d.actionBeats=response.actionBeats;
  d.ledger.push({kind:'user_claim',text,version},{kind:'model_dialogue',text:response.line,version,recallIds:response.recall});
  for(const e of accepted){const fact:Fact={id:e.id,eventId:e.id,version,confirmedAt:new Date().toISOString(),kind:e.kind==='clue'?'clue':e.kind==='relationship'?'relationship':e.kind==='resolution'?'ending':'scene',text:e.text};d.facts.push(fact);d.ledger.push({kind:'verified_event',text:e.text,version,eventId:e.id});}
  d.ledger=d.ledger.slice(-HISTORY_LIMIT*2);g.dialogue=d;
  g.log.push({speaker:'당신',text},{speaker:g.mode==='office'?bosses[g.officeMatch?.setup.boss??'park'].name:'서유나',text:response.line});g.log=g.log.slice(-HISTORY_LIMIT);
  g.officeMatch?.exchanges.push({version,player:text,reply:response.line});
  finishBattle(g);
  return g;
 }
 validateReply(response,game);
 const before=canonical(game),version=before.version+1,eventId=randomUUID(),now=new Date().toISOString();
 const g:DialogueGame=game.mode==='office'?advanceOffice(game,choice,text,manipulation(text)?'none':text.trim()?response.intent:undefined):advanceRomance(game,choice,text,manipulation(text)?'none':text.trim()?response.intent:undefined);
 const d=structuredClone(before);d.version=version;
 d.ledger.push({kind:'user_claim',text:text.trim()||(choice!==null?sceneFor(game).choices[choice]:''),version},{kind:'model_dialogue',text:response.line,version,recallIds:[...response.recall]});
 if(response.conjecture)d.ledger.push({kind:'character_conjecture',text:response.conjecture,version});
 if(game.mode==='office'&&g.office){
  const applied=g.office.evidence.at(-1);
  if(applied?.change||g.ending){
   const fact:Fact={id:`agreement-${version}`,eventId,version,confirmedAt:now,kind:g.ending?'ending':'agreement',text:agreementSummary(g)+(g.ending?` / ${g.ending}`:'')};
   d.facts.push(fact);d.ledger.push({kind:'verified_event',eventId,text:fact.text,version});
  }
 }else if(g.romance){
  for(const event of g.romance.facts.filter(f=>!game.romance?.facts.some(old=>old.id===f.id))){
   const fact:Fact={id:event.id,eventId:event.eventId,version,confirmedAt:now,kind:event.kind==='evidence'?'clue':event.kind==='autonomy'?'boundary':'relationship',text:event.text};
   d.facts.push(fact);d.ledger.push({kind:'verified_event',eventId:event.eventId,text:fact.text,version});
  }
 }

 d.reply=[response.line,response.conjecture].filter(Boolean).join('\n');
 g.log.push({speaker:game.mode==='office'?'박도현':'서유나',text:d.reply});
 // Canonical facts survive the bounded conversational and untrusted ledgers.
 g.log=g.log.slice(-HISTORY_LIMIT);d.ledger=d.ledger.slice(-HISTORY_LIMIT*2);g.dialogue=d;return g;
}
