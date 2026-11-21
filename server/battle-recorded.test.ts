import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conversationTurn} from './conversation-turn.ts';
import {commitDialogue} from './dialogue.ts';
import {decodeConversation} from './conversation-response.ts';
import {battleTotals} from './battle-rules.ts';
const fixtures=JSON.parse(readFileSync('docs/battle-review/recorded-model.json','utf8'));
test('captured natural six-turn game and real repaired seventh response replay to victory without injected gains',async()=>{
 const f=fixtures.find((f:any)=>f.name==='winning-repair'),g=structuredClone(f.before),prior=structuredClone(g);
 assert.equal(g.dialogue.version,6);assert.deepEqual(battleTotals(g),{player:100,boss:8});
 let calls=0;const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='captured-replay-no-network';
 try{
  const result=await conversationTurn(g,f.text,'recorded-winning-request','openai',new AbortController().signal,async()=>{},async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(f.outputs[calls++])}]}]}));
  assert.equal(calls,2);assert.deepEqual(g,prior);assert.equal(result.game.ending,'office-clockout-success');assert.equal(result.game.dialogue!.version,7);assert.deepEqual(battleTotals(result.game),{player:100,boss:0});
  assert.equal(result.game.log.filter(x=>x.text===f.text).length,1);
 }finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
test('captured over-generous live judgment is rejected atomically; recorded failure is not relabelled as a live pass',()=>{
 const f=fixtures.find((f:any)=>f.name==='unsupported-refusal'),g=structuredClone(f.before),prior=structuredClone(g);
 assert.throws(()=>commitDialogue(g,null,f.text,decodeConversation(f.outputs[0],f.text)),/제시하지 않은 대안/);assert.deepEqual(g,prior);
});
