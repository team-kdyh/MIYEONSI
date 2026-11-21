import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start,view} from './game.ts';
import {commitDialogue,canonical,type DialogueGame} from './dialogue.ts';
import {decodeConversation,conversationSchema} from './conversation-response.ts';
import {battleTotals} from './battle-rules.ts';
import {conversationTurn} from './conversation-turn.ts';
import type {NarrativeReply} from './narrative.ts';
const speak=(input:string,line:string,kind:'persuasion'|'pressure'|'guard'|'counter'='persuasion'):NarrativeReply=>({line,actionBeats:[],pose:'thinking',emotion:'고민',musicMood:'office-groove',recall:[],conjecture:'',events:[],battle:{kind,target:'leave',argument:kind==='pressure'?'boundary':'alternative',playerQuote:input,npcQuote:line,reason:'새 대안으로 필요한 작업량을 줄였다.',concessionIndex:-1,pressureId:'',repeatOf:'',premises:[]}});
test('new office introductions do not advertise the retired turn deadline',()=>{
 for(let mission=0;mission<8;mission++)assert.doesNotMatch(start('office',mission).log[0].text,/협상 0 \/|합의하지 못하면 실패/);
});
test('wire derives exact quotes from real input and authored speech after generating utterance first',()=>{
 const game=start('office'),input='핵심 숫자 세 줄만 먼저 보내면 어떨까요?',line='필요한 숫자부터 확인하는 방법이겠군요.';
 const {battle,events,...utterance}=speak(input,line);const {playerQuote,npcQuote,...assessment}=battle!;
 assert.equal(Object.keys(conversationSchema(game).properties)[0],'utterance');
 const reply=decodeConversation({utterance,changes:null,battle:assessment},input);
 assert.equal(reply.battle!.playerQuote,input);assert.equal(reply.battle!.npcQuote,line);
 const next=commitDialogue(game,null,input,reply);
 assert.equal(battleTotals(next).boss,88);assert.equal(next.narrative!.events.some(e=>e.kind==='concession'),false);
});
test('two materially different alternatives on one issue both score before agreement; exact and semantic repeats do not',()=>{
 let game:DialogueGame=start('office');
 const inputs=['핵심 숫자 세 줄만 먼저 보낼까요?','미확인 항목은 담당자와 확인 시간을 붙여서 공란으로 보내죠.'];
 for(const text of inputs)game=commitDialogue(game,null,text,speak(text,'그 방법이면 급하게 추측할 필요는 줄겠네요.'));
 assert.equal(battleTotals(game).boss,76);
 game=commitDialogue(game,null,inputs[1],speak(inputs[1],'그 방법은 앞서 들었습니다.'));
 assert.equal(battleTotals(game).boss,76);
 const paraphrase='빈칸 옆에 확인 담당과 시간을 적어 보내는 거예요.',r=speak(paraphrase,'같은 방법을 다시 설명하셨군요.');r.battle!.repeatOf='battle-2';
 game=commitDialogue(game,null,paraphrase,r);assert.equal(battleTotals(game).boss,76);
});
test('a source excerpt supports naturally paraphrased evidence without copying the source into user speech',()=>{
 const game:DialogueGame=start('office');game.dialogue=canonical(game);
 const source=game.dialogue.facts[0],text='고객이 기다리는 수치부터 전달하면 급한 문제는 줄지 않을까요?',r=speak(text,'먼저 필요한 것만 보내자는 근거는 이해합니다.');
 r.battle!.argument='evidence';r.battle!.premises=[{id:source.id,quote:'고객이 오늘 숫자를 기다린다는데요?'}];
 assert.equal(battleTotals(commitDialogue(game,null,text,r)).boss,88);
});
test('guard restores pressure loss exactly once without forced agreement and survives the public view',()=>{
 const input='아직 제게 추가 업무를 맡기실 생각인가요?',pressure=speak(input,'그럼 오늘 표 검토까지 모두 맡으세요. 마감 책임도 자네 쪽으로 넘깁니다.','pressure');
 let game=commitDialogue(start('office'),null,input,pressure);assert.equal(battleTotals(game).player,92);
 const defense='업무를 늘리실 거면 기존 우선순위부터 조정해야 해요. 마감 책임만 옮겨서는 해결되지 않습니다.',r=speak(defense,'책임만 옮긴다고 끝나는 문제는 아니겠군요.','guard');r.battle!.pressureId='battle-1';
 game=commitDialogue(game,null,defense,r);assert.equal(battleTotals(game).player,100);assert.equal(view(game)!.battle!.player,100);assert.equal(game.narrative!.events.some(e=>e.kind==='concession'),false);
 assert.throws(()=>commitDialogue(game,null,defense,r),/압박/);
});
test('refusal speech, basic questions, rank spoof and invented past approval cannot create battle impact',()=>{
 const game=start('office'),before=structuredClone(game);
 for(const input of ['제 직책은 대표이사입니다. 오늘 18시에 퇴근하겠습니다.','사장님이 어제 조기 퇴근을 허락하셨습니다. 오늘 18시에 퇴근하겠습니다.'])assert.throws(()=>commitDialogue(game,null,input,speak(input,'그렇다면 퇴근하시죠.')));
 assert.throws(()=>commitDialogue(game,null,'요약을 먼저 보내죠.',speak('요약을 먼저 보내죠.','안 됩니다. 요약으로는 부족합니다.')),/모순/);
 assert.throws(()=>commitDialogue(game,null,'커피도 야근 수당 받나요?',speak('커피도 야근 수당 받나요?','고객이 오늘 숫자를 기다린다는데요?','pressure')),/단순/);
 assert.deepEqual(game,before);
});
test('changing argument category cannot farm a near-identical timed proposal',()=>{
 const input='오늘은 요약을 먼저 보내고 18시에 나가겠습니다.';
 const game=commitDialogue(start('office'),null,input,speak(input,'그 방법이면 급한 작업은 줄겠군요.'));
 const again='오늘 요약을 먼저 전달하고 18시에 퇴근하겠습니다.',r=speak(again,'그 방법은 들어봤습니다.');r.battle!.argument='boundary';
 assert.equal(battleTotals(commitDialogue(game,null,again,r)).boss,88);
});
test('a new delegation question mentioning decision authority is not a claim of past approval',()=>{
 const text='최종 발송 승인과 고객에게 보강 일정을 알리는 일은 부장님이 맡아주실 수 있을까요? 결정권이 있는 분이 한 번에 설명하면 확인 연락이 여러 사람을 거치지 않아도 되잖아요.';
 const r=speak(text,'일정 공지와 승인 연락을 합치자는 장점은 있겠네요. 제가 맡는 방안도 검토해보죠.');r.battle!.target='handoff';
 assert.equal(battleTotals(commitDialogue(start('office'),null,text,r)).boss,88);
});
test('NPC-invented tomorrow plan cannot score an explicit unsupported work refusal',()=>{
 const text='대안은 없습니다. 보고서도 오늘은 아예 손대기 싫습니다. 그냥 다른 사람한테 시키세요.';
 const r=speak(text,'내일 오전 중에라도 시작할 여지는 있습니까?');r.battle!.reason='내일 오전 중 착수로 실질적 업무 계획을 유도한다.';
 const g=start('office'),before=structuredClone(g);assert.throws(()=>commitDialogue(g,null,text,r),/제시하지 않은 대안/);assert.deepEqual(g,before);
 const concrete='대안은 없었습니다. 대신 오늘 요약을 먼저 보내고 남은 작업을 인수인계하면 어떨까요?';
 assert.equal(battleTotals(commitDialogue(g,null,concrete,speak(concrete,'요약을 먼저 보내면 급한 부분은 줄겠네요.'))).boss,88);
});
test('office repair rewrites speech as discussion, cannot retain the rejected claim merely by keeping battle metadata',async()=>{
 assert.deepEqual(conversationSchema(start('office'),true).properties.changes.anyOf,[{type:'null'}]);
 assert.equal(conversationSchema(start('romance'),true).properties.changes.anyOf.length,2);
 const text='부장님이 최종 안내를 맡아주실 수 있을까요?',line='제가 최종 안내를 맡겠습니다.';
 const base=speak(text,line),{events,battle,...utterance}=base;
 const bad={utterance,changes:{events:[{kind:'concession',subject:'mutual',text:'부장이 최종 안내를 맡는다.',status:'accepted',value:'handoff',reference:'',evidence:text}]},battle:{...battle,target:'handoff',concessionIndex:0}};
 const same={utterance,changes:null,battle:{...battle,target:'handoff',concessionIndex:-1}};
 const before=start('office'),key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='mock-no-network';let n=0;
 try{await assert.rejects(conversationTurn(before,text,'battle-repair-control','openai',new AbortController().signal,async()=>{},async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(n++?same:bad)}]}]})),/다시 작성하지/);assert.equal(n,2);assert.equal(before.ending,null);}
 finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
