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
 const line=question?'급한 숫자만 먼저 보내거나, 검토할 항목을 줄일 수 있어요.':'그 방법이면 부담이 줄겠네요.';
 const draft={utterance:{line,actionBeats:['서류를 들고 귀를 기울인다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''},changes:null,battle:question?null:{kind:'persuasion',target:'leave',argument:'alternative',repeatOf:'',reason:'제안한 방법이 업무 부담을 줄였다.',concessionIndex:-1,pressureId:'',premises:[]}};
 if(text.includes('마지막'))writeFileSync(clock,String(Date.now()+2000));
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
};
