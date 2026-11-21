import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import type {ConditionInput} from './commitments.ts';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {type NarrativeReply,type EventProposal} from './narrative.ts';
import {contractVersion,type RevisionInput} from './commitment-revisions.ts';
import {emptyProfile,ProfileStore,validateProfile} from './storage.ts';
const trace:unknown[]=[];
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
function turn(g:DialogueGame,input:string,response:NarrativeReply){
 try{const after=commitDialogue(g,null,input,response);trace.push({input,response,before:g,after,result:'committed'});return after;}
 catch(error){trace.push({input,response,before:g,after:g,result:'rejected',reason:String(error)});throw error;}
}
function setup(mode:'office'|'romance'='romance'){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=turn(start(mode),text,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 g=turn(g,'좋아요.',reply({events:[{...offer,status:'accepted',reference:g.narrative!.commitments![0].promiseId,evidence:'좋아요.'}]}));
 return {g,offer};
}
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
function perform(g:DialogueGame,index:number,text:string,extra:Partial<NarrativeReply>={}){
 const c=contract(g),condition=c.conditions[index];
 return turn(g,text,reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:condition.id,performer:condition.performer,source:'player',quote:text,eventId:'',actionIndex:-1}],...extra}));
}
function revision(g:DialogueGame,index=1,replacement:ConditionInput={performer:'player' as const,target:'유나',action:'그림을 그리는'}):RevisionInput{
 const c=contract(g),old=c.conditions[index];
 const quote=`${old.action} 대신 ${replacement.action} 것으로 바꾸는 데 동의해요.`;
 return {promiseId:c.promiseId,conditionId:old.id,expectedVersion:contractVersion(c),replacement,playerQuote:quote,npcQuote:`좋아요. ${quote}`};
}
const revise=(g:DialogueGame,a=revision(g))=>turn(g,a.playerQuote,reply({line:a.npcQuote,commitmentRevisions:[a]}));

test('normal ribbon + letter to drawing revision retains ribbon, restores all slots, and completes only with drawing',async()=>{
 let {g,offer}=setup();g=perform(g,0,'노란 리본 가져왔어요.');const before=structuredClone(contract(g));
 g=revise(g);assert.equal(contract(g).promiseId,before.promiseId);assert.equal(contract(g).status,'partial');
 assert.deepEqual(contract(g).conditions[0],before.conditions[0]);assert.equal(contract(g).conditions[1].action,'그림을 그리는');
 assert.equal(contract(g).revisions![0].applicability[0].decision,'retained');
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-revision-'));
 try{
  const p=emptyProfile();p.game=g;p.slots=[g,structuredClone(g),structuredClone(g)];await new ProfileStore(dir).save('b'.repeat(48),p);
  const restored=(await new ProfileStore(dir).load('b'.repeat(48))).profile;
  for(const saved of [restored.game,...restored.slots]){assert.deepEqual(saved!.narrative!.commitments,g.narrative!.commitments);const finished=perform(saved!,1,'그림을 그렸어요.',{events:[{...offer,reference:before.promiseId,status:'fulfilled',evidence:'그림을 그렸어요.'}]});assert.equal(contract(finished).status,'completed');validateProfile({...p,game:finished});}
 }finally{await rm(dir,{recursive:true,force:true});}
 assert.throws(()=>perform(g,1,'편지를 접었어요.'));
});

test('changed performed condition keeps historical evidence but requires new performance',()=>{
 let {g}=setup();g=perform(g,1,'편지를 접었어요.');const oldEvidence=contract(g).conditions[1].evidenceIds[0];
 g=revise(g);const c=contract(g);assert.equal(c.status,'pending');assert.equal(c.conditions[1].evidenceIds.length,0);
 assert.ok(g.narrative!.events.some(e=>e.id===oldEvidence));assert.equal(c.revisions![0].applicability[0].decision,'historical');
 assert.throws(()=>turn(g,'좋아요.',reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,performer:'player',source:'event',eventId:oldEvidence,actionIndex:-1,quote:'편지를 접었어요.'}]})));
 g=perform(g,1,'그림을 그렸어요.');g=perform(g,0,'노란 리본 가져왔어요.');assert.equal(contract(g).status,'completed');
});

test('declined, ambiguous, unilateral, wrong reference and stale revisions are atomic',()=>{
 const {g,offer}=setup(),a=revision(g),snapshot=structuredClone(g);
 for(const input of ['잘 모르겠어요.',a.playerQuote+' 하지만 동의하지 않아요.',a.playerQuote+'?'])assert.throws(()=>turn(g,input,reply({line:a.npcQuote,commitmentRevisions:[a]})));
 for(const bad of [{...a,expectedVersion:0},{...a,expectedVersion:2},{...a,conditionId:'missing'},{...a,npcQuote:'생각해 볼게요.'},{...a,playerQuote:a.playerQuote.replace('동의해요','생각해 볼게요')}])assert.throws(()=>turn(g,bad.playerQuote,reply({line:bad.npcQuote,commitmentRevisions:[bad]})));
 assert.deepEqual(g,snapshot);
 const declined=turn(g,'변경은 거절해요. 편지는 그대로 접을게요.',reply({line:'알겠어요. 원래 약속을 유지할게요.'}));
 assert.deepEqual(contract(declined),contract(g));assert.equal(contract(perform(declined,1,'편지를 접었어요.')).status,'partial');
 const changed=revise(g);assert.throws(()=>revise(changed,a));
 assert.throws(()=>turn(g,a.playerQuote,reply({line:a.npcQuote,events:[{...offer,status:'accepted',reference:a.promiseId,text:'그림으로 바꾸었다.',evidence:a.playerQuote}]})));
});

test('revision acceptance cannot serve as same-turn performance, remove conditions, or evade bounds',()=>{
 const {g}=setup(),a=revision(g),c=contract(g);
 assert.throws(()=>turn(g,a.playerQuote,reply({line:a.npcQuote,commitmentRevisions:[a],commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,performer:'player',source:'player',quote:a.playerQuote,actionIndex:-1,eventId:''}]})));
 for(const action of ['그림','그림을','그림을 아주','그림을 그리는 고 편지를 접는']){const bad=revision(g,1,{performer:'player',target:'유나',action});assert.throws(()=>revise(g,bad));}
 let current=g;for(let i=0;i<32;i++)current=revise(current,revision(current,1,{performer:'player',target:'유나',action:i%2?'편지를 접는':'그림을 그리는'}));
 assert.equal(contract(current).conditions.length,2);assert.throws(()=>revise(current));validateProfile({...emptyProfile(),game:current});
});

test('recipient revision invalidates old evidence and preserves precise recipient control',()=>{
 let {g}=setup();g=perform(g,0,'노란 리본을 유나에게 가져왔어요.');
 const a=revision(g,0,{performer:'player',target:'친구',action:'노란 리본을 가져오고'});
 a.playerQuote='노란 리본을 가져오고 조건의 대상을 유나 대신 친구로 바꾸는 데 동의해요.';a.npcQuote=`좋아요. ${a.playerQuote}`;
 g=revise(g,a);assert.equal(contract(g).conditions[0].evidenceIds.length,0);
 assert.throws(()=>perform(g,0,'노란 리본을 유나에게 가져왔어요.'));
 g=perform(g,0,'노란 리본을 친구에게 가져왔어요.');validateProfile({...emptyProfile(),game:g});
});

test('performer changes require explicit ownership and later NPC action, with delegation/version interleaving',()=>{
 let {g}=setup();const a:RevisionInput={...revision(g),replacement:{performer:'npc',target:'유나',action:'그림을 그리는'}};
 a.playerQuote='편지를 접는 대신 유나가 그림을 그리는 것으로 바꾸는 데 동의해요.';a.npcQuote=`좋아요. ${a.playerQuote}`;
 g=revise(g,a);assert.equal(contract(g).status,'pending');assert.throws(()=>perform(g,1,'그림을 그렸어요.'));
 const c=contract(g),beat='유나가 그림을 그린다.';
 g=turn(g,'고마워요.',reply({actionBeats:[beat],commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,performer:'npc',source:'action',actionIndex:0,eventId:'',quote:beat}]}));
 validateProfile({...emptyProfile(),game:g});assert.equal(contract(g).status,'partial');
 let next=setup().g;const old=contract(next),stale=revision(next);
 const delegation={promiseId:old.promiseId,conditionId:old.conditions[1].id,performer:'npc' as const,playerQuote:'편지는 대신 맡아 주세요.',npcQuote:'제가 편지를 대신 맡을게요.'};
 next=turn(next,delegation.playerQuote,reply({line:delegation.npcQuote,commitmentAmendments:[delegation]}));
 assert.throws(()=>revise(next,stale));
 next=revise(next,revision(next,1,{performer:'npc',target:'유나',action:'그림을 그리는'}));
 const back={...delegation,performer:'player' as const,playerQuote:'제가 그림을 대신 맡을게요.',npcQuote:'그림은 대신 맡아 주세요.'};
 next=turn(next,back.playerQuote,reply({line:back.npcQuote,commitmentAmendments:[back]}));
 assert.equal(contract(next).revisionVersion,4);validateProfile({...emptyProfile(),game:next});
});

test('office performer naming is grounded in both agreement quotes',()=>{
 const {g}=setup('office');const a=revision(g);a.replacement.performer='npc';a.playerQuote='편지를 접는 대신 박도현이 그림을 그리는 것으로 바꾸는 데 동의해요.';a.npcQuote=`좋아요. ${a.playerQuote}`;assert.equal(contract(revise(g,a)).conditions[1].performer,'npc');
});

test('malformed revisions and historical-evidence replay fail storage validation; legacy read is idempotent',()=>{
 const {g}=setup(),legacy=JSON.stringify(g);validateProfile({...emptyProfile(),game:g});assert.equal(JSON.stringify(g),legacy);
 const changed=revise(perform(g,1,'편지를 접었어요.'));
 for(const mutate of [
  (c:ReturnType<typeof contract>)=>{c.revisionVersion=9;},
  (c:ReturnType<typeof contract>)=>{c.revisions![0].before.action='가짜';},
  (c:ReturnType<typeof contract>)=>{c.revisions![0].applicability=[];},
  (c:ReturnType<typeof contract>)=>{c.conditions[1].evidenceIds=[c.revisions![0].before.evidenceIds[0]];c.status='partial';},
  (c:ReturnType<typeof contract>)=>{c.revisions![0].conditionId='missing';}
 ]){const bad=structuredClone(changed);mutate(contract(bad));assert.throws(()=>validateProfile({...emptyProfile(),game:bad}));}
 validateProfile({...emptyProfile(),game:changed});
});

after(()=>{const files=['server/commitment-revisions.ts','server/commitment-revisions.test.ts','server/commitments.ts','server/narrative.ts','server/provider.ts','server/storage.ts'];mkdirSync('docs/v2-content-revision-run',{recursive:true});writeFileSync('docs/v2-content-revision-run/semantic-trace.json',JSON.stringify({at:new Date().toISOString(),source:'authored mock responses, normal start and turns; no paid calls',hashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),trace},null,2));});
