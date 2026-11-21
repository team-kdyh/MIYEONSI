import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {commitDialogue} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=commitDialogue(start('romance'),null,text,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 const c=g.narrative!.commitments![0];
 g=commitDialogue(g,null,'좋아요.',reply({events:[{...offer,status:'accepted',reference:c.promiseId,evidence:'좋아요.'}]}));
 g=commitDialogue(g,null,'노란 리본 가져왔어요.',reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player',source:'player',actionIndex:-1,eventId:'',quote:'노란 리본 가져왔어요.'}]}));
 const playerQuote='편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.',npcQuote='좋아요. '+playerQuote;
 const revision={promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player' as const,target:'유나',action:'그림을 그리는'},playerQuote,npcQuote};
 return {g,revision,playerQuote,npcQuote};
}
test('either speaker retracting a quoted revision leaves the original partial contract untouched',()=>{
 const {g,revision,playerQuote,npcQuote}=setup(),before=structuredClone(g);
 const withdrawals=[' 아니, 방금 말은 취소할게요. 원래대로 할게요.',' 아니요. 바꾸지 말아 주세요.',' 아니, 취소할게요.',' 방금 한 동의를 철회해요.'];
 for(const tail of withdrawals)for(const speaker of ['player','npc']){
  assert.throws(()=>commitDialogue(g,null,playerQuote+(speaker==='player'?tail:''),reply({line:npcQuote+(speaker==='npc'?tail:''),commitmentRevisions:[revision]})));
  assert.deepEqual(g,before);
 }
});
test('unrelated refusal or cancellation does not retract a mutually agreed revision',()=>{
 const {g,revision,playerQuote,npcQuote}=setup();
 for(const tail of ['',' 커피는 안 마실게요.',' 잡지 구독은 취소할게요.']){
  const after=commitDialogue(g,null,playerQuote+tail,reply({line:npcQuote,commitmentRevisions:[revision]}));
  const old=g.narrative!.commitments![0],changed=after.narrative!.commitments![0];
  assert.equal(changed.conditions[1].action,'그림을 그리는');assert.equal(changed.status,'partial');
  assert.deepEqual(changed.conditions[0],old.conditions[0]);assert.equal(changed.conditions[1].evidenceIds.length,0);
 }
});
