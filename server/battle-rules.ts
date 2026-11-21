import type {DialogueGame} from './dialogue.ts';
import type {NarrativeReply} from './narrative.ts';
import {missions} from './office.ts';

/** Three concrete levels per issue; escalation requires a different authored demand. */
export function battlePressure(step:number,target:string){
 const term=missions[step].terms.find(t=>t.id===target);
 if(!term)return [];
 return [term.objection.replace(/[“”]/g,'')+' 우선 제 요구대로 처리하세요.',`${term.label}은 제 요구대로 진행하세요.`,`${term.label} 조정은 받지 않겠습니다. 지금 제 요구를 따르세요.`];
}
export function battleTotals(game:DialogueGame){
 const h=game.dialogue?.battleEvaluations??[];
 return h.reduce((gauges,e)=>({player:Math.max(0,Math.min(100,gauges.player-e.playerDamage+e.guard)),boss:Math.max(0,gauges.boss-e.bossDamage)}),{player:100,boss:100});
}
/** Simultaneous depletion favours the player: a decisive persuasion stands. */
export function battleOutcome(player:number,boss:number){return boss<=0?'success':player<=0?'failure':null;}
export function validateBattleSpeech(game:DialogueGame,reply:NarrativeReply){
 if(game.mode!=='office'||reply.battle===undefined&&!game.dialogue?.battleEvaluations)return;
 const speech=[reply.line,...reply.actionBeats,reply.battle?.reason??''].join(' ');
 if(/(?:미션|배틀|협상).{0,12}(?:승리|패배|성공|실패|끝났|종료)|(?:당신|플레이어|네가|당신이).{0,16}(?:이겼|졌|굴복|동의했|수락했|고개를 끄덕|생각했)/u.test(speech))throw Error('배틀 결과와 플레이어의 반응은 대사로 선결하지 않습니다. 현재 제안에 대한 NPC 반응을 다시 작성하세요.');
 if(reply.events.some(e=>e.kind==='resolution'))throw Error('배틀 종료는 합의 체크리스트가 아니라 서버 게이지로 결정합니다.');
}
export function finishBattle(game:DialogueGame){
 if(game.mode!=='office'||!game.dialogue?.battleEvaluations?.length)return;
 const {player,boss}=battleTotals(game),outcome=battleOutcome(player,boss);
 if(!outcome)return;
 const mission=missions[game.step],last=game.dialogue.battleEvaluations.at(-1)!;
 game.ending=`office-${mission.id}-${outcome}`;
 if(game.office)game.office.outcome=outcome;
 // A server result, separate from generated character speech, never invents consent or action.
 const reason=last.reason.startsWith('response:')?last.npcQuote:last.reason;
 game.log.push({speaker:'배틀 결과',text:`${mission.title} · ${outcome==='success'?'설득 승리':'협상 패배'}\n플레이어 여유 ${player} / 부장 버티기 ${boss}\n${outcome==='success'?'새 근거와 대안이 부장의 버티기를 모두 깎았습니다.':'부장의 누적 압박으로 이번 협상의 여유가 소진되었습니다.'}\n마지막 교환: ${reason}${player===0&&boss===0?'\n동시 소진: 결정적 설득 우선으로 승리합니다.':''}`});
}
