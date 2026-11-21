import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
import {emptyProfile,ProfileStore,validateProfile} from './storage.ts';
const trace:unknown[]=[];
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
function turn(g:DialogueGame,input:string,response:NarrativeReply){const next=commitDialogue(g,null,input,response);trace.push({input,response,before:g,after:next});return next;}
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=turn(start('romance'),text,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 g=turn(g,'좋아요.',reply({events:[{...offer,status:'accepted',reference:contract(g).promiseId,evidence:'좋아요.'}]}));return perform(g,0,'노란 리본을 유나에게 가져왔어요.');
}
function perform(g:DialogueGame,index:number,text:string){const c=contract(g);return turn(g,text,reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[index].id,performer:'player',source:'player',quote:text,eventId:'',actionIndex:-1}]}));}
const agreement='편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.';
function propose(g:DialogueGame){const c=contract(g),text='편지를 접는 대신 그림을 그리는 것으로 바꾸면 어떨까요?';return turn(g,text,reply({revisionProposals:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player',target:'유나',action:'그림을 그리는'},proposer:'player',quote:text}]}));}
function respond(g:DialogueGame,text:string,npc?:string){const id=g.narrative!.revisionNegotiations![0].id;return turn(g,text,reply({line:npc??'원래 약속은 그대로 둘게요.',revisionResponses:[{proposalId:id,actor:'player',quote:text},...(npc?[{proposalId:id,actor:'npc' as const,quote:npc}]:[])]}));}
async function restore(g:DialogueGame){const dir=await mkdtemp(path.join(tmpdir(),'afterhours-negotiation-'));try{
 const p={...emptyProfile(),game:g,slots:[g,g,g]};await new ProfileStore(dir).save('d'.repeat(48),p);const restored=(await new ProfileStore(dir).load('d'.repeat(48))).profile;
 for(const saved of [restored.game,...restored.slots])assert.deepEqual(saved!.narrative,g.narrative);
 trace.push({boundary:'automatic and all three slot payloads, new store disk reload',before:g,after:restored});return restored.game!;
}finally{await rm(dir,{recursive:true,force:true});}}
test('proposal, refusal and ambiguity restore independently; refusal still permits original performance',async()=>{
 const original=setup(),pending=await restore(propose(original));assert.deepEqual(contract(pending),contract(original));
 const refused=await restore(respond(pending,'변경은 거절해요. 편지는 그대로 접을게요.'));
 assert.equal(refused.narrative!.revisionNegotiations![0].status,'refused');assert.deepEqual(contract(refused),contract(original));
 assert.equal(contract(perform(refused,1,'편지를 접었어요.')).status,'completed');
 const ambiguous=await restore(respond(pending,'잘 모르겠어요.'));
 assert.equal(ambiguous.narrative!.revisionNegotiations![0].status,'pending');assert.equal(ambiguous.narrative!.revisionNegotiations![0].responses[0].interpretation,'ambiguous');assert.deepEqual(contract(ambiguous),contract(original));
});
test('agreement and application are separate; successful change retains ribbon and requires new drawing',async()=>{
 const pending=propose(setup()),changed=await restore(respond(pending,agreement,agreement));
 const p=changed.narrative!.revisionNegotiations![0];assert.equal(p.status,'applied');assert.equal(p.attempts[0].result,'applied');
 assert.equal(contract(changed).revisionVersion,2);assert.equal(contract(changed).status,'partial');assert.equal(contract(changed).conditions[1].evidenceIds.length,0);
 assert.deepEqual(contract(changed).conditions[0],contract(pending).conditions[0]);
 const completed=await restore(perform(changed,1,'그림을 그렸어요.'));assert.equal(contract(completed).status,'completed');
 const failed=await restore(respond(pending,'좋아요.','좋아요.'));
 const attempt=failed.narrative!.revisionNegotiations![0];assert.equal(attempt.status,'pending');assert.ok(attempt.responses.every(r=>r.interpretation==='accepted'));assert.equal(attempt.attempts[0].result,'not-applied');assert.deepEqual(contract(failed),contract(pending));
 assert.equal(failed.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='accepted').length,pending.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='accepted').length);
});
test('actual storage write failure leaves last committed negotiation unchanged',async()=>{
 const pending=propose(setup()),changed=respond(pending,agreement,agreement),dir=await mkdtemp(path.join(tmpdir(),'afterhours-write-failure-'));
 try{const store=new ProfileStore(dir),id='e'.repeat(48);await store.save(id,{...emptyProfile(),game:pending});const blocker=path.join(dir,'blocked');await writeFile(blocker,'file prevents directory creation');
  await assert.rejects(()=>new ProfileStore(blocker).save(id,{...emptyProfile(),game:changed}));
  assert.deepEqual((await new ProfileStore(dir).load(id)).profile.game,pending);
  trace.push({boundary:'actual filesystem failure at separate destination',lastCommitted:pending,unsavedAttempt:changed,result:'not persisted; consent/application in this attempt is not saved history'});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('interpretation and obligation matching remain distinct after restore without nonperformance events',async()=>{
 const g=setup();
 for(const [text,meaning,matching] of [
  ['편지를 접었어요.','performance','match'],['편지를 접는 데 동의해요.','acceptance','mismatch'],['친구가 편지를 접었어요.','performance','mismatch'],['편지를 친구에게 접었어요.','performance','mismatch'],
  ['편지를 아직 접지 않았어요.','explicit-nonperformance','mismatch'],['편지를 접을게요.','future','mismatch'],['편지를 정성껏 마무리했어요.','uninterpreted','unresolved'],
 ] as const){
  const next=await restore(turn(g,text,reply()));const diagnostic=next.narrative!.performanceInterpretations!.at(-1)!;
  assert.equal(diagnostic.meaning,meaning,text);assert.equal(diagnostic.matching,matching,text);assert.deepEqual(next.narrative!.events,g.narrative!.events);assert.deepEqual(contract(next),contract(g));
  trace.push({case:'interpretation contrast',text,reviewerExpectation:text.includes('마무리')?'possibly completed folding; parser does not establish it':meaning,diagnostic});
 }
});
test('late proposal response cannot resurrect an older contract; malformed lifecycle references reject restoration',()=>{
 const pending=propose(setup()),c=contract(pending);
 const advanced=turn(pending,agreement,reply({line:agreement,commitmentRevisions:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player',target:'유나',action:'그림을 그리는'},playerQuote:agreement,npcQuote:agreement}]}));
 const stale=respond(advanced,agreement,agreement);assert.deepEqual(contract(stale),contract(advanced));assert.equal(stale.narrative!.revisionNegotiations![0].attempts[0].result,'not-applied');validateProfile({...emptyProfile(),game:stale});
 const applied=respond(pending,agreement,agreement);
 for(const mutate of [
  (g:DialogueGame)=>{g.narrative!.revisionNegotiations![0].attempts[0].revisionId='missing';},
  (g:DialogueGame)=>{g.narrative!.revisionNegotiations![0].responses[0].quote='가짜 동의';},
  (g:DialogueGame)=>{g.narrative!.revisionNegotiations![0].replacement.action='편지를 접는';},
 ]){const bad=structuredClone(applied);mutate(bad);assert.throws(()=>validateProfile({...emptyProfile(),game:bad}));}
});
test('response and diagnostic bounds reject atomically instead of truncating history',()=>{
 let pending=propose(setup());for(let i=0;i<8;i++)pending=respond(pending,'잘 모르겠어요.');
 validateProfile({...emptyProfile(),game:pending});const before=structuredClone(pending);assert.throws(()=>respond(pending,'잘 모르겠어요.'));assert.deepEqual(pending,before);
 let g=setup();while((g.narrative!.performanceInterpretations?.length??0)<64)g=turn(g,'편지를 정성껏 마무리했어요.',reply());
 validateProfile({...emptyProfile(),game:g});const snapshot=structuredClone(g);assert.throws(()=>turn(g,'편지를 정성껏 마무리했어요.',reply()));assert.deepEqual(g,snapshot);
});
test('both refusal replies in one turn stay proposal-scoped and duplicate rows do not create transitions',()=>{
 const g=propose(setup()),id=g.narrative!.revisionNegotiations![0].id,text='변경은 거절해요.',line='변경에 동의하지 않아요.';
 const response={proposalId:id,actor:'player' as const,quote:text};
 const refused=turn(g,text,reply({line,revisionResponses:[response,response,{proposalId:id,actor:'npc',quote:line}]}));
 assert.equal(refused.narrative!.revisionNegotiations![0].responses.length,2);assert.equal(refused.narrative!.revisionNegotiations![0].status,'refused');assert.deepEqual(contract(refused),contract(g));validateProfile({...emptyProfile(),game:refused});
});
test('a model cannot turn a change refusal into refusal of the original promise',()=>{
 const g=propose(setup()),p=g.narrative!.revisionNegotiations![0],origin=g.narrative!.events.find(e=>e.id===p.promiseId)!,text='변경은 거절해요. 편지는 그대로 접을게요.';
 const refused=turn(g,text,reply({line:'변경만 거절한 것으로 남길게요.',revisionResponses:[{proposalId:p.id,actor:'player',quote:text}],events:[{...origin,status:'refused' as const,reference:origin.id,evidence:'변경은 거절해요.'}].map(({id,turn,...event})=>event)}));
 assert.equal(refused.narrative!.revisionNegotiations![0].status,'refused');
 assert.ok(!refused.narrative!.events.some(e=>e.kind==='promise'&&e.status==='refused'));
 assert.equal(contract(perform(refused,1,'편지를 접었어요.')).status,'completed');
 const withdrawal='원래 약속은 철회해요.';
 const withdrawn=turn(g,withdrawal,reply({events:[{...origin,status:'refused' as const,reference:origin.id,evidence:withdrawal}].map(({id,turn,...event})=>event)}));
 assert.ok(withdrawn.narrative!.events.some(e=>e.kind==='promise'&&e.status==='refused'));assert.throws(()=>perform(withdrawn,1,'편지를 접었어요.'));

});
after(()=>{mkdirSync('docs/v2-contract-followup',{recursive:true});const files=['server/commitments.ts','server/evidence-applicability.ts','server/performance-interpretation.ts','server/revision-negotiation.ts','server/narrative.ts','server/provider.ts','server/storage.ts'];writeFileSync('docs/v2-contract-followup/normal-turn-trace.json',JSON.stringify({source:'authored mock responses, normal new-game turns; no paid calls',hashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),trace},null,2));});

