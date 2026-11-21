import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {start,type Game} from './game.ts';
import {reconcile,validateNarrative,type EventProposal,type NarrativeReply} from './narrative.ts';

// This test is copied unchanged into both snapshots. No provider/server/credential access.
globalThis.fetch=async()=>{throw Error('NETWORK_FORBIDDEN');};
const rows:unknown[]=[];
const event=(extra:Partial<EventProposal>={}):EventProposal=>({kind:'relationship',subject:'npc',status:'fulfilled',text:'유나가 자기 마음을 말한다.',reference:'',evidence:'',value:'',...extra});
const reply=(events:EventProposal[]=[],actionBeats:string[]=[],line='여기서 이야기해요.'):NarrativeReply=>({line,events,actionBeats,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function turn(g:Game,text:string,events:EventProposal[]=[],actions:string[]=[],line?:string):Game{
 const before=structuredClone(g),r=reply(events,actions,line);validateNarrative(r);
 try{const result=reconcile(g,text,r);rows.push({text,reply:r,before,after:result.game,status:'committed'});return result.game;}
 catch(error){rows.push({text,reply:r,before,status:'rejected',error:(error as Error).message});throw error;}
 finally{assert.deepEqual(g,before,'Input must remain unchanged on success and rejection.');}
}
function couple(){
 let g=start('romance');for(let i=0;i<3;i++)g=turn(g,`카페에서 소리 이야기를 해요 ${i}`);
 for(const [value,text] of [['familiar','서로 편해졌네요.'],['attracted','더 알아가고 싶어요.'],['confessed','어떤 마음인지 궁금해요.']])g=turn(g,text,[event({value})]);
 const text='저도 좋아해요. 우리 사귀어요.';
 g=turn(g,text,[event({subject:'mutual',status:'accepted',value:'couple',evidence:text,text:'두 사람이 연인이 되기로 합의한다.'})]);
 assert.equal(g.narrative!.relationship,'couple');return g;
}
const date=(evidence:string,status:EventProposal['status']='accepted',reference='')=>event({subject:'mutual',status,value:'date',reference,evidence,text:'카페 데이트에 관한 합의'});
const promise=(subject:EventProposal['subject'],status:EventProposal['status'],evidence='',reference='',text='노란 리본을 가져오는 약속')=>event({kind:'promise',subject,status,evidence,reference,text,value:'yellow-ribbon'});
function offered(owner:'player'|'npc'='player'){
 const text=owner==='player'?'제가 다음에 노란 리본을 가져올게요.':'리본을 가져와 줄 수 있어요?';
 return turn(start('romance'),text,[promise(owner,'offered',owner==='player'?text:'')],[],'다음에 이야기해요.');
}
const root=(g:Game)=>g.narrative!.events.find(e=>e.kind==='promise')!.id;
const fulfilled=(g:Game)=>g.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled');

test('D1 control: current participation opens one date without completing it',()=>{
 const text='오늘 여기서 데이트해요.',g=turn(couple(),text,[date(text)]);
 assert.ok(g.narrative!.activeDate);assert.equal(g.narrative!.dates,0);
});
test('D2 reproduced: unrelated future work sentence does not suppress today date',()=>{
 const text='오늘 여기서 데이트해요. 내일은 회사 회의가 있어요.';
 const g=turn(couple(),text,[date(text)]);assert.ok(g.narrative!.activeDate);assert.equal(g.narrative!.dates,0);
});
test('D3 control: narrow evidence and full evidence have the same current-date consequence',()=>{
 const text='오늘 여기서 데이트해요. 내일은 회사 회의가 있어요.';
 assert.ok(turn(couple(),text,[date('오늘 여기서 데이트해요.')]).narrative!.activeDate);
});
test('D4 control: future date remains pending and cannot be fulfilled',()=>{
 const text='다음 주 토요일에 여기서 데이트해요.';
 let g=turn(couple(),text,[date(text,'offered')]);g=turn(g,text,[date(text,'accepted',g.narrative!.events.at(-1)!.id)]);
 assert.equal(g.narrative!.activeDate,undefined);assert.equal(g.narrative!.dates,0);
 assert.throws(()=>turn(g,'다음 주 만남이 기대돼요.',[date('다음 주 만남이 기대돼요.','fulfilled',g.narrative!.events.at(-1)!.id)],['유나가 달력을 덮는다.']));
});
test('D5 control: offer, present acceptance and a separate shared activity complete once',()=>{
 const future='다음에 카페에서 데이트하고 싶어요.';let g=turn(couple(),future,[date(future,'offered')]);
 const today='오늘 여기서 데이트해요.';g=turn(g,today,[date(today,'accepted',g.narrative!.events.at(-1)!.id)]);
 assert.ok(g.narrative!.activeDate);assert.equal(g.narrative!.dates,0);
 const activity='저는 리본을 꺼내 컵 옆에 놓았어요. 같이 색을 골라요.',e=date(activity,'fulfilled',g.narrative!.activeDate!.eventId);
 g=turn(g,activity,[e],['유나가 빨간 집게를 리본 옆에 내려놓는다.']);
 assert.equal(g.narrative!.dates,1);assert.equal(g.narrative!.activeDate,undefined);
 assert.throws(()=>turn(g,activity,[e],['유나가 빨간 집게를 리본 옆에 내려놓는다.']));
});
test('D6 control: same turn cannot start and complete a date',()=>{
 const text='오늘 여기서 데이트해요.';assert.throws(()=>turn(couple(),text,[date(text),date(text,'fulfilled')],['유나가 노트를 펼친다.']));
});
test('D7 control: today work plus tomorrow date does not start a date',()=>{
 const text='오늘 회사 회의가 있어요. 내일 여기서 데이트해요.';
 const g=turn(couple(),text,[date(text)]);assert.equal(g.narrative!.activeDate,undefined);
});
test('O1 reproduced: NPC cannot fulfill player promise from mere recall',()=>{
 const g=offered(),text='네, 기억해요.';
 assert.throws(()=>turn(g,text,[promise('npc','fulfilled',text,root(g))],['유나가 노트를 덮는다.']));
});
test('O2 control: player accepts NPC offer without becoming its performer',()=>{
 const g=offered('npc'),text='좋아요, 리본을 가져와 주세요.';
 const next=turn(g,text,[promise('player','accepted',text,root(g))]);
 assert.equal(next.narrative!.events.at(-1)!.subject,'player');assert.equal(fulfilled(next).length,0);
});
test('O3 reproduced: explicit player noncompletion is not fulfilled',()=>{
 const g=offered(),text='아직 준비하지 못했어요.';
 assert.throws(()=>turn(g,text,[promise('player','fulfilled',text,root(g))],[],'괜찮아요. 준비되면 알려 주세요.'));
});
test('O4 reproduced: future NPC dialogue without delivery is not fulfilled',()=>{
 const g=offered('npc');assert.throws(()=>turn(g,'리본은 준비됐어요?',[promise('npc','fulfilled','',root(g))],[],'다음에 가져올게요.'));
});
test('O5 control: player explicit completed action fulfills their own promise',()=>{
 const g=offered(),text='약속한 노란 리본을 가져왔어요.';
 assert.equal(fulfilled(turn(g,text,[promise('player','fulfilled',text,root(g))])).length,1);
});
test('O6 control: NPC actual delivery action fulfills their own promise',()=>{
 const g=offered('npc');assert.equal(fulfilled(turn(g,'리본은요?',[promise('npc','fulfilled','',root(g))],['유나가 노란 리본을 꺼내 테이블에 놓는다.'])).length,1);
});
test('O7 control: completion speech can support a verbal promise without action narration',()=>{
 const g=turn(start('romance'),'암호를 나중에 알려 주세요.',[promise('npc','offered','','','유나가 암호를 알려주기로 약속한다.')]);
 assert.equal(fulfilled(turn(g,'암호를 알려 줄래요?',[promise('npc','fulfilled','',root(g),'유나가 암호를 알려주었다.')],[],'약속한 암호를 알려드릴게요. 암호는 별빛입니다.')).length,1);
});
test('O8 control: offered owner survives acceptance by the opposite actor',()=>{
 let g=offered('npc');const text='좋아요, 리본을 가져와 주세요.';g=turn(g,text,[promise('player','accepted',text,root(g))]);
 const accepted=g.narrative!.events.at(-1)!.id;
 assert.equal(fulfilled(turn(g,'리본은요?',[promise('npc','fulfilled','',accepted)],['유나가 노란 리본을 꺼내 테이블에 놓는다.'])).length,1);
 assert.throws(()=>turn(g,'노란 리본을 가져왔어요.',[promise('player','fulfilled','노란 리본을 가져왔어요.',accepted)]));
});
test('O9 control: unrelated completed action cannot fulfill a ribbon promise',()=>{
 const g=offered(),text='노트를 덮었어요.';
 assert.throws(()=>turn(g,text,[promise('player','fulfilled',text,root(g))]));
});
test('O10 control: unrelated NPC action does not satisfy future ribbon delivery',()=>{
 const g=offered('npc');assert.throws(()=>turn(g,'리본은 준비됐어요?',[promise('npc','fulfilled','',root(g))],['유나가 노트를 덮는다.'],'다음에 리본을 가져올게요.'));
});
test('O11 control: already shown delivery after the offer can be confirmed later',()=>{
 let g=offered('npc');const id=root(g);g=turn(g,'리본을 꺼내 주세요.',[],['유나가 노란 리본을 꺼내 테이블에 놓는다.']);
 g=turn(g,'리본 약속을 지켜줘서 고마워요.',[promise('npc','fulfilled','',id)],[],'작은 선물이 마음에 들었다니 기뻐요.');
 assert.equal(fulfilled(g).length,1);
});
test('O12 control: prior unrelated performance cannot fulfill a later promise',()=>{
 let g=turn(start('romance'),'오늘 리본 예쁘네요.',[],['유나가 노란 리본을 꺼내 테이블에 놓는다.']);
 g=turn(g,'다음번에도 리본을 가져와 줄래요?',[promise('npc','offered')]);
 assert.throws(()=>turn(g,'그 리본은요?',[promise('npc','fulfilled','',root(g))],[],'다음에 가져올게요.'));
});
test('O13 control: already completed event remains idempotent without repeating performance',()=>{
 let g=offered('npc');const e=promise('npc','fulfilled','',root(g));
 g=turn(g,'리본은요?',[e],['유나가 노란 리본을 꺼내 테이블에 놓는다.']);
 assert.equal(fulfilled(turn(g,'고마워요.',[e])).length,1);
});
test('O14 control: another actor performed the action does not fulfill player ownership',()=>{
 const g=offered(),text='유나가 노란 리본을 가져왔어요.';
 assert.throws(()=>turn(g,text,[promise('player','fulfilled',text,root(g))]));
});
test('O15 control: NPC speech cannot assign their fulfillment to the player',()=>{
 const g=offered('npc');assert.throws(()=>turn(g,'리본은요?',[promise('npc','fulfilled','',root(g))],[],'당신이 노란 리본을 가져왔어요.'));
});
test('O16 control: current display is not fulfillment of a new next-visit offer',()=>{
 const g=turn(start('romance'),'다음에도 리본을 가져와 주세요.',[promise('npc','offered')],['유나가 노란 리본을 꺼내 테이블에 놓는다.']);
 assert.throws(()=>turn(g,'다음 만남 약속은요?',[promise('npc','fulfilled','',root(g))],[],'다음에 가져올게요.'));
});
test('O17 control: actual delivery tolerates a separate future work sentence',()=>{
 const g=offered(),text='노란 리본을 가져왔어요. 내일 회사 회의가 있어요.';
 assert.equal(fulfilled(turn(g,text,[promise('player','fulfilled',text,root(g))])).length,1);
});
test('C1 creative control: novel origami action can fulfill its referenced promise',()=>{
 const g=turn(start('romance'),'작은 종이배를 접어 줄래요?',[promise('npc','offered','','','유나가 작은 종이배를 접어 주기로 제안한다.')]);
 assert.equal(fulfilled(turn(g,'종이배는요?',[promise('npc','fulfilled','',root(g),'유나가 작은 종이배를 접었다.')],['유나가 작은 종이배를 접는다.'])).length,1);
});
test('C2 creative control: a new drawing subject need not repeat the offer object',()=>{
 const g=turn(start('romance'),'그림을 그려 줄래요?',[promise('npc','offered','','','유나가 그림을 그려주기로 제안한다.')]);
 assert.equal(fulfilled(turn(g,'어떤 그림인가요?',[promise('npc','fulfilled','',root(g),'유나가 고양이를 그렸다.')],['유나가 고양이를 그린다.'])).length,1);
});
test('C3 creative control: demonstrative completion grounds a single pending owned promise',()=>{
 const g=offered();for(const text of ['그걸 가져왔어요.','다 했어요.'])assert.equal(fulfilled(turn(g,text,[promise('player','fulfilled',text,root(g))])).length,1);
});
test('O18 control: future will grammar cannot masquerade as past completion',()=>{
 const g=offered('npc');assert.throws(()=>turn(g,'리본은요?',[promise('npc','fulfilled','',root(g))],[],'내일 노란 리본을 가져오겠어요.'));
});
test('C4 creative control: natural completion allows an omitted object particle',()=>{
 const g=offered();for(const text of ['노란 리본을 가져왔어요.','노란 리본 가져왔어요.'])assert.equal(fulfilled(turn(g,text,[promise('player','fulfilled',text,root(g))])).length,1);
});
after(async()=>{await writeFile('docs/lifecycle-observations.json',JSON.stringify({scope:'Synthetic proposals and controlled fixture states; pure reducer unit tests. No live model/network calls or production state mutation.',rows},null,2));});
