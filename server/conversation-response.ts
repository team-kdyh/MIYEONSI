import {battleSchema,validateBattle} from './battle-evaluation.ts';
import type {Game} from './game.ts';
import {narrativeSchema,validateNarrative,type NarrativeReply} from './narrative.ts';
import {groundedFeedback,type OfficeFeedback} from './office-match.ts';

const spokenKeys=['line','actionBeats','emotion','pose','musicMood','recall','conjecture'] as const;
/** Ordinary dialogue has no transaction to fill out. The existing event engine owns real changes. */
export function conversationSchema(game:Game,repair=false,discussionOnly=false){
 const source=narrativeSchema(game),entries=Object.entries(source.properties);
 const utterance=Object.fromEntries(entries.filter(([key])=>spokenKeys.includes(key as typeof spokenKeys[number])));
 const changes=game.mode==='office'?{events:{...source.properties.events,items:{anyOf:source.properties.events.items.anyOf.filter(variant=>['detail','concession','complication'].includes(variant.properties.kind.enum[0]))}}}:Object.fromEntries(entries.filter(([key])=>!spokenKeys.includes(key as typeof spokenKeys[number])));
 const excerpt={type:'string',minLength:1,maxLength:80};
 return {type:'object',additionalProperties:false,required:['utterance','changes',...(game.mode==='office'?['battle','feedback']:[])],properties:{
  utterance:{type:'object',additionalProperties:false,required:Object.keys(utterance),properties:discussionOnly?{...utterance,recall:{...source.properties.recall,maxItems:0}}:utterance},
  changes:{anyOf:[{type:'null'},...(game.mode==='office'&&repair?[]:[{type:'object',additionalProperties:false,required:Object.keys(changes),properties:changes}])]},
  ...(game.mode==='office'?{battle:discussionOnly?{type:'null'}:battleSchema(game.step,repair),
   feedback:{type:'object',additionalProperties:false,required:['playerQuote','bossQuote','explanation'],properties:{playerQuote:excerpt,bossQuote:excerpt,explanation:{type:'string',minLength:1,maxLength:180}}}}:{})
 }};
}
export function decodeConversation(value:unknown,text?:string,allowOfficeFeedback=true):NarrativeReply & {feedback?:OfficeFeedback}{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('대화 응답 형식 오류');
 // Historical transport fixtures/integrations can still deliver the flat v2 shape.
 if(!('utterance' in value))return validateNarrative(value);
 const v=value as {utterance:unknown;changes:unknown;battle?:unknown;feedback?:unknown};
 if(v.battle&&typeof v.battle==='object'&&!('playerQuote' in v.battle)&&!('npcQuote' in v.battle)&&typeof text==='string'&&v.utterance&&typeof v.utterance==='object'&&'line' in v.utterance)v.battle={...v.battle,playerQuote:text,npcQuote:v.utterance.line};
 if(v.battle!==undefined)validateBattle(v.battle);
 const battle=v.battle===undefined?{}:{battle:v.battle};
 const envelopeKeys=Object.keys(v).filter(key=>!(key==='feedback'&&allowOfficeFeedback&&'battle' in v));
 if(!['changes,utterance','battle,changes,utterance'].includes(envelopeKeys.sort().join(','))||!v.utterance||typeof v.utterance!=='object'||Array.isArray(v.utterance))throw Error('대사 형식 오류');
 if(Object.keys(v.utterance).sort().join(',')!==[...spokenKeys].sort().join(','))throw Error('대사 필드 오류');
 const changes=v.changes===null?{events:[]}:v.changes;
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!('events' in changes)||Object.keys(changes).some(k=>spokenKeys.includes(k as typeof spokenKeys[number])))throw Error('진행 기록 형식 오류');
 const reply=validateNarrative({...v.utterance,...changes,...battle});
 // An inaccurate editorial quote is omitted without altering any gameplay proposal.
 const feedback=groundedFeedback(v.feedback,text??'',reply.line);
 return feedback?{...reply,feedback}:reply;
}
