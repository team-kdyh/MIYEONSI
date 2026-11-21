import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {start} from './game.ts';
import {canonical,commitDialogue,type DialogueGame} from './dialogue.ts';
import {narrative,type EventProposal,type NarrativeReply} from './narrative.ts';
import {emptyProfile,ProfileStore} from './storage.ts';
import {messages} from './provider.ts';

const event=(kind:EventProposal['kind'],value:string,text:string,status:EventProposal['status']='accepted'):EventProposal=>({kind,value,text,status,subject:'mutual',reference:'',evidence:text});
const response=(events:EventProposal[]=[]):NarrativeReply=>({line:'말씀하신 계획을 확인했어요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events,recall:[],conjecture:''});
const advance=(g:DialogueGame,text:string,r: NarrativeReply)=>commitDialogue(g,null,text,r);
const hash=(g:unknown)=>createHash('sha256').update(JSON.stringify(g)).digest('hex');
const consequences=(g:DialogueGame)=>({location:g.narrative!.location,relationship:g.narrative!.relationship,dates:g.narrative!.dates,ending:g.ending,agreements:g.narrative!.events.filter(e=>e.kind==='concession'&&e.status==='accepted').map(e=>({value:e.value,text:e.text}))});

for(const mode of ['office','romance'] as const)test(`${mode}: identical saved origin, three branches, common followup and disk restore retain consequences`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'afterhours-counterfactual-'));
 try{
  const profile=emptyProfile();profile.game=start(mode);
  profile.game.dialogue=canonical(profile.game);profile.game.narrative=narrative(profile.game);
  const store=new ProfileStore(dir),originKey='a'.repeat(48);await store.save(originKey,profile);
  const scenarios=mode==='office'?[
   {label:'accept',input:'오늘 18시 퇴근하고 민지가 내일 10시까지 표를 맡습니다.',values:['leave','handoff'],status:'accepted' as const},
   {label:'creative',input:'대신 제가 화면 공유로 오류 두 개만 수정합니다.',values:['scope'],status:'accepted' as const},
   {label:'refuse',input:'오늘 인계는 거절합니다.',values:['handoff'],status:'refused' as const},
  ]:[
   {label:'accept',input:'지금 옥상으로 가요.',values:['rooftop'],status:'accepted' as const},
   {label:'creative',input:'대신 지금 강변으로 가요.',values:['riverside'],status:'accepted' as const},
   {label:'refuse',input:'옥상은 싫어요. 카페에 있을래요.',values:[],status:'refused' as const},
  ];
  const rows=[];
  for(const [i,scenario] of scenarios.entries()){
   const before=(await new ProfileStore(dir).load(originKey)).profile.game!;
   const generated=response(scenario.values.map(v=>event(mode==='office'?'concession':'move',v,scenario.input,scenario.status)));
   const after=advance(before,scenario.input,generated);
   const commonInput='방금 이야기한 내용을 기억하며 조금 더 이야기해요.';
   const continued=advance(after,commonInput,response());
   assert.deepEqual(consequences(continued),consequences(after));
   const branchProfile=emptyProfile();branchProfile.game=continued;branchProfile.slots=[continued,null,null];
   const key=String(i+1).repeat(48);await store.save(key,branchProfile);
   const restoredProfile=(await new ProfileStore(dir).load(key)).profile;
   assert.deepEqual(restoredProfile.slots[0],continued);
   const restored=restoredProfile.game!;
   assert.deepEqual(restored,continued);
   const following=advance(restored,commonInput,response());
   assert.deepEqual(consequences(following),consequences(after));
   const context=JSON.parse(messages(following,'다음에는 무엇을 할까요?')[0].content);
   assert.equal(context.story.location,following.narrative!.location);
   let resolution:'accepted'|'rejected'|null=null;
   if(mode==='office'){
    const text='그 합의로 마무리합니다.';
    const r=response([{...event('resolution','success',text),subject:'player'}]);
    if(scenario.label==='accept'){
     assert.equal(advance(following,text,r).ending,'office-clockout-success');resolution='accepted';
    }else{assert.throws(()=>advance(following,text,r));resolution='rejected';}
   }
   rows.push({label:scenario.label,startHash:hash(before),before,input:scenario.input,generated,after,commonInput,continued,restored,following,consequence:consequences(following),resolution});
  }
  assert.equal(new Set(rows.map(r=>r.startHash)).size,1);
  assert.equal(new Set(rows.map(r=>JSON.stringify(r.consequence))).size,3);
  await writeFile(`docs/v2-ac2-${mode}-durable-counterfactual.json`,JSON.stringify({scope:'Deterministic mocked proposals through production reducer and disk store; not new model generation or live conversational proof',rows},null,2));
 }finally{await rm(dir,{recursive:true,force:true});}
});
