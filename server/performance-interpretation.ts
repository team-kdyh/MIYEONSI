import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {ConditionInput,Commitment} from './commitments.ts';
import {performedCommitment,type StoryEvent,type NarrativeState} from './narrative.ts';
import {recipientMatches} from './evidence-applicability.ts';
export const interpretationLimit=64;
const componentHash=createHash('sha256').update(readFileSync(new URL('./performance-interpretation.ts',import.meta.url))).update(readFileSync(new URL('./narrative.ts',import.meta.url))).update(readFileSync(new URL('./evidence-applicability.ts',import.meta.url))).digest('hex');
type Meaning='performance'|'acceptance'|'future'|'explicit-nonperformance'|'other'|'uninterpreted';
type Match='match'|'mismatch'|'unresolved';
export type PerformanceInterpretation={id:string;conditionId:string;promiseId:string;turn:number;text:string;span:{start:number;end:number};componentHash:string;previousId:null;meaning:Meaning;matching:Match;reasons:{actor:string;target:string;action:string;tense:string;polarity:string}};
export function interpretPerformance(condition:ConditionInput,text:string,names:string[],turn:number,conditionId:string,promiseId:string):PerformanceInterpretation{
 const recipients=recipientMatches(text,condition,names);
 const otherActor=condition.performer==='player'&&/(?:친구|유나|서유나|부장|박도현)(?:가|이|는|은)\s/.test(text);
 const negative=/(?:않았|못했|못\s|안\s)/.test(text),future=/(?:겠|예정|계획|려고|(?:할|갈|올|줄|볼|둘|낼|릴|을)\s*(?:게|거))/.test(text);
 const acceptance=/^\s*(?:네|응|좋아요|좋습니다|동의해요)[.!。]*\s*$/.test(text)||/(?:동의|수락)해요[.!。]*\s*$/.test(text);
 const past=[...text].some(c=>c!=='있'&&c>='가'&&c<='힣'&&(c.charCodeAt(0)-0xac00)%28===20);
 const matched=performedCommitment({subject:condition.performer,text:condition.action} as StoryEvent,[{text,action:false}],names,false)&&recipients;
 // These diagnostics describe the bounded parser's knowledge. They neither
 // create world events nor certify that an unrecognized sentence means failure.
 const meaning:Meaning=negative?'explicit-nonperformance':future?'future':acceptance?'acceptance':matched||past&&(otherActor||!recipients)?'performance':text.trim()? 'uninterpreted':'other';
 const matching:Match=matched?'match':otherActor||!recipients||negative||future||acceptance?'mismatch':'unresolved';
 return {id:randomUUID(),conditionId,promiseId,turn,text,span:{start:0,end:text.length},componentHash,previousId:null,meaning,matching,reasons:{actor:otherActor?'different explicit actor':'linked actor; no conflicting recognized actor',target:recipients?'compatible explicit recipient or linked omitted recipient':'different explicit recipient',action:matched?'bounded predicate/object matched':'predicate/object not established',tense:future?'future intention':past?'past inflection':'no established completed tense',polarity:negative?'explicit negative statement':'no recognized negative statement'}};
}
export function recordInterpretations(c:Commitment,s:NarrativeState,text:string,names:string[]){
 if(!c.acceptanceIds.length)return;
 for(const condition of c.conditions){
  if(condition.performer!=='player')continue;
  const object=condition.action.match(/([가-힣A-Za-z0-9]+)(?:을|를)\s/)?.[1];
  if(!object||!text.includes(object))continue;
  const rows=s.performanceInterpretations??=[];
  if(rows.length>=interpretationLimit)throw Error('수행 해석 진단의 저장 한도입니다.');
  rows.push(interpretPerformance(condition,text,names,s.turn,condition.id,c.promiseId));
 }
}
export function validInterpretations(s:NarrativeState){
 const rows=s.performanceInterpretations;if(rows===undefined)return true;
 if(!Array.isArray(rows)||rows.length>interpretationLimit)return false;
 const ids=new Set<string>();
 for(const r of rows){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!s.commitments?.some(c=>c.promiseId===r.promiseId&&c.conditions.some(v=>v.id===r.conditionId))||!Number.isInteger(r.turn)||r.turn<0||r.turn>s.turn||typeof r.text!=='string'||r.text.length>500||!r.span||r.span.start!==0||r.span.end!==r.text.length||!/^\w{64}$/.test(r.componentHash)||r.previousId!==null||!['performance','acceptance','future','explicit-nonperformance','other','uninterpreted'].includes(r.meaning)||!['match','mismatch','unresolved'].includes(r.matching)||!r.reasons||Object.keys(r.reasons).sort().join()!=='action,actor,polarity,target,tense'||Object.values(r.reasons).some(v=>typeof v!=='string'||!v||v.length>180))return false;
  ids.add(r.id);
 }
 // Preserve the original interpretation/hash; reading does not silently
 // reclassify historical diagnostics with a newer parser or invent missing ones.
 return true;
}
