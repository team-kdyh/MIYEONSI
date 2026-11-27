import type {DialogueGame} from './dialogue.ts';
import type {BattleJudgment} from './battle-evaluation.ts';
import {missions} from './office.ts';
import {rushScenes} from './office-match.ts';

const wins:Record<string,string>={
 clockout:'부장이 보고서를 이유로 퇴근을 붙잡던 요구를 거뒀습니다.',
 dinner:'부장이 회식 참석을 강요하던 입장을 거뒀습니다.',
 weekend:'부장이 주말 업무를 일방적으로 맡기던 요구를 거뒀습니다.',
 vacation:'부장이 휴가 일정에 대한 반대를 거뒀습니다.',
 credit:'부장이 발표에서 기여 기록을 바로잡자는 제안을 받아들였습니다.',
 meeting:'부장이 두 시간으로 잡아 둔 회의를 줄이기로 했습니다.',
 delegation:'부장이 재고표를 통째로 떠맡기려던 요구를 거뒀습니다.',
 remote:'부장이 빈자리 대신 업무 결과로 재택 계획을 판단하기로 했습니다.',
};
const outcomePoints={'설득 성공':70,'합의로 마무리':55,'부분 합의':40,'대화 마침':0,'시간 초과':0,'협상 패배':0} as const;
const approachNames={alternative:'대안 제시',evidence:'근거 제시',boundary:'경계 설정'} as const;
function describe(h:BattleJudgment){
 if(!h.guard&&!h.bossDamage&&!h.playerDamage)return '이미 오간 논점이어서 추가 게이지 변화가 없었습니다.';
 if(h.reason.startsWith('response:'))return `부장의 압박에 대응했습니다.${h.guard?` 내 여유 +${h.guard}.`:''}${h.bossDamage?` 부장 버티기 −${h.bossDamage}.`:''}`;
 return h.reason;
}
export function officeReview(g:DialogueGame){
 const m=g.officeMatch;
 if(!m||!g.ending)return null;
 const mission=missions[g.step];
 const judgments=new Map(g.dialogue?.battleEvaluations?.map(h=>[h.id,h] as const));
 const turns=m.exchanges.map((t,i)=>{
  const h=judgments.get(`battle-${t.version}`);
  const approach=h&&(h.bossDamage>0||h.guard>0)?approachNames[h.argument]:null;
  return {number:i+1,...t,approach,note:h?describe(h):t.reply?'서로의 말을 듣고 상황을 살폈습니다.':'마무리 인사를 건넸습니다.',bossDamage:h?.bossDamage??0,pressure:h?.playerDamage??0,guard:h?.guard??0};
 });
 const best=[...turns].filter(t=>t.bossDamage>0||t.guard>0).sort((a,b)=>b.bossDamage+b.guard-a.bossDamage-a.guard)[0];
 const pressured=[...turns].filter(t=>t.pressure>0).sort((a,b)=>b.pressure-a.pressure)[0];
 const win=g.office?.outcome==='success',last=g.log.at(-1);
 const closing=!m.timedOut&&last?.speaker==='협상 결과';
 const verdict=m.timedOut?'시간 초과':win?'설득 성공':g.ending.endsWith('-agreed')?'합의로 마무리':g.office?.outcome==='partial'?'부분 합의':g.ending.endsWith('-closed')?'대화 마침':'협상 패배';
 const effective=turns.flatMap(t=>t.approach?[t.approach]:[]);
 const approaches=[...new Set(effective)];
 const outcome=outcomePoints[verdict];
 const impact=[0,12,20][Math.min(2,effective.length)];
 const variety=Math.min(2,approaches.length)*5;
 const score={total:outcome+impact+variety,outcome,impact,variety,effectiveTurns:effective.length,approaches};
 return {verdict,score,
  reason:m.timedOut?rushScenes[mission.id].expired:closing?last.text:win?wins[mission.id]:'거듭된 압박으로 이번 협상을 이어 갈 여유가 소진됐습니다.',
  elapsedSeconds:Math.ceil(((m.finishedAt??m.startedAt)-m.startedAt)/1000),best,pressured,turns};
}
export type OfficeReview=NonNullable<ReturnType<typeof officeReview>>;
