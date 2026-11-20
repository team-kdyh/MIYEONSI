import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {ProfileStore} from './storage.ts';

test('AC6: atomic boundaries, process restarts, slots, endings, conflicts and corruption',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-ac6-'));
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 let child:ChildProcess|undefined;let cookie='';const trace:unknown[]=[];
 async function boot(){child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',AFTERHOURS_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout')),10000);child!.stdout!.on('data',()=>{clearTimeout(timer);resolve();});child!.on('exit',()=>{clearTimeout(timer);reject(Error('server exited'));});});}
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
 async function call(action='state',body?:object,failure?:string){const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,...(body?{'content-type':'application/json'}:{}),...(failure?{'x-test-failure':failure}:{})},body:body?JSON.stringify(body):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const data=await r.json();trace.push({action,input:body,failure:failure??null,status:r.status,state:data});return {status:r.status,data};}
 let counter=0;
 const input=(s:any,choice=0)=>({text:'',choice,step:s.game.step,version:s.game.dialogue.version,requestId:`ac6-request-${++counter}`});
 try{
  await boot();await call();
  for(const mode of ['office','romance']){
   let s=(await call('new',{mode})).data;
   const initial=structuredClone(s),first=input(s);
   assert.equal((await call('turn',first,'before-commit')).status,400);
   assert.deepEqual((await call()).data,initial,'precommit failure cannot change game or unlocks');
   await stop();await boot();assert.deepEqual((await call()).data,initial);
   const firstResult=(await call('turn',first)).data;
   assert.deepEqual((await call('turn',first)).data,firstResult);
   assert.equal((await call('turn',{...first,text:'다른 대사'})).status,409);
   const conflict=await call('turn',{...first,requestId:`conflict-${counter}`});assert.equal(conflict.status,409);assert.deepEqual(conflict.data.state,firstResult);
   s=firstResult;await call('save',{slot:0});
   const second=input(s);
   await assert.rejects(call('turn',second,'after-commit'));
   await stop();await boot();
   const recovered=(await call()).data;
   const retried=(await call('turn',second)).data;
   assert.equal(retried.game.dialogue.version,s.game.dialogue.version+1);assert.deepEqual(retried,recovered);
   // A delivered response is deliberately discarded before any display/update.
   s=retried;if(!s.game.ending){const third=input(s);const delivered=await call('turn',third);await stop();await boot();assert.deepEqual((await call('turn',third)).data,delivered.data);s=delivered.data;}
   await call('save',{slot:1});const middle=structuredClone(s.game);
   for(let n=0;n<25&&!s.game.ending;n++)s=(await call('turn',input(s))).data;
   assert.ok(s.game.ending);assert.ok(s.collection.includes(s.game.ending));
   await call('save',{slot:2});s=(await call()).data;
   await stop();await boot();assert.deepEqual((await call()).data,s);
   const id=cookie.split('=')[1],store=new ProfileStore(dir);const disk=(await store.load(id)).profile;
   assert.equal(disk.slots.length,3);assert.deepEqual(disk.slots[1]?.log,middle.log);
   for(let slot=0;slot<3;slot++){
    const restored=(await call('load',{slot})).data;
    const expected=structuredClone(disk.slots[slot]) as any;delete expected.scores;
    const actual=structuredClone(restored.game);delete actual.scene;delete actual.end;
    expected.dialogue.version=actual.dialogue.version;
    assert.deepEqual(actual,expected,'every story field restored; only concurrency version changes');
    await stop();await boot();assert.deepEqual((await call()).data,restored);
   }
   const beforeOldReplay=(await call()).data;
   const oldReplay=await call('turn',first);
   assert.equal(oldReplay.status,409,'historical replay must not display an abandoned timeline');
   assert.deepEqual(oldReplay.data.state,beforeOldReplay);
   assert.deepEqual((await call()).data,beforeOldReplay);
  }
  const fresh=(await call('new',{mode:'romance'})).data;
  const simultaneous=input(fresh);
  const racing=await Promise.all([call('turn',simultaneous),call('turn',simultaneous)]);
  assert.equal(racing.filter(r=>r.status===200).length,1);assert.equal(racing.filter(r=>r.status===409).length,1);
  const onceOnly=(await call('turn',simultaneous)).data;
  assert.equal(onceOnly.game.dialogue.version,fresh.game.dialogue.version+1);
  const current=(await call()).data;assert.deepEqual(current,onceOnly);
  const id=cookie.split('=')[1],file=path.join(dir,id+'.json');
  const backup=JSON.parse(await readFile(file+'.bak','utf8')).profile;
  await writeFile(file,'{broken');
  const recovered=await call();assert.equal(recovered.status,200);assert.match(recovered.data.recovery,/복구/);assert.deepEqual(recovered.data.game.log,backup.game.log);
  const envelope=JSON.parse(await readFile(file,'utf8'));envelope.format=999;await writeFile(file,JSON.stringify(envelope));await writeFile(file+'.bak','broken');
  const failed=await call();assert.equal(failed.status,503);assert.equal(failed.data.canReset,true);
  assert.equal((await call('reset',{})).data.game,null);
  await writeFile('docs/ac7-persistence-evidence.json',JSON.stringify({criterion:7,executedAt:new Date().toISOString(),provider:'offline',initial:'new temporary data directory; public HTTP new game',claim:'before/after commit failure, restart, slots, idempotency, conflicts, corruption recovery',codeVersion:createHash('sha256').update(await readFile('server/index.ts')).update(await readFile('server/storage.ts')).update(await readFile('server/persistence.test.ts')).digest('hex'),result:'pass',trace},null,2));
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
