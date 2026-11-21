import {test,after} from 'node:test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './game.ts';
import {narrative,type NarrativeReply,type EventProposal} from './narrative.ts';
import {ProfileStore,emptyProfile,validateProfile} from './storage.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
const trace:unknown[]=[];
const turn=(g:DialogueGame,text:string,r:NarrativeReply)=>{
 const before=structuredClone(g.narrative??null);
 try{const game=commitDialogue(g,null,text,r);trace.push({input:text,reply:r,before,after:structuredClone(game.narrative),result:'committed'});return {game};}
 catch(error){trace.push({input:text,reply:r,before,after:structuredClone(g.narrative??null),result:'rejected',reason:String(error)});throw error;}
};
after(()=>{
 const files=['server/commitments.ts','server/commitments.test.ts','server/narrative.ts','server/provider.ts','server/storage.ts'];
 mkdirSync('docs/v2-commitment-state',{recursive:true});
 writeFileSync('docs/v2-commitment-state/semantic-trace.json',JSON.stringify({executedAt:new Date().toISOString(),source:'mock authored replies; normal start/commitDialogue; no paid calls',hashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),trace},null,2));
});
const reply=(events:EventProposal[]=[],extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'알겠어요.',actionBeats:[],events,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',...extra});
function setup(joint=false){
 const text=joint?'우리 각자 노란 리본을 가져오는 약속을 해요.':'제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:joint?'mutual':'player',text,status:'offered',reference:'',evidence:text,value:'ribbon'};
 let g=turn(start('romance'),text,reply([offer],{commitmentOffers:[{eventIndex:0,conditions:joint?[{performer:'player',target:'서로',action:'노란 리본을 가져오는'},{performer:'npc',target:'서로',action:'노란 리본을 가져오는'}]:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]})).game;
 const id=g.narrative!.commitments![0].promiseId;
 g=turn(g,'좋아요.',reply([{...offer,status:'accepted',reference:id,evidence:'좋아요.'}])).game;
 return {g,offer,id};
}
function progress(g:ReturnType<typeof start>,index:number,quote:string,source:'player'|'action'='player'){
 const c=g.narrative!.commitments![0],condition=c.conditions[index];
 return {promiseId:c.promiseId,conditionId:condition.id,performer:condition.performer,source,actionIndex:source==='action'?0:-1,eventId:'',quote};
}
test('joint promise remains partial when NPC explicitly has not performed; both performers complete',()=>{
 let {g,offer,id}=setup(true);
 g=turn(g,'제 노란 리본 가져왔어요.',reply([],{line:'저는 아직 리본을 준비하지 못했어요.',commitmentProgress:[progress(g,0,'제 노란 리본 가져왔어요.')]})).game;
 assert.equal(g.narrative!.commitments![0].status,'partial');
 assert.equal(g.narrative!.commitments![0].conditions[1].evidenceIds.length,0);
 const completion={...offer,status:'fulfilled' as const,reference:id,evidence:'제 노란 리본 가져왔어요.'};
 assert.throws(()=>turn(g,'제 노란 리본 가져왔어요.',reply([completion],{line:'저는 아직 리본을 준비하지 못했어요.'})));
 const beat='유나가 노란 리본을 건네준다.';
 g=turn(g,'제 노란 리본 가져왔어요.',reply([completion],{actionBeats:[beat],commitmentProgress:[progress(g,1,beat,'action')]})).game;
 assert.equal(g.narrative!.commitments![0].status,'completed');
 assert.equal(g.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
});
test('normal partial turn survives automatic and three manual saves and store restart; next condition completes original',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-conditions-'));
 try{
  let {g,offer,id}=setup();
  g=turn(g,'노란 리본 가져왔어요.',reply([],{commitmentProgress:[progress(g,0,'노란 리본 가져왔어요.')]})).game;
  const p=emptyProfile();p.game=g as DialogueGame;p.slots=[structuredClone(p.game),structuredClone(p.game),structuredClone(p.game)];
  await new ProfileStore(dir).save('a'.repeat(48),p);
  const loaded=(await new ProfileStore(dir).load('a'.repeat(48))).profile;
  for(const saved of [loaded.game,...loaded.slots])assert.deepEqual(saved!.narrative!.commitments,g.narrative!.commitments);
  g=loaded.game!;
  const completion={...offer,status:'fulfilled' as const,reference:id,evidence:'편지를 접었어요.'};
  const request=reply([completion],{commitmentProgress:[progress(g,1,'편지를 접었어요.')]});
  const result=turn(g,'편지를 접었어요.',request).game;
  assert.equal(result.narrative!.commitments![0].status,'completed');
  assert.equal(result.narrative!.commitments![0].originalText,offer.text);
  const again=turn(result,'편지를 접었어요.',request).game;
  assert.equal(again.narrative!.events.filter(e=>e.value==='condition-evidence').length,2);
  assert.equal(again.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid IDs, performer, future, unrelated action and quoted denial cannot add evidence',()=>{
 const {g}=setup(true),p=progress(g,0,'노란 리본을 가져왔어요.');
 for(const change of [{conditionId:'unknown'},{performer:'npc' as const},{promiseId:'unknown'}])assert.throws(()=>turn(g,p.quote,reply([],{commitmentProgress:[{...p,...change}]})));
 for(const input of ['노란 리본을 가져올게요.','노란 리본을 봤어요.','친구가 노란 리본을 가져왔어요.','노란 리본을 가져왔어요?'])assert.throws(()=>turn(g,input,reply([],{commitmentProgress:[{...p,quote:input}]})));
 assert.equal(g.narrative!.commitments![0].conditions[0].evidenceIds.length,0);
});
test('delegation requires both explicit grounds and preserves previous performer',()=>{
 let {g}=setup();const c=g.narrative!.commitments![0];
 const a={promiseId:c.promiseId,conditionId:c.conditions[1].id,performer:'npc' as const,playerQuote:'편지는 대신 맡아 주세요.',npcQuote:'제가 편지를 대신 맡을게요.'};
 assert.throws(()=>turn(g,'잘 모르겠어요.',reply([],{line:a.npcQuote,commitmentAmendments:[a]})));
 g=turn(g,a.playerQuote,reply([],{line:a.npcQuote,commitmentAmendments:[a]})).game;
 assert.equal(g.narrative!.commitments![0].amendments[0].previousPerformer,'player');
 const beat='유나가 편지를 접는다.';
 g=turn(g,'고마워요.',reply([],{actionBeats:[beat],commitmentProgress:[progress(g,1,beat,'action')]})).game;
 assert.equal(g.narrative!.commitments![0].status,'partial');
});
test('storage refuses fabricated completion and dangling evidence; refusal never promotes completion',()=>{
 const {g,offer,id}=setup();const p=emptyProfile();p.game=structuredClone(g);
 p.game.narrative!.commitments![0].status='completed';assert.throws(()=>validateProfile(p));
 p.game=structuredClone(g);p.game.narrative!.commitments![0].conditions[0].evidenceIds=['fabricated'];assert.throws(()=>validateProfile(p));
 const refused=turn(g,'그 약속은 거절할게요.',reply([{...offer,status:'refused',reference:g.narrative!.commitments![0].acceptanceIds[0],evidence:'그 약속은 거절할게요.'}])).game;
 assert.throws(()=>turn(refused,'노란 리본 가져왔어요.',reply([],{commitmentProgress:[progress(refused,0,'노란 리본 가져왔어요.')]})));
 assert.equal(refused.narrative!.commitments![0].status,'pending');
});
test('legacy completion remains original evidence-insufficient history, with no invented performance',()=>{
 // A legacy fixture is deliberately used only for migration, never to prove new completion.
 const {g,offer,id}=setup();delete g.narrative!.commitments;
 g.narrative!.events.push({...offer,id:'legacy-complete',reference:id,status:'fulfilled',turn:g.narrative!.turn});
 const original=structuredClone(g),read=narrative(g);
 assert.deepEqual(g,original);
 assert.deepEqual(read.events,original.narrative!.events);
 assert.equal(read.legacyCommitmentAssessments![0].result,'insufficient');
 assert.equal(read.commitments,undefined);
});
test('acceptance alone, wrong recipient, and NPC denial do not fulfill a condition',()=>{
 const {g}=setup(true);assert.equal(g.narrative!.commitments![0].status,'pending');
 const wrong='친구에게 노란 리본을 건네줬어요.';
 assert.throws(()=>turn(g,wrong,reply([],{commitmentProgress:[progress(g,0,wrong)]})));
 const denial='저는 아직 노란 리본을 가져오지 못했어요.';
 assert.throws(()=>turn(g,'알겠어요.',reply([],{line:denial,commitmentProgress:[{...progress(g,1,denial),source:'line'}]})));
});
