import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LEDGER,QA,REQUIRED_SOURCES,sha,json,preflight,validateLedger,acquireLock,reserveTurn,assertUpstreamPayload,sourceHashes} from './guard.mjs';
import {runAuthorizedAction} from './runner.mjs';
import {guardedFetch} from './server.mjs';

// Pure temporary-file tests. The synthetic approved records below authorize no real run.
async function fixture(t,approval='approved'){
 const root=await mkdtemp(path.join(tmpdir(),'afterhours-final-gate-unit-'));
 t.after(async()=>{const base=await realpath(tmpdir()),target=await realpath(root),relative=path.relative(base,target);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(target).startsWith('afterhours-final-gate-unit-'));await rm(target,{recursive:true,force:true});});
 await mkdir(path.join(root,'docs'),{recursive:true});
 const histories=[];
 for(const [file,count] of [['docs/api-smoke-ledger.json',12],['docs/v2-api-smoke-ledger.json',32]]){
  const content=JSON.stringify({attempts:Array.from({length:count},(_,i)=>({id:i+1,result:'historical-unit-fixture'}))});
  await writeFile(path.join(root,file),content);histories.push({path:file,attempts:count,sha256:sha(content)});
 }
 const hashes={};for(const file of REQUIRED_SOURCES){const content='unit fixture '+file;await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),content);hashes[file]=sha(content);}
 const ledger={approval,owner:'parent',approvedAt:'synthetic-unit-record-only',userApprovalReference:'not-an-actual-approval',workersQuiescent:true,phaseLimit:24,previousAttempts:44,cumulativeLimit:68,maxOutputTokensPerCall:1600,previousLedgers:histories,candidate:{model:'unit-model',sourceHashes:hashes},attempts:[]};
 const save=()=>writeFile(path.join(root,LEDGER),JSON.stringify(ledger));await save();
 return {root,ledger,save};
}
const request={action:'turn',profile:'qa-unit',text:'오늘은 간단히 이야기해요.',purpose:'Synthetic unit assertion only'};
function forbiddenEffects(){const count={spawn:0,network:0};return {count,effects:{startServer:async()=>{count.spawn++;throw Error('No process may start');},fetch:async()=>{count.network++;throw Error('No network allowed');}}};}

test('missing, pending, denied and incomplete approval stop before spawn/network',async t=>{
 for(const approval of ['missing','pending','denied','approved']){
  const f=await fixture(t,approval),probe=forbiddenEffects();
  if(approval==='missing')await rm(path.join(f.root,LEDGER));
  if(approval==='approved'){f.ledger.userApprovalReference=null;await f.save();}
  await assert.rejects(()=>runAuthorizedAction(f.root,request,probe.effects));
  assert.deepEqual(probe.count,{spawn:0,network:0});
 }
});
test('all 24 failed attempts consume the cap before any process or network',async t=>{
 const f=await fixture(t),probe=forbiddenEffects();
 f.ledger.attempts=Array.from({length:24},(_,i)=>({id:i+1,cumulativeId:45+i,maxOutputTokens:1600,result:'failed'}));await f.save();
 assert.equal(validateLedger(f.ledger).attempts.length,24);
 await assert.rejects(()=>runAuthorizedAction(f.root,request,probe.effects),/PHASE_BUDGET_EXHAUSTED/);
 assert.deepEqual(probe.count,{spawn:0,network:0});
 for(const change of [{phaseLimit:25},{cumulativeLimit:69},{previousAttempts:43},{maxOutputTokensPerCall:1601}])assert.throws(()=>validateLedger({...f.ledger,...change}),/INVALID_BUDGET_CONTRACT/);
});
test('changed historical ledger, changed source and non-quiescent workers reject',async t=>{
 const f=await fixture(t);await preflight(f.root);
 await writeFile(path.join(f.root,'docs/v2-api-smoke-ledger.json'),JSON.stringify({attempts:[]}));
 await assert.rejects(()=>preflight(f.root),/IMMUTABLE_HISTORY_MISMATCH/);
 const g=await fixture(t);await writeFile(path.join(g.root,'server/narrative.ts'),'changed after freeze');
 await assert.rejects(()=>preflight(g.root),/CANDIDATE_SOURCE_CHANGED/);
 const added=await fixture(t);await writeFile(path.join(added.root,'server/new-runtime.ts'),'new runtime');
 await assert.rejects(()=>preflight(added.root),/CANDIDATE_SOURCE_CHANGED/);
 added.ledger.candidate.sourceHashes=await sourceHashes(added.root);await added.save();await preflight(added.root);
 await rm(path.join(added.root,'server/new-runtime.ts'));
 await assert.rejects(()=>preflight(added.root),/CANDIDATE_SOURCE_CHANGED/);
 assert.throws(()=>validateLedger({...g.ledger,workersQuiescent:false}),/PARENT_APPROVAL_RECORD_REQUIRED/);
});
test('exclusive phase lock and orphan reservation cannot be silently cleared',async t=>{
 const f=await fixture(t),lock=await acquireLock(f.root);
 try{
  await assert.rejects(()=>acquireLock(f.root),/ANOTHER_QA_RUN_OR_STALE_LOCK/);
  const attempt=await reserveTurn(f.root,{...request,requestId:'unit-reserved-request',lockToken:lock.token});
  assert.equal(attempt.id,1);assert.equal((await json(path.join(f.root,LEDGER))).attempts[0].result,'reserved');
  await assert.rejects(()=>preflight(f.root),/UNRESOLVED_RESERVATION/);
 }finally{await lock.release();}
});
test('reservation is on disk before one fake upstream; headers never enter raw capture',async t=>{
 const f=await fixture(t),lock=await acquireLock(f.root);
 const historyBefore=await Promise.all(f.ledger.previousLedgers.map(h=>readFile(path.join(f.root,h.path),'utf8')));
 let fakeUpstreamCalls=0;
 try{
  const attempt=await reserveTurn(f.root,{...request,text:' '+request.text+' ',requestId:'unit-one-upstream',lockToken:lock.token});
  const dir=path.join(f.root,QA,'attempts','001');await mkdir(dir,{recursive:true});
  await writeFile(path.join(f.root,QA,'permit.json'),JSON.stringify({id:attempt.id,nonce:attempt.nonce}));
  const fetcher=guardedFetch(f.root,lock.token,async()=>{
   fakeUpstreamCalls++;assert.equal((await json(path.join(f.root,LEDGER))).attempts[0].result,'reserved');
   return Response.json({status:'completed',output:[]});
  });
  const body={model:'unit-model',max_output_tokens:1600,store:false,input:[{role:'user',content:request.text}]};
  await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'SYNTHETIC-HEADER-DO-NOT-CAPTURE'},body:JSON.stringify(body)});
  await assert.rejects(()=>fetcher('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(body)}));
  assert.equal(fakeUpstreamCalls,1);
  const raw=await readFile(path.join(dir,'raw.json'),'utf8');assert.ok(!raw.includes('SYNTHETIC-HEADER'));assert.equal(JSON.parse(raw).status,200);
  assert.deepEqual(await Promise.all(f.ledger.previousLedgers.map(h=>readFile(path.join(f.root,h.path),'utf8'))),historyBefore);
  assert.throws(()=>assertUpstreamPayload({...body,max_output_tokens:1601},attempt),/UPSTREAM_REQUEST_OUTSIDE_RESERVATION/);
  assert.throws(()=>assertUpstreamPayload({...body,model:'different'},attempt),/UPSTREAM_REQUEST_OUTSIDE_RESERVATION/);
 }finally{await lock.release();}
});
test('no permit or pending approval denies the intercepted upstream with zero fake calls',async t=>{
 const f=await fixture(t,'pending');let calls=0;
 const fetcher=guardedFetch(f.root,'unit-token',async()=>{calls++;throw Error('must not be reached');});
 await assert.rejects(()=>fetcher('https://api.openai.com/v1/responses',{method:'POST',body:'{}'}),/NO_RESERVED_UPSTREAM_PERMIT/);
 await mkdir(path.join(f.root,QA),{recursive:true});await writeFile(path.join(f.root,QA,'permit.json'),JSON.stringify({id:1,nonce:'unit'}));
 await assert.rejects(()=>fetcher('https://api.openai.com/v1/responses',{method:'POST',body:'{}'}),/APPROVAL_REQUIRED/);
 await assert.rejects(()=>fetcher('https://example.invalid',{method:'GET'}),/UNEXPECTED_UPSTREAM/);
 assert.equal(calls,0);
});
test('HTTP 200 needs real-shape upstream and matching persisted after evidence to pass',async t=>{
 for(const scenario of ['missing-raw','missing-after','wrong-version','complete']){
  const f=await fixture(t);let turns=0,stopped=0;
  const state=version=>({provider:'openai',collection:[],game:{step:0,ending:null,dialogue:{version},narrative:{format:2,turn:version}}});
  const effects={startServer:async()=>({port:1,stop:async()=>{stopped++;}}),fetch:async(url,options)=>{
   assert.ok(url.startsWith('http://127.0.0.1:1/api/'));
   if(url.endsWith('/turn')){
    turns++;const attempt=(await json(path.join(f.root,LEDGER))).attempts[0];
    if(scenario!=='missing-raw'){
     const dir=path.join(f.root,QA,'attempts','001');
     await writeFile(path.join(dir,'upstream-started'),attempt.nonce);
     await writeFile(path.join(dir,'raw.json'),JSON.stringify({attemptId:1,phase:'response',status:200,body:{id:'synthetic-response-id',status:'completed',output:[{content:[{type:'output_text',text:'synthetic structured response'}]}]}}));
    }
    return Response.json({status:200,...state(1)});
   }
   if(turns&&scenario==='missing-after')throw Error('Synthetic missing after-state');
   return Response.json(state(turns&&scenario!=='wrong-version'?1:0));
  }};
  const result=await runAuthorizedAction(f.root,request,effects);
  assert.equal(result.result,scenario==='complete'?'committed':'failed');assert.equal(stopped,1);
  assert.equal((await json(path.join(f.root,LEDGER))).attempts.length,1);
  const evidence=await json(path.join(f.root,result.receipt));
  assert.equal(evidence.verificationIssues.length===0,scenario==='complete');
 }
});
test('uncertain child termination retains the phase lock for parent investigation',async t=>{
 const f=await fixture(t);let stopCalls=0;
 const effects={startServer:async()=>({port:1,stop:async()=>{stopCalls++;throw Error('SYNTHETIC_STOP_TIMEOUT');}}),fetch:async()=>Response.json({provider:'openai',game:null,collection:[]})};
 await assert.rejects(()=>runAuthorizedAction(f.root,{action:'state',profile:'qa-unit'},effects),/SYNTHETIC_STOP_TIMEOUT/);
 assert.equal(stopCalls,1);assert.ok((await json(path.join(f.root,LEDGER+'.lock'))).token);
 const startup=await fixture(t);
 const startFailure={startServer:async()=>{const error=new Error('SYNTHETIC_START_AND_STOP_FAILURE');error.retainQaLock=true;throw error;},fetch:async()=>{throw Error('must never run');}};
 await assert.rejects(()=>runAuthorizedAction(startup.root,{action:'state',profile:'qa-unit'},startFailure),/SYNTHETIC_START_AND_STOP_FAILURE/);
 assert.ok((await json(path.join(startup.root,LEDGER+'.lock'))).token);
});
