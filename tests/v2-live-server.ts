// Only launched by the explicit, ledger-governed v2 smoke runner.
import {writeFile} from 'node:fs/promises';
const original=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const response=await original(input,init);
 if(String(input)==='https://api.openai.com/v1/responses'){
  await writeFile(process.env.V2_RAW_PATH!,JSON.stringify({request:JSON.parse(init!.body as string),status:response.status,body:await response.clone().json()},null,2));
 }
 return response;
};
await import('../server/index.ts');
