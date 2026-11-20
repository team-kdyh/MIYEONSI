// Explicit opt-in only: not part of npm test or Playwright. Reserves every paid attempt.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
if(process.argv[2]!=='--execute-authorized-smoke')throw Error('Explicit smoke flag required');
const ledgerPath='docs/api-smoke-ledger.json';const lock=await open(ledgerPath+'.lock','wx');
const budget=JSON.parse(await readFile(ledgerPath,'utf8'));
if(budget.paid_response_attempts+3>8){await lock.close();await rm(ledgerPath+'.lock');throw Error('This three-call batch exceeds the remaining total budget; no calls made');}
const dir=await mkdtemp(path.join(tmpdir(),'afterhours-live-'));
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),AFTERHOURS_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
let cookie='';const runs:any[]=[];
async function call(action='state',input?:object){const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:input?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:input?JSON.stringify(input):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,state:await r.json()};}
async function smoke(before:any,text:string,purpose:string){
 const ledger=JSON.parse(await readFile(ledgerPath,'utf8'));if(ledger.paid_response_attempts>=8)throw Error('Total paid attempt budget exhausted');
 const attempt={id:++ledger.paid_response_attempts,mode:before.game.mode,purpose,provider:'openai',reservedAt:new Date().toISOString(),max_output_tokens:700,result:'reserved',latencyMs:0};ledger.attempts.push(attempt);await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
 const input={text,choice:null,step:before.game.step,version:before.game.dialogue.version,requestId:`paid-smoke-${attempt.id}-${Date.now()}`};const started=Date.now();
 try{const response=await call('turn',input);attempt.result=response.status===200?'pass':'failed';runs.push({attempt:attempt.id,purpose,provider:'openai',initial:before,input,response});return response.state;}
 catch{attempt.result='transport-failure';runs.push({attempt:attempt.id,purpose,result:'transport-failure'});return before;}
 finally{attempt.latencyMs=Date.now()-started;await writeFile(ledgerPath,JSON.stringify(ledger,null,2));}
}
try{
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('server exit'));});});
 await call();await call('provider',{provider:'openai'});
 const office=(await call('new',{mode:'office'})).state;
 await smoke(office,'고객 마감 메일은 내일 오전 10시입니다. 오늘 18시에 퇴근하겠습니다. 제 가방도 야근 수당을 요구하네요.','office contextual Korean speech + validated agreement');
 const romance=(await call('new',{mode:'romance'})).state;
 const next=await smoke(romance,'종소리를 같이 듣고 싶어요. 저는 빗소리를 들으며 귤을 까 먹는 걸 좋아해요. 유나 씨는 어떤 소리가 좋아요?','romance original speech responding to personal detail');
 if(next?.game)await smoke(next,'제가 좋아하는 소리와 간식 기억나요? 아까 함께 들었던 소리도 기억해요?','romance history detail and canonical recall');
 const files=['server/provider.ts','server/dialogue.ts','server/index.ts','tests/live-smoke.ts'];const codeVersion=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
 await writeFile('docs/ac7-live-evidence.json',JSON.stringify({criterion:7,executedAt:new Date().toISOString(),codeVersion,scope:'three targeted public API turns; not full-path live verification',runs},null,2));
 console.log(JSON.stringify(runs.map(r=>({attempt:r.attempt,status:r.response?.status,reply:r.response?.state?.game?.dialogue?.reply,error:r.response?.state?.error}))));
}finally{if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}await lock.close();await rm(ledgerPath+'.lock');await rm(dir,{recursive:true,force:true});}
