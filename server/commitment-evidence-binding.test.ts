import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
import {emptyProfile,validateProfile} from './storage.ts';

const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
function setup(){
 const input='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text:input,status:'offered',reference:'',evidence:input,value:'keepsake'};
 const proposed=commitDialogue(start('romance'),null,input,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 const accepted=commitDialogue(proposed,null,'좋아요.',reply({events:[{...offer,status:'accepted',reference:contract(proposed).promiseId,evidence:'좋아요.'}]}));
 return {input,offer,proposed,accepted};
}
function perform(g:DialogueGame,text:string){
 const c=contract(g);
 return commitDialogue(g,null,text,reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player',source:'player',quote:text,eventId:'',actionIndex:-1}]}));
}
test('restoration rejects condition evidence reassigned to a different obligation',()=>{
 const {accepted}=setup();const partial=perform(accepted,'노란 리본을 유나에게 가져왔어요.');
 validateProfile({...emptyProfile(),game:partial});
 const bad=structuredClone(partial),c=contract(bad);
 c.conditions[1].evidenceIds=c.conditions[0].evidenceIds;c.status='completed';
 assert.throws(()=>validateProfile({...emptyProfile(),game:bad}));
 const condition=c.conditions[1];
 assert.throws(()=>commitDialogue(partial,null,'노란 리본을 유나에게 가져왔어요.',reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:condition.id,performer:'player',source:'event',quote:'노란 리본을 유나에게 가져왔어요.',eventId:c.conditions[0].evidenceIds[0],actionIndex:-1}]})));
});

test('revision applicability rejects a historical evidence event with a broken obligation reference',()=>{
 const {accepted}=setup();const partial=perform(accepted,'노란 리본을 유나에게 가져왔어요.');
 const c=contract(partial),quote='노란 리본을 가져오고 대신 그림을 그리는 것으로 바꾸는 데 동의해요.';
 const changed=commitDialogue(partial,null,quote,reply({line:quote,commitmentRevisions:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,expectedVersion:1,replacement:{performer:'player',target:'유나',action:'그림을 그리는'},playerQuote:quote,npcQuote:quote}]}));
 validateProfile({...emptyProfile(),game:changed});
 const bad=structuredClone(changed);
 bad.narrative!.events.find(e=>e.id===c.conditions[0].evidenceIds[0])!.reference=c.conditions[1].id;
 assert.throws(()=>validateProfile({...emptyProfile(),game:bad}));
});

test('Korean performance contrast records supported forms and unresolved paraphrases without inventing nonperformance',()=>{
 const origin=setup();
 const cases=[
  {text:'노란 리본을 유나에게 가져왔어요.',meaning:'performed',expected:true},
  {text:'노란 리본 가져왔어요.',meaning:'performed',expected:true},
  {text:'노란 리본을 유나에게 가져왔습니다.',meaning:'performed',expected:true},
  {text:'좋아요.',meaning:'acceptance',expected:false},
  {text:'노란 리본을 유나에게 가져올게요.',meaning:'future intention',expected:false},
  {text:'노란 리본을 아직 가져오지 않았어요.',meaning:'explicit nonperformance',expected:false},
  {text:'친구가 노란 리본을 유나에게 가져왔어요.',meaning:'other actor',expected:false},
  {text:'노란 리본을 친구에게 가져왔어요.',meaning:'other recipient',expected:false},
  {text:'노란 리본을 유나에게 갖다 놓았어요.',meaning:'performed paraphrase; support not assumed',expected:undefined},
  {text:'노란 리본을 지참해서 유나에게 왔어요.',meaning:'performed paraphrase; support not assumed',expected:undefined},
 ];
 const rows=cases.map(row=>{
  let after=origin.accepted,error:string|undefined;
  try{after=perform(origin.accepted,row.text);}catch(e){error=String(e);}
  const matched=contract(after).conditions[0].evidenceIds.length>0;
  if(row.expected!==undefined)assert.equal(matched,row.expected,row.text);
  if(!matched)assert.deepEqual(after,origin.accepted);
  return {...row,sourceSpan:{start:0,end:row.text.length},source:'authored mock, normal turns',server:{matched,error,interpretation:matched?'validated performance':'not exposed: rejection does not distinguish parsing failure from mismatch'},review:row.expected===undefined&&!matched?'unrecognized paraphrase/support limitation':row.meaning,before:origin.accepted,after};
 });
 const files=['server/commitments.ts','server/commitment-revisions.ts','server/narrative.ts','server/storage.ts'];
 mkdirSync('docs/v2-seed-evidence-audit',{recursive:true});
 writeFileSync('docs/v2-seed-evidence-audit/performance-contrasts.json',JSON.stringify({at:new Date().toISOString(),hashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),origin,rows,limitation:'The server exposes a boolean validator, not separate actor/tense/polarity parsing assessments. Rejected turns commit no nonperformance fact. This trace does not establish general Korean entailment or generated speech quality.'},null,2));
});
