import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import type {EventProposal,NarrativeReply} from './narrative.ts';
import type {ConditionInput} from './commitments.ts';
const reply=(events:EventProposal[]=[],extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'알겠어요.',events,actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],...extra});
const condition=(performer:'player'|'npc',action:string):ConditionInput=>({performer,target:'서로',action});
const ribbon=(who:'player'|'npc')=>condition(who,'노란 리본을 가져오고');
const letter=(who:'player'|'npc')=>condition(who,'편지를 접는');
const compound='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
const joint='우리 각자 노란 리본을 가져오고 편지를 접는 약속을 해요.';
function offer(text:string,subject:EventProposal['subject'],conditions:ConditionInput[]){
 const event:EventProposal={kind:'promise',subject,status:'offered',text,evidence:text,value:'coverage',reference:''};
 const initial=start('romance'),before=structuredClone(initial);
 try{return {game:commitDialogue(initial,null,text,reply([event],{commitmentOffers:[{eventIndex:0,conditions}]})),event};}
 finally{assert.deepEqual(initial,before);}
}
function accept(text:string,subject:EventProposal['subject'],conditions:ConditionInput[]){
 const first=offer(text,subject,conditions),id=first.game.narrative!.commitments![0].promiseId;
 return {game:commitDialogue(first.game,null,'좋아요.',reply([{...first.event,status:'accepted',reference:id,evidence:'좋아요.'}])),event:first.event,id};
}
function progress(g:DialogueGame,event:EventProposal,id:string,input:string,indices:number[],beats:string[]=[],complete=false){
 const before=structuredClone(g),c=g.narrative!.commitments![0];
 const updates=indices.map(i=>{const condition=c.conditions[i],npc=condition.performer==='npc';return {promiseId:id,conditionId:condition.id,performer:condition.performer,source:npc?'action' as const:'player' as const,actionIndex:npc?0:-1,eventId:'',quote:npc?beats[0]:input};});
 try{return commitDialogue(g,null,input,reply(complete?[{...event,status:'fulfilled',reference:id,evidence:input}]:[],{actionBeats:beats,commitmentProgress:updates}));}
 finally{assert.deepEqual(g,before);}
}
for(const c of [
 {name:'omitted compound task',text:compound,subject:'player' as const,conditions:[ribbon('player')]},
 {name:'bare noun action',text:'제가 노란 리본을 가져오는 약속을 할게요.',subject:'player' as const,conditions:[condition('player','노란 리본')]},
 {name:'bare noun with object particle',text:'제가 노란 리본을 가져오는 약속을 할게요.',subject:'player' as const,conditions:[condition('player','노란 리본을')]},
 {name:'adverb fragment omits the predicate',text:'제가 그림을 아주 천천히 그려주는 약속을 할게요.',subject:'player' as const,conditions:[condition('player','그림을 아주')]},
 {name:'joint task omitted for both actors',text:joint,subject:'mutual' as const,conditions:[ribbon('player'),ribbon('npc')]},
 {name:'joint task omitted for one actor',text:joint,subject:'mutual' as const,conditions:[ribbon('player'),ribbon('npc'),letter('player')]},
])test(`original contract coverage rejects ${c.name}`,()=>assert.throws(()=>offer(c.text,c.subject,c.conditions),/약속 조건 또는 이행 근거/));

test('complete compound contract preserves partial progress and a later completion',()=>{
 let {game,event,id}=accept(compound,'player',[ribbon('player'),letter('player')]);
 game=progress(game,event,id,'노란 리본 가져왔어요.',[0]);
 assert.equal(game.narrative!.commitments![0].status,'partial');
 assert.throws(()=>progress(game,event,id,'노란 리본 가져왔어요.',[0],[],true));
 game=progress(game,event,id,'편지를 접었어요.',[1],[],true);
 assert.equal(game.narrative!.commitments![0].status,'completed');
});
test('each actor can fulfill both original joint obligations across turns',()=>{
 let {game,event,id}=accept(joint,'mutual',[ribbon('player'),ribbon('npc'),letter('player'),letter('npc')]);
 game=progress(game,event,id,'제 노란 리본 가져왔어요.',[0,1],['유나가 노란 리본을 건네준다.']);
 assert.equal(game.narrative!.commitments![0].status,'partial');
 game=progress(game,event,id,'제 편지를 접었어요.',[2,3],['유나가 편지를 접는다.'],true);
 assert.equal(game.narrative!.commitments![0].status,'completed');
});
test('explicit different performers remain a valid joint contract',()=>{
 const text='플레이어는 노란 리본을 가져오고 유나는 편지를 접는 약속';
 const {game,event,id}=accept(text,'mutual',[ribbon('player'),letter('npc')]);
 assert.equal(progress(game,event,id,'제 노란 리본 가져왔어요.',[0,1],['유나가 편지를 접는다.'],true).narrative!.commitments![0].status,'completed');
});
test('shared task followed by an explicit player-only task keeps that ownership',()=>{
 const text='우리 각자 노란 리본을 가져오고 저는 편지를 접는 약속을 해요.';
 let {game,event,id}=accept(text,'mutual',[ribbon('player'),ribbon('npc'),letter('player')]);
 game=progress(game,event,id,'제 노란 리본 가져왔어요.',[0,1],['유나가 노란 리본을 건네준다.']);
 assert.equal(progress(game,event,id,'편지를 접었어요.',[2],[],true).narrative!.commitments![0].status,'completed');
});
for(const [action,beat] of [
 ['작은 종이배를 접는','유나가 작은 종이배를 접는다.'],
 ['그림을 그려주는','유나가 고양이를 그린다.'],
 ['빨간 실을 준비하는','유나가 빨간 실을 준비한다.'],
 ['별자리를 수놓는','유나가 별자리를 수놓는다.'],
])test(`open creative action remains available: ${action}`,()=>{
 const {game,event,id}=accept(`유나가 ${action} 약속`,'npc',[condition('npc',action)]);
 assert.equal(progress(game,event,id,'어떻게 됐어요?',[0],[beat],true).narrative!.commitments![0].status,'completed');
});
