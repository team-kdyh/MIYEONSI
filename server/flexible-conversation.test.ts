import {test} from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {canonical,commitDialogue,type DialogueGame} from './dialogue.ts';
import {conversationSchema,decodeConversation} from './conversation-response.ts';
import {conversationTurn,MAX_GENERATION_ATTEMPTS} from './conversation-turn.ts';
import {ReplyRejectedError} from './reply-error.ts';
import {messages} from './provider.ts';
const utterance=(line:string)=>({line,actionBeats:['박도현이 펜을 돌린다.'],emotion:'호기심',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''});
const wire=(line:string,changes:object|null=null)=>({utterance:utterance(line),changes:changes===null?null:{events:[],commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],commitmentRevisions:[],revisionProposals:[],revisionResponses:[],...changes}});
const invalid={events:[{kind:'move',subject:'mutual',text:'옥상에 도착했다.',status:'accepted',value:'rooftop',reference:'',evidence:'옥상으로 같이 가요.'}]};
const originalKey=process.env.OPENAI_API_KEY;
async function generate(g:DialogueGame,text:string,outputs:unknown[],extra:{signal?:AbortSignal;reserve?:(attempt:number)=>Promise<void>}={}){
 const calls:any[]=[],reserved:number[]=[];process.env.OPENAI_API_KEY='mock-flexible-no-network';
 const fetcher:typeof fetch=async(_url,options)=>{calls.push(JSON.parse(options!.body as string));const value=outputs[Math.min(calls.length-1,outputs.length-1)];if(value instanceof Response)return value;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});};
 try{const result=await conversationTurn(g,text,'flexible-request-001','openai',extra.signal??new AbortController().signal,async n=>{reserved.push(n);await extra.reserve?.(n);},fetcher);return {result,calls,reserved};}
 finally{if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
}
test('conversation envelope omits all transaction fields for ordinary speech and rejects crossed fields',()=>{
 const s=conversationSchema(start('office'));assert.equal(s.additionalProperties,false);assert.deepEqual(s.properties.changes.anyOf[0],{type:'null'});
 const r=decodeConversation(wire('방법부터 말씀드리죠.'));assert.deepEqual(r.events,[]);assert.ok(!('commitmentOffers' in r));
 assert.throws(()=>decodeConversation({utterance:{...utterance('말'),events:[]},changes:null}));
 assert.throws(()=>decodeConversation(wire('말',{events:[],line:'대사 덮어쓰기'})));
 assert.throws(()=>decodeConversation({...wire('말'),ending:'win'}));
});
test('asking for alternatives, joking, hesitation and a topic change persist without objective progress or repair',async()=>{
 let g:DialogueGame=start('office');const inputs=['네 선택지를 주세요','부장님 커피도 야근 수당 받아요?','잘 모르겠어요. 잠깐 생각해 볼게요.','그런데 창밖에 무지개 보셨어요?'];
 for(const [i,input] of inputs.entries()){
  const line=['오늘은 요약만 보내거나 남은 표를 제가 맡는 방법이 있겠네요. 다른 생각도 듣겠습니다.','제 커피는 벌써 식어서 퇴근했군요.','서두르지 말죠. 저도 보고서가 왜 이렇게 두꺼운지 생각 좀 하겠습니다.','먹구름 사이에 저런 게 있었군요. 잠깐 보죠.'][i];
  const {result,calls,reserved}=await generate(g,input,[wire(line)]);assert.equal(calls.length,1);assert.deepEqual(reserved,[0]);assert.equal(calls[0].input.at(-1).content,input);assert.equal(result.game.dialogue!.reply,line);assert.equal(result.game.ending,null);assert.equal(result.game.narrative!.events.filter(e=>e.kind==='concession').length,0);g=result.game;
 }
 assert.equal(canonical(g).version,4);assert.deepEqual(g.dialogue!.playerStatements!.map(p=>p.text),inputs);assert.equal(g.narrative!.location,'office');
});
test('invalid draft is re-authored internally from unchanged state and original input; only final dialogue is committed',async()=>{
 const g=start('office'),before=structuredClone(g),text='네 선택지를 주세요',bad=wire('옥상에 도착했으니 퇴근한 겁니다.',invalid),good=wire('오늘 요약만 보내거나 남은 표를 제가 맡는 방법이 있겠네요. 어떻게 생각하세요?');
 const {result,calls,reserved}=await generate(g,text,[bad,good]);
 assert.deepEqual(g,before);assert.equal(result.attempts,2);assert.deepEqual(reserved,[0,1]);assert.equal(canonical(result.game).version,1);assert.equal(result.game.narrative!.turn,1);assert.equal(result.game.narrative!.location,'office');assert.equal(result.game.ending,null);
 assert.deepEqual(calls.map(c=>c.input.at(-1).content),[text,text]);assert.deepEqual(JSON.parse(calls[0].input[0].content).story,JSON.parse(calls[1].input[0].content).story);
 const repair=JSON.parse(calls[1].input.at(-2).content);assert.match(repair.task,/사건만 지우고/);assert.deepEqual(repair.untrustedDraft,decodeConversation(bad));
 assert.equal(result.game.log.filter(l=>l.text===text).length,1);assert.ok(!JSON.stringify(result.game).includes(bad.utterance.line));assert.equal(result.game.dialogue!.reply,good.utterance.line);
 for(const call of calls){assert.equal(call.store,false);assert.equal(call.max_output_tokens,1600);}
});
test('repair cannot just delete rejected changes and retain the same spoken claim',async()=>{
 const g=start('office'),before=structuredClone(g),bad=wire('옥상에 도착했어요.',invalid);
 await assert.rejects(generate(g,'방법을 알려 주세요.',[bad,wire(bad.utterance.line)]),/다시 작성하지/);assert.deepEqual(g,before);
});
test('two invalid drafts stop without mutation; storage errors and network failures are not repair triggers',async()=>{
 const g=start('office'),before=structuredClone(g);let count=0;
 await assert.rejects(generate(g,'방법을 알려 주세요.',[wire('없는 장면',invalid)],{reserve:async()=>{count++;}}),ReplyRejectedError);assert.equal(count,MAX_GENERATION_ATTEMPTS);assert.deepEqual(g,before);
 count=0;await assert.rejects(generate(g,'질문',[new Response('',{status:429})],{reserve:async()=>{count++;}}),/429/);assert.equal(count,1);
 count=0;await assert.rejects(generate(g,'질문',[wire('대사')],{reserve:async()=>{count++;throw Error('storage unavailable');}}),/storage unavailable/);assert.equal(count,1);assert.deepEqual(g,before);
});
test('abort before repair generation and explicit model refusal never issue another request',async()=>{
 const controller=new AbortController();let reserved=0;
 await assert.rejects(generate(start('office'),'질문',[wire('잘못된 장면',invalid)],{signal:controller.signal,reserve:async attempt=>{reserved++;if(attempt===1)controller.abort();}}),{name:'AbortError'});assert.equal(reserved,2);
 let calls=0;process.env.OPENAI_API_KEY='mock-flexible-no-network';
 try{await assert.rejects(conversationTurn(start('office'),'질문','refused-001','openai',new AbortController().signal,async()=>{},async()=>{calls++;return Response.json({status:'completed',output:[{content:[{type:'refusal',refusal:'Declined'}]}]});}),ReplyRejectedError);assert.equal(calls,1);}
 finally{if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
});
test('genuine novel agreement still commits through the state engine and is available to following conversation',async()=>{
 const text='내일 오전에 민지에게 그래프 두 장만 넘기겠습니다.';
 const next=await generate(start('office'),text,[wire('좋습니다. 그 범위로 민지에게 인계하죠.',{events:[{kind:'concession',subject:'mutual',text:'민지에게 내일 오전 그래프 두 장만 인계',status:'accepted',value:'scope',reference:'',evidence:text}]})]);
 const remembered=messages(next.result.game,'그럼 커피 이야기도 해 볼까요?');assert.match(remembered[0].content,/그래프 두 장/);assert.equal(next.result.game.ending,null);assert.equal(next.result.game.narrative!.events.filter(e=>e.kind==='concession').length,1);
 // Even a valid-looking result cannot skip earned state or manufacture a couple.
 assert.throws(()=>commitDialogue(start('romance'),null,'네 선택지를 주세요',decodeConversation(wire('우리 사귀는 거예요.',{events:[{kind:'relationship',subject:'mutual',text:'사귀기로 함',status:'accepted',value:'couple',reference:'',evidence:'네 선택지를 주세요'}]}))));
});

test('repair preserves a real creative agreement while replacing an invalid extra transition atomically',async()=>{
 const g=start('office'),text='민지에게 내일 오전 그래프 두 장만 넘기겠습니다.';
 const agreement={kind:'concession',subject:'mutual',text:'민지에게 내일 오전 그래프 두 장만 인계',status:'accepted',value:'scope',reference:'',evidence:text};
 const {result}=await generate(g,text,[wire('그 범위로 인계하고 옥상에서 마저 이야기하죠.',{events:[agreement,...invalid.events]}),wire('좋습니다. 민지에게 내일 오전 그래프 두 장만 인계하는 것으로 하죠.',{events:[agreement]})]);
 assert.equal(result.attempts,2);assert.equal(result.game.narrative!.turn,1);assert.equal(result.game.narrative!.location,'office');assert.equal(result.game.narrative!.events.filter(e=>e.kind==='concession').length,1);assert.equal(result.game.dialogue!.playerStatements!.length,1);
});
