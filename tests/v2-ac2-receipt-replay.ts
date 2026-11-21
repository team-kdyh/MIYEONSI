import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {commitDialogue} from '../server/dialogue.ts';

// Recorded responses only. Never invokes a provider or starts an HTTP server.
const rows=[];
for(let id=1;id<=32;id++){
 const receipt=JSON.parse(await readFile(`docs/v2-live-${String(id).padStart(2,'0')}.json`,'utf8'));
 const reply=JSON.parse(receipt.raw.body.output.flatMap((o:any)=>o.content??[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join(''));
 const before=structuredClone(receipt.before.state.game);
 const originalCommitted=!!receipt.response?.state?.game;
 let result;
 try{result=commitDialogue(before,null,receipt.input.text,reply);}
 catch(error){assert.equal(originalCommitted,false,`Receipt ${id} was previously committed`);rows.push({id,originalCommitted,replay:'rejected',error:(error as Error).message});continue;}
 assert.deepEqual(before,receipt.before.state.game);
 if(originalCommitted){
  const expected=receipt.response.state.game;
  for(const field of ['location','relationship','dates','turn'])assert.equal((result.narrative as any)[field],expected.narrative[field]);
  assert.equal(result.ending,expected.ending);
  const shape=(events:any[])=>events.map(({id,...rest})=>rest);
  assert.deepEqual(shape(result.narrative!.events),shape(expected.narrative.events));
 }
 rows.push({id,originalCommitted,replay:'committed',matchesOriginal:originalCommitted});
}
const hashes=Object.fromEntries(await Promise.all(['server/narrative.ts','server/provider.ts','server/dialogue.ts','tests/v2-ac2-receipt-replay.ts'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
await writeFile('docs/v2-ac2-receipt-replay.json',JSON.stringify({scope:'Captured-response replay, not new live generation; UUID identity excluded, all other event fields compared',hashes,rows},null,2));
console.log(`${rows.filter(r=>r.originalCommitted).length} original committed receipts preserved; all 32 replayed without network.`);
