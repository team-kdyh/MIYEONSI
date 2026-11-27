import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical,commitDialogue} from './dialogue.ts';
import {conversationTurn} from './conversation-turn.ts';
import {start,view} from './game.ts';
import {defaultSetup} from './office-match.ts';
import {isOfficeFarewell} from './office-closing.ts';
import {narrative,type NarrativeReply} from './narrative.ts';

const npc=(line:string):NarrativeReply=>({line,actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:'',events:[],battle:null});
const office=(step=0)=>start('office',step,defaultSetup);
const goodbye=(game:ReturnType<typeof office>)=>conversationTurn(game,'그럼 가보겠습니다.','closing-test','openai',new AbortController().signal,async()=>assert.fail('farewell contacted the provider'));

test('a goodbye closes each mission without fabricated consent, model dialogue or damage',async()=>{
 for(let i=0;i<8;i++){
  const before=commitDialogue(office(i),null,'어떤 방법이 있을까요?',npc('말씀해 보세요. 제가 들어 보죠.'));
  const {game,attempts}=await goodbye(before),result=view(game)!;
  assert.equal(attempts,0);assert.equal(before.ending,null);
  assert.equal(result.battle?.boss,100);assert.equal(result.review?.verdict,'대화 마침');
  assert.equal(result.review?.turns.at(-1)?.reply,'');assert.equal(result.review?.turns.at(-1)?.player,'그럼 가보겠습니다.');
  assert.equal(canonical(game).version,canonical(before).version+1);
  assert.deepEqual(canonical(game).facts,canonical(before).facts);
 }
});

test('clear permission opens the clock-out result with the actual boss line, including in an older open save',async()=>{
 const line='보고서는 제가 맡죠. 이제 퇴근하세요.';
 const finished=commitDialogue(office(),null,'오늘 요약은 전달했습니다.',npc(line));
 assert.equal(view(finished)?.review?.verdict,'설득 성공');assert.ok(view(finished)?.review?.reason.includes(line));
 const legacy=structuredClone(finished);legacy.ending=null;legacy.office!.outcome=null;legacy.log.pop();
 assert.equal((await goodbye(legacy)).game.ending,'office-clockout-success');
 assert.equal(commitDialogue(office(),null,'오늘 남은 일은 어쩌죠?',npc('먼저 퇴근하세요. 남은 건 제가 맡죠.')).ending,'office-clockout-success');
 for(const speech of ['다 끝내면 퇴근하세요.','“지금 퇴근하세요”라고 말한 적 없어요.','지금 퇴근하세요?','내일 퇴근하세요.','먼저 퇴근하세요. 아니, 잠깐만요.','회의실 문 열려 있어요. 들어가세요.','지금은 안 됩니다.']){
  const g=commitDialogue(office(),null,'오늘 갈 수 있을까요?',npc(speech));
  assert.equal(g.ending,null);assert.equal(view((await goodbye(g)).game)?.review?.verdict,'대화 마침');
 }
 assert.equal(commitDialogue(office(7),null,'내일 재택할까요?',npc(line)).ending,null);
});

test('quoted or conditional player farewells remain conversation, persisted concessions inform the final report',async()=>{
 for(const line of ['그럼 가보겠습니다.','네, 그럼 이만 들어갈게요!','대화를 여기서 마치겠습니다.','먼저 가볼게요. 감사합니다.'])assert.ok(isOfficeFarewell(line),line);
 for(const line of ['그럼 가보겠습니다?','“그럼 가보겠습니다.”라고 하면 돼요?','시간이 되면 가보겠습니다.','잠깐 거래처에 가보겠습니다.','아직 퇴근할 생각이 없어요.','오늘 18시에 퇴근하겠습니다.','감사합니다.'])assert.ok(!isOfficeFarewell(line),line);
 const g=office();g.narrative=narrative(g);
 const text='오늘은 요약을 먼저 보내고 18시에 나가겠습니다.';
 const agreed=commitDialogue(g,null,text,{...npc('그 요약이면 되겠어요. 시간을 그렇게 정하죠.'),events:[{kind:'concession',subject:'mutual',status:'accepted',value:'leave',text:'오늘 18시에 퇴근하기로 했다.',reference:'',evidence:text}]});
 const end=view((await goodbye(agreed)).game);
 assert.equal(end?.review?.verdict,'합의로 마무리');assert.match(end!.review!.reason,/18시/);
 assert.equal(end?.review?.score.total,55);
 const decision:NarrativeReply={...npc('그 시간으로 정하죠. 수고했어요.'),pose:'farewell',events:[{kind:'concession',subject:'mutual',status:'accepted',value:'leave',text:'오늘 18시에 퇴근하기로 했다.',reference:'',evidence:text}]};
 assert.equal(view(commitDialogue(g,null,text,decision))?.review?.verdict,'합의로 마무리');
 assert.equal(commitDialogue(g,null,text,{...decision,events:[]}).ending,null);
 assert.equal(commitDialogue(g,null,text,{...decision,line:'그 시간으로 할까요?',events:[]}).ending,null);
});
