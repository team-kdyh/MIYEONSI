// Explicit opt-in only. Never imported by npm test or the browser test suite.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,open,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {start} from '../server/game.ts';
import {commitDialogue} from '../server/dialogue.ts';

if(process.argv[2]!=='--execute-authorized-smoke')throw Error('Explicit smoke flag required');
const LIMIT=12;
const boundary='오늘은 야근을 할 수 없습니다. 요약본은 지금 보내고 여섯 시에 나가겠습니다.';
const mocked={line:'제안 내용을 확인해 보죠.',recall:[],conjecture:'',intent:'leave:summary'};
assert.equal(commitDialogue(start('office',0),null,boundary,mocked).office?.secured.leave,'오늘 18:00','Fix the known boundary regression before spending live attempts');
assert.deepEqual(commitDialogue(start('office',0),null,'요약본은 보내지 않겠습니다. 18시에 퇴근합니다.',mocked).office?.secured,{});

const ledgerPath='docs/api-smoke-ledger.json';
const lock=await open(ledgerPath+'.lock','wx');
const runs:any[]=[];
let child:ReturnType<typeof spawn>|undefined;
let directory:string|undefined;
const tempRoot=await realpath(tmpdir());
const files=['server/provider.ts','server/dialogue.ts','server/index.ts','server/interpretation.ts','server/office.ts','server/romance.ts','tests/final-live-smoke.ts'];
const codeVersion=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const persist=()=>writeFile('docs/final-live-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),codeVersion,scope:'four targeted real public API turns: two consecutive office turns and two consecutive romance turns, no offline prefix and no state injection; not every mission or ending live',runs},null,2));
try{
 const budget=JSON.parse(await readFile(ledgerPath,'utf8'));
 if(budget.maximum_paid_response_attempts!==LIMIT||budget.paid_response_attempts+4>LIMIT)throw Error('This four-call final batch exceeds the recorded successor budget; no calls made');
 directory=await mkdtemp(path.join(tempRoot,'afterhours-live-'));
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
 const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
 child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),AFTERHOURS_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});
 let cookie='';
 async function call(action='state',input?:object){
  const response=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:input?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:input?JSON.stringify(input):undefined});
  cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
  return {status:response.status,state:await response.json()};
 }
 async function smoke(before:any,text:string,purpose:string){
  const ledger=JSON.parse(await readFile(ledgerPath,'utf8'));
  if(ledger.paid_response_attempts>=LIMIT)throw Error('Total paid attempt budget exhausted');
  const attempt={id:++ledger.paid_response_attempts,mode:before.game.mode,purpose,provider:'openai',reservedAt:new Date().toISOString(),max_output_tokens:700,result:'reserved',latencyMs:0};
  ledger.attempts.push(attempt);await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  const input={text,choice:null,step:before.game.step,version:before.game.dialogue.version,requestId:`paid-smoke-${attempt.id}-${Date.now()}`};
  const started=Date.now();
  try{
   const response=await call('turn',input);
   attempt.result=response.status===200?'connection-and-schema-pass':'failed';
   runs.push({attempt:attempt.id,purpose,provider:'openai',initial:before,input,response});
   if(response.status!==200)throw Error(`Paid attempt ${attempt.id} failed with HTTP ${response.status}; remaining attempts preserved`);
   return response.state;
  }catch(error){
   if(attempt.result==='reserved'){attempt.result='transport-failure';runs.push({attempt:attempt.id,purpose,result:'transport-failure'});}
   throw error;
  }finally{
   attempt.latencyMs=Date.now()-started;
   await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
   await persist();
  }
 }
 await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('startup timeout')),10000);
  child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});
  child!.once('exit',()=>{clearTimeout(timer);reject(Error('server exit'));});
 });
 await call();await call('provider',{provider:'openai'});
 let office=(await call('new',{mode:'office'})).state;
 office=await smoke(office,boundary,'final: negative overtime boundary with positive summary and 18:00 proposal');
 office=await smoke(office,'남은 표는 내일 오전 열 시까지 부장님이 맡아서 마무리해 주세요.','final: natural handoff owner and deadline, consecutive office continuation');
 let romance=(await call('new',{mode:'romance'})).state;
 romance=await smoke(romance,'종소리는 같이 듣고 싶어요. 저는 빗소리를 들으며 귤을 까 먹는 걸 좋아해요.','final: natural first romance reply and player-specific preferences');
 romance=await smoke(romance,'제가 좋아한다던 소리와 간식이 뭐였죠? 유나 씨는 어떤 향을 좋아한다고 했나요? 헤드폰은 지금 돌려드릴게요.','final: uncoached role and preference recall with headphone return');
 console.log(JSON.stringify(runs.map(run=>({attempt:run.attempt,status:run.response?.status,reply:run.response?.state?.game?.dialogue?.reply,secured:run.response?.state?.game?.office?.secured,ending:run.response?.state?.game?.ending}))));
 assert.equal(office.game.ending,'office-clockout-success','The two natural office turns did not resolve the mission');
 assert.ok(romance.game.romance.facts.some((fact:any)=>fact.id==='headphone-return'),'Headphone return was not recognized');
}finally{
 if(child&&child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
 await lock.close();await rm(ledgerPath+'.lock');
 if(directory){
  const target=await realpath(directory),relative=path.relative(tempRoot,target);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||!path.basename(target).startsWith('afterhours-live-'))throw Error('Refusing cleanup outside the generated smoke directory');
  await rm(target,{recursive:true,force:true});
 }
}
