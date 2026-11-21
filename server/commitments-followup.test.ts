import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './game.ts';
import {commitDialogue} from './dialogue.ts';
import type {NarrativeReply,EventProposal} from './narrative.ts';
import {ProfileStore,emptyProfile} from './storage.ts';
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'알겠어요.',actionBeats:[],events:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',...extra});
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'ribbon'};
 let g=commitDialogue(start('romance'),null,text,reply({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 const id=g.narrative!.commitments![0].promiseId;
 g=commitDialogue(g,null,'좋아요.',reply({events:[{...offer,status:'accepted',reference:id,evidence:'좋아요.'}]}));
 const c=g.narrative!.commitments![0];
 const amendment={promiseId:id,conditionId:c.conditions[1].id,performer:'npc' as const,playerQuote:'편지는 대신 맡아 주세요.',npcQuote:'제가 편지를 대신 맡을게요.'};
 return {g,offer,id,amendment};
}
test('a refused promise cannot be delegated or revived, including refusal in the same turn',()=>{
 const {g,offer,id,amendment}=setup();
 const refused={...offer,status:'refused' as const,reference:id,evidence:'그 약속은 거절할게요.'};
 const stopped=commitDialogue(g,null,refused.evidence,reply({events:[refused]}));
 assert.throws(()=>commitDialogue(stopped,null,amendment.playerQuote,reply({line:amendment.npcQuote,commitmentAmendments:[amendment]})));
 assert.throws(()=>commitDialogue(g,null,`${refused.evidence} ${amendment.playerQuote}`,reply({line:amendment.npcQuote,events:[refused],commitmentAmendments:[amendment]})));
});
test('delegation history has a finite limit and rejects overflow without dropping obligations',()=>{
 let {g,amendment}=setup();
 for(let i=0;i<32;i++){
  const a=i%2===0?amendment:{...amendment,performer:'player' as const,playerQuote:'제가 편지를 대신 맡을게요.',npcQuote:'편지는 대신 맡아 주세요.'};
  g=commitDialogue(g,null,a.playerQuote,reply({line:a.npcQuote,commitmentAmendments:[a]}));
 }
 const before=structuredClone(g);
 assert.throws(()=>commitDialogue(g,null,amendment.playerQuote,reply({line:amendment.npcQuote,commitmentAmendments:[amendment]})));
 assert.deepEqual(g,before);
 assert.equal(g.narrative!.commitments![0].conditions.length,2);
});
test('repeated performance does not grow evidence or assessment history',()=>{
 let {g}=setup();const c=g.narrative!.commitments![0],text='노란 리본 가져왔어요.';
 const response=reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player',source:'player',actionIndex:-1,eventId:'',quote:text}]});
 g=commitDialogue(g,null,text,response);const before=structuredClone(g.narrative!.commitments);
 for(let i=0;i<3;i++)g=commitDialogue(g,null,text,response);
 assert.deepEqual(g.narrative!.commitments,before);
});
test('normal partial performance and delegation preserve evidence before and after all save boundaries',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'commitment-followup-'));const trace:unknown[]=[];
 try{
  let {g,amendment}=setup();
  const c=g.narrative!.commitments![0];
  const text='노란 리본 가져왔어요.';
  const response=reply({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player',source:'player',actionIndex:-1,eventId:'',quote:text}]});
  const before=structuredClone(g);g=commitDialogue(g,null,text,response);trace.push({input:text,response,before,after:g});
  const evidenceId=g.narrative!.commitments![0].conditions[0].evidenceIds[0];
  for(const phase of ['before-amendment','after-amendment'] as const){
   if(phase==='after-amendment'){
    const before=structuredClone(g),response=reply({line:amendment.npcQuote,commitmentAmendments:[amendment]});
    g=commitDialogue(g,null,amendment.playerQuote,response);trace.push({input:amendment.playerQuote,response,before,after:g});
   }
   const p=emptyProfile();p.game=g;p.slots=[structuredClone(g),structuredClone(g),structuredClone(g)];
   await new ProfileStore(dir).save('b'.repeat(48),p);
   const loaded=(await new ProfileStore(dir).load('b'.repeat(48))).profile;
   for(const game of [loaded.game,...loaded.slots])assert.deepEqual(game!.narrative!.commitments,g.narrative!.commitments);
   trace.push({phase,beforeSave:g.narrative!.commitments,afterRestore:loaded.game!.narrative!.commitments,slots:loaded.slots.map(s=>s!.narrative!.commitments)});
   g=loaded.game!;
  }
  assert.equal(g.narrative!.commitments![0].status,'partial');
  assert.deepEqual(g.narrative!.commitments![0].conditions[0].evidenceIds,[evidenceId]);
  const beat='유나가 편지를 접는다.',current=g.narrative!.commitments![0];
  const finalReply=reply({actionBeats:[beat],commitmentProgress:[{promiseId:current.promiseId,conditionId:current.conditions[1].id,performer:'npc',source:'action',actionIndex:0,eventId:'',quote:beat}]});
  const final=commitDialogue(g,null,'고마워요.',finalReply);
  assert.equal(final.narrative!.commitments![0].status,'completed');
  trace.push({input:'고마워요.',response:finalReply,before:g,after:final});
  await mkdir('docs/v2-state-followup',{recursive:true});
  await writeFile('docs/v2-state-followup/amendment-persistence.json',JSON.stringify({source:'mock normal turns; no completed state injection',trace},null,2));
 }finally{await rm(dir,{recursive:true,force:true});}
});
