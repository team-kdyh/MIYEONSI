import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {emptyProfile,validateProfile} from './storage.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
const turn=(g:DialogueGame,text:string,r:NarrativeReply)=>commitDialogue(g,null,text,r);
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const event:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=turn(start('romance'),text,reply({events:[event],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 g=turn(g,'좋아요.',reply({events:[{...event,status:'accepted',reference:contract(g).promiseId,evidence:'좋아요.'}]}));
 const proposal='편지를 접는 대신 그림을 그리는 것으로 바꾸면 어떨까요?',c=contract(g);
 return turn(g,proposal,reply({revisionProposals:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player',target:'유나',action:'그림을 그리는'},proposer:'player',quote:proposal}]}));
}
const agreement='편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.';
function response(g:DialogueGame,tail:string,speaker:'player'|'npc'){
 const id=g.narrative!.revisionNegotiations![0].id;
 return turn(g,agreement+(speaker==='player'?tail:''),reply({line:agreement+(speaker==='npc'?tail:''),revisionResponses:[{proposalId:id,actor:'player',quote:agreement},{proposalId:id,actor:'npc',quote:agreement}]}));
}
test('a narrow response quote cannot suppress either speaker retracting, refusing or deferring that change',()=>{
 for(const [tail,status] of [
  [' 하지만 그 변경 제안은 철회할게요.','withdrawn'],
  [' 아니, 취소할게요.','withdrawn'],
  [' 변경하지 말아 주세요.','withdrawn'],
  [' 아니요.','refused'],
  [' 그 변경은 거절해요.','refused'],
  [' 그 변경 제안은 좀 생각해 볼게요.','pending'],
 ] as const)for(const actor of ['player','npc'] as const){
  const g=setup(),before=structuredClone(g),next=response(g,tail,actor),p=next.narrative!.revisionNegotiations![0];
  assert.equal(p.status,status,actor+tail);assert.deepEqual(contract(next),contract(g));
  assert.equal(p.attempts.length,0);assert.deepEqual(g,before);
  const observed=p.responses.find(r=>r.actor===actor)!;assert.equal(observed.source,agreement+tail);assert.equal(observed.quote,agreement);
  validateProfile(JSON.parse(JSON.stringify({...emptyProfile(),game:next,slots:[next,next,next]})));
 }
});
test('unrelated refusal, cancellation and question preserve an otherwise grounded change',()=>{
 for(const tail of ['', ' 커피는 마시지 않을게요.',' 잡지 구독은 취소할게요.',' 그 음악 제목은 뭐예요?'])for(const actor of ['player','npc'] as const){
  const g=setup(),next=response(g,tail,actor),p=next.narrative!.revisionNegotiations![0];
  assert.equal(p.status,'applied',actor+tail);assert.equal(p.attempts.filter(a=>a.result==='applied').length,1);
  assert.equal(contract(next).conditions[1].action,'그림을 그리는');assert.equal(contract(next).conditions[1].evidenceIds.length,0);
  validateProfile(JSON.parse(JSON.stringify({...emptyProfile(),game:next,slots:[next,next,next]})));
 }
});
