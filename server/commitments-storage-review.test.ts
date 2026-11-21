import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {narrative,type NarrativeReply,type EventProposal} from './narrative.ts';
import {ProfileStore,emptyProfile} from './storage.ts';

const reply=(events:EventProposal[]=[],extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'알겠어요.',actionBeats:[],events,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],...extra});
function setup(compound=false){
 const text=compound?'제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.':'제가 유나에게 노란 리본을 가져오는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'ribbon'};
 let g=commitDialogue(start('romance'),null,text,reply([offer],{commitmentOffers:[{eventIndex:0,conditions:compound?[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]:[{performer:'player',target:'유나',action:'노란 리본을 가져오는'}]}]}));
 const id=g.narrative!.commitments![0].promiseId;
 g=commitDialogue(g,null,'좋아요.',reply([{...offer,status:'accepted',reference:id,evidence:'좋아요.'}]));
 return {g,offer,id};
}
function progress(g:DialogueGame,index:number,quote:string,source:'player'|'action'='player'){
 const c=g.narrative!.commitments![0],condition=c.conditions[index];
 return {promiseId:c.promiseId,conditionId:condition.id,performer:condition.performer,source,actionIndex:source==='action'?0:-1,eventId:'',quote};
}
const amend=(g:DialogueGame,playerQuote:string,npcQuote:string)=>{const c=g.narrative!.commitments![0];return {promiseId:c.promiseId,conditionId:c.conditions[1].id,performer:'npc' as const,playerQuote,npcQuote};};

test('recipient focus particles retain the original promised target',()=>{
 const {g,offer,id}=setup();
 for(const [text,accept] of [
  ['유나에게만 노란 리본을 건넸어요.',true],
  ['유나한테만 노란 리본을 건넸어요.',true],
  ['친구에게 노란 리본을 건넸어요.',false],
  ['친구에게만 노란 리본을 건넸어요.',false],
  ['친구한테만 노란 리본을 건넸어요.',false],
  ['유나에게는 안 주고 친구에게만 줬어요.',false],
 ] as const){
  const perform=()=>commitDialogue(g,null,text,reply([{...offer,status:'fulfilled',reference:id,evidence:text}],{commitmentProgress:[progress(g,0,text)]}));
  if(accept)assert.equal(perform().narrative!.commitments![0].status,'completed',text);else assert.throws(perform,text);
 }
 assert.equal(g.narrative!.commitments![0].status,'pending');
});

test('explicit delegation is sentence-scoped without dropping negation around a quoted fragment',()=>{
 const {g}=setup(true),npc='제가 편지를 대신 맡을게요.';
 for(const [text,quote,accept] of [
  ['편지는 대신 맡아 주세요.','편지는 대신 맡아 주세요.',true],
  ['오늘은 야근 안 할게요. 편지는 대신 맡아 주세요.','편지는 대신 맡아 주세요.',true],
  ['내일은 회사에 갈 거예요. 편지는 대신 맡아 주세요.','편지는 대신 맡아 주세요.',true],
  ['편지는 대신 맡아 주세요, 아니요 취소할게요.','편지는 대신 맡아 주세요',false],
  ['편지는 대신 맡아 주세요 라는 말은 아니에요.','편지는 대신 맡아 주세요',false],
 ] as const){
  const apply=()=>commitDialogue(g,null,text,reply([],{line:npc,commitmentAmendments:[amend(g,quote,npc)]}));
  if(accept)assert.equal(apply().narrative!.commitments![0].conditions[1].performer,'npc',text);else assert.throws(apply,text);
 }
 for(const [line,quote,accept] of [
  ['오늘은 옥상에 가지 않을게요. 제가 편지를 대신 맡을게요.',npc,true],
  ['제가 편지를 대신 맡을게요 라고 말한 건 아니에요.','제가 편지를 대신 맡을게요',false],
  ['“제가 편지를 대신 맡을게요.”라고 말하지 않았어요.',npc,false],
 ] as const){
  const text='편지는 대신 맡아 주세요.',apply=()=>commitDialogue(g,null,text,reply([],{line,commitmentAmendments:[amend(g,text,quote)]}));
  if(accept)assert.equal(apply().narrative!.commitments![0].conditions[1].performer,'npc',line);else assert.throws(apply,line);
 }
});

test('partial evidence and explicit delegation keep identities across all slots and store reopen',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'afterhours-independent-commitments-')),id='a'.repeat(48);
 try{
  let {g,offer}=setup(true);
  g=commitDialogue(g,null,'노란 리본 가져왔어요.',reply([],{commitmentProgress:[progress(g,0,'노란 리본 가져왔어요.')]}));
  const a=amend(g,'편지는 대신 맡아 주세요.','제가 편지를 대신 맡을게요.');
  g=commitDialogue(g,null,a.playerQuote,reply([],{line:a.npcQuote,commitmentAmendments:[a]}));
  const p=emptyProfile();p.game=g;p.slots=[structuredClone(g),structuredClone(g),structuredClone(g)];
  await new ProfileStore(directory).save(id,p);
  const original=await readFile(path.join(directory,id+'.json'));
  const loaded=(await new ProfileStore(directory).load(id)).profile;
  assert.deepEqual(await readFile(path.join(directory,id+'.json')),original);
  for(const saved of [loaded.game,...loaded.slots])assert.deepEqual(saved!.narrative!.commitments,g.narrative!.commitments);
  g=loaded.game!;const c=g.narrative!.commitments![0],condition=c.conditions[1];
  assert.equal(condition.originalPerformer,'player');assert.equal(condition.performer,'npc');assert.equal(condition.target,'유나');
  assert.equal(c.originalText,offer.text);assert.equal(c.amendments[0].previousPerformer,'player');
  assert.throws(()=>commitDialogue(g,null,'편지를 접었어요.',reply([],{commitmentProgress:[{...progress(g,1,'편지를 접었어요.'),performer:'player'}]})));
  const beat='유나가 편지를 접는다.';
  const complete=commitDialogue(g,null,'고마워요.',reply([{...offer,status:'fulfilled',reference:c.promiseId,evidence:'고마워요.'}],{actionBeats:[beat],commitmentProgress:[progress(g,1,beat,'action')]}));
  assert.equal(complete.narrative!.commitments![0].status,'completed');
 }finally{
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));
  await rm(directory,{recursive:true,force:true});
 }
});

test('missing legacy condition sidecar stays evidence-insufficient and read-only',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'afterhours-independent-legacy-')),id='b'.repeat(48);
 try{
  let {g,offer,id:promiseId}=setup();const text='유나에게 노란 리본을 건넸어요.';
  g=commitDialogue(g,null,text,reply([{...offer,status:'fulfilled',reference:promiseId,evidence:text}],{commitmentProgress:[progress(g,0,text)]}));
  // Migration-only fixture: represent the old format without inventing condition evidence.
  delete g.narrative!.commitments;g.narrative!.events=g.narrative!.events.filter(e=>e.value!=='condition-evidence');
  const p=emptyProfile();p.game=g;await new ProfileStore(directory).save(id,p);
  const before=await readFile(path.join(directory,id+'.json'));
  const loaded=(await new ProfileStore(directory).load(id)).profile.game!;
  const assessed=narrative(loaded);
  assert.deepEqual(await readFile(path.join(directory,id+'.json')),before);
  assert.deepEqual(loaded,g);assert.equal(assessed.commitments,undefined);assert.equal(assessed.legacyCommitmentAssessments![0].result,'insufficient');
  const next=commitDialogue(loaded,null,'오늘 카페가 조용하네요.',reply());
  assert.equal(next.ending,null);assert.equal(next.narrative!.dates,0);assert.equal(next.narrative!.relationship,'strangers');
  assert.equal(next.narrative!.commitments?.length??0,0);
 }finally{
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));
  await rm(directory,{recursive:true,force:true});
 }
});

