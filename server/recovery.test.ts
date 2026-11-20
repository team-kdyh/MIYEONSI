import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

test('AC7 schema/429/real timer timeout/cancel recover with same request without double commit',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-ac7-'));const fixture=path.join(dir,'mode');await writeFile(fixture,'ok');
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(path.resolve('tests/provider-fixture.mjs')).href,'server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'isolated-mock-not-a-real-key',AFTERHOURS_DATA_DIR:dir,AC7_FIXTURE:fixture},stdio:['ignore','pipe','pipe']});
 const trace:any[]=[];let cookie='',count=0;
 async function call(action='state',input?:object,signal?:AbortSignal){const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:input?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:input?JSON.stringify(input):undefined,signal});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const state=await r.json();trace.push({action,input,status:r.status,state});return {status:r.status,state};}
 try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('startup exit'));});});
  await call();await call('provider',{provider:'openai'});
  for(const mode of ['schema','429','timeout','cancel']){
   const initial=(await call('new',{mode:'office'})).state;
   const input={text:'고객 마감 메일은 내일 오전 10시입니다. 오늘 18시에 퇴근하겠습니다.',choice:null,step:initial.game.step,version:initial.game.dialogue.version,requestId:`recovery-${++count}`};
   await writeFile(fixture,mode==='cancel'?'timeout':mode);const started=Date.now();
   if(mode==='cancel'){
    const controller=new AbortController();const pending=call('turn',input,controller.signal);
    await new Promise(r=>setTimeout(r,250));controller.abort();await assert.rejects(pending);
    await new Promise(r=>setTimeout(r,150));trace.push({failure:mode,result:'client abort observed'});
   }else{
    const failed=await call('turn',input);assert.equal(failed.status,400);
    assert.match(failed.state.error,mode==='schema'?/검증/:mode==='429'?/429/:/초과/);
    if(mode==='timeout')assert.ok(Date.now()-started>=9500,'exercise production ten-second timeout');
   }
   assert.deepEqual((await call()).state,initial,'failed generation leaves game, unlocks and version unchanged');
   await writeFile(fixture,'ok');const recovered=await call('turn',input);assert.equal(recovered.status,200);assert.equal(recovered.state.game.dialogue.version,initial.game.dialogue.version+1);
   assert.deepEqual((await call('turn',input)).state,recovered.state);trace.push({failure:mode,elapsed:Date.now()-started,result:'pass'});
  }
  // Exhaust real per-profile hourly limiter with public requests, then prove other sessions remain usable.
  let limited=false;for(let i=0;i<310;i++){const r=await call('provider',{provider:'offline'});if(r.status===429){limited=true;break;}}
  assert.ok(limited);assert.equal((await call()).status,200);cookie='';await call();assert.equal((await call('new',{mode:'office'})).status,200);
  const files=['server/index.ts','server/provider.ts','server/recovery.test.ts','tests/provider-fixture.mjs'];const codeVersion=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
  await writeFile('docs/ac7-recovery-evidence.json',JSON.stringify({criterion:7,executedAt:new Date().toISOString(),provider:'mock Responses transport; no external API',initial:'empty temporary storage; public new game each scenario',codeVersion,result:'pass',trace},null,2));
 }finally{if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}await rm(dir,{recursive:true,force:true});}
});
