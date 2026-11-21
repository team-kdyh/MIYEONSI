import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,readdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {createHash} from 'node:crypto';
import {ProfileStore,emptyProfile} from './storage.ts';
import {start} from './game.ts';
import {canonical,type DialogueGame} from './dialogue.ts';

async function removeTemporary(directory:string){
 const root=await realpath(tmpdir()),target=await realpath(directory),relative=path.relative(root,target);
 assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(target).startsWith('afterhours-v2-'));
 await rm(target,{recursive:true,force:true});
}

test('v2 passive loads never generate; default AI fails explicitly; hostile request fields cannot mutate state',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-v2-http-')),counter=path.join(dir,'calls');await writeFile(counter,'');
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 const fakeKey='test-only-v2-secret-sentinel';
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(path.resolve('tests/v2-security-fixture.mjs')).href,'server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:fakeKey,OPENAI_MODEL:'gpt-4.1',AFTERHOURS_DATA_DIR:dir,V2_CALL_COUNTER:counter},stdio:['ignore','pipe','pipe']});
 let cookie='';const observations:unknown[]=[];
 async function call(action='state',body?:object,headers:Record<string,string>={}){
  const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
  cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;const text=await r.text();assert.ok(!text.includes(fakeKey));assert.ok(!text.includes('private provider diagnostic'));
  return {status:r.status,data:JSON.parse(text),cache:r.headers.get('cache-control')};
 }
 try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);child.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('Startup failure'));});});
  const passive=await call();assert.equal(passive.data.provider,'openai');assert.equal(passive.cache,'no-store');
  const oldProfileStore=new ProfileStore(dir),session=cookie.split('=')[1];const oldProfile=(await oldProfileStore.load(session)).profile;oldProfile.provider='offline';delete oldProfile.providerSelectionVersion;await oldProfileStore.save(session,oldProfile);assert.equal((await call()).data.provider,'openai','legacy browser defaults migrate to AI without a paid call');
  const initial=(await call('new',{mode:'romance'})).data;await call();await call('save',{slot:0});await call('load',{slot:0});
  assert.equal(await readFile(counter,'utf8'),'','state/new/save/load never call the provider');
  const before=(await call()).data,input={text:'귤 껍질 소리를 기억해 주세요.',step:before.game.step,version:before.game.dialogue.version,requestId:'v2-secure-request-1'};
  for(const extra of [{game:{ending:'romance-0'}},{provider:'offline'},{events:[{kind:'ending'}]},{__protoField:'unsafe'}])assert.equal((await call('turn',{...input,...extra})).status,400);
  assert.equal((await call('turn',input,{origin:'https://attacker.invalid'})).status,403);
  // Node fetch normalizes Host, so use the raw HTTP client for a real rebinding probe.
  const hostileHostStatus=await new Promise<number|undefined>((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:'/api/state',headers:{host:'attacker.invalid',cookie}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  assert.equal(hostileHostStatus,403);
  assert.deepEqual((await call()).data,before);assert.equal(await readFile(counter,'utf8'),'');
  const failed=await call('turn',input);assert.equal(failed.status,400);assert.match(failed.data.error,/503/);
  assert.deepEqual((await call()).data,before,'AI failure never commits an offline response');
  assert.equal(await readFile(counter,'utf8'),'call\n');
  await call('provider',{provider:'offline'});const offline=await call('turn',input);assert.equal(offline.status,200);assert.equal(offline.data.provider,'offline');
  assert.equal(await readFile(counter,'utf8'),'call\n','offline is explicit and never generates');
  await call('reset',{});await call('new',{mode:'romance'});
  assert.equal((await call('turn',input)).status,409,'a pending request from before reset cannot run in the new timeline');
  assert.equal(await readFile(counter,'utf8'),'call\n');
  observations.push({defaultProvider:passive.data.provider,passiveCalls:0,hostileRequestsRejected:6,modelErrorStatus:failed.status,failedTurnPreserved:true,explicitOffline:true,initialVersion:initial.game.dialogue.version});
  await writeFile('docs/v2-security-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),paidCalls:0,transport:'mock returning 503; no network',observations},null,2));
 }finally{if(child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}await removeTemporary(dir);}
});

test('v1 envelope remains byte-preserved on read; extra narrative data survives autosave and all three slots; reset archives originals',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-v2-storage-')),id='b'.repeat(48),file=path.join(dir,id+'.json'),store=new ProfileStore(dir);
 try{
  const legacy=emptyProfile();legacy.game=start('romance') as DialogueGame;legacy.game.dialogue=canonical(legacy.game);
  legacy.provider='offline';legacy.game.dialogue.ledger.push({kind:'user_claim',text:'귤을 좋아해요.',version:0});
  const original=JSON.stringify({format:1,checksum:createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),profile:legacy});await writeFile(file,original);
  assert.deepEqual((await store.load(id)).profile,legacy);assert.equal(await readFile(file,'utf8'),original);
  // Storage is deliberately lossless for additive narrative fields owned/validated by the story engine.
  // This fixture verifies persistence, not model event reconciliation or live conversational quality.
  const extended=(await store.load(id)).profile;
  Object.assign(extended.game!.dialogue!,{actionBeats:['유나가 컵을 내려놓는다.'],promises:[{id:'promise-unique',text:'다음 만남에 귤을 가져오겠다는 유나의 약속',owner:'npc',status:'open'}],events:[{id:'rain-plan',kind:'plan',text:'옥상 대신 카페에서 빗소리 듣기'}],location:'cafe'});
  extended.slots=[structuredClone(extended.game),structuredClone(extended.game),structuredClone(extended.game)];
  await store.save(id,extended);assert.deepEqual((await new ProfileStore(dir).load(id)).profile,extended);
  const latest=await readFile(file,'utf8');await store.reset(id);
  const preserved=await Promise.all((await readdir(dir)).filter(n=>n.includes('.preserved-')).map(n=>readFile(path.join(dir,n),'utf8')));
  assert.ok(preserved.includes(original));assert.ok(preserved.includes(latest));assert.equal((await store.load(id)).profile.game,null);
  await writeFile('docs/v2-legacy-save-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),paidCalls:0,legacyFormat:1,readPreservesBytes:true,additiveNarrativeFieldsRoundTrip:true,slots:3,resetArchivesBothVersions:true,fixtureScope:'synthetic saved narrative fields; not generated model event evidence'},null,2));
 }finally{await removeTemporary(dir);}
});
