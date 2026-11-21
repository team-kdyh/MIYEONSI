import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './game.ts';
import {narrative,reconcile,type NarrativeReply,type EventProposal} from './narrative.ts';
const event=(value:string,evidence:string,reference=''):EventProposal=>({kind:'relationship',subject:'mutual',status:'accepted',text:value==='date'?'지금 데이트에 참여하기로 한다.':'서로 연인으로 사귀기로 한다.',value,evidence,reference});
const reply=(e:EventProposal):NarrativeReply=>({line:'저도 좋아요. 함께하고 싶어요.',actionBeats:['유나가 미소 짓는다.'],pose:'smile',emotion:'기쁨',musicMood:'cafe-warmth',events:[e],recall:[],conjecture:''});
function confession(){const g=start('romance');g.narrative=narrative(g);g.narrative.turn=6;g.narrative.relationship='confessed';g.narrative.events.push({...event('confessed',''),subject:'npc',text:'저는 당신을 좋아해요. 연인으로 사귀고 싶어요.',id:'confession',turn:6});return g;}
function dateOffer(text:string){const g=confession();g.narrative!.relationship='couple';g.narrative!.events.push({...event('date',''),status:'offered',text,id:'date-offer',turn:6});return g;}
test('one-syllable affirmative after explicit confession is a valid player response',()=>{
 for(const text of ['네','응','좋아요'])assert.equal(reconcile(confession(),text,reply(event('couple',text))).game.narrative?.relationship,'couple');
});
test('ambiguous, quoted and questioning short replies do not establish a couple',()=>{
 for(const text of ['음','네?','"네"라는 대사','응이라는 말은 못 하겠어요'])assert.throws(()=>reconcile(confession(),text,reply(event('couple',text))));
});
test('accepting a referenced current date offer begins participation but does not complete it',()=>{
 for(const text of ['네','응','좋아요']){const g=reconcile(dateOffer('지금 여기서 데이트해요.'),text,reply(event('date',text,'date-offer'))).game;assert.ok(g.narrative?.activeDate);assert.equal(g.narrative.dates,0);}
});
test('accepting a future offer or mentioning an unreferenced offer does not begin a current date',()=>{
 const future=reconcile(dateOffer('내일 여기서 데이트해요.'),'좋아요',reply(event('date','좋아요','date-offer'))).game;
 const unlinked=reconcile(dateOffer('지금 여기서 데이트해요.'),'좋아요',reply(event('date','좋아요'))).game;
 assert.equal(future.narrative?.activeDate,undefined);assert.equal(unlinked.narrative?.activeDate,undefined);
 assert.throws(()=>reconcile(dateOffer('지금 여기서 데이트해요.'),'좋아요?',reply(event('date','좋아요?','date-offer'))));
});
