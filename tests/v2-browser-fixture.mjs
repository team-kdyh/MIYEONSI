// Test-only external transport. Production reconciliation/storage/HTTP remain real.
import './v2-persistence-fixture.mjs';
const persistenceFixture=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected external request in isolated browser fixture');
 const request=JSON.parse(options.body),text=request.input.at(-1).content;
 let event;
 if(text.startsWith('오늘 18시에 퇴근하겠습니다.'))event={kind:'concession',value:'leave',subject:'mutual',status:'accepted',text:'오늘 18시 퇴근에 합의함',evidence:'오늘 18시에 퇴근하겠습니다.',reference:''};
 if(text==='남은 도표는 부장님이 내일 10시까지 맡아 주세요.')event={kind:'concession',value:'handoff',subject:'mutual',status:'accepted',text:'부장님이 남은 도표를 내일 10시까지 맡기로 함',evidence:text,reference:''};
 if(text==='이 합의로 마무리해요.')event={kind:'resolution',value:'success',subject:'player',status:'accepted',text:'합의한 퇴근과 인계로 협상을 마무리함',evidence:text,reference:''};
 if(!event)return persistenceFixture(url,options);
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({line:event.kind==='resolution'?'좋습니다. 오늘은 여기까지 하죠. 남은 도표는 약속대로 제가 맡겠습니다.':'그 조건에 합의하겠습니다. 남은 일도 하나씩 정리하죠.',actionBeats:['박도현이 서류를 덮고 고개를 끄덕인다.'],emotion:'차분함',pose:'offer',musicMood:'office-groove',events:[event],recall:[],conjecture:''})}]}]});
};
