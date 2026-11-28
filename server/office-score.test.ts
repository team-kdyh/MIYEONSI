import test from 'node:test';
import assert from 'node:assert/strict';
import {commitDialogue,commitOfficeFarewell,type DialogueGame} from './dialogue.ts';
import {defaultSetup} from './office-match.ts';
import {start,view} from './game.ts';
import type {NarrativeReply} from './narrative.ts';

function persuade(game:DialogueGame,input:string,argument:'boundary'|'alternative',line='그 점은 일리가 있네요.'){
 const reply:NarrativeReply={line,emotion:'고민',pose:'thinking',musicMood:'office-groove',actionBeats:[],recall:[],conjecture:'',events:[],
  battle:{kind:'persuasion',target:'leave',argument,playerQuote:input,npcQuote:line,reason:'제안에 일리가 있어 부장이 물러섰다.',concessionIndex:-1,pressureId:'',premises:[]}};
 return commitDialogue(game,null,input,reply);
}

test('points follow effective exchanges, cap at 100 and survive a save round trip',()=>{
 let game=start('office',0,defaultSetup);
 assert.equal(view(game)?.review,undefined);
 const text='확인된 숫자만 먼저 요약해서 보내죠.';
 game=persuade(game,text,'alternative');
 const closedScore=(g:DialogueGame)=>view(commitOfficeFarewell(g,'그럼 가보겠습니다.').game)!.review!.score;
 assert.deepEqual(closedScore(game),{total:17,outcome:0,impact:12,variety:5,effectiveTurns:1,approaches:['대안 제시']});
 const repeated=persuade(game,text,'alternative');
 assert.deepEqual(closedScore(repeated),closedScore(game));
 game=persuade(repeated,'검토 전 수치를 오늘 보내면 고객에게 오해를 줍니다.','boundary');
 assert.deepEqual(closedScore(game),{total:30,outcome:0,impact:20,variety:10,effectiveTurns:2,approaches:['대안 제시','경계 설정']});
 game=persuade(game,'추정치는 따로 표시하고 내일 검토표를 보내죠.','alternative','좋습니다. 이제 퇴근하세요.');
 const score=view(game)!.review!.score;
 assert.equal(score.total,100);assert.equal(score.effectiveTurns,3);
 assert.deepEqual(view(JSON.parse(JSON.stringify(game)))?.review?.score,score);
 const review=view(game)!.review!;
 assert.equal(review.turns.reduce<number>((total,t)=>total+t.points,score.outcome),score.total);
 assert.equal(review.turns[1].points,0);assert.match(review.turns[1].note,/이미 오간/);
 assert.ok(review.turns[3].impactPoints>0);
 assert.deepEqual(review.turns.map(t=>t.varietyPoints),[5,0,5,0]);
 for(const t of review.turns)assert.equal(t.points,t.impactPoints+t.varietyPoints);
});
