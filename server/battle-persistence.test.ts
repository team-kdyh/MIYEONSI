import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {ProfileStore,emptyProfile,validateProfile} from './storage.ts';
import {start} from './game.ts';
import {canonical,commitDialogue,type DialogueGame} from './dialogue.ts';
import {battleView} from './battle-view.ts';
import {battlePressure} from './battle-rules.ts';

 test('AC4 legacy active/completed office saves and all slots retain neutral baseline; romance stays unchanged',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-legacy-')),id='a'.repeat(48),store=new ProfileStore(dir);
 try{
  for(const ending of [null,'office-clockout-success','office-clockout-failure']){
   const g:DialogueGame=start('office');g.dialogue=canonical(g);g.dialogue.version=8;g.ending=ending;
   const p=emptyProfile();p.game=g;p.slots=[structuredClone(g),structuredClone(g),structuredClone(g)];
   await store.save(id,p);const restored=(await new ProfileStore(dir).load(id)).profile;
   assert.deepEqual(restored,p);
   for(const saved of [restored.game,...restored.slots]){assert.equal(saved!.ending,ending);assert.equal(battleView(saved!)!.player,100);assert.equal(battleView(saved!)!.boss,100);assert.equal(battleView(saved!)!.exchange,null);}
  }
  const romance:DialogueGame=start('romance');romance.dialogue=canonical(romance);const p=emptyProfile();p.game=romance;await store.save(id,p);assert.deepEqual((await store.load(id)).profile,p);assert.equal(battleView(romance),null);
 }finally{await rm(dir,{recursive:true,force:true});}
 });
 test('AC4 storage rejects malformed, duplicate, future and out-of-range battle records',()=>{
 const text='왜요?',line=battlePressure(0,'leave')[0];
 const g=commitDialogue(start('office'),null,text,{line,actionBeats:[],emotion:'차분',pose:'listen',musicMood:'office-pressure',events:[],recall:[],conjecture:'',battle:{kind:'pressure',target:'leave',argument:'boundary',playerQuote:text,npcQuote:line,reason:'요구',concessionIndex:-1,pressureId:'',premises:[]}});
 const p=emptyProfile();p.game=g;validateProfile(p);
 for(const patch of [{playerDamage:-8},{bossDamage:100},{id:'battle-99'},{target:'unknown'},{combo:9},{reason:null}]){const bad=structuredClone(p);Object.assign(bad.game!.dialogue!.battleEvaluations![0],patch);assert.throws(()=>validateProfile(bad));}
 const duplicate=structuredClone(p);duplicate.game!.dialogue!.battleEvaluations!.push(duplicate.game!.dialogue!.battleEvaluations![0]);assert.throws(()=>validateProfile(duplicate));
 });
 test('AC4 real HTTP battle commit survives slots/restart; retries, repair, cancellation and rejection apply once',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-http-')),fixture=path.join(dir,'case.json'),callsFile=path.join(dir,'calls.jsonl');
 await writeFile(callsFile,'');
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 let child:ChildProcess|undefined,cookie='',counter=0;
 const config=async(mode:string,level=0)=>writeFile(fixture,JSON.stringify({id:String(++counter),mode,level}));
 const calls=async()=> (await readFile(callsFile,'utf8')).trim().split('\n').filter(Boolean).length;
 async function boot(){child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(path.resolve('tests/battle-persistence-provider.mjs')).href,'server/index.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'mock-no-network',AFTERHOURS_DATA_DIR:dir,BATTLE_CASE_FILE:fixture,BATTLE_CALLS_FILE:callsFile},stdio:['ignore','pipe','pipe']});await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('startup timeout')),10000);child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child!.once('exit',()=>{clearTimeout(timer);reject(Error('startup failed'));});});}
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
 async function call(action='state',body?:object,failure?:string,signal?:AbortSignal){const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json',...(failure?{'x-test-failure':failure}:{})},body:body?JSON.stringify(body):undefined,signal});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,data:await r.json()};}
 const input=(s:any,id:string)=>({text:'그 요구의 이유를 듣고 싶습니다.',step:0,version:s.game.dialogue.version,requestId:id});
 const store=new ProfileStore(dir),profile=async()=> (await store.load(cookie.split('=')[1])).profile;
 try{
  await boot();await call();let initial=(await call('new',{mode:'office'})).data;
  await config('repair');let body=input(initial,'battle-repair-001');const repaired=await call('turn',body);assert.equal(repaired.status,200);assert.equal(await calls(),2);assert.equal((await profile()).requests,2);assert.equal(repaired.data.game.battle.player,92);assert.equal(repaired.data.game.dialogue.battleEvaluations.length,1);assert.equal(repaired.data.game.narrative.turn,1);
  assert.deepEqual((await call('turn',body)).data,repaired.data);assert.equal(await calls(),2);
  assert.equal((await call('turn',{...body,text:'다른 입력'})).status,409);
  for(let slot=0;slot<3;slot++)await call('save',{slot});
  await stop();await boot();assert.deepEqual((await call()).data.game,repaired.data.game);
  for(let slot=0;slot<3;slot++){const restored=(await call('load',{slot})).data;assert.deepEqual(restored.game.dialogue.battleEvaluations,repaired.data.game.dialogue.battleEvaluations);assert.deepEqual(restored.game.battle,repaired.data.game.battle);assert.equal(restored.game.narrative.turn,1);}
  initial=(await call()).data;await config('valid',1);body=input(initial,'battle-delivery-002');await assert.rejects(call('turn',body,'after-commit'));await stop();await boot();const recovered=(await call()).data;assert.equal(recovered.game.battle.player,68);assert.equal(recovered.game.narrative.turn,2);const count=await calls();assert.deepEqual((await call('turn',body)).data,recovered);assert.equal(await calls(),count);
  for(const mode of ['invalid','cancel','before-commit']){
   initial=(await call('new',{mode:'office'})).data;await config(mode==='before-commit'?'valid':mode);body=input(initial,`battle-${mode}-003`);const prior=await calls();
   if(mode==='cancel'){const controller=new AbortController(),pending=call('turn',body,undefined,controller.signal);for(let n=0;n<100&&await calls()<prior+2;n++)await new Promise(r=>setTimeout(r,20));assert.equal(await calls(),prior+2);controller.abort();await assert.rejects(pending);await new Promise(r=>setTimeout(r,150));}
   else{const result=await call('turn',body,mode==='before-commit'?mode:undefined);assert.equal(result.status,400);if(mode==='invalid')assert.equal(result.data.code,'reply_rejected');}
   assert.deepEqual((await call()).data,initial);assert.equal((await profile()).committed.some(t=>t.id===body.requestId),false);
   await config('valid');const retry=await call('turn',body);assert.equal(retry.status,200);assert.equal(retry.data.game.battle.player,92);assert.equal(retry.data.game.narrative.turn,1);assert.equal(retry.data.game.dialogue.battleEvaluations.length,1);
  }
  initial=(await call('new',{mode:'office'})).data;await config('valid');body=input(initial,'battle-concurrent-004');const race=await Promise.all([call('turn',body),call('turn',body)]);assert.ok(race.some(r=>r.status===200));const state=(await call()).data;assert.equal(state.game.battle.player,92);assert.equal(state.game.narrative.turn,1);assert.equal(state.game.dialogue.battleEvaluations.length,1);
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
 });

test('AC4 earned battle endings and damaging history round-trip without changing totals',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-ending-')),store=new ProfileStore(dir),id='b'.repeat(48);
 try{
  let g:DialogueGame=start('office');
  for(let i=0;i<6;i++){
   const target=i%2?'handoff':'leave',argument=(['alternative','boundary','evidence'] as const)[Math.floor(i/2)];
   const text=`${target}에 대해 ${['요약 자료를 먼저 보내겠습니다.','추가 업무는 여기까지만 맡겠습니다.','앞서 정한 방법에 확인 절차를 더하겠습니다.'][Math.floor(i/2)]}`;
   const line='그 제안을 받아들이겠습니다.',fact=g.dialogue?.facts.find(f=>f.text.includes(target));
   g=commitDialogue(g,null,text,{line,actionBeats:[],emotion:'차분',pose:'listen',musicMood:'office-pressure',events:[{kind:'concession',subject:'mutual',status:'accepted',value:target,text,evidence:text,reference:''}],recall:[],conjecture:'',battle:{kind:'persuasion',target,argument,playerQuote:text,npcQuote:line,reason:text,concessionIndex:0,pressureId:'',premises:argument==='evidence'?[{id:fact!.id,quote:fact!.text}]:[]}});
   const p=emptyProfile();p.game=g;p.slots=[structuredClone(g),structuredClone(g),structuredClone(g)];await store.save(id,p);
   const loaded=(await new ProfileStore(dir).load(id)).profile;assert.deepEqual(loaded,p);assert.deepEqual(battleView(loaded.game!),battleView(g));g=loaded.game!;
  }
  assert.equal(g.ending,'office-clockout-success');assert.equal(battleView(g)!.boss,0);assert.equal(g.dialogue!.battleEvaluations!.length,6);
 }finally{await rm(dir,{recursive:true,force:true});}
});
