import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {reconcile,type EventProposal,type NarrativeReply} from './narrative.ts';

type Probe={name:string;owner:'npc'|'player';input:string;actions?:string[];offer?:string};
const response=(event:EventProposal,actionBeats:string[]=[]):NarrativeReply=>({line:'알겠어요.',events:[event],actionBeats,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function check(p:Probe,expected:'commit'|'reject'){
 const offerText=p.offer??'노란 리본을 가져오고 편지를 접는 약속';
 const offerInput=offerText==='편지를 쓰는 약속'?(p.owner==='player'?'제가 편지를 쓸게요.':'편지를 써 줄래요?'):
  offerText.includes('파란 종이')?'제가 노란 리본을 가져오고 파란 종이도 가져올게요.':
  offerText==='노란 리본을 가져오는 약속'?'제가 노란 리본을 가져올게요.':
  p.owner==='player'?'제가 노란 리본을 가져오고 편지를 접을게요.':'노란 리본을 가져오고 편지도 접어 줄래요?';
 const offer:EventProposal={kind:'promise',subject:p.owner,status:'offered',text:offerText,value:'compound-natural',reference:'',evidence:p.owner==='player'?offerInput:''};
 const game=reconcile(start('romance'),offerInput,response(offer)).game,before=structuredClone(game);
 const fulfilled:EventProposal={...offer,status:'fulfilled',text:'약속을 이행했다.',reference:game.narrative!.events.find(e=>e.kind==='promise')!.id,evidence:p.owner==='player'?p.input:''};
 try{
  if(expected==='reject')assert.throws(()=>reconcile(game,p.input,response(fulfilled,p.actions)),/사건 제안의 근거 또는 진행 조건/);
  else assert.equal(reconcile(game,p.input,response(fulfilled,p.actions)).game.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
 }finally{assert.deepEqual(game,before);}
}
describe('Coordinated completion retains natural sentences and actor boundaries',()=>{
 const positives:Probe[]=[
  {name:'both tasks in one player sentence',owner:'player',input:'노란 리본을 가져왔고 편지를 접었어요.'},
  {name:'both tasks with explicit player subject',owner:'player',input:'제가 노란 리본을 가져왔고 편지를 접었어요.'},
  {name:'both tasks in separate sentences',owner:'player',input:'노란 리본 가져왔어요. 편지를 접었어요.'},
  {name:'both tasks in one NPC beat',owner:'npc',input:'약속은요?',actions:['유나가 노란 리본을 건네고 편지를 접는다.']},
  {name:'both tasks in separate NPC beats',owner:'npc',input:'약속은요?',actions:['유나가 노란 리본을 건네준다.','유나가 편지를 접는다.']},
 ];
 for(const p of positives)test(p.name,()=>check(p,'commit'));
 const negatives:Probe[]=[
  {name:'player first task alone',owner:'player',input:'노란 리본 가져왔어요.'},
  {name:'NPC first task alone',owner:'npc',input:'약속은요?',actions:['유나가 노란 리본을 건네준다.']},
  {name:'friend second task in a separate sentence',owner:'player',input:'노란 리본 가져왔어요. 친구가 편지를 접었어요.'},
  {name:'friend second task in the same sentence',owner:'player',input:'제가 노란 리본을 가져왔고 친구가 편지를 접었어요.'},
  {name:'friend first task in the same sentence',owner:'player',input:'친구가 노란 리본을 가져왔고 제가 편지를 접었어요.'},
  {name:'friend subject cannot disappear after conjunction',owner:'player',input:'제가 노란 리본을 가져왔어요. 친구가 노란 리본을 가져왔고 편지를 접었어요.'},
  {name:'NPC and friend within one beat',owner:'npc',input:'약속은요?',actions:['유나가 노란 리본을 건네고 친구가 편지를 접는다.']},
 ];
 for(const p of negatives)test(p.name,()=>check(p,'reject'));
});
describe('Delivery binds to its object while writing inflections remain usable',()=>{
 const twoObjects='노란 리본을 가져오고 파란 종이를 가져오는 약속';
 test('same delivery verb does not prove delivery of the second object',()=>check({name:'one object',owner:'player',offer:twoObjects,input:'노란 리본을 가져왔어요.'},'reject'));
 test('both named delivery objects are sufficient',()=>check({name:'both objects',owner:'player',offer:twoObjects,input:'노란 리본을 가져왔어요. 파란 종이를 가져왔어요.'},'commit'));
 test('a single delivery promise also keeps its object',()=>check({name:'different object',owner:'player',offer:'노란 리본을 가져오는 약속',input:'파란 종이를 가져왔어요.'},'reject'));
 for(const action of ['유나가 편지를 쓴다.','유나가 편지를 써요.'])test(action,()=>check({name:action,owner:'npc',offer:'편지를 쓰는 약속',input:'편지는요?',actions:[action]},'commit'));
 test('player contracted writing past',()=>check({name:'writing past',owner:'player',offer:'편지를 쓰는 약속',input:'편지를 썼어요.'},'commit'));
});
