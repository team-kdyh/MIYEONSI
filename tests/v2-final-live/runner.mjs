// Explicit parent-only QA tool; intentionally outside normal test discovery.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {QA,preflight,validateRequest,acquireLock,reserveTurn,atomicJson,json,sourceHashes,sha,finalize,fail} from './guard.mjs';

async function startServer(root,token,model){
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
 const port=socket.address().port;await new Promise((resolve,reject)=>socket.close(error=>error?reject(error):resolve()));
 const child=spawn(process.execPath,['--import','tsx','tests/v2-final-live/server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,PORT:String(port),OPENAI_MODEL:model,AFTERHOURS_DATA_DIR:path.join(root,QA,'data'),AFTERHOURS_FINAL_QA_LOCK:token},stdio:['ignore','pipe','pipe']});
 child.on('error',()=>{});
 child.stderr.on('data',()=>{}); // Never surface child diagnostics or environment values.
 const childPath=path.join(root,QA,'child.json'),childInfo={pid:child.pid??null,port,lockToken:token,startedAt:new Date().toISOString()};
 const stop=async()=>{
  try{
   if(child.pid&&child.exitCode===null&&child.signalCode===null){const exit=once(child,'exit');child.kill();await Promise.race([exit,new Promise((_,reject)=>setTimeout(()=>reject(Error('CHILD_STOP_TIMEOUT')),10000).unref())]);}
   await atomicJson(childPath,{...childInfo,stoppedAt:new Date().toISOString(),exitCode:child.exitCode,signalCode:child.signalCode});
  }catch(error){error.retainQaLock=true;throw error;}
 };
 try{
  await Promise.all([atomicJson(childPath,childInfo),new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('CHILD_START_TIMEOUT')),10000);
   child.once('error',()=>{clearTimeout(timer);reject(Error('CHILD_START_FAILED'));});
   child.once('exit',()=>{clearTimeout(timer);reject(Error('CHILD_EXITED'));});
   child.stdout.on('data',chunk=>{if(String(chunk).includes(`AFTER HOURS http://127.0.0.1:${port}`)){clearTimeout(timer);resolve();}});
  })]);
  return {port,stop};
 }catch(error){await stop();throw error;}
}
export function commitEvidenceIssues({attempt,before,response,after,raw,upstreamMarker}){
 const issues=[];
 const output=Array.isArray(raw?.body?.output)?raw.body.output:[];
 const hasText=output.some(item=>Array.isArray(item?.content)&&item.content.some(part=>part?.type==='output_text'&&typeof part.text==='string'&&part.text.length>0));
 if(upstreamMarker!==attempt.nonce||raw?.attemptId!==attempt.id||raw?.phase!=='response'||raw?.status!==200||raw?.body?.status!=='completed'||typeof raw?.body?.id!=='string'||!raw.body.id||!hasText)issues.push('missing_completed_upstream_evidence');
 if(response?.status!==200||response?.state?.provider!=='openai')issues.push('local_response_not_live_success');
 if(after?.status!==200||after?.state?.provider!=='openai')issues.push('missing_persisted_after_state');
 const version=before?.state?.game?.dialogue?.version,turn=before?.state?.game?.narrative?.turn;
 if(response?.state?.game?.dialogue?.version!==version+1||after?.state?.game?.dialogue?.version!==version+1||response?.state?.game?.narrative?.turn!==turn+1||after?.state?.game?.narrative?.turn!==turn+1)issues.push('expected_turn_not_persisted');
 if(!isDeepStrictEqual(response?.state?.game,after?.state?.game)||!isDeepStrictEqual(response?.state?.collection,after?.state?.collection))issues.push('response_after_state_mismatch');
 return issues;
}
export async function runAuthorizedAction(root,request,effects={startServer,fetch:(...args)=>globalThis.fetch(...args)}){
 validateRequest(request);
 // No directory mutation, child process, socket or HTTP request before this gate.
 await preflight(root,{requireCapacity:request.action==='turn'});
 const lock=await acquireLock(root);let server,retainLock=false;
 try{
  const gate=await preflight(root,{requireCapacity:request.action==='turn'});
  const qaRoot=path.join(root,QA);await mkdir(path.join(qaRoot,'profiles'),{recursive:true});
  const sessionPath=path.join(qaRoot,'profiles',request.profile+'.json');
  let cookie='';try{const session=await json(sessionPath);if(!/^afterhours=[a-f0-9]{48}$/.test(session.cookie))fail('INVALID_QA_SESSION');cookie=session.cookie;}catch(error){if(error.code!=='ENOENT')throw error;}
  // Any stale permit is closed before a server starts. Reservations are never reset.
  await unlink(path.join(qaRoot,'permit.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
  server=await effects.startServer(root,lock.token,gate.ledger.candidate.model);
  const call=async(action='state',body)=>{
   const response=await effects.fetch(`http://127.0.0.1:${server.port}/api/${action}`,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(45000),headers:{cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
   const nextCookie=response.headers.get('set-cookie')?.split(';')[0];
   if(nextCookie){if(!/^afterhours=[a-f0-9]{48}$/.test(nextCookie))fail('INVALID_QA_SESSION');cookie=nextCookie;await atomicJson(sessionPath,{cookie});}
   return {status:response.status,state:await response.json()};
  };
  const before=await call();if(before.status!==200)fail('INITIAL_STATE_UNAVAILABLE');
  if(request.action!=='turn'){
   const input=request.action==='new'?{mode:request.mode,...(request.mission===undefined?{}:{mission:request.mission})}:['save','load'].includes(request.action)?{slot:request.slot}:undefined;
   const response=request.action==='state'?before:await call(request.action,input);
   const after=request.action==='state'?before:await call();
   const receipt=path.join(QA,'operations',randomUUID()+'.json');
   await atomicJson(path.join(root,receipt),{profile:request.profile,action:request.action,input,before,response,after,sourceHashes:gate.hashes,recordedAt:new Date().toISOString(),paidAttempts:0});
   return {action:request.action,status:response.status,profile:request.profile,receipt};
  }
  if(before.state.provider!=='openai'||!before.state.game||before.state.game.ending||before.state.game.narrative?.format!==2||!Number.isInteger(before.state.game.narrative.turn)||!Number.isInteger(before.state.game.dialogue?.version))fail('LIVE_PLAYABLE_STATE_REQUIRED');
  const requestId='final-qa-'+randomUUID();
  const input={text:request.text,step:before.state.game.step,version:before.state.game.dialogue.version,requestId};
  const attempt=await reserveTurn(root,{...request,requestId,lockToken:lock.token});
  const directory=path.join(qaRoot,'attempts',String(attempt.id).padStart(3,'0'));
  await mkdir(directory,{recursive:true});
  const receipt=`docs/v2-final-live-${String(attempt.id).padStart(3,'0')}.json`;
  // Persist the before/input even if the parent process is interrupted mid-request.
  await atomicJson(path.join(directory,'before.json'),{attempt,before,input,receipt});
  await atomicJson(path.join(qaRoot,'permit.json'),{id:attempt.id,nonce:attempt.nonce});
  const started=Date.now();let response=null,after=null,raw=null,upstreamMarker=null,result='transport-failure';
  try{response=await call('turn',input);result=response.status===200?'committed':'failed';}catch{/* The reservation is charged, including ambiguous transport failures. */}
  finally{await unlink(path.join(qaRoot,'permit.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  try{after=await call();}catch{/* An absent after-state is explicit evidence, never invented. */}
  try{raw=await json(path.join(directory,'raw.json'));}catch{/* Includes failures before upstream. */}
  try{upstreamMarker=await readFile(path.join(directory,'upstream-started'),'utf8');}catch{}
  const verificationIssues=commitEvidenceIssues({attempt,before,response,after,raw,upstreamMarker});
  if(result==='committed'&&verificationIssues.length)result='failed';
  let afterHashes=null;try{afterHashes=await sourceHashes(root);}catch{}
  if(!afterHashes||JSON.stringify(Object.keys(afterHashes).sort())!==JSON.stringify(Object.keys(attempt.sourceHashes).sort())||Object.keys(attempt.sourceHashes).some(file=>attempt.sourceHashes[file]!==afterHashes[file]))result='source-drift';
  const completed={...attempt,result,latencyMs:Date.now()-started};
  const evidence={attempt:completed,before,input,response,after,raw,verificationIssues,sourceHashesAfter:afterHashes,scope:'One parent-selected natural turn; normal public API and QA-only profile; no state injection'};
  const serialized=JSON.stringify(evidence,null,2);
  await writeFile(path.join(root,receipt),serialized,{flag:'wx'});
  await finalize(root,attempt,{result,latencyMs:completed.latencyMs,receipt,receiptSha256:sha(serialized),upstreamStarted:upstreamMarker===attempt.nonce});
  return {action:'turn',profile:request.profile,attemptId:attempt.id,cumulativeId:attempt.cumulativeId,result,status:response?.status??null,receipt};
 }catch(error){retainLock=error.retainQaLock===true;throw error;}finally{
  // A failed stop deliberately leaves the lock on disk for parent investigation.
  if(server)try{await server.stop();}catch(error){await lock.retain();throw error;}
  if(retainLock)await lock.retain();else await lock.release();
 }
}
async function main(){
 if(process.argv.length!==3)fail('ONE_ACTION_JSON_REQUIRED');
 const request=JSON.parse(await readFile(path.resolve(process.argv[2]),'utf8'));
 const result=await runAuthorizedAction(process.cwd(),request);console.log(JSON.stringify(result));
 if(result.action==='turn'&&result.result!=='committed'||result.status!==200)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{await main();}catch(error){console.error(JSON.stringify({result:'stopped',code:error.code??'FINAL_QA_FAILED'}));process.exitCode=1;}}
