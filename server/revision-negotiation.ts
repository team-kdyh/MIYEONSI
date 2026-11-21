import {randomUUID} from 'node:crypto';
import type {Commitment,ConditionInput} from './commitments.ts';
import type {NarrativeReply,NarrativeState} from './narrative.ts';
import {applyRevisions,contractVersion} from './commitment-revisions.ts';
export type RevisionProposalInput={promiseId:string;conditionId:string;expectedVersion:number;replacement:ConditionInput;proposer:'player'|'npc';quote:string};
export type RevisionResponseInput={proposalId:string;actor:'player'|'npc';quote:string};
type Interpretation='accepted'|'refused'|'ambiguous'|'withdrawn';
export type RevisionNegotiation=RevisionProposalInput&{id:string;turn:number;requestId:string|null;source:string;status:'pending'|'refused'|'withdrawn'|'applied';responses:{id:string;actor:'player'|'npc';turn:number;requestId:string|null;source:string;span:{start:number;end:number};quote:string;interpretation:Interpretation}[];attempts:{id:string;turn:number;requestId:string|null;expectedVersion:number;result:'applied'|'not-applied';reason:string;revisionId:string|null}[]};
export const negotiationLimits={proposals:64,responses:8,attempts:8};
const interpretation=(q:string):Interpretation=>/철회|취소|원래대로|(?:바꾸|변경하)지\s*(?:말|마)/.test(q)?'withdrawn':/거절|동의하지|않|싫|^아니요[.!。]*$/.test(q)?'refused':/[?？]|모르겠|생각해|보류|글쎄/.test(q)?'ambiguous':/동의|좋아요|좋습니다|바꾸자|바꿀게/.test(q)?'accepted':'ambiguous';
function scopedInterpretation(source:string,p:RevisionNegotiation,beforeAction:string):Interpretation{
 const clauses=source.match(/[^.!?。！？;；\n]+[.!?。！？;；]?/gu)??[];
 let result:Interpretation='ambiguous';
 for(const raw of clauses){
  const clause=raw.trim().replace(/^(?:하지만|그런데|그래도|아니요(?=\s|[,，])|아니(?=\s|[,，]))[,，]?\s*/u,'');
  const named=!!beforeAction&&clause.includes(beforeAction)||clause.includes(p.replacement.action)||/(?:그|이|방금|아까|앞서)\s*(?:한\s*)?(?:변경\s*)?(?:제안|합의|동의|말)|(?:변경|바꾸기)(?:은|는|에|을|를)/u.test(clause);
  const direct=/^(?:네[,.，]?\s*)?(?:동의|좋아요|좋습니다|거절|취소|철회|원래대로|바꾸지|변경하지|아니요|잘\s*모르겠|모르겠|생각해|보류|글쎄)/u.test(clause);
  // An unrelated refusal (coffee, a subscription, etc.) cannot override this
  // proposal. Conversely a later referenced withdrawal overrides a narrow quote.
  if(named||direct)result=interpretation(clause);
 }
 return result;
}
const fail=()=>{throw Error('약속 변경 제안 또는 응답 근거가 유효하지 않습니다.');};
export function negotiateRevisions(s:NarrativeState,text:string,r:NarrativeReply,touched:Set<Commitment>,consent:(s:string,q:string)=>boolean,refused:(c:Commitment)=>boolean,requestId?:string){
 for(const input of r.revisionProposals??[]){
  const c=s.commitments?.find(c=>c.promiseId===input.promiseId),condition=c?.conditions.find(v=>v.id===input.conditionId),source=input.proposer==='player'?text:r.line;
  if(!c||!condition||!c.acceptanceIds.length||refused(c)||c.status==='completed'||input.expectedVersion!==contractVersion(c)||!source.includes(input.quote)||!input.quote.includes(condition.action)||!input.quote.includes(input.replacement.action)||!/바꾸|변경|대신|대체/.test(input.quote))fail();
  const rows=s.revisionNegotiations??=[];
  if(rows.some(p=>p.status==='pending'&&p.promiseId===input.promiseId&&p.conditionId===input.conditionId&&p.expectedVersion===input.expectedVersion&&JSON.stringify(p.replacement)===JSON.stringify(input.replacement)))continue;
  if(rows.length>=negotiationLimits.proposals)fail();
  rows.push({...structuredClone(input),id:randomUUID(),turn:s.turn,requestId:requestId??null,source,status:'pending',responses:[],attempts:[]});
 }
 const affected=new Set<RevisionNegotiation>();
 for(const response of r.revisionResponses??[]){
  const p=s.revisionNegotiations?.find(v=>v.id===response.proposalId),source=response.actor==='player'?text:r.line;
  if(!p||p.status!=='pending'&&!affected.has(p)||!source.includes(response.quote))fail();
  if(p!.responses.some(v=>v.turn===s.turn&&v.actor===response.actor&&v.quote===response.quote))continue;
  if(p!.responses.length>=negotiationLimits.responses)fail();
  const beforeAction=s.commitments?.find(c=>c.promiseId===p!.promiseId)?.conditions.find(c=>c.id===p!.conditionId)?.action??'';
  const result=scopedInterpretation(source,p!,beforeAction);
  p!.responses.push({id:randomUUID(),actor:response.actor,turn:s.turn,requestId:requestId??null,source,span:{start:source.indexOf(response.quote),end:source.indexOf(response.quote)+response.quote.length},quote:response.quote,interpretation:result});affected.add(p!);
  if(result==='refused')p!.status='refused';
  if(result==='withdrawn')p!.status='withdrawn';
 }
 for(const p of affected){
  if(p.status!=='pending')continue;
  const player=p.responses.filter(v=>v.actor==='player').at(-1),npc=p.responses.filter(v=>v.actor==='npc').at(-1);
  if(player?.interpretation!=='accepted'||npc?.interpretation!=='accepted')continue;
  if(p.attempts.length>=negotiationLimits.attempts)fail();
  const c=s.commitments!.find(c=>c.promiseId===p.promiseId)!;
  const attempt:RevisionNegotiation['attempts'][number]={id:randomUUID(),turn:s.turn,requestId:requestId??null,expectedVersion:p.expectedVersion,result:'not-applied',reason:'validation failed; original contract retained',revisionId:null};
  // Validate on a detached state. A failed application is not party refusal and
  // cannot leave acceptance, replaced terms, or new performance in the contract.
  const trial=structuredClone(s),trialTouched=new Set<Commitment>();
  try{
   if(r.commitmentRevisions?.some(v=>v.promiseId===p.promiseId)||r.commitmentAmendments?.some(v=>v.promiseId===p.promiseId)||r.commitmentProgress?.some(v=>v.promiseId===p.promiseId&&v.conditionId===p.conditionId))throw Error('같은 턴의 충돌하는 변경 또는 수행');
   const revision={promiseId:p.promiseId,conditionId:p.conditionId,expectedVersion:p.expectedVersion,replacement:p.replacement,playerQuote:player.quote,npcQuote:npc.quote};
   applyRevisions(trial,player.quote,{...r,line:npc.quote,commitmentRevisions:[revision],commitmentProgress:[]},trialTouched,consent,refused);
   const changed=trial.commitments!.find(v=>v.promiseId===p.promiseId)!;
   Object.assign(c,changed);touched.add(c);p.status='applied';attempt.result='applied';attempt.reason='both grounded responses validated atomically';attempt.revisionId=c.revisions!.at(-1)!.id;
  }catch(error){attempt.reason=String(error).slice(0,180);}
  p.attempts.push(attempt);
 }
}
const validRequest=(id:unknown)=>id===null||typeof id==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(id);
export function validNegotiations(s:NarrativeState){
 const rows=s.revisionNegotiations;if(rows===undefined)return true;
 if(!Array.isArray(rows)||rows.length>negotiationLimits.proposals)return false;
 const ids=new Set<string>();
 for(const p of rows){
  const c=s.commitments?.find(c=>c.promiseId===p.promiseId);
  if(!c||!c.conditions.some(v=>v.id===p.conditionId)||typeof p.id!=='string'||!p.id||ids.has(p.id)||!Number.isInteger(p.turn)||p.turn>s.turn||!Number.isInteger(p.expectedVersion)||p.expectedVersion<1||p.expectedVersion>contractVersion(c)||!['player','npc'].includes(p.proposer)||typeof p.quote!=='string'||!p.quote||p.quote.length>500||!p.replacement||!['player','npc'].includes(p.replacement.performer)||![p.replacement.action,p.replacement.target].every(v=>typeof v==='string'&&v.length>0&&v.length<=180)||!['pending','refused','withdrawn','applied'].includes(p.status)||!Array.isArray(p.responses)||p.responses.length>8||!Array.isArray(p.attempts)||p.attempts.length>8)return false;
  if(!validRequest(p.requestId)||typeof p.source!=='string'||p.source.length>600||!p.source.includes(p.quote))return false;
  ids.add(p.id);const responseIds=new Set<string>();
  for(const a of p.responses){if(typeof a.id!=='string'||!a.id||responseIds.has(a.id)||!['player','npc'].includes(a.actor)||!Number.isInteger(a.turn)||a.turn<p.turn||a.turn>s.turn||typeof a.quote!=='string'||!a.quote||a.quote.length>500||!['accepted','refused','ambiguous','withdrawn'].includes(a.interpretation))return false;if(!validRequest(a.requestId)||typeof a.source!=='string'||a.source.length>600||!a.span||a.span.start<0||a.span.end!==a.span.start+a.quote.length||a.source.slice(a.span.start,a.span.end)!==a.quote)return false;responseIds.add(a.id);}
  for(const a of p.attempts)if(!validRequest(a.requestId)||typeof a.id!=='string'||!a.id||!Number.isInteger(a.turn)||a.turn<p.turn||a.turn>s.turn||a.expectedVersion!==p.expectedVersion||!['applied','not-applied'].includes(a.result)||typeof a.reason!=='string'||a.reason.length>180||a.result==='applied'&&!c.revisions?.some(r=>r.id===a.revisionId&&r.conditionId===p.conditionId&&r.expectedVersion===p.expectedVersion)||a.result==='not-applied'&&a.revisionId!==null)return false;
  if((p.status==='applied')!==p.attempts.some(a=>a.result==='applied'))return false;
  const applied=p.attempts.filter(a=>a.result==='applied');if(applied.length>1)return false;
  if(applied.length){const revision=c.revisions!.find(r=>r.id===applied[0].revisionId)!,player=p.responses.filter(a=>a.actor==='player').at(-1),npc=p.responses.filter(a=>a.actor==='npc').at(-1);
   if(player?.interpretation!=='accepted'||npc?.interpretation!=='accepted'||player.quote!==revision.playerQuote||npc.quote!==revision.npcQuote||revision.turn!==applied[0].turn||Object.keys(p.replacement).some(k=>p.replacement[k as keyof ConditionInput]!==revision.replacement[k as keyof ConditionInput]))return false;
  }
  if(p.status==='pending'&&p.responses.some(a=>a.interpretation==='refused'||a.interpretation==='withdrawn'))return false;

  if(p.status==='refused'&&!p.responses.some(a=>a.interpretation==='refused')||p.status==='withdrawn'&&!p.responses.some(a=>a.interpretation==='withdrawn'))return false;
 }
 return true;
}
