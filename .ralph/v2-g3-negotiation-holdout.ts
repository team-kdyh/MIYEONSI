import {start} from './v2-g3-review-probe/server/game.ts';
import {commitDialogue,type DialogueGame} from './v2-g3-review-probe/server/dialogue.ts';
import type {NarrativeReply,EventProposal} from './v2-g3-review-probe/server/narrative.ts';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
globalThis.fetch=async()=>{throw Error('NETWORK_FORBIDDEN');};
const reply=(extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',...extra});
const contract=(g:DialogueGame)=>g.narrative!.commitments![0];
const turn=(g:DialogueGame,text:string,r:NarrativeReply)=>commitDialogue(g,null,text,r);
function setup(){
 const text='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const event:EventProposal={kind:'promise',subject:'player',text,status:'offered',reference:'',evidence:text,value:'keepsake'};
 let g=turn(start('romance'),text,reply({events:[event],commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}]}));
 g=turn(g,'좋아요.',reply({events:[{...event,status:'accepted',reference:contract(g).promiseId,evidence:'좋아요.'}]}));
 const proposal='편지를 접는 대신 그림을 그리는 것으로 바꾸면 어떨까요?',c=contract(g);
 return turn(g,proposal,reply({revisionProposals:[{promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1,replacement:{performer:'player',target:'유나',action:'그림을 그리는'},proposer:'player',quote:proposal}]}));
}
const agreement='편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.';
const cases=[
 {id:'bilateral-control',text:agreement,line:agreement,applied:true},
 {id:'player-later-withdrawal',text:agreement+' 하지만 그 변경 제안은 철회할게요.',line:agreement,applied:false},
 {id:'npc-later-withdrawal',text:agreement,line:agreement+' 하지만 그 변경 제안은 철회할게요.',applied:false},
 {id:'unrelated-coffee-refusal',text:agreement+' 커피는 마시지 않을게요.',line:agreement,applied:true},
];
const rows=cases.map(c=>{
 const before=setup(),id=before.narrative!.revisionNegotiations![0].id;
 const response=reply({line:c.line,revisionResponses:[{proposalId:id,actor:'player',quote:agreement},{proposalId:id,actor:'npc',quote:agreement}]});
 const after=turn(before,c.text,response),actual=after.narrative!.revisionNegotiations![0].status==='applied';
 return {...c,actual,pass:actual===c.applied,before,response,after};
});
const files=['revision-negotiation.ts','commitment-revisions.ts','commitments.ts','narrative.ts','dialogue.ts'];
const out=process.argv[2];if(!out)throw Error('Explicit evidence output required');
mkdirSync('docs/v2-g3-parent-holdout',{recursive:true});
writeFileSync(out,JSON.stringify({scope:'Independent normal-turn mock diagnostic, no paid call or active worktree mutation',hashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(`.ralph/v2-g3-review-probe/server/${f}`)).digest('hex')])),rows},null,2));
console.log(JSON.stringify(rows.map(({id,actual,applied,pass})=>({id,actual,expected:applied,pass}))));
if(rows.some(r=>!r.pass))process.exitCode=1;
