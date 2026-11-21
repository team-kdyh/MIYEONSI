import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {commitDialogue} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
import {emptyProfile,validateProfile} from './storage.ts';
const reply=(events:EventProposal[]=[],extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],events,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',...extra});
function setup(){
 const original='제가 노란 리본을 가져오는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text:original,status:'offered',reference:'',evidence:original,value:'ribbon'};
 const g=commitDialogue(start('romance'),null,original,reply([offer],{commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오는'}]}]}));
 const c=g.narrative!.commitments![0];
 const acceptance:EventProposal={...offer,status:'accepted',reference:c.promiseId,evidence:'좋아요.'};
 const progress={promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player' as const,source:'player' as const,actionIndex:-1,eventId:'',quote:'노란 리본 가져왔어요.'};
 return {g,c,offer,acceptance,progress};
}
test('acceptance plus actual performance commits atomically and has durable acceptance evidence',()=>{
 const {g,c,offer,acceptance,progress}=setup();
 const result=commitDialogue(g,null,'좋아요. 노란 리본 가져왔어요.',reply([acceptance,{...offer,status:'fulfilled',reference:c.promiseId,evidence:progress.quote}],{commitmentProgress:[progress]}));
 const contract=result.narrative!.commitments![0];
 assert.equal(contract.status,'completed');assert.equal(contract.acceptanceIds.length,1);
 assert.ok(result.narrative!.events.some(e=>e.id===contract.acceptanceIds[0]&&e.status==='accepted'));
 const profile=emptyProfile();profile.game=result;assert.doesNotThrow(()=>validateProfile(profile));
 assert.equal(g.narrative!.commitments![0].status,'pending');
});
test('progress without prior or validated same-turn acceptance cannot commit',()=>{
 const {g,progress,acceptance}=setup();
 for(const events of [[],[{...acceptance,evidence:'존재하지 않는 동의'}],[{...acceptance,reference:'missing'}]]){
  assert.throws(()=>commitDialogue(g,null,'노란 리본 가져왔어요.',reply(events,{commitmentProgress:[progress]})));
 }
 assert.equal(g.narrative!.commitments![0].conditions[0].evidenceIds.length,0);
});
test('same-turn acceptance cannot conceal explicit refusal or non-performance',()=>{
 const {g,progress,acceptance}=setup();
 assert.throws(()=>commitDialogue(g,null,'좋아요는 아직 못 하겠어요. 노란 리본 가져왔어요.',reply([{...acceptance,evidence:'좋아요'}],{commitmentProgress:[progress]})));
 assert.throws(()=>commitDialogue(g,null,'좋아요. 리본은 아직 안 가져왔어요.',reply([acceptance],{commitmentProgress:[{...progress,quote:'리본은 아직 안 가져왔어요.'}]})));
 assert.throws(()=>commitDialogue(g,null,'좋아요. 노란 리본 가져왔어요. 약속은 거절할게요.',reply([acceptance,{...acceptance,status:'refused',evidence:'약속은 거절할게요.'}],{commitmentProgress:[progress]})));
});
