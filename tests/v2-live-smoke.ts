// Explicit paid QA only; never discovered by npm test / Playwright.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
if(process.argv[2]!=='--execute-authorized-smoke')throw Error('Explicit authorization flag required');
const root='.ralph/v2-qa';await mkdir(root,{recursive:true});
const ledgerPath='docs/v2-api-smoke-ledger.json';
const lock=await open(ledgerPath+'.lock','wx');
const hashes=Object.fromEntries(await Promise.all(['server/provider.ts','server/narrative.ts','server/game.ts','server/dialogue.ts','server/index.ts','server/storage.ts','src/main.tsx','src/style.css','tests/v2-live-smoke.ts'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const sessionPath=root+'/session.json';
let session={cookie:''};try{session=JSON.parse(await readFile(sessionPath,'utf8'));}catch{}
const plan=JSON.parse(await readFile(process.argv[3],'utf8'));
const child=spawn(process.execPath,['--import','tsx','tests/v2-live-server.ts'],{env:{...process.env,PORT:'3049',OPENAI_MODEL:'gpt-4.1',AFTERHOURS_DATA_DIR:root+'/data',V2_RAW_PATH:root+'/raw.json'},stdio:['ignore','pipe','pipe']});
async function call(action='state',input?:object){
 const r=await fetch('http://127.0.0.1:3049/api/'+action,{method:input?'POST':'GET',headers:{cookie:session.cookie,'content-type':'application/json'},body:input?JSON.stringify(input):undefined});
 session.cookie=r.headers.get('set-cookie')?.split(';')[0]||session.cookie;
 await writeFile(sessionPath,JSON.stringify(session));
 return {status:r.status,state:await r.json()};
}
try{
 await Promise.race([once(child.stdout!,'data'),once(child,'exit').then(()=>{throw Error('server exited');}),new Promise((_,reject)=>setTimeout(()=>reject(Error('startup timeout')),10000).unref())]);
 for(const step of plan){
  if(step.action!=='turn'){const r=await call(step.action,step.input);if(r.status!==200)throw Error(JSON.stringify(r));console.log(step.action,r.status);continue;}
  const before=await call();if(before.state.provider!=='openai')throw Error('OpenAI must be the configured default');
  const ledger=JSON.parse(await readFile(ledgerPath,'utf8'));
  if(ledger.phaseLimit!==32||ledger.attempts.length>=32)throw Error('Phase budget exhausted');
  const attempt={id:ledger.attempts.length+1,reservedAt:new Date().toISOString(),owner:'AC7 final conversational QA',purpose:step.purpose,maxOutputTokens:1600,result:'reserved',latencyMs:0,hashes};
  ledger.attempts.push(attempt);await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  const input={text:step.text,step:before.state.game.step,version:before.state.game.dialogue.version,requestId:'v2-paid-'+attempt.id+'-'+Date.now()};
  const started=Date.now();let response:unknown;
  try{
   await unlink(root+'/raw.json').catch(()=>{});
   response=await call('turn',input);
   attempt.result=(response as any).status===200?'committed':'failed';
  }catch{attempt.result='transport-failure';}
  attempt.latencyMs=Date.now()-started;await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  let raw;try{raw=JSON.parse(await readFile(root+'/raw.json','utf8'));}catch{}
  await writeFile(`docs/v2-live-${String(attempt.id).padStart(2,'0')}.json`,JSON.stringify({attempt,before,input,response,raw},null,2));
  const result=response as any;
  console.log(JSON.stringify({id:attempt.id,result:attempt.result,latencyMs:attempt.latencyMs,line:result?.state?.game?.dialogue?.reply,error:result?.state?.error,story:result?.state?.game?.narrative&&{turn:result.state.game.narrative.turn,relationship:result.state.game.narrative.relationship,location:result.state.game.narrative.location,events:result.state.game.narrative.events.filter((e:any)=>e.turn===result.state.game.narrative.turn)},ending:result?.state?.game?.ending}));
  if(attempt.result!=='committed')throw Error('Stopped on failed attempt; inspect preserved evidence before spending more');
 }
}finally{
 if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
 await lock.close();await unlink(ledgerPath+'.lock');
}
