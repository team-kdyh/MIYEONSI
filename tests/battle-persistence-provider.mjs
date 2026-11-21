import {readFile,appendFile} from 'node:fs/promises';
import {battlePressure} from '../server/battle-rules.ts';
const counts=new Map();
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected network');
 const c=JSON.parse(await readFile(process.env.BATTLE_CASE_FILE,'utf8')),body=JSON.parse(options.body);
 const n=(counts.get(c.id)||0)+1;counts.set(c.id,n);
 await appendFile(process.env.BATTLE_CALLS_FILE,JSON.stringify({id:c.id,n})+'\n');
 if(c.mode==='cancel'&&n===2)return new Promise((_,reject)=>{const abort=()=>reject(new DOMException('Aborted','AbortError'));if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});});
 const invalid=c.mode==='invalid'||['repair','cancel'].includes(c.mode)&&n===1;
 const line=battlePressure(0,'leave')[c.level??0];
 const output={utterance:{line,actionBeats:[],emotion:'차분',pose:'listen',musicMood:'office-pressure',recall:[],conjecture:''},changes:null,battle:{kind:'pressure',target:invalid?'unknown':'leave',argument:'boundary',playerQuote:body.input.at(-1).content,npcQuote:line,reason:'퇴근 시각에 대한 강제 요구',concessionIndex:-1,pressureId:'',premises:[]}};
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
};
