import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {reconcile,type EventProposal,type NarrativeReply} from './narrative.ts';

const reply=(event:EventProposal,actionBeats:string[]=[]):NarrativeReply=>({line:'알겠어요.',events:[event],actionBeats,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function offered(subject:'npc'|'player'){
 const text='제가 다음에 노란 리본을 가져올게요.';
 const event:EventProposal={kind:'promise',subject,status:'offered',text:'노란 리본을 가져오는 약속',value:'ribbon',reference:'',evidence:subject==='player'?text:''};
 const game=reconcile(start('romance'),text,reply(event)).game;
 return {game,event:{...event,status:'fulfilled' as const,reference:game.narrative!.events[0].id,text:'노란 리본 약속을 이행했다.'}};
}
for(const [label,subject,text,actions,proposal] of [
 ['replacement cannot prove itself','npc','리본은요?',['유나가 노트를 덮는다.'],'유나가 노트를 덮었다.'],
 ['looking is not delivery','npc','리본은요?',['유나가 노란 리본을 바라본다.'],''],
 ['searching is not delivery','player','노란 리본을 찾아봤어요.',[],''],
 ['losing is not placement','player','노란 리본을 놓쳤어요.',[],''],
 ['friend is not player','player','친구가 노란 리본을 가져왔어요.',[],''],
 ['named third party is not player','player','민지가 노란 리본을 가져왔어요.',[],''],
 ['friend is not NPC','npc','리본은요?',['친구가 노란 리본을 가져온다.'],''],
] as const)test(`promise completion: ${label}`,()=>{
 const {game,event}=offered(subject),before=structuredClone(game);
 assert.throws(()=>reconcile(game,text,reply({...event,evidence:subject==='player'?text:'',text:proposal||event.text},[...actions])));
 assert.deepEqual(game,before);
});
for(const text of ['노란 리본 가져왔어요.','제가 노란 리본을 가져왔어요.','친구에게 노란 리본을 가져왔어요.'])test(`promise completion preserves own delivery: ${text}`,()=>{
 const {game,event}=offered('player');
 const next=reconcile(game,text,reply({...event,evidence:text})).game;
 assert.equal(next.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
});
test('new activity uses its original predicate, not merely its object',()=>{
 const offer:EventProposal={kind:'promise',subject:'npc',status:'offered',text:'유나가 별자리를 수놓기로 제안한다.',value:'embroidery',reference:'',evidence:''};
 const game=reconcile(start('romance'),'별자리를 수놓아 줄래요?',reply(offer)).game;
 const done={...offer,status:'fulfilled' as const,reference:game.narrative!.events[0].id,text:'별자리 약속을 이행했다.'};
 assert.throws(()=>reconcile(game,'별자리는요?',reply(done,['유나가 별자리를 바라본다.'])));
 assert.equal(reconcile(game,'별자리는요?',reply(done,['유나가 별자리를 수놓는다.'])).game.narrative!.events.filter(e=>e.kind==='promise'&&e.status==='fulfilled').length,1);
});
