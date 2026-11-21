import {describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {reconcile,validateNarrative,type EventProposal,type NarrativeReply} from './narrative.ts';

// Pure normal-start reducer tests. No provider, files, private saves or network.
type Scenario={name:string;owner:'npc'|'player';input:string;actions?:string[];offer?:string;offerInput?:string;proposal?:string};
const reply=(event:EventProposal,actions:string[]=[]):NarrativeReply=>({line:'알겠어요.',actionBeats:actions,events:[event],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function check(c:Scenario,expected:'commit'|'reject'){
 const offerInput=c.offerInput??(c.owner==='player'?'제가 다음에 노란 리본을 가져올게요.':'다음에 노란 리본을 가져와 줄래요?');
 const offer:EventProposal={kind:'promise',subject:c.owner,status:'offered',text:c.offer??'노란 리본을 가져오는 약속',value:'natural-delivery',reference:'',evidence:c.owner==='player'?offerInput:''};
 const offered=reconcile(start('romance'),offerInput,reply(offer)).game;
 const before=structuredClone(offered);
 const completion:EventProposal={...offer,status:'fulfilled',text:c.proposal??'노란 리본 약속을 이행했다.',reference:offered.narrative!.events.find(e=>e.kind==='promise')!.id,evidence:c.owner==='player'?c.input:''};
 const response=reply(completion,c.actions);validateNarrative(response);
 try{
  if(expected==='reject')assert.throws(()=>reconcile(offered,c.input,response),/사건 제안의 근거 또는 진행 조건/);
  else{
   const after=reconcile(offered,c.input,response).game;
   assert.equal(after.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
  }
 }finally{assert.deepEqual(offered,before,'Completion must not mutate its input game.');}
}

describe('NPC visible delivery accepts ordinary Korean inflection',()=>{
 for(const action of [
  '유나가 노란 리본을 건네준다.',
  '유나가 노란 리본을 건넨다.',
  '유나가 노란 리본을 건넸다.',
  '유나가 노란 리본을 내민다.',
  '유나가 노란 리본을 꺼내 보여준다.',
  '유나가 노란 리본을 드려요.',
  '유나가 노란 리본을 전해요.',
  '유나가 노란 리본을 건넸어요.',
  '유나가 노란 리본을 내밀어요.',
  '유나가 노란 리본을 전달했어요.',
 ])test(action,()=>check({name:action,owner:'npc',input:'리본은요?',actions:[action]},'commit'));
});

describe('Temporal topics and recipients do not change the real performer',()=>{
 for(const input of [
  '노란 리본 가져왔어요.',
  '노란 리본을 가져왔어요.',
  '오늘 노란 리본 가져왔어요.',
  '오늘은 노란 리본 가져왔어요.',
  '이번에는 노란 리본 가져왔어요.',
  '친구에게 노란 리본을 가져왔어요.',
  '유나에게 노란 리본을 가져왔어요.',
 ])test(input,()=>check({name:input,owner:'player',input},'commit'));
 for(const action of [
  '오늘은 유나가 노란 리본을 건네준다.',
  '이번에는 유나가 노란 리본을 건네준다.',
  '유나가 당신에게 노란 리본을 건네준다.',
 ])test(action,()=>check({name:action,owner:'npc',input:'리본은요?',actions:[action]},'commit'));
});

describe('Incomplete actions and other actors cannot fulfill the promise',()=>{
 const cases:Scenario[]=[
  {name:'unrelated proposal cannot support its own replacement referent',owner:'npc',input:'리본은요?',proposal:'유나가 노트를 덮었다.',actions:['유나가 노트를 덮는다.']},
  {name:'looking is not delivery',owner:'npc',input:'리본은요?',actions:['유나가 노란 리본을 바라본다.']},
  {name:'searching is not delivery',owner:'player',input:'노란 리본을 찾아봤어요.'},
  {name:'friend is not the player',owner:'player',input:'친구가 노란 리본을 가져왔어요.'},
  {name:'friend is not the NPC',owner:'npc',input:'리본은요?',actions:['친구가 노란 리본을 건네준다.']},
  {name:'today topic does not hide the following actor',owner:'player',input:'오늘은 친구가 노란 리본을 가져왔어요.'},
  {name:'this-time topic does not hide the following actor',owner:'player',input:'이번에는 친구가 노란 리본을 가져왔어요.'},
  {name:'NPC action topic does not hide the following actor',owner:'npc',input:'리본은요?',actions:['오늘은 친구가 노란 리본을 건네준다.']},
  {name:'leaving behind is not delivery',owner:'player',input:'노란 리본 놓고 왔어요.'},
  {name:'dropping is not placing',owner:'player',input:'노란 리본을 놓쳤어요.'},
  {name:'leaving behind with 두다 is not delivery',owner:'player',input:'노란 리본을 두고 왔어요.'},
  {name:'taking out before leaving behind is not delivery',owner:'player',input:'노란 리본을 꺼내 놓고 왔어요.'},
  {name:'losing is not delivery',owner:'player',input:'노란 리본을 잃어버렸어요.'},
  {name:'future transfer is not completed delivery',owner:'npc',input:'리본은요?',actions:['유나가 노란 리본을 건네줄 거예요.']},
 ];
 for(const c of cases)test(c.name,()=>check(c,'reject'));
});

describe('Creative predicates and single-promise references remain available',()=>{
 const drawing={owner:'npc' as const,input:'그림은요?',offerInput:'그림을 그려 줄래요?',offer:'유나가 그림을 그려주기로 제안한다.'};
 const folding={owner:'npc' as const,input:'종이배는요?',offerInput:'작은 종이배를 접어 줄래요?',offer:'유나가 작은 종이배를 접어 주기로 제안한다.'};
 test('a new drawing subject can fulfill the drawing promise',()=>check({...drawing,name:'new drawing',proposal:'유나가 고양이를 그렸다.',actions:['유나가 고양이를 그린다.']},'commit'));
 test('folding remains an open-vocabulary promise',()=>check({...folding,name:'folding',proposal:'유나가 작은 종이배를 접었다.',actions:['유나가 작은 종이배를 접는다.']},'commit'));
 test('watching is not drawing',()=>check({...drawing,name:'watching',proposal:'유나가 그림을 그리는 약속을 이행했다.',actions:['유나가 그림을 바라본다.']},'reject'));
 test('touching is not folding',()=>check({...folding,name:'touching',proposal:'유나가 종이배를 접는 약속을 이행했다.',actions:['유나가 작은 종이배를 만지작거린다.']},'reject'));
 for(const input of ['그걸 가져왔어요.','다 했어요.'])test(input,()=>check({name:input,owner:'player',input},'commit'));
});
