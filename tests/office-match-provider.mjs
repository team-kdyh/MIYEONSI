// Runs only in the isolated test server. Freeze its clock and intercept every provider request.
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';
const dir=process.env.AFTERHOURS_MATCH_FIXTURE;
const clock=path.join(dir,'clock'),calls=path.join(dir,'calls');
Date.now=()=>Number(readFileSync(clock,'utf8'));
globalThis.fetch=async(url,opts)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected test network');
 const body=JSON.parse(opts.body),text=body.input.at(-1).content;
 appendFileSync(calls,JSON.stringify(body.input)+'\n');
 const question=text.endsWith('?');
 const line=text==='숫자는 보냈고 보고서는 내일 드릴게요.'?'보고서는 내일 받죠. 오늘은 퇴근하세요.':question?'급한 숫자만 먼저 보내거나, 검토할 항목을 줄일 수 있어요.':'그 방법이면 부담이 줄겠네요.';
 const draft={utterance:{line,actionBeats:['서류를 들고 귀를 기울인다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''},changes:null,battle:question?null:{kind:'persuasion',target:'leave',argument:'alternative',repeatOf:'',reason:'제안한 방법이 업무 부담을 줄였다.',concessionIndex:-1,pressureId:'',premises:[]}};
 if(text==='몇 시예요?')Object.assign(draft.utterance,{pose:'watch',line:'셔틀이 곧 오겠네요.',actionBeats:['손목시계를 내려다본다.']});
 if(text==='휴가 중 고객 문의는 어떻게 나눌까요?'){
  draft.utterance.line='고객이 자주 묻는 내용은 인수인계 노트에 적어 두면 돼요. 급한 전화만 제가 받고 나머지는 돌아온 뒤 확인하는 방법이 있어요. 팀원끼리 하루씩 연락을 맡는 방법도 있고요. 첫 번째는 제 쪽 부담이 크고, 두 번째는 매일 담당이 바뀌니 서로 전달할 게 늘어요.';
 }
 if(text==='네 그럼 부장님께 맡기겠습니다.'){
  const schema=body.text.format.schema.properties;
  if(schema.battle.type==='null'&&schema.changes.anyOf.every(v=>v.type==='null')&&schema.utterance.properties.recall.maxItems===0){
   draft.utterance.line='급한 전화는 제 자리로 돌려도 돼요. 자주 연락 오는 거래처 이름만 같이 짚어 봅시다.';
   draft.battle=null;
  }else{
   draft.utterance.line='이미 휴가 승인 메일이 왔군요.';
   draft.battle={...draft.battle,target:'cover',argument:'evidence',premises:[{id:'missing-approval',quote:'승인'}]};
  }
 }
 if(text.includes('마지막'))writeFileSync(clock,String(Date.now()+2000));
 if(text==='점검을 금요일에 자동으로 돌리면 주말에는 쉬어도 될까요?'){
  draft.utterance.line='주말 잘 쉬고 오세요. 다음 주엔 좋은 소식도 좀 들고 오시고요.';
  draft.battle={kind:'persuasion',target:'rest',argument:'alternative',repeatOf:'',reason:'금요일 자동 점검으로 주말 당번의 일을 앞당겼다.',concessionIndex:-1,pressureId:'',premises:[]};
  draft.feedback={playerQuote:'금요일에 자동으로',bossQuote:'주말 잘 쉬고 오세요',explanation:'점검을 금요일에 자동 실행한다는 제안 덕분에 부장이 주말 근무 요구를 거뒀습니다.'};
 }
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
};
