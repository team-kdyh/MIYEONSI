// Tests only: intercept every model call, keep the production HTTP/storage/reducer.
import {readFile,appendFile} from 'node:fs/promises';
const counts=new Map();
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected external request');
 const config=JSON.parse(await readFile(process.env.FLEX_CASE_FILE,'utf8')),body=JSON.parse(options.body),n=(counts.get(config.id)||0)+1;counts.set(config.id,n);
 await appendFile(process.env.FLEX_TRACE_FILE,JSON.stringify({case:config.id,attempt:n,player:body.input.at(-1).content,story:JSON.parse(body.input[0].content).story,repair:body.input.some(m=>m.role==='developer'&&m.content.includes('untrustedDraft')),maxTokens:body.max_output_tokens})+'\n');
 if(config.mode==='cancel'&&n===2)return new Promise((_resolve,reject)=>{const abort=()=>reject(new DOMException('Aborted','AbortError'));if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});});
 const invalid=config.mode==='always-invalid'||config.mode!=='conversation'&&n===1;
 const output={utterance:{line:invalid?'옥상에 도착했으니 이미 퇴근한 겁니다.':'오늘은 요약만 먼저 보내거나, 남은 표를 제가 맡는 방법이 있겠네요. 다른 생각도 듣겠습니다.',actionBeats:['박도현이 서류를 내려놓는다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''},changes:invalid?{events:[{kind:'move',subject:'mutual',status:'accepted',text:'옥상으로 이동했다.',value:'rooftop',reference:'',evidence:'옥상으로 같이 가요.'}],commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],commitmentRevisions:[],revisionProposals:[],revisionResponses:[]}:null};
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
};
