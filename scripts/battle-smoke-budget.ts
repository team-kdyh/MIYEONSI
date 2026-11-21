import {open,readFile,rename,unlink} from 'node:fs/promises';
export const LIMIT=24;
type Attempt={id:number;reservedAt:string;maxOutputTokens:number;result:string;status?:number};
type Ledger={phase:'office-battle';phaseLimit:24;historicalAttempts:44;attempts:Attempt[]};
export const emptyLedger=():Ledger=>({phase:'office-battle',phaseLimit:24,historicalAttempts:44,attempts:[]});
/** Lock spans reserve, network and result: concurrent owners fail closed. A crash leaves
 * a reservation (and lock) for human review; it never refunds an uncertain delivery. */
export function budgetedFetch(ledgerPath:string,transport:typeof fetch):typeof fetch{
 return async(input,init)=>{
  if(String(input)!=='https://api.openai.com/v1/responses')throw Error('Smoke network destination rejected');
  const body=JSON.parse(String(init?.body));
  if(!Number.isInteger(body.max_output_tokens)||body.max_output_tokens<1||body.max_output_tokens>1600)throw Error('Output cap rejected');
  const lock=await open(ledgerPath+'.lock','wx');
  try{
   const ledger:Ledger=JSON.parse(await readFile(ledgerPath,'utf8'));
   if(ledger.phase!=='office-battle'||ledger.phaseLimit!==LIMIT||ledger.historicalAttempts!==44||!Array.isArray(ledger.attempts)||ledger.attempts.length>=LIMIT||ledger.attempts.some((a,i)=>a.id!==i+1))throw Error('Invalid or exhausted battle ledger');
   const save=async()=>{const f=await open(ledgerPath+'.tmp','w');try{await f.writeFile(JSON.stringify(ledger,null,2)+'\n');await f.sync();}finally{await f.close();}await rename(ledgerPath+'.tmp',ledgerPath);};
   const attempt:Attempt={id:ledger.attempts.length+1,reservedAt:new Date().toISOString(),maxOutputTokens:body.max_output_tokens,result:'reserved'};
   ledger.attempts.push(attempt);await save();
   let response:Response;
   try{response=await transport(input,init);}catch{attempt.result='transport-failure-or-cancelled';await save();throw Error('Responses transport failed; attempt retained');}
   attempt.status=response.status;attempt.result=response.ok?'response-received':'http-failure';await save();
   return response;
  }finally{await lock.close();await unlink(ledgerPath+'.lock');}
 };
}
