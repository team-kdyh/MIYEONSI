import {readFile,readdir,open,rename,unlink,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';

export const LEDGER='docs/v2-final-api-smoke-ledger.json';
export const QA='.ralph/v2-final-qa';
export const REQUIRED_SOURCES=['package.json','package-lock.json','server/provider.ts','server/narrative.ts','server/dialogue.ts','server/game.ts','server/index.ts','server/storage.ts','src/main.tsx','src/style.css','src/CharacterSprite.tsx','src/visualAssets.ts','src/presentation.ts','src/StageEffects.tsx','tests/v2-final-live/guard.mjs','tests/v2-final-live/runner.mjs','tests/v2-final-live/server.mjs'];
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function fail(code){const error=new Error(code);error.code=code;throw error;}
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export async function json(file){return JSON.parse(await readFile(file,'utf8'));}
export function validateRequest(request){
 if(!plain(request)||!['state','new','save','load','turn'].includes(request.action)||!/^[a-z][a-z0-9-]{1,31}$/.test(request.profile??''))fail('INVALID_ACTION');
 const allowed={state:['action','profile'],new:['action','profile','mode','mission'],save:['action','profile','slot'],load:['action','profile','slot'],turn:['action','profile','text','purpose']}[request.action];
 if(Object.keys(request).some(key=>!allowed.includes(key)))fail('UNEXPECTED_ACTION_FIELD');
 if(request.action==='new'&&(!['office','romance'].includes(request.mode)||request.mission!==undefined&&(!Number.isInteger(request.mission)||request.mission<0||request.mission>7)))fail('INVALID_NEW_GAME');
 if(['save','load'].includes(request.action)&&(!Number.isInteger(request.slot)||request.slot<0||request.slot>2))fail('INVALID_SLOT');
 if(request.action==='turn'&&(typeof request.text!=='string'||!request.text.trim()||request.text.length>500||typeof request.purpose!=='string'||!request.purpose.trim()||request.purpose.length>200))fail('INVALID_TURN');
 return request;
}
export function validateLedger(ledger,{requireCapacity=false,allowedReservation}={}){
 if(!plain(ledger)||ledger.approval!=='approved')fail('APPROVAL_REQUIRED');
 if(ledger.owner!=='parent'||!ledger.approvedAt||!ledger.userApprovalReference||ledger.workersQuiescent!==true)fail('PARENT_APPROVAL_RECORD_REQUIRED');
 if(ledger.phaseLimit!==24||ledger.previousAttempts!==44||ledger.cumulativeLimit!==68||ledger.maxOutputTokensPerCall!==1600)fail('INVALID_BUDGET_CONTRACT');
 if(!Array.isArray(ledger.attempts)||ledger.attempts.length>24)fail('PHASE_BUDGET_EXHAUSTED');
 if(requireCapacity&&ledger.attempts.length>=24)fail('PHASE_BUDGET_EXHAUSTED');
 if(ledger.previousAttempts+ledger.attempts.length>68)fail('CUMULATIVE_BUDGET_EXHAUSTED');
 if(ledger.previousLedgers?.length!==2||ledger.previousLedgers[0]?.path!=='docs/api-smoke-ledger.json'||ledger.previousLedgers[0]?.attempts!==12||ledger.previousLedgers[1]?.path!=='docs/v2-api-smoke-ledger.json'||ledger.previousLedgers[1]?.attempts!==32)fail('HISTORY_BINDING_REQUIRED');
 if(!plain(ledger.candidate)||typeof ledger.candidate.model!=='string'||!ledger.candidate.model.trim()||!plain(ledger.candidate.sourceHashes)||REQUIRED_SOURCES.some(file=>!/^[a-f0-9]{64}$/.test(ledger.candidate.sourceHashes[file]??'')))fail('CANDIDATE_FREEZE_REQUIRED');
 for(const [index,attempt] of ledger.attempts.entries()){
  if(attempt.id!==index+1||attempt.cumulativeId!==45+index||attempt.maxOutputTokens!==1600||!['reserved','committed','failed','transport-failure','source-drift'].includes(attempt.result))fail('ATTEMPT_HISTORY_INVALID');
  if(attempt.result==='reserved'&&attempt.id!==allowedReservation)fail('UNRESOLVED_RESERVATION');
 }
 return ledger;
}
export async function sourceHashes(root){
 const files=new Set(REQUIRED_SOURCES);
 async function walk(folder){for(const entry of await readdir(path.join(root,folder),{withFileTypes:true})){const file=folder+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(/\.(?:ts|tsx|js|mjs|css)$/.test(file)&&!file.includes('.test.'))files.add(file);}}
 await walk('server');await walk('src');
 return Object.fromEntries(await Promise.all([...files].sort().map(async file=>[file,sha(await readFile(path.join(root,file)))])));
}
export async function preflight(root,options={}){
 let ledger;try{ledger=await json(path.join(root,LEDGER));}catch{fail('LEDGER_MISSING_OR_INVALID');}
 validateLedger(ledger,options);
 for(const history of ledger.previousLedgers){
  const bytes=await readFile(path.join(root,history.path));
  if(sha(bytes)!==history.sha256||JSON.parse(bytes).attempts?.length!==history.attempts)fail('IMMUTABLE_HISTORY_MISMATCH');
 }
 const hashes=await sourceHashes(root);
 if(JSON.stringify(Object.keys(hashes).sort())!==JSON.stringify(Object.keys(ledger.candidate.sourceHashes).sort())||Object.keys(hashes).some(file=>hashes[file]!==ledger.candidate.sourceHashes[file]))fail('CANDIDATE_SOURCE_CHANGED');
 return {ledger,hashes};
}
export async function atomicJson(file,value){
 await mkdir(path.dirname(file),{recursive:true});
 const temporary=file+'.tmp-'+randomUUID();
 const handle=await open(temporary,'wx');
 try{await handle.writeFile(JSON.stringify(value,null,2));await handle.sync();}finally{await handle.close();}
 try{await rename(temporary,file);}catch(error){await unlink(temporary).catch(()=>{});throw error;}
}
export async function acquireLock(root){
 const file=path.join(root,LEDGER+'.lock');let handle;
 try{handle=await open(file,'wx');}catch{fail('ANOTHER_QA_RUN_OR_STALE_LOCK');}
 const token=randomUUID();await handle.writeFile(JSON.stringify({token,pid:process.pid,createdAt:new Date().toISOString()}));await handle.sync();
 let closed=false;const close=async()=>{if(!closed){await handle.close();closed=true;}};
 return {token,retain:close,async release(){await close();const stored=await json(file);if(stored.token!==token)fail('LOCK_OWNER_CHANGED');await unlink(file);}};
}
export async function reserveTurn(root,{profile,purpose,text,requestId,lockToken}){
 const {ledger,hashes}=await preflight(root,{requireCapacity:true});
 if((await json(path.join(root,LEDGER+'.lock'))).token!==lockToken)fail('LOCK_REQUIRED');
 const id=ledger.attempts.length+1;
 const attempt={id,cumulativeId:44+id,reservedAt:new Date().toISOString(),owner:'parent',profile,purpose,requestId,textSha256:sha(text.trim()),nonce:randomUUID(),maxOutputTokens:1600,model:ledger.candidate.model,result:'reserved',sourceHashes:hashes};
 ledger.attempts.push(attempt);await atomicJson(path.join(root,LEDGER),ledger);
 return attempt;
}
export function assertUpstreamPayload(body,attempt){
 if(!plain(body)||body.max_output_tokens!==1600||body.model!==attempt.model||body.store!==false||!Array.isArray(body.input)||sha(body.input.at(-1)?.content??'')!==attempt.textSha256)fail('UPSTREAM_REQUEST_OUTSIDE_RESERVATION');
}
export async function finalize(root,attempt,update){
 const ledger=await json(path.join(root,LEDGER));
 const current=ledger.attempts?.[attempt.id-1];
 if(!current||current.nonce!==attempt.nonce||current.result!=='reserved')fail('RESERVATION_CHANGED');
 // Recording an already-started attempt is required even if approval was revoked meanwhile.
 Object.assign(current,update,{finishedAt:new Date().toISOString()});
 await atomicJson(path.join(root,LEDGER),ledger);
}
