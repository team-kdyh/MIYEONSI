// Parent runner child only. No headers/credential values are inspected or recorded.
import {readFile,open} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {LEDGER,QA,preflight,json,atomicJson,assertUpstreamPayload,fail} from './guard.mjs';

export function guardedFetch(root,lockToken,nativeFetch){
 return async(input,init)=>{
  if(String(input)!=='https://api.openai.com/v1/responses'||init?.method!=='POST')fail('UNEXPECTED_UPSTREAM');
  const permit=await json(path.join(root,QA,'permit.json')).catch(()=>fail('NO_RESERVED_UPSTREAM_PERMIT'));
  const {ledger}=await preflight(root,{allowedReservation:permit.id});
  const attempt=ledger.attempts[permit.id-1];
  if(!attempt||attempt.result!=='reserved'||attempt.nonce!==permit.nonce||(await json(path.join(root,LEDGER+'.lock'))).token!==lockToken)fail('INVALID_UPSTREAM_PERMIT');
  const body=JSON.parse(init.body);assertUpstreamPayload(body,attempt);
  const directory=path.join(root,QA,'attempts',String(attempt.id).padStart(3,'0'));
  // wx is the durable one-upstream-attempt gate; even transport failure consumes it.
  const marker=await open(path.join(directory,'upstream-started'),'wx');await marker.writeFile(attempt.nonce);await marker.sync();await marker.close();
  const rawPath=path.join(directory,'raw.json');
  const raw={attemptId:attempt.id,request:body,startedAt:new Date().toISOString(),phase:'upstream-started',status:null,body:null};
  await atomicJson(rawPath,raw);
  try{
   const response=await nativeFetch(input,{...init,redirect:'error'});
   const text=await response.clone().text();let result;try{result=JSON.parse(text);}catch{result={unparsedText:text};}
   await atomicJson(rawPath,{...raw,phase:'response',status:response.status,body:result,finishedAt:new Date().toISOString()});
   return response;
  }catch(error){await atomicJson(rawPath,{...raw,phase:'transport-failure',errorName:error?.name??'Error',finishedAt:new Date().toISOString()});throw error;}
 };
}
export async function startChild(root=process.cwd()){
 const token=process.env.AFTERHOURS_FINAL_QA_LOCK;
 if(!token)fail('PARENT_RUNNER_REQUIRED');
 await preflight(root);
 if((await json(path.join(root,LEDGER+'.lock'))).token!==token)fail('LOCK_REQUIRED');
 globalThis.fetch=guardedFetch(root,token,globalThis.fetch);
 // The normal server loads its existing private environment only after approval.
 await import(pathToFileURL(path.join(root,'server/index.ts')).href);
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await startChild();
