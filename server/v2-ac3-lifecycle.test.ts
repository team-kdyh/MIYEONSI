import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {type EventProposal,type NarrativeReply} from './narrative.ts';
import {emptyProfile,ProfileStore} from './storage.ts';
import {messages} from './provider.ts';
import {missions} from './office.ts';

const event=(kind:EventProposal['kind'],value:string,text:string,extra:Partial<EventProposal>={}):EventProposal=>({kind,value,text,subject:'mutual',status:'accepted',reference:'',evidence:text,...extra});
const reply=(events:EventProposal[]=[],actions:string[]=[]):NarrativeReply=>({line:'그 이야기를 이어가 볼까요.',actionBeats:actions,emotion:'차분',pose:'listen',musicMood:'cafe-warmth',events,recall:[],conjecture:''});
const turn=(g:DialogueGame,text:string,events:EventProposal[]=[],actions:string[]=[])=>commitDialogue(g,null,text,reply(events,actions));
function couple(){
 let g:DialogueGame=start('romance');
 for(let i=0;i<3;i++)g=turn(g,'음악 이야기를 해요.');
 for(const value of ['familiar','attracted','confessed'])g=turn(g,'마음을 듣고 싶어요.',[event('relationship',value,`유나의 ${value}`,{subject:'npc',status:'fulfilled',evidence:''})]);
 return turn(g,'저도 좋아해요. 우리 사귀어요.',[event('relationship','couple','저도 좋아해요. 우리 사귀어요.')]);
}
async function restored(g:DialogueGame){
 const dir=await mkdtemp(join(tmpdir(),'afterhours-ac3-'));
 try{const p=emptyProfile();p.game=g;p.slots=[g,null,null];await new ProfileStore(dir).save('c'.repeat(48),p);
  const loaded=(await new ProfileStore(dir).load('c'.repeat(48))).profile;
  assert.deepEqual(loaded.game,g);assert.deepEqual(loaded.slots[0],g);return loaded.game!;
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('AC3 date agreement, entered scene and later interaction are distinct durable facts',async()=>{
 let g=couple();
 const future='내일 옥상에서 데이트해요.';
 g=turn(g,future,[event('relationship','date',future)]);
 assert.equal(g.narrative!.dates,0);assert.equal(g.narrative!.activeDate,undefined);
 assert.throws(()=>turn(g,'보관실로 가요.',[event('move','archive','보관실로 가요.')]));
 const enter='지금 여기서 데이트해요.';
 g=turn(g,enter,[event('relationship','date',enter)]);
 const startId=g.narrative!.activeDate!.eventId;
 assert.equal(g.narrative!.dates,0);
 g=await restored(g);
 const activity='지금 종이배를 접고 있어요.';
 const done=event('relationship','date','종이배 접기로 첫 데이트를 함께 경험함',{status:'fulfilled',reference:startId,evidence:activity});
 assert.throws(()=>turn(g,activity,[done])); // no NPC interaction
 assert.throws(()=>turn(g,'그냥 내일 할까요?',[{...done,evidence:'그냥 내일 할까요?'}],['유나가 종이를 편다.']));
 const refused=turn(g,'데이트는 그만할래요.',[event('relationship','date','데이트는 그만할래요.',{status:'refused',reference:startId})]);
 assert.equal(refused.narrative!.dates,0);assert.equal(refused.narrative!.activeDate,undefined);
 assert.throws(()=>turn(refused,activity,[done],['유나가 종이를 편다.']));
 const moved=turn(g,'옥상으로 가요.',[event('move','rooftop','옥상으로 가요.')]);
 assert.throws(()=>turn(moved,activity,[done],['유나가 종이를 편다.']));
 g=turn(g,activity,[done],['유나가 자기 종이배를 접어 테이블에 놓는다.']);
 assert.equal(g.narrative!.dates,1);assert.equal(g.narrative!.activeDate,undefined);
 assert.throws(()=>turn(g,activity,[done],['유나가 종이를 편다.']));
 assert.equal((await restored(g)).narrative!.dates,1);
 g=turn(g,'보관실로 가요.',[event('move','archive','보관실로 가요.')]);
 for(const status of ['offered','refused'] as const){
  const pending=turn(g,'원본을 찾아봐요.',[event('clue','cut','원본 편집 여부는 아직 미확인',{subject:'npc',status,evidence:''})]);
  assert.equal(pending.step,4);
  for(const value of ['reset','repeat','restore'])assert.throws(()=>turn(pending,'이대로 마무리해요.',[event('resolution',value,'이대로 마무리해요.',{subject:'player'})]));
 }
});

const alternatives=[
 ['오늘 18시 퇴근해요.','남은 표는 민지가 화요일 11시에 검수하고 음성 메모로 인계해요.'],
 ['회식 대신 내일 점심 산책에 참여해요.','회식 불참 불이익 없음으로 평가 기록을 남겨요.'],
 ['주말에는 일하지 않겠습니다.','장애는 지원조가 담당하고 월요일 11시에 녹화 인계해요.'],
 ['8월 20일부터 22일까지 휴가를 승인해 주세요.','지현이 19일에 영상으로 고객 문의를 인계받아요.'],
 ['분석표 출처 링크에 제 이름과 기여를 표시해요.','금요일 전체 공지로 부장님이 정정을 게시해요.'],
 ['회의 대신 문서 댓글로 논의해요.','오후 네 시에 부장님이 미결 안건을 결정해요.'],
 ['재고표는 지원팀에 넘기고 저는 녹화 교육만 제공해요.','본업 우선으로 부장님이 새 요청 순서를 조정해요.'],
 ['화요일과 목요일에 재택해요.','열한 시부터 세 시까지 연락하고 네 시에 결과를 공유해요.']
];
for(const [index,mission] of missions.entries())test(`AC3 ${mission.id}: accepted/refused alternative changes restored negotiation outcome`,async()=>{
 const initial=start('office',index),ctx=JSON.parse(messages(initial,'다른 방법을 제안해요.')[0].content);
 assert.ok(ctx.premise.intro);assert.ok(ctx.premise.objectives.every((t:any)=>t.goal&&t.resistance));
 const rows=[];
 for(const status of ['accepted','refused'] as const){
  let g:DialogueGame=initial;
  for(const [i,term] of mission.terms.entries())g=turn(g,alternatives[index][i],[event('concession',term.id,alternatives[index][i],{status})]);
  const beforeRestore=g;g=await restored(g);
  const followup='현재 조건을 확인하고 합의를 마무리해요.';
  const context=JSON.parse(messages(g,followup)[0].content);
  assert.deepEqual(context.story.events,g.narrative!.events);
  const end=event('resolution','success',followup,{subject:'player'});
  if(status==='accepted')assert.equal(turn(g,followup,[end]).ending,`office-${mission.id}-success`);
  else assert.throws(()=>turn(g,followup,[end]));
  rows.push({status,inputs:alternatives[index],beforeRestore,restored:g,followup,providerContext:context,canResolve:status==='accepted'});
 }
 await writeFile(`docs/v2-ac3-${mission.id}-state-trace.json`,JSON.stringify({scope:'Mocked proposals, real reducer and disk storage; not model conversation quality',mission:mission.id,problem:ctx.premise,rows},null,2));
});

test('AC3 attributed preferences, third-party name, accepted promise and refusal survive 14 turns and restore',async()=>{
 const input='저는 민입니다. 배를 좋아해요. 제 동료 이름은 지현이에요.';
 let g=turn(start('romance'),input,[event('detail','player-preference','플레이어 민은 배를 좋아함',{subject:'player',evidence:input}),event('detail','colleague','플레이어의 동료 이름은 지현',{subject:'player',evidence:input}),event('detail','npc-preference','유나는 시나몬 향을 좋아함',{subject:'npc',evidence:''}),event('promise','pear','유나가 배를 가져오겠다고 제안',{subject:'npc',status:'offered',evidence:''}),event('invitation','record','유나가 목소리 녹음을 제안',{subject:'npc',status:'offered',evidence:''})]);
 const original=structuredClone(g),promise=g.narrative!.events.find(e=>e.kind==='promise')!,invite=g.narrative!.events.find(e=>e.kind==='invitation')!;
 g=turn(g,'좋아요. 배를 가져와 주세요.',[event('promise','pear','배 약속 수락',{subject:'player',reference:promise.id,evidence:'배를 가져와 주세요.'})]);
 g=turn(g,'목소리 녹음은 거절합니다.',[event('invitation','record','녹음 제안 거절',{subject:'player',status:'refused',reference:invite.id,evidence:'목소리 녹음은 거절합니다.'})]);
 for(let i=0;i<11;i++)g=turn(g,`오늘의 다른 소리 이야기 ${i}`);
 assert.equal(g.narrative!.turn,14);g=await restored(g);
 const context=JSON.parse(messages(g,'약속한 배를 가져왔어요?')[0].content);
 for(const detail of original.narrative!.events.filter(e=>e.kind==='detail'))assert.deepEqual(context.story.events.find((e:any)=>e.id===detail.id),detail);
 assert.ok(context.playerStatements.some((s:any)=>s.text===input));
 assert.throws(()=>turn(g,'그 이야기를 기억해요.',[event('invitation','record','목소리를 녹음함',{subject:'npc',status:'fulfilled',reference:invite.id,evidence:''})]));
 const used=original.narrative!.events.filter(e=>e.kind==='detail').map(e=>e.id);
 const response={...reply([event('promise','pear','유나가 민을 위해 배를 꺼냄',{subject:'npc',status:'fulfilled',reference:promise.id,evidence:''})],['유나가 배를 테이블에 놓는다.']),recall:used,line:'민 씨는 배, 저는 시나몬 향이죠. 동료 지현 씨 이름도 기억해요. 녹음은 하지 않을게요.'};
 g=commitDialogue(g,null,'약속한 배를 가져왔어요?',response);
 assert.deepEqual([...g.dialogue!.ledger].reverse().find(e=>e.kind==='model_dialogue')!.recallIds,used);
 assert.ok(g.narrative!.events.some(e=>e.reference===promise.id&&e.status==='fulfilled'));
 await writeFile('docs/v2-ac3-memory-trace.json',JSON.stringify({scope:'Deterministic attribution/recall plumbing, not live model memory ability',original,context,response,restoredAfterUse:await restored(g)},null,2));
});
