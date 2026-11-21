import type {Game} from './game.ts';
import {narrativeSchema,validateNarrative,type NarrativeReply} from './narrative.ts';

const spokenKeys=['line','actionBeats','emotion','pose','musicMood','recall','conjecture'] as const;
/** Ordinary dialogue has no transaction to fill out. The existing event engine owns real changes. */
export function conversationSchema(game:Game){
 const source=narrativeSchema(game),entries=Object.entries(source.properties);
 const utterance=Object.fromEntries(entries.filter(([key])=>spokenKeys.includes(key as typeof spokenKeys[number])));
 const changes=Object.fromEntries(entries.filter(([key])=>!spokenKeys.includes(key as typeof spokenKeys[number])));
 return {type:'object',additionalProperties:false,required:['utterance','changes'],properties:{
  utterance:{type:'object',additionalProperties:false,required:Object.keys(utterance),properties:utterance},
  changes:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:Object.keys(changes),properties:changes}]}
 }};
}
export function decodeConversation(value:unknown):NarrativeReply{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('대화 응답 형식 오류');
 // Historical transport fixtures/integrations can still deliver the flat v2 shape.
 if(!('utterance' in value))return validateNarrative(value);
 const v=value as {utterance:unknown;changes:unknown};
 if(Object.keys(v).sort().join(',')!=='changes,utterance'||!v.utterance||typeof v.utterance!=='object'||Array.isArray(v.utterance))throw Error('대사 형식 오류');
 if(Object.keys(v.utterance).sort().join(',')!==[...spokenKeys].sort().join(','))throw Error('대사 필드 오류');
 if(v.changes===null)return validateNarrative({...v.utterance,events:[]});
 if(!v.changes||typeof v.changes!=='object'||Array.isArray(v.changes)||!('events' in v.changes)||Object.keys(v.changes).some(k=>spokenKeys.includes(k as typeof spokenKeys[number])))throw Error('진행 기록 형식 오류');
 return validateNarrative({...v.utterance,...v.changes});
}
