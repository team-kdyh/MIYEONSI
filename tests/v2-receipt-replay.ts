import {readFile,writeFile} from 'node:fs/promises';
import {commitDialogue} from '../server/dialogue.ts';
import assert from 'node:assert/strict';
const rows=[];
for(const id of [29,30,31,32]){
 const r=JSON.parse(await readFile(`docs/v2-live-${id}.json`,'utf8'));
 const reply=JSON.parse(r.raw.body.output.flatMap((o:any)=>o.content??[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join(''));
 const g=commitDialogue(r.before.state.game,null,r.input.text,reply),expected=r.response.state.game;
 for(const field of ['location','relationship','dates','turn'])assert.equal((g.narrative as any)[field],expected.narrative[field]);
 assert.equal(g.ending,expected.ending);
 const shape=(events:any[])=>events.map(({id,...rest})=>rest);
 assert.deepEqual(shape(g.narrative!.events.filter(e=>e.turn===g.narrative!.turn)),shape(expected.narrative.events.filter((e:any)=>e.turn===expected.narrative.turn)));
 rows.push({receipt:id,matched:true});
}
await writeFile('docs/v2-final-receipt-replay.json',JSON.stringify({scope:'Offline deterministic replay of captured real responses through final reducer; no new generation',rows},null,2));
console.log('Final receipts 29–32 match final reducer, excluding new IDs/timestamps.');
