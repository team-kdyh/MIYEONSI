import {negotiateRevisions,validNegotiations} from './revision-negotiation.ts';
import {recordInterpretations,validInterpretations} from './performance-interpretation.ts';
import {applicable,recordApplicability,validApplicability,recipientMatches,type EvidenceApplicability} from './evidence-applicability.ts';
import {randomUUID} from 'node:crypto';
import type {StoryEvent, NarrativeReply, NarrativeState} from './narrative.ts';
import {applyRevisions, validRevisions, originalConditions, contractVersion, type RevisionRecord} from './commitment-revisions.ts';

type Actor='player'|'npc';
// Fail atomically at capacity; never evict obligations or their evidence to fit.
export const commitmentLimits={promises:128,conditions:6,acceptances:8,amendments:32,assessments:64,evidencePerCondition:1} as const;
export type ConditionInput={performer:Actor;target:string;action:string};
export type CommitmentOffer={eventIndex:number;conditions:ConditionInput[]};
export type ProgressInput={promiseId:string;conditionId:string;performer:Actor;source:'player'|'line'|'action'|'event';actionIndex:number;eventId:string;quote:string};
export type AmendmentInput={promiseId:string;conditionId:string;performer:Actor;playerQuote:string;npcQuote:string};
export type Commitment={evidenceApplicability?:EvidenceApplicability[];revisionVersion?:number;revisions?:RevisionRecord[];promiseId:string;originalText:string;acceptanceIds:string[];conditions:(ConditionInput&{id:string;originalPerformer:Actor;evidenceIds:string[]})[];amendments:(AmendmentInput&{id:string;previousPerformer:Actor;turn:number})[];assessments:{turn:number;result:'pending'|'partial'|'completed'|'insufficient';conditions:{id:string;evidenceIds:string[]}[];reason:string}[];status:'pending'|'partial'|'completed'|'insufficient'};
function fail():never {throw Error('약속 조건 또는 이행 근거를 확인하지 못했습니다.');}
const actor=(v:unknown):v is Actor=>v==='player'||v==='npc';
const short=(v:unknown,n=180):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const keys=(v:object,names:string[])=>Object.keys(v).sort().join()===names.sort().join();
export function validateCommitmentReply(r:NarrativeReply){
 for(const field of ['revisionProposals','revisionResponses','commitmentOffers','commitmentProgress','commitmentAmendments','commitmentRevisions'] as const){const rows=r[field];if(rows!==undefined&&(!Array.isArray(rows)||rows.length>8))fail();}
 for(const p of r.revisionProposals??[]){
  if(!p||!keys(p,['promiseId','conditionId','expectedVersion','replacement','proposer','quote'])||!short(p.promiseId,100)||!short(p.conditionId,100)||!Number.isInteger(p.expectedVersion)||p.expectedVersion<1||!actor(p.proposer)||!short(p.quote,500))fail();
  const v=p.replacement;if(!v||!keys(v,['performer','target','action'])||!actor(v.performer)||!short(v.target)||!short(v.action))fail();
 }
 for(const p of r.revisionResponses??[])if(!p||!keys(p,['proposalId','actor','quote'])||!short(p.proposalId,100)||!actor(p.actor)||!short(p.quote,500))fail();
 for(const a of r.commitmentRevisions??[]){
  if(!a||!keys(a,['promiseId','conditionId','expectedVersion','replacement','playerQuote','npcQuote'])||!short(a.promiseId,100)||!short(a.conditionId,100)||!Number.isInteger(a.expectedVersion)||a.expectedVersion<1||!short(a.playerQuote,500)||!short(a.npcQuote,500))fail();
  const c=a.replacement;if(!c||!keys(c,['performer','target','action'])||!actor(c.performer)||!short(c.target)||!short(c.action))fail();
 }
 for(const o of r.commitmentOffers??[]){
  if(!o||!keys(o,['eventIndex','conditions'])||!Number.isInteger(o.eventIndex)||o.eventIndex<0||o.eventIndex>=r.events.length||!Array.isArray(o.conditions)||!o.conditions.length||o.conditions.length>6)fail();
  for(const c of o.conditions)if(!c||!keys(c,['performer','target','action'])||!actor(c.performer)||!short(c.target)||!short(c.action))fail();
 }
 for(const p of r.commitmentProgress??[])if(!p||!keys(p,['promiseId','conditionId','performer','source','actionIndex','eventId','quote'])||!short(p.promiseId,100)||!short(p.conditionId,100)||!actor(p.performer)||!['player','line','action','event'].includes(p.source)||!Number.isInteger(p.actionIndex)||typeof p.eventId!=='string'||p.eventId.length>100||!short(p.quote,500))fail();
 for(const a of r.commitmentAmendments??[])if(!a||!keys(a,['promiseId','conditionId','performer','playerQuote','npcQuote'])||!short(a.promiseId,100)||!short(a.conditionId,100)||!actor(a.performer)||!short(a.playerQuote,500)||!short(a.npcQuote,500))fail();
 if(r.commitmentOffers!==undefined){
  if(new Set(r.commitmentOffers.map(o=>o.eventIndex)).size!==r.commitmentOffers.length)fail();
  r.events.forEach((e,i)=>{if(e.kind==='promise'&&e.status==='offered'&&!r.commitmentOffers!.some(o=>o.eventIndex===i))fail();});
 }
}
const object=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const str=(maxLength=180)=>({type:'string',minLength:1,maxLength});
const who={type:'string',enum:['player','npc']};
export const commitmentSchema={
 revisionProposals:{type:'array',maxItems:8,items:object({promiseId:str(100),conditionId:str(100),expectedVersion:{type:'integer',minimum:1,maximum:33},replacement:object({performer:who,target:str(),action:str()}),proposer:who,quote:str(500)})},
 revisionResponses:{type:'array',maxItems:8,items:object({proposalId:str(100),actor:who,quote:str(500)})},
 commitmentRevisions:{type:'array',maxItems:8,items:object({promiseId:str(100),conditionId:str(100),expectedVersion:{type:'integer',minimum:1,maximum:33},replacement:object({performer:who,target:str(),action:str()}),playerQuote:str(500),npcQuote:str(500)})},
 commitmentOffers:{type:'array',maxItems:5,items:object({eventIndex:{type:'integer',minimum:0,maximum:4},conditions:{type:'array',minItems:1,maxItems:6,items:object({performer:who,target:str(),action:str()})}})},
 commitmentProgress:{type:'array',maxItems:8,items:object({promiseId:str(100),conditionId:str(100),performer:who,source:{type:'string',enum:['player','line','action','event']},actionIndex:{type:'integer'},eventId:{type:'string',maxLength:100},quote:str(500)})},
 commitmentAmendments:{type:'array',maxItems:8,items:object({promiseId:str(100),conditionId:str(100),performer:who,playerQuote:str(500),npcQuote:str(500)})}
};

// Missing legacy condition evidence remains unknown. Never reconstruct performance
// from an old completion flag or rewrite the user's saved original events.
export function commitments(s:NarrativeState):Commitment[]{return s.commitments??=[];}
// Conditions partition explicit original object/action clauses. Literal noun
// fragments are not actions, and a covered first task cannot erase later tasks.
// This bounded grammar deliberately leaves an ambiguous offer insufficient;
// it is neither a verb vocabulary nor a general Korean semantic parser.
function coversOriginal(origin:StoryEvent,conditions:ConditionInput[]):boolean{
 if(!conditions.every(c=>c&&actor(c.performer)&&short(c.action)))return false;
 const cuts=[0,...Array.from(origin.text.matchAll(/(?<=[가-힣]고)\s+(?=[가-힣\s]+(?:을|를)\s)/gu),m=>m.index!+m[0].length),origin.text.length];
 const required:{start:number;end:number;performer:Actor}[]=[];
 let owners:Actor[]=origin.subject==='mutual'?['player','npc']:actor(origin.subject)?[origin.subject]:[];
 for(let i=0;i<cuts.length-1;i++){
  const part=origin.text.slice(cuts[i],cuts[i+1]);
  const object=/[가-힣A-Za-z0-9]+(?:을|를)\s+/u.exec(part);if(!object)return false;
  const prefix=part.slice(0,object.index);
  if(origin.subject==='mutual'){
   for(const m of prefix.matchAll(/각자|각각|우리|서로|플레이어(?:는|가)|제가|저는|내가|나는|(?:서유나|유나|박도현|부장님|부장)(?:\s*씨)?(?:는|가|은|이)/gu)){
    if(/^(?:각자|각각|우리|서로)$/.test(m[0]))owners=['player','npc'];
    else if(/^플레이어/.test(m[0])||/^(?:제가|저는|내가|나는)$/.test(m[0])&&origin.evidence.includes(m[0]))owners=['player'];
    else if(/^(?:서유나|유나|박도현|부장)/.test(m[0]))owners=['npc'];
    else return false;
   }
  }
  const tail=part.slice(object.index);
  const wrapper=/\s+(?:약속|제안)(?=\s|[을를은는이가.!?。！？]|하|해|했|할|$)/u.exec(tail);
  const action=tail.slice(0,wrapper?.index??tail.length).replace(/[.!?。！？]+\s*$/u,'').trimEnd();
  // Require everything after the object through this clause's final predicate,
  // including modifiers; "그림을 아주" cannot stand for "아주 천천히 그린다".
  if(action.length<=object[0].trimEnd().length||!/[가-힣]/u.test(action.slice(object[0].length)))return false;
  const start=cuts[i]+object.index,end=start+action.length;
  for(const performer of owners)required.push({start,end,performer});
 }
 if(!required.length||required.length!==conditions.length)return false;
 const used=new Set<number>();
 for(const condition of conditions){
  const candidates=new Set<number>();
  for(let at=origin.text.indexOf(condition.action);at>=0;at=origin.text.indexOf(condition.action,at+1)){
   const matches=required.map((r,i)=>({...r,index:i})).filter(r=>r.performer===condition.performer&&r.start>=at&&r.end<=at+condition.action.length);
   // A condition is one obligation, not a compound bundle that loses partials.
   if(matches.length===1)candidates.add(matches[0].index);
  }
  const available=[...candidates].filter(i=>!used.has(i));if(available.length!==1)return false;
  used.add(available[0]);
 }
 return used.size===required.length;
}
export function validCommitments(s:NarrativeState):boolean{
 if(!validNegotiations(s)||!validInterpretations(s))return false;
 if(s.commitments===undefined)return true; // Legacy bytes remain readable and unchanged.
 if(!Array.isArray(s.commitments)||s.commitments.length>s.events.length||s.commitments.length>commitmentLimits.promises)return false;
 const ids=new Set<string>();
 try{for(const c of s.commitments){
  const origin=s.events.find(e=>e.id===c.promiseId&&e.kind==='promise'&&e.status==='offered');
  if(!origin||ids.has(c.promiseId)||c.originalText!==origin.text||!Array.isArray(c.conditions)||!c.conditions.length||c.conditions.length>6||!Array.isArray(c.acceptanceIds)||!Array.isArray(c.amendments)||!Array.isArray(c.assessments))return false;
  if(!validApplicability(c,s)||!validRevisions(c,s)||!coversOriginal(origin,originalConditions(c)))return false;
  ids.add(c.promiseId);
  if(c.acceptanceIds.length>commitmentLimits.acceptances||c.amendments.length>commitmentLimits.amendments||c.assessments.length>commitmentLimits.assessments)return false;
  if(c.acceptanceIds.some(id=>!s.events.some(e=>e.id===id&&e.kind==='promise'&&e.status==='accepted'&&(e.reference===c.promiseId||c.acceptanceIds.includes(e.reference)))))return false;
  const conditionIds=new Set<string>();
  for(const condition of c.conditions){
   if(!short(condition.id,100)||conditionIds.has(condition.id)||!actor(condition.performer)||!short(condition.target)||!short(condition.action)||!Array.isArray(condition.evidenceIds)||new Set(condition.evidenceIds).size!==condition.evidenceIds.length)return false;
   conditionIds.add(condition.id);
   if(condition.evidenceIds.length>commitmentLimits.evidencePerCondition)return false;
   if(!actor(condition.originalPerformer)||origin.subject!=='mutual'&&condition.originalPerformer!==origin.subject)return false;
   let owner=condition.originalPerformer;
   for(const amendment of [...c.amendments.filter(a=>a.conditionId===condition.id),...(c.revisions??[]).filter(a=>a.conditionId===condition.id).map(a=>({turn:a.turn,previousPerformer:a.before.performer,performer:a.replacement.performer}))].sort((a,b)=>a.turn-b.turn)){if(amendment.previousPerformer!==owner)return false;owner=amendment.performer;}
   if(owner!==condition.performer)return false;
   if(condition.evidenceIds.some(id=>!s.events.some(e=>e.id===id&&e.subject===condition.performer&&e.turn>origin.turn&&e.kind==='complication'&&e.status==='fulfilled'&&['action','condition-evidence'].includes(e.value)&&(e.performanceSource!==undefined||c.evidenceApplicability?.some(r=>r.evidenceId===id&&r.conditionId===condition.id)?applicable(c,e,condition.id):(e.value!=='condition-evidence'||e.reference===condition.id)))))return false;
  }
  if(c.amendments.some(a=>!conditionIds.has(a.conditionId)||a.promiseId!==c.promiseId||!actor(a.performer)||!actor(a.previousPerformer)||a.performer===a.previousPerformer||!short(a.playerQuote,500)||!short(a.npcQuote,500)||!Number.isInteger(a.turn)||a.turn>s.turn))return false;
  const count=c.conditions.filter(c=>c.evidenceIds.length).length;
  if(c.status!==(count===c.conditions.length?'completed':count?'partial':'pending')||count>0&&!c.acceptanceIds.length)return false;
  if(c.assessments.some(a=>!Number.isInteger(a.turn)||a.turn>s.turn||!['pending','partial','completed','insufficient'].includes(a.result)||typeof a.reason!=='string'||!Array.isArray(a.conditions)||a.conditions.some(v=>!conditionIds.has(v.id)||!Array.isArray(v.evidenceIds)||v.evidenceIds.some(id=>!s.events.some(e=>e.id===id)))))return false;
 }}catch{return false;}
 return true;
}
type Performs=(offer:StoryEvent,sources:{text:string;action:boolean}[],names:string[],single:boolean)=>boolean;
export function applyProgress(s:NarrativeState,text:string,r:NarrativeReply,events:StoryEvent[],names:string[],performs:Performs,consent:(s:string,quote:string)=>boolean,requestId?:string){
 const touched=new Set<Commitment>();
 const refused=(c:Commitment)=>[...s.events,...r.events].some(e=>e.kind==='promise'&&e.status==='refused'&&(e.reference===c.promiseId||c.acceptanceIds.includes(e.reference)));
 negotiateRevisions(s,text,r,touched,consent,refused,requestId);
 applyRevisions(s,text,r,touched,consent,refused);
 for(const a of r.commitmentAmendments??[]){
  const c=commitments(s).find(c=>c.promiseId===a.promiseId),condition=c?.conditions.find(c=>c.id===a.conditionId);
  if(!c||!condition||!c.acceptanceIds.length||refused(c)||c.status==='completed'||condition.evidenceIds.length||condition.performer===a.performer||c.amendments.length+(c.revisions?.length??0)>=commitmentLimits.amendments||r.commitmentRevisions?.some(v=>v.promiseId===a.promiseId))fail();
  if(!text.includes(a.playerQuote)||!r.line.includes(a.npcQuote)||!consent(text,a.playerQuote)||!consent(r.line,a.npcQuote)||![a.playerQuote,a.npcQuote].every(q=>/대신|맡/.test(q)))fail();
  const taking=a.performer==='npc'?a.npcQuote:a.playerQuote;
  if(!/(?:제가|내가|저는|나는)/.test(taking))fail();
  // Both parties must refer to this condition, not a simultaneous unrelated favour.
  const object=condition!.action.match(/([가-힣A-Za-z0-9]+)(?:을|를)\s/)?.[1];
  if(object&&![a.playerQuote,a.npcQuote].every(q=>q.includes(object)))fail();
  c!.amendments.push({...a,id:randomUUID(),previousPerformer:condition!.performer,turn:s.turn});condition!.performer=a.performer;if(c.revisionVersion!==undefined)c.revisionVersion=contractVersion(c);touched.add(c!);
 }
 for(const p of r.commitmentProgress??[]){
  const c=commitments(s).find(c=>c.promiseId===p.promiseId),condition=c?.conditions.find(c=>c.id===p.conditionId),origin=s.events.find(e=>e.id===p.promiseId);
  // A grounded acceptance and real performance may arrive in the same turn.
  // This is provisional: reconcile validates every acceptance before committing
  // any change, and registerCommitments attaches its server-owned event ID.
  const referencesThis=(e:{kind:string;reference:string})=>!!c&&e.kind==='promise'&&(e.reference===c.promiseId||c.acceptanceIds.includes(e.reference));
  const hasAcceptance=!!c&&(c.acceptanceIds.length>0||r.events.some(e=>referencesThis(e)&&e.status==='accepted'));
  if(!c||!condition||!origin||!hasAcceptance||condition.performer!==p.performer||refused(c))fail();
  let source='',action=false,existing:StoryEvent|undefined;
  if(p.source==='player'&&p.performer==='player')source=text;
  if(p.source==='line'&&p.performer==='npc')source=r.line;
  if(p.source==='action'&&p.performer==='npc'){source=r.actionBeats[p.actionIndex]??'';action=true;}
  if(p.source==='event'){
   existing=s.events.find(e=>e.id===p.eventId&&e.subject===p.performer&&e.turn>origin!.turn&&e.status==='fulfilled'&&e.kind==='complication'&&['action','condition-evidence'].includes(e.value));
   if(existing?.value==='condition-evidence'&&!c.conditions.some(v=>v.id===existing!.reference))fail();
   source=existing?.text??'';action=existing?.value==='action'||existing?.performanceSource==='action';
   const amendment=c!.amendments.filter(a=>a.conditionId===condition!.id).at(-1);
   if(amendment&&existing&&existing.turn<=amendment.turn)fail();
   const revision=c.revisions?.filter(a=>a.conditionId===condition.id).at(-1);
   if(revision&&existing&&existing.turn<=revision.turn)fail();
  }
  // Validate the entire source, not a convenient positive substring hiding a denial.
  if(!source.includes(p.quote)||!performs({...origin!,subject:p.performer,text:condition!.action},[{text:source,action}],names,false))fail();
  if(!recipientMatches(source,condition,names))fail();
  if(condition!.evidenceIds.length)continue;
  const evidence=existing??{id:randomUUID(),turn:s.turn,kind:'complication' as const,subject:p.performer,text:source,status:'fulfilled' as const,reference:condition!.id,evidence:p.quote,value:'condition-evidence',performanceSource:action?'action' as const:'statement' as const,performanceVersion:contractVersion(c)};
  recordApplicability(c,evidence,condition,names);
  if(!existing)events.push(evidence);
  condition!.evidenceIds.push(evidence.id);touched.add(c!);
 }
 for(const c of commitments(s))recordInterpretations(c,s,text,names);
 for(const c of touched){
  if(c.evidenceApplicability!==undefined)for(const condition of c.conditions)for(const id of condition.evidenceIds){const e=[...s.events,...events].find(e=>e.id===id);if(!e)fail();if(c.evidenceApplicability.some(r=>r.evidenceId===id&&r.conditionId===condition.id))recordApplicability(c,e,condition,names);}
  if(c.assessments.length>=commitmentLimits.assessments)fail();const count=c.conditions.filter(c=>c.evidenceIds.length).length;c.status=count===c.conditions.length?'completed':count?'partial':'pending';c.assessments.push({turn:s.turn,result:c.status,conditions:c.conditions.map(c=>({id:c.id,evidenceIds:[...c.evidenceIds]})),reason:'Server-derived from accepted performer-specific evidence'});}
}

export function registerCommitments(s:NarrativeState,r:NarrativeReply,accepted:StoryEvent[]){
 for(const o of r.commitmentOffers??[]){
  const proposal=r.events[o.eventIndex],event=accepted.find(e=>e.kind===proposal.kind&&e.status===proposal.status&&e.text===proposal.text&&e.subject===proposal.subject);
  if(!event||event.kind!=='promise'||event.status!=='offered'||commitments(s).some(c=>c.promiseId===event.id))fail();
  if(commitments(s).length>=commitmentLimits.promises)fail();
  if(event.subject==='mutual'&&!(['player','npc'] as const).every(actor=>o.conditions.some(c=>c.performer===actor)))fail();
  if(event.subject!=='mutual'&&o.conditions.some(c=>c.performer!==event.subject))fail();
  // Every original obligation/performer needs one action-bearing condition.
  if(!coversOriginal(event,o.conditions))fail();
  commitments(s).push({promiseId:event.id,originalText:event.text,acceptanceIds:[],conditions:o.conditions.map(c=>({...c,id:randomUUID(),originalPerformer:c.performer,evidenceIds:[]})),amendments:[],assessments:[],status:'pending'});
 }
 for(const e of accepted.filter(e=>e.kind==='promise'&&e.status==='accepted')){
  const c=commitments(s).find(c=>c.promiseId===e.reference||c.acceptanceIds.includes(e.reference));if(c&&!c.acceptanceIds.includes(e.id)){if(c.acceptanceIds.length>=commitmentLimits.acceptances)fail();c.acceptanceIds.push(e.id);}
 }
}

