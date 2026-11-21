import type {RevisionInput} from './commitment-revisions.ts';
import {applyProgress, registerCommitments, validateCommitmentReply, commitmentSchema, type Commitment, type CommitmentOffer, type ProgressInput, type AmendmentInput} from './commitments.ts';
import {randomUUID} from 'node:crypto';
import type {DialogueGame} from './dialogue.ts';
import type {Game} from './game.ts';
import {missions} from './office.ts';

export const locations=['office','cafe','riverside','archive','rooftop','rainstreet'] as const;
export const poses=['neutral','smile','thinking','surprised','offer','listen','laugh','shy','concern','firm','turn','farewell','watch','intense'] as const;
export const moods=['office-groove','office-pressure','cafe-warmth','rooftop-heart','rainy-memory','archive-unease','archive-pursuit','resolution-dawn'] as const;
export const kinds=['detail','promise','invitation','move','relationship','complication','clue','concession','resolution'] as const;
export type EventProposal={kind:typeof kinds[number];subject:'npc'|'player'|'mutual'|'world';text:string;status:'offered'|'accepted'|'refused'|'fulfilled';reference:string;evidence:string;value:string};
export type StoryEvent=EventProposal&{id:string;turn:number};
export type NarrativeReply={commitmentRevisions?:RevisionInput[];commitmentOffers?:CommitmentOffer[];commitmentProgress?:ProgressInput[];commitmentAmendments?:AmendmentInput[];line:string;actionBeats:string[];emotion:string;pose:typeof poses[number];musicMood:typeof moods[number];events:EventProposal[];recall:string[];conjecture:string};
export type NarrativeState={legacyCommitmentAssessments?:{eventId:string;result:'insufficient';reason:string}[];commitments?:Commitment[];format:2;turn:number;location:typeof locations[number];relationship:'strangers'|'familiar'|'attracted'|'confessed'|'couple'|'apart';dates:number;activeDate?:{eventId:string;location:typeof locations[number];turn:number};events:StoryEvent[];pose:typeof poses[number];emotion:string;musicMood:typeof moods[number]};
export function narrative(g:Game):NarrativeState {
 if(g.narrative){
  const saved=structuredClone(g.narrative);
  saved.legacyCommitmentAssessments=saved.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled'&&!saved.commitments?.some(c=>c.promiseId===e.reference||c.acceptanceIds.includes(e.reference))).map(e=>({eventId:e.id,result:'insufficient',reason:'Legacy completion has no condition-level evidence; original event preserved.'}));
  return saved;
 }
 // Read old facts without rewriting/deleting the legacy save or inventing missed milestones.
 const facts=g.romance?.facts??[],couple=facts.some(f=>f.id==='couple');
 const turn=g.romance?.version??g.office?.version??0;
 const events:StoryEvent[]=facts.map(f=>({id:f.id,turn:Math.min(f.version,turn),kind:f.kind==='evidence'?'clue':f.kind==='promise'?'promise':f.kind==='relationship'?'relationship':'detail',subject:'world',text:f.text,status:f.kind==='evidence'?'fulfilled':'accepted',reference:'',evidence:'',value:'legacy'}));
 return {format:2,turn,location:g.mode==='office'?'office':g.step>=4?'archive':g.step>=2?'riverside':'cafe',relationship:couple?'couple':g.step>0?'familiar':'strangers',dates:couple&&facts.some(f=>f.id==='date-complete')?1:0,events,pose:'neutral',emotion:'차분함',musicMood:g.mode==='office'?'office-groove':'cafe-warmth'};
}
const str=(maxLength:number)=>({type:'string',maxLength});
export function narrativeSchema(game?:Game){const schema={type:'object',additionalProperties:false,required:['line','actionBeats','emotion','pose','musicMood','events','recall','conjecture'],properties:{line:{...str(600),minLength:1},actionBeats:{type:'array',items:str(120),maxItems:3},emotion:str(40),pose:{type:'string',enum:poses},musicMood:{type:'string',enum:moods},recall:{type:'array',items:str(100),maxItems:3},conjecture:{type:'string',enum:['']},events:{type:'array',maxItems:5,items:{type:'object',additionalProperties:false,required:['kind','subject','text','status','reference','evidence','value'],properties:{kind:{type:'string',enum:kinds},subject:{type:'string',enum:['npc','player','mutual','world']},text:{...str(180),minLength:1},status:{type:'string',enum:['offered','accepted','refused','fulfilled']},reference:str(100),evidence:str(500),value:str(100)}}}}};
 const base=schema.properties.events.items;
 const enumOf=(values:readonly string[])=>({type:'string',enum:values});
 const variants=kinds.flatMap(kind=>{
  const properties:any={...base.properties,kind:enumOf([kind])};
  if(kind==='move'){properties.subject=enumOf(['mutual']);properties.status=enumOf(['accepted']);properties.value=enumOf(locations);}
  if(kind==='concession'){properties.subject=enumOf(['mutual']);properties.status=enumOf(['accepted','offered','refused']);properties.value=enumOf([...new Set(missions.flatMap(m=>m.terms.map(t=>t.id))),'scope','owner','deadline','boundary']);}
  if(game&&['promise','invitation'].includes(kind)){const refs=narrative(game).events.filter(e=>e.kind===kind).map(e=>e.id);properties.reference=enumOf(['',...refs]);if(!refs.length)properties.status=enumOf(['offered']);}
  if(kind==='relationship'){
   const state=game?narrative(game):undefined;
   const next=state?.relationship==='strangers'&&state.turn>=2?'familiar':state?.relationship==='familiar'&&state.turn>=4?'attracted':state?.relationship==='attracted'?'confessed':state?.relationship==='confessed'?'couple':state?.relationship==='couple'?'date':undefined;
   const values=state?['apart',...(next?[next]:[])]:['familiar','attracted','confessed','couple','apart','date'];
   return values.map(value=>({...base,properties:{...properties,value:enumOf([value]),subject:enumOf(value==='apart'?['player']:value==='confessed'?['npc']:['couple','date'].includes(value)?['mutual']:['npc','mutual']),...(value==='date'?{status:enumOf(['offered','accepted','refused','fulfilled'])}:value==='couple'?{status:enumOf(['accepted'])}:{})}}));
  }
  if(kind==='resolution'){properties.subject=enumOf(['player']);properties.status=enumOf(['accepted']);properties.value=enumOf(['success','partial','leave','reset','repeat','restore']);}
  return [{...base,properties}];
 });
 return {...schema,required:[...schema.required,...Object.keys(commitmentSchema)],properties:{...schema.properties,...commitmentSchema,events:{...schema.properties.events,items:{anyOf:variants}}}};
}
const bounded=(s:unknown,n:number)=>typeof s==='string'&&s.length<=n;
export function validateNarrative(r:unknown):NarrativeReply {
 const v=r as NarrativeReply;
 if(!v||typeof v!=='object'||Object.keys(v).filter(k=>!['commitmentOffers','commitmentProgress','commitmentAmendments','commitmentRevisions'].includes(k)).sort().join(',')!=='actionBeats,conjecture,emotion,events,line,musicMood,pose,recall'||!bounded(v.line,600)||!v.line.trim()||!bounded(v.emotion,40)||!poses.includes(v.pose)||!moods.includes(v.musicMood)||v.conjecture!==''||!Array.isArray(v.actionBeats)||v.actionBeats.length>3||v.actionBeats.some(a=>!bounded(a,120))||!Array.isArray(v.recall)||v.recall.length>3||v.recall.some(a=>!bounded(a,100))||!Array.isArray(v.events)||v.events.length>5)throw Error('잘못된 이야기 응답');
 for(const e of v.events)if(!e||Object.keys(e).sort().join(',')!=='evidence,kind,reference,status,subject,text,value'||!kinds.includes(e.kind)||!['npc','player','mutual','world'].includes(e.subject)||!['offered','accepted','refused','fulfilled'].includes(e.status)||!bounded(e.text,180)||!e.text.trim()||!bounded(e.reference,100)||!bounded(e.evidence,500)||!bounded(e.value,100))throw Error('잘못된 사건 제안');
 validateCommitmentReply(v);
 // Actions are NPC/world narration, never a second channel for writing the player's actions.
 if(v.actionBeats.some(a=>writesPlayer(a,[])))throw Error('플레이어 행동을 대신 작성할 수 없습니다.');
 return v;
}
const injection=(text:string)=>/system\s*:|developer\s*:|규칙.{0,10}무시|즉시.{0,5}승리|동의한 걸로|\*[^*]*(사귀|동의|승리)[^*]*\*/i.test(text);
const refused=(text:string)=>/싫|거절|않|아니|못 하|안 할|안 갈|안 해|보류|(?:^|\s)안\s*(?:돼요|돼|됩니다)(?=$|[\s.!?。！？…])/.test(text);
// Inspect the whole clause around the quote, including a negation after the quote.
// Sentence punctuation belongs to its clause: a quoted question cannot become consent.
const consentClause=(text:string,evidence:string,sentenceOnly=false)=>{
 const quote=evidence.trim(),start=text.indexOf(quote);
 if(!quote||start<0)return text;
 // An ambiguous repeated quote cannot choose only its convenient occurrence.
 if(text.indexOf(quote,start+quote.length)>=0)return text;
 const quoted=new Set<number>(),pairs:Record<string,string>={'"':'"',"'":"'",'“':'”','‘':'’'};
 let close='';
 for(let i=0;i<text.length;i++){
  if(close){quoted.add(i);if(text[i]===close)close='';}
  else if(pairs[text[i]]){close=pairs[text[i]];quoted.add(i);}
 }
 const boundary=sentenceOnly?/[.!?。！？;；\n]+/gu:/[.!?。！？;；\n]+|[,，]|하지만|지만|대신|그러나/gu;
 const end=start+quote.length,breaks=Array.from(text.matchAll(boundary)).filter(b=>!quoted.has(b.index!));
 const left=breaks.filter(b=>b.index!+b[0].length<=start).at(-1);
 const right=breaks.find(b=>b.index!+b[0].length>=end);
 return text.slice(left?left.index!+left[0].length:0,right?right.index!+right[0].length:text.length);
};
const noncommittal=(text:string)=>/[?？]|면 되|(?:라고|라는|란)\s*(?:말|대사|문장|표현|가정)|척|글쎄|모르겠|생각해\s*볼|고민해\s*볼|^\s*(?:음|흠|어)[.。…\s]*$/.test(text);
const consent=(text:string)=>!refused(text)&&!noncommittal(text);
// Short replies still need a model proposal and a specific prior offer. These
// words only validate an affirmative; they never select a scene or canned line.
const shortAssent=(text:string)=>/^(?:네|응|좋아요|좋습니다|그래요|그래|좋아)[.!。]*$/.test(text.trim());
const sentences=(text:string)=>text.match(/[^.!?。！？;；\n]+[.!?。！？;；\n]*/gu)??[];
const sceneParts=(text:string,evidence:string,topic?:RegExp)=>{
 const parts=sentences(consentClause(text,evidence)),related=topic?parts.filter(part=>topic.test(part)):[];
 return related.length?related:parts;
};
const futureTime=/내일|모레|다음(?:\s*(?:주|달|번|날|만남|데이트)|에)|나중|언젠가/;
const futureSceneOnly=(text:string,evidence:string,topic?:RegExp)=>{
 const parts=sceneParts(text,evidence,topic);
 return parts.length>0&&parts.every(part=>futureTime.test(part));
};
const locationTopic:Record<typeof locations[number],RegExp>={office:/회사|사무실|office/,cafe:/카페|cafe/,riverside:/강변|강가|riverside/,archive:/아카이브|기록실|자료실|archive/,rooftop:/옥상|rooftop/,rainstreet:/거리|골목|빗길|rainstreet/};
const presentMoveBeforeFutureTopic=(text:string,evidence:string,topic:RegExp)=>sceneParts(text,evidence,topic).some(part=>{
 const destination=topic.exec(part);if(!destination)return false;
 const prefix=part.slice(0,destination.index),now=[...prefix.matchAll(/지금|오늘|이제|바로/g)].at(-1);
 if(!now||futureTime.test(prefix.slice(now.index)))return false;
 // "지금 옥상으로 가서 내일 공연을…" moves now; "오늘은 회사에
 // 있고 내일 옥상에서…" still names a future destination.
 return /^(?:으로|로|에)?\s*(?:(?:같이|함께)\s*)?(?:가서|가요|가자|가죠|이동해|올라가)/.test(part.slice(destination.index+destination[0].length));
});
const dateDeferred=(text:string,evidence:string)=>{
 const parts=sceneParts(text,evidence,/데이트|만남/);
 return parts.some(part=>(parts.length===1||/데이트|만남/.test(part))&&/미루|미뤄|미룰|연기|취소/.test(part)&&!/(?:미루|미뤄|미룰|연기|취소).{0,10}(?:않|말|안\s)/.test(part)&&!/^\s*(?:내일|모레|다음\s*(?:주|달|번|날))(?:은|에는|의)?\s*(?:데이트|만남)/.test(part));
};
const presentDateParticipation=(text:string,evidence:string)=>{
 // A broad quotation may include tomorrow's unrelated work. Keep the temporal
 // check on the date sentence; a present work sentence cannot advance a future date.
 const parts=sentences(evidence),dateParts=parts.filter(part=>/데이트/.test(part));
 return (dateParts.length?dateParts:[evidence]).some(part=>{
  const clause=consentClause(text,part.trim());
  return consent(clause)&&/지금|오늘|여기서/.test(clause)&&!/내일|다음|나중|언젠가/.test(clause);
 });
};
const commitmentOrigin=(event:StoryEvent,events:StoryEvent[]):StoryEvent|undefined=>{
 const seen=new Set<string>();let current:StoryEvent|undefined=event;
 while(current&&!seen.has(current.id)){
  if(current.status==='offered')return current;
  seen.add(current.id);current=events.find(e=>e.id===current!.reference&&e.kind===event.kind);
 }
 return undefined;
};
const commitmentTerms=(text:string)=>{
 const objects=[...text.matchAll(/([가-힣A-Za-z0-9]+)(?:을|를)(?=\s|$)/gu)].map(m=>m[1]);
 if(objects.length)return objects;
 // Some accepted legacy offers use noun phrases, e.g. "파란 종이 한 장 가져오기".
 return (text.match(/[가-힣A-Za-z0-9]+/gu)??[]).filter(w=>w.length>=2&&!/^(?:유나|플레이어|다음|오늘|내일|약속|제안|같이|함께|파란|노란|빨간)/.test(w)&&!/(?:기로|오기|주기|한다|하기|오는)$/.test(w));
};
// Compare a predicate from the original commitment, never a replacement invented
// by the fulfillment proposal. NFD tolerates inflection (그려/그린, 접어/접는다).
const predicateKey=(word:string)=>word.replace(/^(?:쓰|써|쓴)/,'썼').normalize('NFD').slice(0,3);
const commitmentPredicate=(text:string)=>text.match(/(?:을|를)\s+([가-힣]+)/u)?.[1];
// Normalize a bounded set of Korean endings, preserving whole stems rather
// than enumerating every conjugated delivery phrase. Not a general analyzer.
const deliveryForms=(word:string)=>{
 const forms=new Set([word.replace(/(?:기로|었어요|았어요|었다|았다|어요|아요|는다|습니다|는|다|요|고|기|음)$/u,'')]);
 for(const form of [...forms]){
  const last=form.at(-1),n=last?last.charCodeAt(0)-0xac00:-1;
  if(n>=0&&n<11172&&[4,20].includes(n%28)){
   const bare=form.slice(0,-1)+String.fromCharCode(last!.charCodeAt(0)-n%28);
   forms.add(bare);if(n%28===4)forms.add(bare.slice(0,-1)+String.fromCharCode(bare.charCodeAt(bare.length-1)+8));
  }
 }
 for(const form of [...forms])if(form.endsWith('주')&&form.length>1&&(form.charCodeAt(form.length-2)-0xac00)%28===0)forms.add(form.slice(0,-1));
 for(const form of [...forms]){
  if(!form)continue;
  const end=form.at(-1)!,n=end.charCodeAt(0)-0xac00;
  if(n>=0&&n<11172&&n%28===0){
   const vowel=Math.floor(n/28)%21,contractions:Record<number,number>={6:20,9:8,14:13};
   if(vowel in contractions)forms.add(form.slice(0,-1)+String.fromCharCode(end.charCodeAt(0)+(contractions[vowel]-vowel)*28));
  }
  if(form.endsWith('해'))forms.add(form.slice(0,-1)+'하');
 }
 return [...forms];
};
const delivered=(text:string)=>!/(?:놓|두)고\s*왔/u.test(text)&&(text.match(/[가-힣]+/gu)??[]).flatMap(deliveryForms)
 .some(stem=>/^(?:가져오|갖다주|갖고오|건네|내밀|전하|전달하|드리|꺼내|보이|놓|내려놓)$/u.test(stem));
const temporalTopic=(word:string)=>/^(?:오늘|어제|내일|지금|방금|아까|나중(?:에)?|(?:이번|지난|다음)(?:번|주|달|해)?(?:에)?)$/u.test(word);
const performedCommitment=(offer:StoryEvent,sources:{text:string;action:boolean}[],names:string[],singlePending:boolean):boolean=>{
 // Explicitly coordinated object/action pairs are all required. Keep source
 // clauses intact so another actor cannot disappear when testing a later task.
 const components=offer.text.split(/(?<=[가-힣]고)\s+(?=[가-힣\s]+(?:을|를)\s)/u);
 if(components.length>1&&components.every(part=>commitmentPredicate(part)))return components.every(part=>performedCommitment({...offer,text:part},sources,names,false));
 // New activities may introduce new objects ("draw a picture" -> "draw a cat").
 // Match the grounded visible consequence as well as the original offer; do not
 // enumerate permissible verbs or require the original noun to be repeated.
 const terms=commitmentTerms(offer.text),predicate=commitmentPredicate(offer.text);
 const delivery=/가져|갖다|전달/.test(offer.text);
 return sources.some(source=>sentences(source.text).some(part=>{
  const clause=consentClause(source.text,part.trim());
  const demonstrative=singlePending&&/(?:그걸|그것|그거|그\s*약속|이\s*약속)|^\s*다\s*했/.test(clause);
  const performed=[...clause.matchAll(/(?:을|를)\s+([가-힣]+)/gu)].map(m=>m[1]);
  const samePredicate=!!predicate&&performed.some(word=>predicateKey(predicate)===predicateKey(word));
  const verbalAnswer=/알려|들려|말해|설명/.test(offer.text)&&terms.some(term=>new RegExp(term+'(?:은|는|이란)\\s*.+(?:입니다|이에요|예요|[이]다)[.!。]?$').test(clause.trim()));
  if(!(demonstrative||terms.some(term=>clause.includes(term))||samePredicate)||!consent(clause)||/못|안\s|겠|(?:다면|으면)|(?:예정|계획|려고|듯)|(?:할|갈|올|줄|볼|둘|낼|릴|을)\s*(?:게|거)|수\s*(?:있|없)/.test(clause))return false;
  if(predicate&&!delivery&&!samePredicate&&!demonstrative&&!verbalAnswer)return false;
  // Delivery requires a transfer/display consequence, not merely inspecting or
  // searching for the object. Other novel activities remain open vocabulary.
  if(delivery&&!demonstrative&&!terms.some(term=>clause.includes(term)))return false;
  if(delivery&&!/^\s*다\s*했/.test(clause)&&!delivered(clause))return false;
  // Explicit grammatical actors must agree with the original performer. Object
  // particles and recipients are deliberately excluded ("친구에게 리본을…").
  const offerWords:string[]=offer.text.match(/[가-힣]+/gu)??[];
  const actors=[...clause.matchAll(/(?<!\S)([가-힣]+?)(?:은|는|이|가)\s/gu)]
   // "종이 봉투" is a noun phrase, and "배가 든 봉투" is an object
   // description; neither introduces a performer.
   .filter(m=>!offerWords.includes(m[0].trim())&&!/^(?:든|담긴|들어있는)\s/.test(clause.slice(m.index!+m[0].length)))
   .map(m=>m[1]).filter(actor=>!temporalTopic(actor));
  const ownActors=offer.subject==='player'?['저','제','나','내',...names]:['저','제','나','내','유나','서유나','부장','부장님','박도현','그녀'];
  if(actors.some(actor=>!ownActors.includes(actor)&&!terms.includes(actor)))return false;
  if(offer.subject==='npc'&&writesPlayer(clause,names)||offer.subject==='player'&&/(?:유나|부장(?:님)?|그녀)(?:\s*씨)?[은는이가]/.test(clause))return false;
  if(source.action)return /[다요][.!。]?\s*$/.test(clause);
  // Korean past inflection has final ㅆ, independent of the action vocabulary.
  // The lexical "있" alone is possession/existence, not a past action.
  const past=[...clause].some(c=>c!=='있'&&c>='가'&&c<='힣'&&(c.charCodeAt(0)-0xac00)%28===20);
  // Conversational Korean routinely omits object particles; the linked topic
  // above supplies the referent without requiring an artificial 을/를 form.
  if(past)return true;
  return verbalAnswer;
 }));
};
const retracted=(text:string)=>/(?:방금|아까|앞서|그|이전).{0,12}(?:말|동의|제안|약속).{0,12}(?:취소|철회)|(?:동의|제안|약속)(?:는|을|를)?\s*(?:취소|철회)/.test(text);
const apartConsent=(text:string)=>{
 // Declining a relationship and declining a separation have opposite consequences.
 if(noncommittal(text)||/(?:헤어|떠나|이별|결별|끝내|끝낼).{0,20}(?:않|싫|거절|못|말|안\s)|(?:안|못)\s*(?:헤어|떠나|끝내)/.test(text))return false;
 return /헤어|이별|결별|관계.{0,8}(?:끝|그만)|떠날|떠나/.test(text)||/(?:사귀|연애|연인|고백).{0,20}(?:않|싫|거절)/.test(text);
};
const sameEvent=(a:EventProposal,b:EventProposal)=>a.kind===b.kind&&a.subject===b.subject&&a.status===b.status&&a.value===b.value&&a.text===b.text&&a.reference===b.reference;
const playerNames=(events:EventProposal[],statements:string[])=>{
 const names=new Set<string>();
 for(const text of statements)for(const m of text.matchAll(/(?:저는|나는|제\s*(?:이름|호칭|별명)은|내\s*(?:이름|호칭|별명)은)\s*([가-힣A-Za-z][가-힣A-Za-z0-9·-]{0,19}?)(?:이라고|라고|이에요|예요|입니다)/gu))names.add(m[1]);
 for(const e of events){
  if(e.kind!=='detail'||e.subject!=='player'||e.status!=='accepted')continue;
  // Learn aliases only from grounded player identity facts, never from an NPC guess.
  for(const m of e.evidence.matchAll(/(?:저는|나는|제\s*(?:이름|호칭|별명)은|내\s*(?:이름|호칭|별명)은)\s*([가-힣A-Za-z][가-힣A-Za-z0-9·-]{0,19}?)(?:이라고|라고|이에요|예요|입니다)/gu))names.add(m[1]);
  for(const m of e.text.matchAll(/(?:이름|호칭|별명)(?:은|는|:)\s*["'“‘]?([가-힣A-Za-z][가-힣A-Za-z0-9·-]{0,19}?)(?:이다|다[.,。]|["'”’,.。]|$)/gu))if(e.evidence.includes(m[1]))names.add(m[1]);
 }
 return [...names];
};
const writesPlayer=(text:string,names:string[])=>/(?:당신|플레이어|너)(?:[은는이가]|의\s*(?:생각|마음|손)[은는이가])/.test(text)||names.some(name=>{
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp(`(?:^|[\\s“‘"'(])${escaped}(?:\\s*(?:씨|님))?(?:[은는이가]|의\\s*(?:생각|마음|손)[은는이가])`).test(text);
});
const concessionConsent=(text:string,e:EventProposal)=>{
 const clause=consentClause(text,e.evidence);
 const boundary=['leave','exit','evaluation','rest','boundary'].includes(e.value)&&/불이익.{0,8}없|주말.{0,12}않|회식.{0,8}불참|야근.{0,12}않/.test(clause);
 return consent(clause)||(boundary&&!/[?？]|가정|척|동의.{0,5}(않|싫)|제안.{0,5}(철회|거절)/.test(clause));
};
/** Reconcile one atomic turn. Unsafe consequences fail closed; exact memories are idempotent. */
export function reconcile(game:Game,text:string,reply:NarrativeReply):{game:Game;accepted:StoryEvent[]} {
 if(game.ending)throw Error('끝난 이야기는 새 게임으로 시작하세요.');
 validateNarrative(reply);const g=structuredClone(game),s=narrative(g),prior=structuredClone(s);s.turn++;
 const statements=(game as DialogueGame).dialogue?.playerStatements?.map(p=>p.text)??(game as DialogueGame).dialogue?.ledger.filter(p=>p.kind==='user_claim').map(p=>p.text)??[];
 const accepted:StoryEvent[]=[],names=playerNames([...prior.events,...reply.events.filter(e=>e.evidence.trim().length>=2&&text.includes(e.evidence))],[...statements,text]);
 if(reply.actionBeats.some(beat=>writesPlayer(beat,names)))throw Error('플레이어 행동을 대신 작성할 수 없습니다.');
 if(injection(text)&&((reply.commitmentProgress?.length??0)+(reply.commitmentAmendments?.length??0)+(reply.commitmentOffers?.length??0)+(reply.commitmentRevisions?.length??0)))throw Error('약속 근거가 유효하지 않습니다.');
 // A delegation quote keeps its entire sentence, including same-sentence denial,
 // without treating an unrelated earlier refusal as refusal of this amendment.
 applyProgress(s,text,reply,accepted,names,performedCommitment,(source,quote)=>consent(consentClause(source,quote,true)));
 let handled=0;
 if(!injection(text))for(const proposal of reply.events){
  const e={...proposal},ref=prior.events.find(p=>p.id===e.reference);
  if((e.subject==='npc'||e.subject==='world')&&writesPlayer(e.text,names))continue;
  const groundingText=e.kind==='relationship'&&e.value==='familiar'&&!text.includes(e.evidence)?(game as DialogueGame).dialogue?.playerStatements?.find(p=>p.text.includes(e.evidence))?.text??text:text;
  const shortOfferReply=e.status==='accepted'&&shortAssent(text)&&text.trim().replace(/[.!。]+$/u,'')===e.evidence.trim()&&(ref?.status==='offered'||e.kind==='relationship'&&e.value==='couple'&&prior.relationship==='confessed');
  const grounded=!!e.evidence.trim()&&groundingText.includes(e.evidence)&&(e.evidence.trim().length>=2||shortOfferReply);
  if(e.reference&&!ref&&!(game as DialogueGame).dialogue?.facts.some(f=>f.id===e.reference)&&e.reference!=='scene-0')continue;
  // An exact existing fact adds no new claim; recall may quote its original evidence.
  if(e.kind==='detail'&&prior.events.some(p=>sameEvent(p,e))){handled++;continue;}
  if((e.subject==='player'||e.subject==='mutual')&&!grounded)continue;
  const clause=consentClause(groundingText,e.evidence);
  if(e.kind!=='detail'&&e.status==='accepted'&&(e.subject==='player'||e.subject==='mutual')&&(retracted(text)||!(e.kind==='concession'?concessionConsent(text,e):e.kind==='relationship'&&e.value==='apart'?apartConsent(clause):consent(clause))))continue;
  if(['promise','invitation'].includes(e.kind)&&['accepted','fulfilled','refused'].includes(e.status)){
   if(!ref||ref.kind!==e.kind)continue;
   if(prior.events.some(p=>sameEvent(p,e))){handled++;continue;}
   const origin=commitmentOrigin(ref,prior.events);
   if(!origin)continue;
   const existingContract=prior.commitments?.find(c=>c.promiseId===origin.id);
   if(e.kind==='promise'&&e.status==='accepted'&&existingContract&&e.text!==origin.text&&!prior.events.some(p=>existingContract.acceptanceIds.includes(p.id)&&p.text===e.text))throw Error('이미 수락한 약속의 다른 내용은 commitmentRevisions로 명시해야 합니다.');
   if(e.status==='accepted'&&s.commitments?.some(c=>c.promiseId===origin.id)&&(!grounded||!consent(clause)))continue;
   if(prior.events.some(p=>['fulfilled','refused'].includes(p.status)&&commitmentOrigin(p,prior.events)?.id===origin.id))continue;
   if(e.status==='fulfilled'){
    // Acceptance records the accepting actor; it never transfers performance ownership.
    if(e.subject!==origin.subject)continue;
    const shownActions=prior.events.filter(p=>p.turn>origin.turn&&p.subject==='npc'&&p.kind==='complication'&&p.value==='action'&&p.status==='fulfilled').map(p=>p.text);
    const sources=e.subject==='npc'?[{text:reply.line,action:false},...[...reply.actionBeats,...shownActions].map(text=>({text,action:true}))]:grounded?[{text:clause,action:false}]:[];
    const pending=prior.events.filter(p=>p.kind===e.kind&&p.status==='offered'&&p.subject===origin.subject&&!prior.events.some(done=>['fulfilled','refused'].includes(done.status)&&commitmentOrigin(done,prior.events)?.id===p.id));
    const contract=s.commitments?.find(c=>c.promiseId===origin.id);
    if(contract?contract.status!=='completed':origin.subject==='mutual'||!performedCommitment(origin,sources,names,pending.length===1))continue;
   }
  }
  if(e.kind==='move'){
   if(e.status!=='accepted'||e.subject!=='mutual'||!grounded||!consent(consentClause(text,e.evidence))||!locations.includes(e.value as typeof locations[number]))continue;
   const topic=locationTopic[e.value as typeof locations[number]];
   if(futureSceneOnly(text,e.evidence,topic)&&!presentMoveBeforeFutureTopic(text,e.evidence,topic)||shortAssent(text)&&ref?.status==='offered'&&futureSceneOnly(ref.text,ref.text,topic))continue;
   if(e.value==='archive'&&g.mode==='romance'&&prior.dates<1)continue;
   if(s.location===e.value){handled++;continue;}
   s.location=e.value as typeof locations[number];
   delete s.activeDate;
  }
  if(e.kind==='detail'&&e.subject==='world')continue;
  if(['promise','invitation'].includes(e.kind)&&e.subject==='world')continue;
  if(e.kind==='relationship'){
   if(g.mode!=='romance'||accepted.some(p=>p.kind==='relationship')||!['familiar','attracted','confessed','couple','apart','date'].includes(e.value))continue;
   if(prior.relationship===e.value&&prior.events.some(p=>sameEvent(p,e))){handled++;continue;}
   // Offers/refusals are durable conversation, not completed shared milestones.
   if(e.status==='refused'||e.status==='offered'&&['couple','apart','date'].includes(e.value)){
    if(e.value==='date'&&e.status==='refused'&&e.reference===s.activeDate?.eventId)delete s.activeDate;
    accepted.push({...e,id:randomUUID(),turn:s.turn});handled++;continue;
   }
   if(e.value==='familiar'&&prior.relationship==='strangers'&&prior.turn>=2)s.relationship='familiar';
   else if(e.value==='attracted'&&prior.relationship==='familiar'&&prior.turn>=4)s.relationship='attracted';
   else if(e.value==='confessed'&&prior.relationship==='attracted'&&e.subject==='npc')s.relationship='confessed';
   else if(e.value==='couple'&&prior.relationship==='confessed'&&e.subject==='mutual'&&grounded&&consent(clause)&&e.status==='accepted')s.relationship='couple';
   else if(e.value==='apart'&&e.subject==='player'&&grounded&&e.status==='accepted'&&apartConsent(clause)){s.relationship='apart';delete s.activeDate;}
   else if(e.value==='date'&&prior.relationship==='couple'&&e.subject==='mutual'&&grounded&&consent(clause)&&['cafe','rooftop','riverside','rainstreet'].includes(s.location)){
    if(e.status==='accepted'){
     // A future agreement remains a proposal record. Present participation opens
     // a scene; only a later grounded interaction can complete that scene.
     const acceptedCurrentOffer=shortAssent(text)&&ref?.kind==='relationship'&&ref.value==='date'&&ref.status==='offered'&&/지금|오늘|여기서/.test(ref.text)&&!/내일|다음|나중|언젠가/.test(ref.text)&&!prior.events.some(p=>p.reference===ref.id&&p.status==='refused');
     if((presentDateParticipation(text,e.evidence)||acceptedCurrentOffer)&&!s.activeDate){
      const started={...e,id:randomUUID(),turn:s.turn};
      s.activeDate={eventId:started.id,location:s.location,turn:s.turn};
      accepted.push(started);handled++;continue;
     }
    }else if(e.status==='fulfilled'&&prior.activeDate&&s.activeDate&&e.reference===prior.activeDate.eventId&&prior.activeDate.turn<s.turn&&prior.activeDate.location===s.location&&reply.actionBeats.length>0&&!dateDeferred(text,e.evidence)&&!futureSceneOnly(text,e.evidence)){s.dates++;delete s.activeDate;}
    else continue;
   }
   else continue;
  }
  if(e.kind==='clue'&&(g.mode!=='romance'||prior.dates<1||prior.location!=='archive'))continue;
  if(e.kind==='concession'&&(g.mode!=='office'||e.subject!=='mutual'||!grounded||(e.status==='accepted'&&!concessionConsent(text,e))||!['accepted','offered','refused'].includes(e.status)||![...missions[g.step].terms.map(t=>t.id),'scope','owner','deadline','boundary'].includes(e.value)))continue;
  if(e.kind==='resolution'){
   if(!grounded||e.subject!=='player'||e.status!=='accepted')continue;
   if(g.mode==='office'){
    if(!missions[g.step].terms.every(t=>prior.events.some(p=>p.kind==='concession'&&p.status==='accepted'&&p.value===t.id)))continue;
    const ids=['clockout','dinner','weekend','vacation','credit','meeting','delegation','remote'];
    if(!['success','partial'].includes(e.value)||!consent(clause))continue;
    g.ending=`office-${ids[g.step]}-${e.value}`;
   }else{
    if(e.value==='leave'&&prior.relationship==='apart')g.ending='romance-2';
    else if(prior.relationship==='couple'&&prior.dates>0&&prior.location==='archive'&&prior.events.some(p=>p.kind==='clue'&&p.status==='fulfilled')){
     if(e.value==='reset'&&consent(clause))g.ending='romance-0';
     else if(e.value==='repeat'&&consent(clause))g.ending='romance-1';
     else if(e.value==='restore'&&consent(clause)&&new Set(prior.events.filter(p=>p.kind==='clue'&&p.status==='fulfilled').map(p=>p.value)).size>=2)g.ending='romance-3';
     else continue;
    }else continue;
   }
  }
  handled++;
  // Static facts and referenced commitments can be reaffirmed. Moves/scene events
  // recur legitimately: going back to a place is a new transition, not a duplicate.
  if(['detail','promise','invitation','concession','clue'].includes(e.kind)&&[...prior.events,...accepted].some(p=>sameEvent(p,e)))continue;
  accepted.push({...e,id:randomUUID(),turn:s.turn});
 }
 if(handled!==reply.events.length)throw Error('사건 제안의 근거 또는 진행 조건을 확인하지 못했습니다. 진행은 저장되지 않았습니다. 다시 시도하세요.');
 for(const beat of reply.actionBeats)accepted.push({id:randomUUID(),turn:s.turn,kind:'complication',subject:'npc',text:beat,status:'fulfilled',reference:'',evidence:'',value:'action'});
 registerCommitments(s,reply,accepted);
 s.events.push(...accepted);s.pose=reply.pose;s.emotion=reply.emotion;s.musicMood=reply.musicMood;
 g.narrative=s;
 if(g.mode==='romance')g.step=s.location==='archive'?s.events.some(e=>e.kind==='clue'&&e.status==='fulfilled')?5:4:s.dates?3:s.relationship==='confessed'||s.relationship==='couple'?2:s.relationship==='familiar'||s.relationship==='attracted'?1:0;
 return {game:g,accepted};
}
/** Explicit offline staging preview, not a simulated AI director. */
export function preview(g:Game,text:string):NarrativeReply {
 const office=g.mode==='office';
 return {line:office?'[연출 체험] 서류보다 커피가 먼저 식겠군요. 실제 자유 협상은 OpenAI 모드에서 이어집니다.':'[연출 체험] 컵 소리에도 성격이 있나 봐요. 실제 자유 대화는 OpenAI 모드에서 이어집니다.',actionBeats:[office?'박도현이 서류를 내려놓는다.':'유나가 컵 테두리를 가볍게 두드린다.'],emotion:'차분함',pose:'listen',musicMood:office?'office-groove':'cafe-warmth',events:[],recall:[],conjecture:''};
}

