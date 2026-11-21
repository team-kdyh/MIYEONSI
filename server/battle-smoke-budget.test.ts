import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {budgetedFetch,emptyLedger} from '../scripts/battle-smoke-budget.ts';
import {conversationTurn} from './conversation-turn.ts';
import {start} from './game.ts';
test('AC5 paid harness reserves each actual attempt including repair, HTTP failure and cancellation; 24 is a hard cap',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-budget-')),file=path.join(dir,'ledger.json');
 try{
  await writeFile(file,JSON.stringify(emptyLedger()));let calls=0;
  const wrapped=budgetedFetch(file,async()=>{
   const ledger=JSON.parse(await readFile(file,'utf8'));assert.equal(ledger.attempts.length,++calls);assert.equal(ledger.attempts.at(-1).result,'reserved');
   if(calls===2)throw Error('secret must never be recorded');
   return new Response('{}',{status:calls===1?500:200});
  });
  const call=(tokens=1600)=>wrapped('https://api.openai.com/v1/responses',{body:JSON.stringify({max_output_tokens:tokens}),headers:{Authorization:'SECRET'}});
  await assert.rejects(call(1601));assert.equal(calls,0);
  await assert.rejects(wrapped('https://example.com',{body:'{}'}));
  for(let i=0;i<24;i++){if(i===1)await assert.rejects(call());else await call();}
  await assert.rejects(call(),/exhausted/);assert.equal(calls,24);
  const raw=await readFile(file,'utf8'),ledger=JSON.parse(raw);assert.ok(!raw.includes('SECRET'));assert.ok(!raw.includes('secret'));assert.equal(ledger.attempts[0].result,'http-failure');assert.equal(ledger.attempts[1].result,'transport-failure-or-cancelled');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('AC5 malformed/missing ledgers and concurrent owner locks fail closed without network',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-budget-')),file=path.join(dir,'ledger.json');
 try{
  let calls=0;const f=budgetedFetch(file,async()=>{calls++;return new Response('{}');}),call=()=>f('https://api.openai.com/v1/responses',{body:'{"max_output_tokens":1600}'});
  await assert.rejects(call());await writeFile(file,'{}');await assert.rejects(call());
  await writeFile(file,JSON.stringify(emptyLedger()));await writeFile(file+'.lock','');await assert.rejects(call());assert.equal(calls,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('AC5 ordinary internal repair reserves two separate Responses attempts in the new ledger',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'battle-repair-budget-')),file=path.join(dir,'ledger.json'),old=process.env.OPENAI_API_KEY;
 try{
  process.env.OPENAI_API_KEY='mock-only';await writeFile(file,JSON.stringify(emptyLedger()));let count=0;
  const fetcher=budgetedFetch(file,async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(++count===1?{}:{utterance:{line:'잠깐 생각하셔도 됩니다.',actionBeats:[],emotion:'차분',pose:'listen',musicMood:'office-groove',recall:[],conjecture:''},changes:null,battle:null})}]}]}));
  const result=await conversationTurn(start('office'),'잠깐 생각할게요.','ac5-repair','openai',new AbortController().signal,async()=>{},fetcher);
  assert.equal(result.attempts,2);assert.equal(result.game.dialogue!.version,1);assert.equal(JSON.parse(await readFile(file,'utf8')).attempts.length,2);
 }finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;await rm(dir,{recursive:true,force:true});}
});
