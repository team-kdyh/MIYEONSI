import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import {once} from 'node:events';

test('content revision survives HTTP cancellation, timeout, retry, duplicate, restart and three slots',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-condition-http-')),control=path.join(dir,'failure');
 await writeFile(control,'ok');
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 let child:ChildProcess|undefined,cookie='',counter=0;const trace:unknown[]=[];
 async function boot(){
  child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(path.resolve('tests/commitment-transport.mjs')).href,'server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'isolated-mock-only',AFTERHOURS_DATA_DIR:dir,COMMITMENT_FAILURE:control},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child!.once('exit',()=>{clearTimeout(timer);reject(Error('startup exit'));});});
 }
 async function stop(){if(child?.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
 async function call(action='state',body?:object,signal?:AbortSignal){
  const response=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
  const state=await response.json();trace.push({action,body,status:response.status,state});return {status:response.status,state};
 }
 const input=(s:any,text:string)=>({text,choice:null,step:s.game.step,version:s.game.dialogue.version,requestId:`conditions-http-${++counter}`});
 try{
  await boot();await call();let s=(await call('new',{mode:'romance'})).state;
  for(const text of ['제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.','좋아요.','노란 리본 가져왔어요.']){const result=await call('turn',input(s,text));assert.equal(result.status,200);s=result.state;}
  assert.equal(s.game.narrative.commitments[0].status,'partial');
  for(let slot=0;slot<3;slot++)assert.equal((await call('save',{slot})).status,200);
  await stop();await boot();assert.deepEqual((await call()).state.game.narrative.commitments,s.game.narrative.commitments);
  const pending=input(s,'편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.');await writeFile(control,'timeout');
  const controller=new AbortController(),aborted=call('turn',pending,controller.signal);
  await new Promise(r=>setTimeout(r,250));controller.abort();await assert.rejects(aborted);await new Promise(r=>setTimeout(r,150));
  assert.deepEqual((await call()).state.game.narrative.commitments,s.game.narrative.commitments);
  const began=Date.now(),timeout=await call('turn',pending);assert.equal(timeout.status,400);assert.ok(Date.now()-began>=29500);
  assert.deepEqual((await call()).state.game.narrative.commitments,s.game.narrative.commitments);
  await writeFile(control,'ok');const completed=await call('turn',pending);assert.equal(completed.status,200);
  assert.equal(completed.state.game.narrative.commitments[0].status,'partial');
  assert.equal(completed.state.game.narrative.commitments[0].conditions[1].action,'그림을 그리는');
  assert.equal(completed.state.game.narrative.commitments[0].revisions.length,1);
  assert.deepEqual((await call('turn',pending)).state,completed.state);
  await stop();await boot();assert.deepEqual((await call()).state.game.narrative.commitments,completed.state.game.narrative.commitments);
  for(let slot=0;slot<3;slot++)assert.deepEqual((await call('load',{slot})).state.game.narrative.commitments,s.game.narrative.commitments);
  // Restore the accepted revision by replaying its normal turn from the saved pre-change state.
  s=(await call('turn',input((await call()).state,pending.text))).state;
  for(let slot=0;slot<3;slot++)assert.equal((await call('save',{slot})).status,200);
  await stop();await boot();
  for(let slot=0;slot<3;slot++){
   const loaded=(await call('load',{slot})).state;assert.deepEqual(loaded.game.narrative.commitments,s.game.narrative.commitments);
   const done=await call('turn',input(loaded,'그림을 그렸어요.'));assert.equal(done.status,200);assert.equal(done.state.game.narrative.commitments[0].status,'completed');
  }
  await writeFile('docs/v2-content-revision-run/http-trace.json',JSON.stringify({executedAt:new Date().toISOString(),source:'mock Responses; real HTTP/storage/processes; no paid calls',result:'pass',trace},null,2));
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
