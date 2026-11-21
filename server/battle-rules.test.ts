import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start,view} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {battleOutcome,battlePressure,battleTotals} from './battle-rules.ts';
import {missions} from './office.ts';
import {messages} from './provider.ts';
import type {NarrativeReply} from './narrative.ts';
function reply(text:string,line:string):NarrativeReply{return {line,actionBeats:[],emotion:'차분',pose:'listen',musicMood:'office-pressure',events:[],recall:[],conjecture:'',battle:null};}
for(const [step,mission] of missions.entries()){
 test(`AC3 ${mission.id}: six novel negotiations win without checklist resolution; same mission retries cleanly`,()=>{
  let g:DialogueGame=start('office',step);
  for(let i=0;i<6;i++){
   const term=mission.terms[i%2];
   const argument=(['alternative','boundary','evidence'] as const)[Math.floor(i/2)];
   const text=`${term.label}에 대해 ${['요약 자료를 먼저 보내겠습니다.','추가 업무는 여기까지만 맡겠습니다.','앞서 정한 방법에 확인 절차를 더하겠습니다.'][Math.floor(i/2)]}`;
   const line=`${term.label}에 대한 그 제안을 받아들이겠습니다.`;
   const r=reply(text,line);r.events=[{kind:'concession',subject:'mutual',status:'accepted',value:term.id,text,evidence:text,reference:''}];
   const fact=g.dialogue?.facts.find(f=>f.text.includes(term.label));
   r.battle={kind:'persuasion',target:term.id,argument,playerQuote:text,npcQuote:line,reason:`${term.label}: ${text}`,concessionIndex:0,pressureId:'',premises:argument==='evidence'?[{id:fact!.id,quote:fact!.text}]:[]};
   g=commitDialogue(g,null,text,r);
   if(i<5)assert.equal(g.ending,null);
  }
  assert.equal(g.ending,`office-${mission.id}-success`);assert.equal(battleTotals(g).boss,0);
  assert.equal(g.narrative!.events.some(e=>e.kind==='resolution'),false);
  assert.equal(view(g)!.scene,null);assert.match(view(g)!.end!.text,/설득 승리/);
  assert.throws(()=>commitDialogue(g,null,'계속',reply('계속','계속하죠.')),/끝난/);
  const retry=start('office',g.step);assert.equal(retry.office!.missionId,mission.id);assert.deepEqual(battleTotals(retry),{player:100,boss:100});assert.equal(retry.ending,null);
 });
 test(`AC3 ${mission.id}: contextual escalations cause explained defeat; conversation and repeats cannot`,()=>{
  let g:DialogueGame=start('office',step);
  for(let i=0;i<20;i++)g=commitDialogue(g,null,'잠깐 생각할게요.',reply('잠깐 생각할게요.','기다리겠습니다.'));
  assert.equal(g.ending,null);assert.deepEqual(battleTotals(g),{player:100,boss:100});
  for(const term of mission.terms){
   for(const line of battlePressure(step,term.id)){
    const text='그 요구의 이유를 듣고 싶습니다.';const r=reply(text,line);
    r.battle={kind:'pressure',target:term.id,argument:'boundary',playerQuote:text,npcQuote:line,reason:`${term.label}에 대한 강제 요구: ${line}`,concessionIndex:-1,pressureId:'',premises:[]};
    g=commitDialogue(g,null,text,r);
    if(!g.ending){const before=battleTotals(g);g=commitDialogue(g,null,text,r);assert.deepEqual(battleTotals(g),before);}
   }
  }
  assert.equal(g.ending,`office-${mission.id}-failure`);assert.deepEqual(battleTotals(g),{player:0,boss:100});
  assert.match(view(g)!.end!.text,/협상 패배/);assert.ok(view(g)!.end!.text.includes(mission.terms[1].label));
  assert.ok(!view(g)!.end!.text.includes('동의했습니다'));
  const prompt=JSON.stringify(messages(start('office',step),'왜요?'));assert.ok(prompt.includes(mission.intro));assert.ok(prompt.includes(mission.terms[0].objection));
 });
}
test('AC3 deterministic simultaneous zero, no early model victory or fabricated player reaction',()=>{
 assert.equal(battleOutcome(0,0),'success');assert.equal(battleOutcome(0,1),'failure');assert.equal(battleOutcome(1,0),'success');assert.equal(battleOutcome(1,1),null);
 for(const line of ['협상에서 승리했습니다.','당신이 굴복했습니다.','당신은 동의했습니다.','플레이어는 고개를 끄덕였습니다.','당신은 생각했습니다.']){
  const g=start('office'),before=structuredClone(g);assert.throws(()=>commitDialogue(g,null,'왜요?',reply('왜요?',line)));assert.deepEqual(g,before);
 }
 const r=reply('마무리하죠.','그럼 마무리하죠.');r.events=[{kind:'resolution',subject:'player',status:'accepted',value:'success',text:'마무리하죠.',evidence:'마무리하죠.',reference:''}];assert.throws(()=>commitDialogue(start('office'),null,'마무리하죠.',r),/게이지/);
});
