import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {reconcile,type EventProposal,type NarrativeReply} from './narrative.ts';

const reply=(event:EventProposal):NarrativeReply=>({line:'알겠어요.',events:[event],actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function setup(writing=false){
 const text=writing?'제가 노란 리본을 가져오고 편지를 쓸게요.':'제가 노란 리본을 가져오고 편지를 접을게요.';
 const offer:EventProposal={kind:'promise',subject:'player',status:'offered',text:writing?'노란 리본을 가져오고 편지를 쓰는 약속':'노란 리본을 가져오고 편지를 접는 약속',value:'ribbon-letter',reference:'',evidence:text};
 const game=reconcile(start('romance'),text,reply(offer)).game;
 return {game,event:{...offer,status:'fulfilled' as const,reference:game.narrative!.events[0].id}};
}
for(const text of ['노란 리본 가져왔어요.','편지를 접었어요.','노란 리본 가져왔어요. 친구가 편지를 접었어요.'])test(`compound promise rejects incomplete performance: ${text}`,()=>{
 const {game,event}=setup(),before=structuredClone(game);
 assert.throws(()=>reconcile(game,text,reply({...event,evidence:text})));
 assert.deepEqual(game,before);
});
test('compound promise retains writing with its contracted past inflection',()=>{
 const {game,event}=setup(true),text='노란 리본 가져왔어요. 편지를 썼어요.';
 assert.throws(()=>reconcile(game,'노란 리본 가져왔어요.',reply({...event,evidence:'노란 리본 가져왔어요.'})));
 assert.equal(reconcile(game,text,reply({...event,evidence:text})).game.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
});
test('compound promise permits both grounded performances',()=>{
 const {game,event}=setup(),text='노란 리본 가져왔어요. 편지를 접었어요.';
 const after=reconcile(game,text,reply({...event,evidence:text})).game;
 assert.equal(after.narrative!.events.filter(e=>e.status==='fulfilled'&&e.kind==='promise').length,1);
});
