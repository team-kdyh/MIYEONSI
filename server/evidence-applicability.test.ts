import {test,after} from 'node:test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
import {emptyProfile,ProfileStore,validateProfile} from './storage.ts';
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const trace:unknown[]=[];
function commit(g:DialogueGame,choice:null,text:string,response:NarrativeReply){try{const after=commitDialogue(g,choice,text,response);trace.push({before:g,text,response,after});return after;}catch(error){trace.push({before:g,text,response,error:String(error),after:g});throw error;}}
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=commit(start('romance'),null,text,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 g=commit(g,null,'좋아요.',reply({events:[{...offer,status:'accepted',reference:contract(g).promiseId,evidence:'좋아요.'}]}));return g;
}
function perform(g:DialogueGame,index:number,text:string,eventId=''){
 const c=contract(g);
 return commit(g,null,eventId?'이전에 한 일도 확인해 주세요.':text,reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[index].id,performer:c.conditions[index].performer,source:eventId?'event':'player',quote:text,eventId,actionIndex:-1}]}));
}
test('one normal source explicitly performs two obligations; independent applicability survives slots and disk reload',async()=>{
 const text='노란 리본을 유나에게 가져왔어요. 편지를 접었어요.';
 const partial=perform(setup(),0,text),source=contract(partial).conditions[0].evidenceIds[0];
 const completed=perform(partial,1,text,source);
 assert.equal(contract(completed).status,'completed');
 assert.equal(contract(completed).evidenceApplicability!.length,2);
 assert.equal(new Set(contract(completed).evidenceApplicability!.map(r=>r.conditionId)).size,2);
 assert.deepEqual(contract(completed).conditions.map(c=>c.evidenceIds),[[source],[source]]);
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-applicability-'));
 try{const p={...emptyProfile(),game:completed,slots:[completed,completed,completed]};await new ProfileStore(dir).save('c'.repeat(48),p);
  const restored=(await new ProfileStore(dir).load('c'.repeat(48))).profile;
  for(const g of [restored.game,...restored.slots])assert.deepEqual(contract(g!),contract(completed));
 }finally{await rm(dir,{recursive:true,force:true});}
 const bad=structuredClone(completed);bad.narrative!.events.find(e=>e.id===source)!.text='노란 리본을 유나에게 가져왔어요.';
 assert.throws(()=>validateProfile({...emptyProfile(),game:bad}));
});
test('source omitting the second action or naming a different actor cannot be reused',()=>{
 for(const text of ['노란 리본을 유나에게 가져왔어요.','노란 리본을 유나에게 가져왔어요. 친구가 편지를 접었어요.']){
  const partial=perform(setup(),0,text),source=contract(partial).conditions[0].evidenceIds[0];
  assert.throws(()=>perform(partial,1,text,source));assert.equal(contract(partial).status,'partial');
 }
});

after(()=>{mkdirSync('docs/v2-contract-followup',{recursive:true});const files=['server/commitments.ts','server/evidence-applicability.ts','server/commitment-revisions.ts','server/narrative.ts'];writeFileSync('docs/v2-contract-followup/applicability-trace.json',JSON.stringify({source:'mock, normal new-game turns; no completed-state injection',hashes:Object.fromEntries(files.map(f=>[f,createHash("sha256").update(readFileSync(f)).digest("hex")])),trace},null,2));});
