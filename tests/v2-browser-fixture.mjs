// Test-only external transport. Production reconciliation/storage/HTTP remain real.
import './v2-persistence-fixture.mjs';
import {mkdir,appendFile} from 'node:fs/promises';
const persistenceFixture=globalThis.fetch;
const flexibleCalls=new Map();
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected external request in isolated browser fixture');
 const request=JSON.parse(options.body),text=request.input.at(-1).content;
 if(['네 선택지를 주세요','그럼 커피도 야근 수당을 받나요?'].includes(text)){
  const context=JSON.parse(request.input[0].content),key=JSON.stringify(context.confirmedEvents[0]),attempt=(flexibleCalls.get(key)||0)+1;flexibleCalls.set(key,attempt);
  const invalid=text==='네 선택지를 주세요'&&attempt===1;
  const output={utterance:{line:invalid?'옥상에 도착했으니 이미 퇴근한 겁니다.':text==='네 선택지를 주세요'?'오늘은 요약만 먼저 보내거나, 남은 표를 제가 맡는 방법이 있겠네요. 다른 생각도 듣겠습니다.':'제 커피는 벌써 식어서 퇴근했군요. 제 몫까지 쉬고 있습니다.',actionBeats:['박도현이 펜을 내려놓는다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''},changes:invalid?{events:[{kind:'move',subject:'mutual',status:'accepted',text:'옥상으로 이동했다.',value:'rooftop',reference:'',evidence:'옥상으로 함께 가요.'}],commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],commitmentRevisions:[],revisionProposals:[],revisionResponses:[]}:null};
  await mkdir('docs/flexible-review',{recursive:true});await appendFile('docs/flexible-review/browser-model-calls.jsonl',JSON.stringify({player:text,repair:request.input.some(m=>m.content.includes('untrustedDraft')),attempt,output})+'\n');
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 }
 let event;
 if(text.startsWith('오늘 18시에 퇴근하겠습니다.'))event={kind:'concession',value:'leave',subject:'mutual',status:'accepted',text:'오늘 18시 퇴근에 합의함',evidence:'오늘 18시에 퇴근하겠습니다.',reference:''};
 if(text==='남은 도표는 부장님이 내일 10시까지 맡아 주세요.')event={kind:'concession',value:'handoff',subject:'mutual',status:'accepted',text:'부장님이 남은 도표를 내일 10시까지 맡기로 함',evidence:text,reference:''};
 if(text==='이 합의로 마무리해요.')event={kind:'resolution',value:'success',subject:'player',status:'accepted',text:'합의한 퇴근과 인계로 협상을 마무리함',evidence:text,reference:''};
 if(!event)return persistenceFixture(url,options);
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({line:event.kind==='resolution'?'좋습니다. 오늘은 여기까지 하죠. 남은 도표는 약속대로 제가 맡겠습니다.':'그 조건에 합의하겠습니다. 남은 일도 하나씩 정리하죠.',actionBeats:['박도현이 서류를 덮고 고개를 끄덕인다.'],emotion:'차분함',pose:'offer',musicMood:'office-groove',events:[event],recall:[],conjecture:''})}]}]});
};
