import {start} from '../v2-state-g1-snapshot/server/game.ts';
import {commitDialogue} from '../v2-state-g1-snapshot/server/dialogue.ts';
import type {NarrativeReply,EventProposal} from '../v2-state-g1-snapshot/server/narrative.ts';
import {writeFileSync} from 'node:fs';
const reply=(events:EventProposal[]=[],extra:Partial<NarrativeReply>={}):NarrativeReply=>({line:'좋아요.',actionBeats:[],events,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:'',...extra});
const original='제가 노란 리본을 가져오는 약속을 할게요.';
const offer:EventProposal={kind:'promise',subject:'player',text:original,status:'offered',reference:'',evidence:original,value:'ribbon'};
const g=commitDialogue(start('romance'),null,original,reply([offer],{commitmentOffers:[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오는'}]}]}));
const c=g.narrative!.commitments![0];
const text='좋아요. 노란 리본 가져왔어요.';
const acceptance={...offer,status:'accepted' as const,reference:c.promiseId,evidence:'좋아요.'};
const progress={promiseId:c.promiseId,conditionId:c.conditions[0].id,performer:'player' as const,source:'player' as const,actionIndex:-1,eventId:'',quote:'노란 리본 가져왔어요.'};
const response=reply([acceptance],{commitmentProgress:[progress]});
let outcome:any;
try{outcome={committed:true,state:commitDialogue(g,null,text,response).narrative};}catch(error){outcome={committed:false,error:String(error)};}
const accepted=commitDialogue(g,null,'좋아요.',reply([acceptance]));
const separate=commitDialogue(accepted,null,'노란 리본 가져왔어요.',reply([],{commitmentProgress:[progress]}));
writeFileSync(new URL('./result.json',import.meta.url),JSON.stringify({scope:'Mock normal start/offer and same-turn acceptance+actual performance; no API',original,before:g.narrative,text,response,outcome,positiveSeparateTurns:separate.narrative},null,2));
console.log(JSON.stringify({sameTurnCommitted:outcome.committed,error:outcome.error,separateTurnStatus:separate.narrative!.commitments![0].status}));
