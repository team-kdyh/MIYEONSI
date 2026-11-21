import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start,view} from './game.ts';
import {commitDialogue} from './dialogue.ts';
import {narrative,type NarrativeReply} from './narrative.ts';
import {storyGuide,storyDirection} from './story-guide.ts';
import {messages} from './provider.ts';
const reply=(line:string):NarrativeReply=>({line,actionBeats:['유나가 웃는다.'],emotion:'따뜻함',pose:'smile',musicMood:'cafe-warmth',events:[],recall:[],conjecture:''});
test('guide stays on the current chapter through free conversation and does not reveal future plot',()=>{
 let g=start('romance');const initial=storyGuide(g);
 for(let i=0;i<7;i++)g=commitDialogue(g,null,'빗소리를 좋아해요.',reply('저는 컵이 부딪치는 소리가 좋아요.'));
 assert.deepEqual(storyGuide(g),initial);assert.equal(g.ending,null);
 assert.doesNotMatch(JSON.stringify(initial),/집착|변조|편집|결말|6장/);
 assert.deepEqual(view(g)!.storyGuide,initial);
 const input=messages(g,'다음에는요?');assert.equal(input.at(-1)?.content,'다음에는요?');
 const direction=JSON.parse(input.at(-2)!.content);assert.deepEqual(direction.currentStoryBeat,storyDirection(g));
 assert.match(direction.direction,/턴/);
});
test('office guide describes confirmed circumstances without a completion checklist',()=>{
 let g=start('office');const first=storyGuide(g);assert.match(first.situation,/추가 보고서/);assert.ok(!('progress' in first));assert.ok(!('objective' in first));
 const text='오늘 18시에 퇴근하겠습니다.';
 g=commitDialogue(g,null,text,{...reply('좋습니다. 오늘 18시에 퇴근하세요.'),events:[{kind:'concession',subject:'mutual',status:'accepted',text:'오늘 18시 퇴근에 합의함',evidence:text,reference:'',value:'leave'}]});
 const next=storyGuide(g);assert.match(next.situation,/18시 퇴근에 합의/);assert.doesNotMatch(next.situation,/항목 합의|\d \/ \d/);assert.equal(g.ending,null);
 assert.deepEqual(storyGuide(JSON.parse(JSON.stringify(g))),next);
});
test('roadmap distinguishes first date participation, recorded date, discovered clues, and separation',()=>{
 // Controlled state fixtures exercise presentation, not earned progression.
 const g=start('romance');g.narrative=narrative(g);g.narrative.relationship='couple';
 assert.match(storyGuide(g).situation,/연인이/);assert.equal(storyGuide(g).chapterLabel,'4장');
 g.narrative.activeDate={eventId:'date-1',location:'cafe',turn:8};assert.match(storyGuide(g).situation,/데이트를 보내/);
 g.narrative.dates=1;assert.equal(storyGuide(g).chapterLabel,'5장');
 g.narrative.events.push({id:'clue-1',turn:10,kind:'clue',subject:'world',status:'fulfilled',value:'original',text:'원본의 말을 확인했다.',reference:'',evidence:''});
 assert.equal(storyGuide(g).chapterLabel,'6장');g.narrative.relationship='apart';assert.equal(storyGuide(g).chapterLabel,'마지막 대화');assert.match(storyDirection(g).nextBeat,/강제하지/);
});
