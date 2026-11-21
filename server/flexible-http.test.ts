import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {ProfileStore} from './storage.ts';

test('HTTP repairs internally, counts every attempt, replays once, and preserves original input on cancel/limit/failure',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-flex-')),fixture=path.join(dir,'case.json'),log=path.join(dir,'calls.jsonl');
 await writeFile(log,'');await writeFile(fixture,JSON.stringify({id:'repair',mode:'repair'}));
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(path.resolve('tests/flexible-provider-fixture.mjs')).href,'server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'mock-only-no-network',AFTERHOURS_DATA_DIR:dir,FLEX_CASE_FILE:fixture,FLEX_TRACE_FILE:log},stdio:['ignore','pipe','pipe']});
 let cookie='';const trace:any[]=[];
 const calls=async()=>((await readFile(log,'utf8')).trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)));
 const call=async(action='state',body?:object,signal?:AbortSignal)=>{const response=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;const data=await response.json();trace.push({action,status:response.status,body,data});return {status:response.status,data};};
 const store=new ProfileStore(dir),profile=()=>store.load(cookie.split('=')[1]);
 try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('startup failed'));});});
  await call();const initial=(await call('new',{mode:'office'})).data;
  const body={text:'네 선택지를 주세요',step:initial.game.step,version:initial.game.dialogue.version,requestId:'flex-original-001'};
  const repaired=await call('turn',body);assert.equal(repaired.status,200);assert.equal(repaired.data.game.dialogue.version,initial.game.dialogue.version+1);assert.equal(repaired.data.game.narrative.location,'office');assert.equal(repaired.data.game.ending,null);
  assert.equal(repaired.data.game.log.filter((x:any)=>x.text===body.text).length,1);assert.ok(!JSON.stringify(repaired.data).includes('이미 퇴근한'));assert.equal((await profile()).profile.requests,2);
  const first=await calls();assert.equal(first.length,2);assert.deepEqual(first.map(c=>c.player),[body.text,body.text]);assert.deepEqual(first[0].story,first[1].story);assert.equal(first[1].repair,true);
  assert.deepEqual((await call('turn',body)).data,repaired.data);assert.equal((await calls()).length,2);
  await call('save',{slot:0});await call('load',{slot:0});assert.deepEqual((await profile()).profile.game!.log,repaired.data.game.log);
  for(const mode of ['conversation','always-invalid','cancel','limit']){
   await writeFile(fixture,JSON.stringify({id:mode,mode:mode==='limit'?'repair':mode}));const before=(await call('new',{mode:'office'})).data;
   const input={...body,version:before.game.dialogue.version,requestId:`flex-${mode}-001`},prior=(await calls()).length;
   if(mode==='limit'){const p=(await profile()).profile;p.requests=99;await store.save(cookie.split('=')[1],p);}
   if(mode==='cancel'){
    const controller=new AbortController(),pending=call('turn',input,controller.signal);let observed=false;
    for(let n=0;n<100;n++){if((await calls()).length===prior+2){observed=true;break;}await new Promise(r=>setTimeout(r,20));}
    assert.ok(observed);controller.abort();await assert.rejects(pending);await new Promise(r=>setTimeout(r,150));
   }else{
    const response=await call('turn',input);assert.equal(response.status,mode==='conversation'?200:400);
    if(mode==='always-invalid'){assert.equal(response.data.code,'reply_rejected');assert.equal(response.data.committed,false);assert.match(response.data.error,/고치지 않아도/);}
    if(mode==='limit')assert.match(response.data.error,/100회/);
   }
   const count=(await calls()).length-prior;assert.equal(count,mode==='conversation'||mode==='limit'?1:2);
   assert.equal((await profile()).profile.requests,mode==='limit'?100:count);
   if(mode!=='conversation')assert.deepEqual((await call()).data,before);
  }
  await mkdir('docs/flexible-review',{recursive:true});await writeFile('docs/flexible-review/http-evidence.json',JSON.stringify({scope:'Mock model transport; real HTTP, durable attempts, cancellation, slots and idempotency; no paid calls',trace,modelCalls:await calls()},null,2));
 }finally{if(child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}await rm(dir,{recursive:true,force:true});}
});
