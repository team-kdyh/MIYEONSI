import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {missions} from './office.ts';
import {messages} from './provider.ts';
import type {EventProposal,NarrativeReply} from './narrative.ts';
const ev=(kind:EventProposal['kind'],value:string,text:string,extra:Partial<EventProposal>={}):EventProposal=>({kind,value,text,subject:'mutual',status:'accepted',evidence:text,reference:'',...extra});
const turn=(g:DialogueGame,text:string,events:EventProposal[]=[])=>commitDialogue(g,null,text,{line:'그 방법이라면 해 볼 수 있겠네요.',actionBeats:[],emotion:'생각',pose:'thinking',musicMood:g.mode==='office'?'office-groove':'cafe-warmth',events,recall:[],conjecture:''} satisfies NarrativeReply);
const plans=[
 ['18시 퇴근으로 해요.','남은 도표는 민지가 화요일 11시까지 원격으로 검토해요.'],
 ['회식 대신 점심 산책에 참여해요.','회식 불참 불이익 없음으로 성과 평가에 기록해요.'],
 ['주말에는 업무를 하지 않겠습니다.','장애는 지원조가 담당하고 월요일 11시에 음성 메모로 인계해요.'],
 ['8월 20일부터 22일까지 휴가를 승인해 주세요.','지현에게 19일에 녹화 설명으로 문의를 인계해요.'],
 ['분석표 출처에 제 기여와 이름을 링크해 주세요.','부장님이 금요일 전체 공지에 정정 내용을 올려 주세요.'],
 ['회의 대신 비동기 문서 댓글로 논의해요.','부장님이 오후 네 시에 미결 안건을 최종 결정해요.'],
 ['재고표는 지원팀에 넘기고 저는 녹화 교육 한 번을 제공해요.','본업 마감을 우선하고 새 요청 순서는 부장님이 조정해요.'],
 ['화요일과 목요일 재택으로 시험해요.','열한 시부터 세 시까지 연락하고 네 시에 결과를 공유해요.']
];
for(const [index,m] of missions.entries())test(`AC3 v2 ${m.id}: novel complete plan resolves its own objectives only`,()=>{
 let g:DialogueGame=start('office',index);
 const ctx=JSON.parse(messages(g,'다른 방법이 있어요.')[0].content);
 assert.deepEqual(ctx.premise.objectives.map((o:any)=>o.id),m.terms.map(t=>t.id));
 assert.ok(ctx.premise.objectives.every((o:any)=>o.resistance.length>0));
 for(let i=0;i<5;i++)g=turn(g,'커피도 출근 기록이 있나요?');
 assert.equal(g.ending,null);assert.equal(g.step,index);
 const close=()=>turn(g,'이 합의로 마무리해요.',[ev('resolution','success','이 합의로 마무리해요.',{subject:'player'})]);
 for(const [i,t] of m.terms.entries()){
  assert.throws(close);
  g=turn(g,plans[index][i],[ev('concession',t.id,plans[index][i])]);
 }
 assert.equal(close().ending,`office-${m.id}-success`);
});
function courtship(){
 let g:DialogueGame=start('romance');
 for(let i=0;i<3;i++)g=turn(g,'빗소리 이야기를 좀 더 해요.');
 g=turn(g,'친해진 것 같아요.',[ev('relationship','familiar','유나가 편안하게 웃음',{subject:'npc',evidence:''})]);
 g=turn(g,'더 알아가고 싶어요.',[ev('relationship','attracted','유나가 호감을 표현함',{subject:'npc',evidence:''})]);
 g=turn(g,'마음을 말해 줄래요?',[ev('relationship','confessed','유나가 좋아한다고 고백함',{subject:'npc',evidence:''})]);
 return g;
}
function archive(){
 let g=courtship();
 g=turn(g,'좋아요. 우리 사귀어요.',[ev('relationship','couple','좋아요. 우리 사귀어요.')]);
 g=turn(g,'오늘 여기서 같이 종이배를 접으며 데이트해요.',[ev('relationship','date','오늘 여기서 같이 종이배를 접으며 데이트해요.')]);
 const participation='종이배를 접었어요. 유나 씨 배는 어떤 모양이에요?';
 g=commitDialogue(g,null,participation,{line:'제 배는 조금 기울었네요.',actionBeats:['유나가 접은 종이배를 테이블에 놓는다.'],emotion:'기쁨',pose:'smile',musicMood:'cafe-warmth',events:[ev('relationship','date','함께 종이배를 비교함',{status:'fulfilled',reference:g.narrative!.activeDate!.eventId,evidence:'종이배를 접었어요.'})],recall:[],conjecture:''});
 g=turn(g,'보관실로 가요.',[ev('move','archive','보관실로 가요.')]);
 g=turn(g,'원본과 비교해 주세요.',[ev('clue','cut','원본의 거절 문장이 편집본에서 삭제됨',{subject:'npc',status:'fulfilled',evidence:''})]);
 return g;
}
test('AC3 v2 four thematic endings are earned and have distinct durable decisions',()=>{
 for(const [value,id] of [['reset','romance-0'],['repeat','romance-1'],['restore','romance-3']] as const){
  let g=archive();
  if(value==='restore')g=turn(g,'작업 일지도 비교해 주세요.',[ev('clue','responsibility','작업 일지에 유나의 삭제 작업이 남음',{subject:'npc',status:'fulfilled',evidence:''})]);
  const text=value==='reset'?'재생을 멈추고 새롭게 시작해요.':value==='repeat'?'그 반복을 계속해요.':'원본을 복원하고 다시 시작해요.';
  g=turn(g,text,[ev('resolution',value,text,{subject:'player'})]);
  assert.equal(g.ending,id);assert.equal(g.narrative!.events.at(-1)!.value,value);
  assert.throws(()=>turn(g,'계속해요.'));
 }
 let g=courtship();
 g=turn(g,'사귀고 싶지 않아요.',[ev('relationship','apart','사귀고 싶지 않아요.',{subject:'player'})]);
 for(let i=0;i<5;i++)g=turn(g,'오늘은 음악 얘기만 해요.');
 assert.equal(g.narrative!.relationship,'apart');assert.equal(g.narrative!.dates,0);
 g=turn(g,'여기서 관계를 끝낼게요.',[ev('resolution','leave','여기서 관계를 끝낼게요.',{subject:'player'})]);
 assert.equal(g.ending,'romance-2');
});
test('AC3 v2 refusal, repeated clue and same-turn relationship acceleration cannot earn romance',()=>{
 let g=archive();
 assert.throws(()=>turn(g,'원본을 복원해요.',[ev('resolution','restore','원본을 복원해요.',{subject:'player'})]));
 g=turn(g,'다시 비교해요.',[ev('clue','cut','같은 삭제 위치를 다시 확인함',{subject:'npc',status:'fulfilled',evidence:''})]);
 assert.throws(()=>turn(g,'원본을 복원해요.',[ev('resolution','restore','원본을 복원해요.',{subject:'player'})]));
 g=turn(g,'우리 헤어져요.',[ev('relationship','apart','우리 헤어져요.',{subject:'player'})]);
 assert.throws(()=>turn(g,'그 반복을 계속해요.',[ev('resolution','repeat','그 반복을 계속해요.',{subject:'player'})]));
 const c=courtship();
 assert.throws(()=>turn(c,'사귀고 싶지 않아요.',[ev('relationship','couple','사귀고 싶지 않아요.')]));
 assert.throws(()=>turn(c,'사귀고 데이트해요.',[ev('relationship','couple','사귀고 데이트해요.'),ev('relationship','date','사귀고 데이트해요.')]));
});

test('AC3 v2 generic bookkeeping cannot substitute for the mission objective',()=>{
 let g:DialogueGame=start('office',4);
 const text='메모는 민지가 내일 보내고 저는 여섯 시에 퇴근해요.';
 g=turn(g,text,['scope','owner','deadline','boundary'].map(value=>ev('concession',value,text)));
 assert.throws(()=>turn(g,'마무리해요.',[ev('resolution','success','마무리해요.',{subject:'player'})]));
});

test('QA consent clause keeps questions local and preserves refused separation',()=>{
 const g=courtship();
 const accepted=turn(g,'우리 사귀어요. 오늘 날씨는 어때요?',[ev('relationship','couple','연인이 됨',{evidence:'우리 사귀어요'})]);
 assert.equal(accepted.narrative!.relationship,'couple');
 const refused=turn(accepted,'헤어지고 싶지 않아요.',[ev('relationship','apart','이별',{subject:'player',status:'refused',evidence:'헤어지고 싶지 않아요.'})]);
 assert.equal(refused.narrative!.relationship,'couple');
 assert.equal(refused.narrative!.dates,accepted.narrative!.dates);
 assert.equal(refused.narrative!.events.at(-1)!.status,'refused');
 assert.equal(turn(accepted,'옥상으로 가요. 비가 올까요?',[ev('move','rooftop','옥상 이동',{evidence:'옥상으로 가요'})]).narrative!.location,'rooftop');
 assert.throws(()=>turn(accepted,'옥상으로 가요?',[ev('move','rooftop','옥상 이동',{evidence:'옥상으로 가요'})]));
});
test('QA repeated owned detail is idempotent and named player action fails closed',()=>{
 const detail=ev('detail','name','플레이어의 이름은 지호다.',{subject:'player',evidence:'저는 지호입니다.'});
 const g=turn(start('romance'),'저는 지호입니다.',[detail]);
 const again=turn(g,'제 이름 기억하죠?',[detail]);
 assert.equal(again.narrative!.events.filter(e=>e.value==='name').length,1);
 assert.throws(()=>commitDialogue(g,null,'카페가 조용하네요.',{line:'그렇네요.',actionBeats:['지호는 유나의 손을 잡는다.'],emotion:'차분',pose:'neutral',musicMood:'cafe-warmth',events:[],recall:[],conjecture:''}));
 assert.ok(turn(g,'카페가 조용하네요.').narrative);
});

test('QA live 02 creative office proposal is not negated by separate coffee joke',async()=>{
 const {readFile}=await import('node:fs/promises');
 const observation=JSON.parse(await readFile('docs/v2-live-02.json','utf8'));
 const reply=JSON.parse(observation.raw.body.output[0].content[0].text);
 const next=commitDialogue(observation.before.state.game,null,observation.input.text,reply);
 assert.equal(next.narrative!.events.filter(e=>e.kind==='concession').length,2);
});

test('QA live 03 pending concession remains pending, never earns an ending',async()=>{
 const {readFile}=await import('node:fs/promises');
 const observation=JSON.parse(await readFile('docs/v2-live-03.json','utf8'));
 const reply=JSON.parse(observation.raw.body.output[0].content[0].text);
 const next=commitDialogue(observation.before.state.game,null,observation.input.text,reply);
 assert.equal(next.narrative!.events.filter(e=>e.kind==='concession'&&e.status==='offered').length,1);
 assert.throws(()=>turn(next,'합의로 마무리해요.',[ev('resolution','success','합의로 마무리해요.',{subject:'player'})]));
});

test('QA player refusals survive beyond bounded chat history and reach provider separately',()=>{
 let g=turn(start('romance'),'제 목소리는 녹음하지 마세요.');
 for(let i=0;i<15;i++)g=turn(g,`다른 이야기 ${i}`);
 const context=JSON.parse(messages(g,'녹음할까요?')[0].content);
 assert.ok(context.playerStatements.some((e:any)=>e.text==='제 목소리는 녹음하지 마세요.'));
 assert.ok(!g.dialogue!.ledger.some(e=>e.text==='제 목소리는 녹음하지 마세요.'));
});

test('QA live 20 real prior familiarity may ground familiarity, never a later couple acceptance',async()=>{
 const {readFile}=await import('node:fs/promises');
 const o=JSON.parse(await readFile('docs/v2-live-20.json','utf8'));
 const r=JSON.parse(o.raw.body.output[0].content[0].text);
 assert.equal(commitDialogue(o.before.state.game,null,o.input.text,r).narrative!.relationship,'familiar');
 r.events[0].value='couple';assert.throws(()=>commitDialogue(o.before.state.game,null,o.input.text,r));
});
