import {start} from './v2-revision-parent-probe/server/game.ts';
import {commitDialogue,type DialogueGame} from './v2-revision-parent-probe/server/dialogue.ts';
import {type NarrativeReply,type EventProposal} from './v2-revision-parent-probe/server/narrative.ts';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const response=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const trace:unknown[]=[];
function step(g:DialogueGame,input:string,r:NarrativeReply){const after=commitDialogue(g,null,input,r);trace.push({input,response:r,before:g,after});return after;}
const original='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
const offer:EventProposal={kind:'promise',subject:'player',text:original,status:'offered',reference:'',evidence:original,value:'keepsake'};
let g=step(start('romance'),original,response({events:[offer],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
const c=g.narrative!.commitments![0];
g=step(g,'좋아요.',response({events:[{...offer,status:'accepted',reference:c.promiseId,evidence:'좋아요.'}]}));
g=step(g,'노란 리본 가져왔어요.',response({commitmentProgress:[{promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player',source:'player',actionIndex:-1,eventId:'',quote:'노란 리본 가져왔어요.'}]}));
const quote='편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.';
const npcQuote='좋아요. '+quote;
const revision={promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player' as const,target:'유나',action:'그림을 그리는'},playerQuote:quote,npcQuote};
const cases=[
 {name:'explicit bilateral change',input:quote,line:npcQuote,expectedChanged:true},
 {name:'player retracts in next sentence',input:quote+' 아니, 방금 말은 취소할게요. 편지를 그대로 접을게요.',line:npcQuote,expectedChanged:false},
 {name:'player asks not to change after quoted assent',input:quote+' 아니요. 바꾸지 말아 주세요. 원래대로 할게요.',line:npcQuote,expectedChanged:false},
 {name:'npc retracts in next sentence',input:quote,line:npcQuote+' 아니, 방금 말은 취소할게요. 원래 약속대로 해 주세요.',expectedChanged:false},
 {name:'question instead of agreement',input:quote+'?',line:npcQuote,expectedChanged:false},
 {name:'unrelated refusal after real agreement',input:quote+' 커피는 안 마실게요.',line:npcQuote,expectedChanged:true},
 {name:'unrelated subscription cancellation',input:quote+' 잡지 구독은 취소할게요.',line:npcQuote,expectedChanged:true},
 {name:'short direct retraction',input:quote+' 아니, 취소할게요.',line:npcQuote,expectedChanged:false},
 {name:'explicit agreement retraction',input:quote+' 방금 한 동의를 철회해요.',line:npcQuote,expectedChanged:false},
];
const results=cases.map(test=>{
 let after:DialogueGame|undefined,error='';const r=response({line:test.line,commitmentRevisions:[revision]});
 try{after=commitDialogue(g,null,test.input,r);}catch(e){error=String(e);}
 const changed=after?.narrative!.commitments![0].conditions[1].action==='그림을 그리는';
 return {...test,changed,pass:changed===test.expectedChanged,error,response:r,before:g,after:after??g};
});
const files=['server/commitments.ts','server/commitment-revisions.ts','server/narrative.ts','server/provider.ts','server/storage.ts'];
const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync('.ralph/v2-revision-parent-probe/'+f)).digest('hex')]));
mkdirSync('docs/v2-revision-parent-review',{recursive:true});
const destination=process.argv[2];
if(!destination||!/^docs\/v2-revision-parent-review\/holdout-(?:after|followup)\.json$/.test(destination))throw Error('Use a new explicit after/followup evidence path; preserve the before artifact.');
writeFileSync(destination,JSON.stringify({at:new Date().toISOString(),scope:'Parent-isolated snapshot; normal initial turns, controlled mock proposals; zero paid calls; not a frozen final worker review',hashes,setup:trace,results},null,2));
console.log(JSON.stringify({hashes,results:results.map(({name,expectedChanged,changed,pass,error})=>({name,expectedChanged,changed,pass,error}))},null,2));
