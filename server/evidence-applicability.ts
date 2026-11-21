import type {Commitment,ConditionInput} from './commitments.ts';
import type {NarrativeState,StoryEvent} from './narrative.ts';
import {performedCommitment,playerNames} from './narrative.ts';
import {contractVersion} from './commitment-revisions.ts';

// Relations are separate from immutable source events. A source can justify
// multiple obligations, but each target must independently pass the same checks.
export const applicabilityLimit=256;
export type EvidenceApplicability={evidenceId:string;originConditionId:string;conditionId:string;version:number;terms:ConditionInput;quote:string;result:'applicable';reasons:{actor:string;target:string;action:string;completion:string}};
const terms=(v:ConditionInput):ConditionInput=>({performer:v.performer,target:v.target,action:v.action});
export function recipientMatches(source:string,condition:ConditionInput,names:string[]){
 const recipients=[...source.matchAll(/([가-힣A-Za-z0-9]+?)(?:에게|한테|께)(?:만|도|는|까지|라도)?(?=\s|[,，.!?。！？;；]|$)/g)].map(m=>m[1]);
 const targets=condition.target==='서로'?(condition.performer==='player'?['유나','서유나','부장','부장님','박도현']:['당신','플레이어',...names]):[condition.target];
 return recipients.every(target=>targets.includes(target));
}
export function evidenceMatches(e:StoryEvent,condition:ConditionInput,names:string[]){
 return !(e.performanceSource==='action'&&e.subject!=='npc')&&e.subject===condition.performer&&e.kind==='complication'&&e.status==='fulfilled'&&['action','condition-evidence'].includes(e.value)
  &&performedCommitment({...e,subject:condition.performer,text:condition.action},[{text:e.text,action:e.value==='action'||e.performanceSource==='action'}],names,false)&&recipientMatches(e.text,condition,names);
}
export function recordApplicability(c:Commitment,e:StoryEvent,condition:ConditionInput&{id:string},names:string[]){
 if(!evidenceMatches(e,condition,names))throw Error('수행 근거가 대상 의무와 일치하지 않습니다.');
 const version=contractVersion(c),rows=c.evidenceApplicability??=[];
 if(rows.some(r=>r.evidenceId===e.id&&r.conditionId===condition.id&&r.version===version))return;
 if(rows.length>=applicabilityLimit)throw Error('수행 근거 적용 관계의 저장 한도입니다.');
 rows.push({evidenceId:e.id,originConditionId:e.reference,conditionId:condition.id,version,terms:terms(condition),quote:e.text,result:'applicable',reasons:{actor:'source actor matches required actor',target:'explicit recipients match; omitted recipient uses linked obligation',action:'bounded predicate and object validation',completion:'grounded completed statement or NPC action; no acceptance/future/negative'}});
}
function termsAt(c:Commitment,condition:ConditionInput&{id:string;originalPerformer:'player'|'npc'},version:number){
 const first=c.revisions?.find(r=>r.conditionId===condition.id);
 const result={...terms(first?.before??condition),performer:condition.originalPerformer};
 const changes=[...c.amendments.map(a=>({turn:a.turn,conditionId:a.conditionId,replacement:{performer:a.performer}})),...(c.revisions??[]).map(r=>({turn:r.turn,conditionId:r.conditionId,replacement:terms(r.replacement)}))].sort((a,b)=>a.turn-b.turn);
 for(const change of changes.slice(0,version-1))if(change.conditionId===condition.id)Object.assign(result,change.replacement);
 return result;
}
export function validApplicability(c:Commitment,s:NarrativeState){
 if(c.evidenceApplicability===undefined)return true; // Never invent legacy relations.
 if(!Array.isArray(c.evidenceApplicability)||c.evidenceApplicability.length>applicabilityLimit)return false;
 const keys=new Set<string>(),names=playerNames(s.events,[]);
 for(const row of c.evidenceApplicability){
  const condition=c.conditions.find(v=>v.id===row.conditionId),e=s.events.find(v=>v.id===row.evidenceId);
  const key=`${row.evidenceId}/${row.conditionId}/${row.version}`;
  if(!condition||!e||keys.has(key)||!Number.isInteger(row.version)||row.version<1||row.version>contractVersion(c)||row.result!=='applicable'||row.originConditionId!==e.reference||row.quote!==e.text||!row.reasons||Object.values(row.reasons).length!==4||Object.values(row.reasons).some(v=>typeof v!=='string'||!v||v.length>180))return false;
  if(e.performanceVersion!==undefined&&(!Number.isInteger(e.performanceVersion)||e.performanceVersion<1||e.performanceVersion>row.version))return false;
  keys.add(key);
  if(e.value==='condition-evidence'&&!c.conditions.some(v=>v.id===e.reference))return false;
  const expected=termsAt(c,condition,row.version);
  if(!row.terms||Object.keys(expected).some(k=>expected[k as keyof ConditionInput]!==row.terms[k as keyof ConditionInput])||!evidenceMatches(e,expected,names))return false;
 }
 return true;
}
export function applicable(c:Commitment,e:StoryEvent,conditionId:string,version=contractVersion(c)){
 return c.evidenceApplicability?.some(r=>r.evidenceId===e.id&&r.conditionId===conditionId&&r.version===version)??false;
}
