import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {commitDialogue} from '../server/dialogue.ts';
// Offline historical-response audit. No provider import, network or ledger write.
const rows=[];
for(let id=1;id<=32;id++){
 const file=`docs/v2-live-${String(id).padStart(2,'0')}.json`;
 const receipt=JSON.parse(await readFile(file,'utf8'));
 const reply=JSON.parse(receipt.raw.body.output.flatMap((o:any)=>o.content??[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join(''));
 const prior=receipt.before.state.game,original=receipt.response?.state?.game;
 let replay;
 try{
  const result=commitDialogue(prior,null,receipt.input.text,reply);
  replay={status:'committed',dates:result.narrative!.dates,activeDate:result.narrative!.activeDate??null,ending:result.ending,location:result.narrative!.location};
 }catch(error){replay={status:'rejected',error:(error as Error).message};}
 rows.push({id,file,mode:prior.mode,mission:prior.office?.missionId,originalCommitted:!!original,originalDates:original?.narrative?.dates,replay});
}
const files=['server/narrative.ts','server/provider.ts','server/storage.ts','server/dialogue.ts','server/v2-ac3-lifecycle.test.ts','tests/v2-ac3-receipt-audit.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const ledger=JSON.parse(await readFile('docs/v2-api-smoke-ledger.json','utf8'));
await writeFile('docs/v2-ac3-receipt-audit.json',JSON.stringify({scope:'Captured replies replayed independently against their historical starting saves, not new generation or a continuous current-code conversation. Historical date counters remain readable; they do not prove current scene lifecycle.',hashes,paidAttempts:ledger.attempts.length,additionalCalls:0,rows},null,2));
console.log(JSON.stringify({originalCommitted:rows.filter(r=>r.originalCommitted).length,replayed:rows.length,changedDates:rows.filter(r=>r.originalCommitted&&r.originalDates!==r.replay.dates).map(r=>r.id),newCalls:0}));
