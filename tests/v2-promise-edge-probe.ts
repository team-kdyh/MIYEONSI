import {start} from '../server/game.ts';
import {reconcile,type EventProposal,type NarrativeReply} from '../server/narrative.ts';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const response=(event:EventProposal,actions:string[]=[],line='알겠어요.'):NarrativeReply=>({line,events:[event],actionBeats:actions,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
const cases=[
 {id:'unrelated-proposal-cannot-prove-itself',owner:'npc',input:'리본은요?',proposal:'유나가 노트를 덮었다.',actions:['유나가 노트를 덮는다.'],expected:'rejected'},
 {id:'looking-is-not-delivery',owner:'npc',input:'리본은요?',proposal:'노란 리본 약속을 이행했다.',actions:['유나가 노란 리본을 바라본다.'],expected:'rejected'},
 {id:'searching-is-not-delivery',owner:'player',input:'노란 리본을 찾아봤어요.',proposal:'노란 리본 약속을 이행했다.',actions:[],expected:'rejected'},
 {id:'friend-is-not-the-player',owner:'player',input:'친구가 노란 리본을 가져왔어요.',proposal:'노란 리본 약속을 이행했다.',actions:[],expected:'rejected'},
 {id:'natural-particleless-delivery',owner:'player',input:'노란 리본 가져왔어요.',proposal:'노란 리본 약속을 이행했다.',actions:[],expected:'committed'},
] as const;
const rows=[];
for(const c of cases){
 const input=c.owner==='player'?'제가 다음에 노란 리본을 가져올게요.':'다음에 리본을 가져와 줄 수 있어요?';
 const offer:EventProposal={kind:'promise',subject:c.owner,status:'offered',text:'노란 리본을 가져오는 약속',value:'yellow-ribbon',reference:'',evidence:c.owner==='player'?input:''};
 const before=reconcile(start('romance'),input,response(offer)).game;
 const proposal:EventProposal={...offer,status:'fulfilled',text:c.proposal,reference:before.narrative!.events.find(e=>e.kind==='promise')!.id,evidence:c.owner==='player'?c.input:''};
 let status='rejected',after=null;
 try{after=reconcile(before,c.input,response(proposal,[...c.actions])).game;status='committed';}catch{}
 rows.push({...c,before,proposal,status,after,expectationMet:status===c.expected});
}
const sourceSha256=createHash('sha256').update(await readFile('server/narrative.ts')).digest('hex');
await writeFile('docs/v2-parent-current/promise-edge-probe.json',JSON.stringify({scope:'Synthetic model proposals through normal start and pure reducer turns; no external model or production storage mutation',sourceSha256,rows},null,2));
console.log(JSON.stringify({checks:rows.length,met:rows.filter(r=>r.expectationMet).length,knownMismatches:rows.filter(r=>!r.expectationMet).map(r=>r.id)}));
if(rows.some(r=>!r.expectationMet))process.exitCode=1;
