import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {ProfileStore} from './storage.ts';

const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function fixture(){
 const tempRoot=await realpath(tmpdir()),directory=await mkdtemp(path.join(tempRoot,'afterhours-adversarial-'));
 const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');
 const port=(listener.address() as {port:number}).port;await new Promise<void>(resolve=>listener.close(()=>resolve()));
 let child:ChildProcess|undefined,cookie='';
 async function boot(){
  child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),10000);child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child!.once('exit',()=>{clearTimeout(timer);reject(Error('Server exited before readiness'));});});
 }
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
 async function call(action='state',body?:unknown,failure?:string,raw?:string){
  const payload=raw??(body===undefined?undefined:JSON.stringify(body));
  const response=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:payload===undefined?'GET':'POST',headers:{cookie,...(payload===undefined?{}:{'content-type':'application/json'}),...(failure?{'x-test-failure':failure}:{})},body:payload,signal:AbortSignal.timeout(5000)});
  cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
  return {status:response.status,data:await response.json()};
 }
 async function committed(){const id=cookie.split('=')[1];return (await new ProfileStore(directory).load(id)).profile.committed;}
 async function close(){
  await stop();const target=await realpath(directory),relative=path.relative(tempRoot,target);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||!path.basename(target).startsWith('afterhours-adversarial-'))throw Error('Invalid temporary cleanup target');
  await rm(target,{recursive:true,force:true});
 }
 return {boot,stop,call,committed,close};
}

test('HTTP malformed inputs and exact character/body boundaries preserve rejected state',{timeout:60000},async()=>{
 const f=await fixture(),observations:unknown[]=[];
 try{
  await f.boot();await f.call();let state=(await f.call('new',{mode:'office'})).data;
  let serial=0;
  const input=(text:unknown)=>({text,choice:null,step:state.game.step,version:state.game.dialogue.version,requestId:`boundary-request-${++serial}`});
  for(const [name,text] of [['empty',''],['whitespace','   '],['null',null],['number',123],['boolean',true],['array',['hello']],['object',{text:'hello'}],['501 characters','가'.repeat(501)]] as const){
   const before=digest(state),response=await f.call('turn',input(text));
   assert.equal(response.status,400,name);state=(await f.call()).data;assert.equal(digest(state),before,name);
   observations.push({name,status:response.status,before,after:digest(state),unchanged:true});
  }
  for(const raw of ['{bad json','"primitive"']){
   const before=digest(state),response=await f.call('turn',undefined,undefined,raw);
   assert.equal(response.status,400);state=(await f.call()).data;assert.equal(digest(state),before);
   observations.push({name:'malformed JSON',raw,status:response.status,unchanged:true});
  }
  const before500=state.game.dialogue.version,response500=await f.call('turn',input('가'.repeat(500)));
  assert.equal(response500.status,200);state=response500.data;assert.equal(state.game.dialogue.version,before500+1);
  observations.push({name:'500 characters',status:200,versionDelta:1});
  for(const bytes of [4096,4097]){
   const before=digest(state),version=state.game.dialogue.version,encoded=JSON.stringify(input('안녕하세요'));
   const raw=encoded+' '.repeat(bytes-Buffer.byteLength(encoded));assert.equal(Buffer.byteLength(raw),bytes);
   const response=await f.call('turn',undefined,undefined,raw);state=(await f.call()).data;
   assert.equal(response.status,bytes===4096?200:400);
   if(bytes===4096)assert.equal(state.game.dialogue.version,version+1);else assert.equal(digest(state),before);
   observations.push({name:'UTF-8 HTTP body boundary',bytes,status:response.status,before,after:digest(state),versionDelta:state.game.dialogue.version-version});
  }
  await writeFile('docs/v2-input-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),provider:'offline',realHttpServer:true,paidCalls:0,observations},null,2));
 }finally{await f.close();}
});

test('repeated precommit and postcommit interruptions survive restart with exactly-once turns',{timeout:60000},async()=>{
 const f=await fixture(),sequence:unknown[]=[];
 try{
  await f.boot();await f.call();let state=(await f.call('new',{mode:'office'})).data;
  for(let turn=1;turn<=2;turn++){
   const before=structuredClone(state),request={text:'제안은 조금 더 생각해 볼게요.',choice:null,step:state.game.step,version:state.game.dialogue.version,requestId:`interrupt-sequence-${turn}`};
   const interrupted=await f.call('turn',request,'before-commit');assert.equal(interrupted.status,400);
   assert.deepEqual((await f.call()).data,before);
   await f.stop();await f.boot();assert.deepEqual((await f.call()).data,before);
   sequence.push({turn,stage:'before-commit -> restart',status:400,before:digest(before),after:digest((await f.call()).data),unchanged:true});
   await assert.rejects(f.call('turn',request,'after-commit'));
   await f.stop();await f.boot();state=(await f.call()).data;
   assert.equal(state.game.narrative.turn,turn);assert.equal(state.game.dialogue.version,before.game.dialogue.version+1);
   const persisted=structuredClone(state);
   for(let retry=1;retry<=3;retry++){
    const result=await f.call('turn',request);assert.equal(result.status,200);assert.deepEqual(result.data,persisted);
    sequence.push({turn,stage:'after-commit -> restart -> duplicate retry',retry,status:200,stateHash:digest(result.data),officeTurn:result.data.game.office.turn,version:result.data.game.dialogue.version});
   }
   const records=await f.committed();assert.equal(records.filter(record=>record.id===request.requestId).length,1);assert.equal(records.length,turn);
   sequence.push({turn,stage:'read-only persisted journal audit',uniqueRequestId:request.requestId,matchingCommits:1,totalCommits:records.length});
  }
  assert.equal(state.game.ending,null);assert.equal(state.collection.length,0);
  await writeFile('docs/v2-interruption-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),provider:'offline',paidCalls:0,serverRestarts:4,injectedInterruptions:4,duplicateRetries:6,finalStateHash:digest(state),ending:state.game.ending,sequence},null,2));
 }finally{await f.close();}
});
