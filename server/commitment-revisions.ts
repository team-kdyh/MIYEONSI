import {randomUUID} from 'node:crypto';
import type {Commitment, ConditionInput} from './commitments.ts';
import type {NarrativeReply, NarrativeState} from './narrative.ts';

export type RevisionInput={promiseId:string;conditionId:string;expectedVersion:number;replacement:ConditionInput;playerQuote:string;npcQuote:string};
type Applicability={conditionId:string;evidenceId:string;decision:'retained'|'historical';reason:'unchanged obligation'|'changed terms require new performance'};
export type RevisionRecord=RevisionInput&{id:string;turn:number;version:number;before:ConditionInput&{evidenceIds:string[]};applicability:Applicability[];status:'accepted'};
function fail():never {throw Error('약속 변경의 버전, 조건 또는 양측 합의를 확인하지 못했습니다.');}
export const contractVersion=(c:Commitment)=>1+c.amendments.length+(c.revisions?.length??0);
const same=(a:ConditionInput,b:ConditionInput)=>a.action===b.action&&a.target===b.target&&a.performer===b.performer;
const terms=(c:ConditionInput):ConditionInput=>({performer:c.performer,target:c.target,action:c.action});
const action=(s:string)=>/(?:는|기|고|다)$/.test(s)&&[...s.matchAll(/(?:을|를)\s/gu)].length===1&&/^[^.!?。！？\n]+(?:을|를)\s+[가-힣][^.!?。！？\n]*$/u.test(s)&&!/(?:대신|바꾸|변경|않|못|아직)/.test(s)&&!/(?<=[가-힣]고)\s+.*(?:을|를)\s/u.test(s);

// The quoted assent is not final if the speaker retracts that agreement later.
// Keep unrelated refusals (for example coffee or a subscription) independent.
function retractsAfter(source:string,quote:string):boolean{
 const tail=source.slice(source.indexOf(quote)+quote.length);
 return (tail.match(/[^.!?。！？;；\n]+/gu)??[]).some(raw=>{
  const clause=raw.trim().replace(/^아니(?:요)?\s*[,，]?\s*/u,'');
  const referred=/(?:방금|아까|앞서|이전|위|그|이)\s*(?:한\s*)?(?:말|동의|합의|대답|수락|제안)|(?:약속|조건|합의|변경|대체)/u.test(clause);
  const withdrawal=/취소|철회|바꾸지\s*(?:말|마)|변경하지\s*(?:말|마)|원래\s*(?:대로|약속대로|조건대로|내용대로)/u.test(clause);
  const direct=/^(?:취소|철회|바꾸지\s*(?:말|마)|변경하지\s*(?:말|마)|원래\s*(?:대로|약속대로|조건대로|내용대로))/u.test(clause);
  return direct||referred&&withdrawal;
 });
}

// A bounded literal agreement grammar, not general entailment: both parties quote
// the old/new action and explicitly agree to changing it. Ordinary dialogue stays free.
function grounded(a:RevisionInput,before:ConditionInput,text:string,line:string,consent:(s:string,q:string)=>boolean){
 if(!text.includes(a.playerQuote)||!line.includes(a.npcQuote)||[text,line].some(s=>/동의하지|(?:변경|바꾸).{0,30}(?:거절|않|보류)/.test(s)))return false;
 if(retractsAfter(text,a.playerQuote)||retractsAfter(line,a.npcQuote))return false;
 if([text.slice(text.indexOf(a.playerQuote)+a.playerQuote.length),line.slice(line.indexOf(a.npcQuote)+a.npcQuote.length)].some(s=>/^[?？]/.test(s)))return false;
 return [a.playerQuote,a.npcQuote].every((q,i)=>consent(i?line:text,q)&&/바꾸|변경|대체/.test(q)&&/동의|좋아요|좋습니다|할게|하겠|바꿀게|바꾸자/.test(q)&&q.includes(before.action)&&q.includes(a.replacement.action)
  &&(before.target===a.replacement.target||q.includes(before.target)&&q.includes(a.replacement.target))
  &&(before.performer===a.replacement.performer||(a.replacement.performer==='npc'?/유나|박도현|부장/.test(q):q.includes('플레이어'))));
}

export function originalConditions(c:Commitment):ConditionInput[]{
 return c.conditions.map(v=>({...terms(c.revisions?.find(r=>r.conditionId===v.id)?.before??v),performer:v.originalPerformer}));
}

export function applyRevisions(s:NarrativeState,text:string,r:NarrativeReply,touched:Set<Commitment>,consent:(s:string,q:string)=>boolean,refused:(c:Commitment)=>boolean){
 const seen=new Set<string>();
 for(const a of r.commitmentRevisions??[]){
  const c=s.commitments?.find(c=>c.promiseId===a.promiseId),condition=c?.conditions.find(v=>v.id===a.conditionId);
  if(!c||!condition||seen.has(c.promiseId)||!c.acceptanceIds.length||refused(c)||c.status==='completed'||a.expectedVersion!==contractVersion(c)||c.amendments.length+(c.revisions?.length??0)>=32)fail();
  seen.add(c.promiseId);
  if(same(condition,a.replacement)||!action(a.replacement.action)||!grounded(a,condition,text,r.line,consent))fail();
  // Do not let the negotiation itself count as performing the new obligation.
  if(r.commitmentProgress?.some(p=>p.promiseId===c.promiseId&&p.conditionId===condition.id))fail();
  const applicability:Applicability[]=c.conditions.flatMap(v=>v.evidenceIds.map(evidenceId=>({conditionId:v.id,evidenceId,decision:v.id===condition.id?'historical':'retained',reason:v.id===condition.id?'changed terms require new performance':'unchanged obligation'})));
  const revision:RevisionRecord={...structuredClone(a),id:randomUUID(),status:'accepted',turn:s.turn,version:a.expectedVersion+1,before:{...terms(condition),evidenceIds:[...condition.evidenceIds]},applicability};
  (c.revisions??=[]).push(revision);c.revisionVersion=revision.version;
  Object.assign(condition,a.replacement,{evidenceIds:[]});touched.add(c);
 }
}

// Reading an older save is non-mutating. Version 1 is implicit; no old completion
// or evidence is synthesized. Validate the entire bounded chain before accepting it.
export function validRevisions(c:Commitment,s:NarrativeState):boolean{
 const rows=c.revisions??[];
 if(!Array.isArray(rows)||rows.length+c.amendments.length>32||c.revisionVersion!==undefined&&c.revisionVersion!==contractVersion(c))return false;
 const ids=new Set<string>();let lastTurn=-1;
 for(let i=0;i<rows.length;i++){
  const r=rows[i],condition=c.conditions.find(v=>v.id===r.conditionId);
  if(!condition||r.promiseId!==c.promiseId||typeof r.id!=='string'||!r.id||ids.has(r.id)||r.status!=='accepted'||r.expectedVersion!==i+1+c.amendments.filter(a=>a.turn<r.turn).length||r.version!==r.expectedVersion+1||!Number.isInteger(r.turn)||r.turn<=lastTurn||r.turn>s.turn||!r.before||!r.replacement||!Array.isArray(r.before.evidenceIds)||r.before.evidenceIds.length>1||!Array.isArray(r.applicability)||r.applicability.length>6)return false;
  ids.add(r.id);lastTurn=r.turn;
  for(const value of [r.before,r.replacement])if(!['player','npc'].includes(value.performer)||typeof value.target!=='string'||!value.target.trim()||value.target.length>180||typeof value.action!=='string'||!value.action.trim()||value.action.length>180)return false;
  if(!action(r.replacement.action)||same(r.before,r.replacement)||![r.playerQuote,r.npcQuote].every(q=>typeof q==='string'&&q.length>0&&q.length<=500&&q.includes(r.before.action)&&q.includes(r.replacement.action)&&/바꾸|변경|대체/.test(q)))return false;
  const previous=rows.slice(0,i).filter(v=>v.conditionId===r.conditionId).at(-1);
  if(previous&&(previous.replacement.action!==r.before.action||previous.replacement.target!==r.before.target))return false;
  const later=rows.slice(i+1).some(v=>v.conditionId===r.conditionId);
  if(!later&&(condition.action!==r.replacement.action||condition.target!==r.replacement.target))return false;
  const evidenceIds=new Set<string>();
  for(const a of r.applicability){
   const obligation=c.conditions.find(v=>v.id===a.conditionId),event=s.events.find(e=>e.id===a.evidenceId);
   if(!obligation||!event||event.turn>=r.turn||event.kind!=='complication'||event.status!=='fulfilled'||!['action','condition-evidence'].includes(event.value)||evidenceIds.has(a.evidenceId))return false;
   if(event.value==='condition-evidence'&&event.reference!==a.conditionId)return false;
   evidenceIds.add(a.evidenceId);
   if(a.conditionId===r.conditionId){if(a.decision!=='historical'||a.reason!=='changed terms require new performance'||!r.before.evidenceIds.includes(a.evidenceId)||event.subject!==r.before.performer)return false;}
   else if(a.decision!=='retained'||a.reason!=='unchanged obligation')return false;
  }
  if(r.before.evidenceIds.some(id=>!r.applicability.some(a=>a.conditionId===r.conditionId&&a.evidenceId===id)))return false;
 }
 for(const condition of c.conditions){
  const last=rows.filter(r=>r.conditionId===condition.id).at(-1);
  if(last&&condition.evidenceIds.some(id=>!s.events.some(e=>e.id===id&&e.turn>last.turn)))return false;
 }
 return true;
}
