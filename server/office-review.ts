import type {DialogueGame} from './dialogue.ts';
import type {BattleJudgment} from './battle-evaluation.ts';
import {missions} from './office.ts';
import {rushScenes,type OfficeExchange} from './office-match.ts';

const outcomePoints={'설득 성공':70,'합의로 마무리':55,'부분 합의':40,'대화 마침':0,'시간 초과':0,'협상 패배':0} as const;
const approachNames={alternative:'대안 제시',evidence:'근거 제시',boundary:'경계 설정'} as const;
// Largest remainders keep integer credits additive; earlier turns break exact ties.
function allocateImpact(weights:number[],pool:number){
 const sum=weights.reduce((a,b)=>a+b,0);
 if(!sum)return weights.map(()=>0);
 const points=weights.map(w=>Math.floor(w*pool/sum));
 const order=weights.map((w,i)=>({i,remainder:w*pool%sum})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
 const left=pool-points.reduce((a,b)=>a+b,0);
 for(const entry of order.slice(0,left))points[entry.i]++;
 return points;
}

function turnReason(t:OfficeExchange,h:BattleJudgment|undefined,issue:string,priorPressure?:BattleJudgment){
 if(t.feedback)return t.feedback.explanation;
 if(!t.reply)return '이 발언으로 대화를 마쳤습니다. 부장의 추가 답변이나 새 양보가 발생하기 전에 협상이 끝났습니다.';
 if(!h){
  if(/^(?:네|예|넵|알겠습니다|감사합니다)[.!~,\s]*$/u.test(t.player.trim()))return '앞선 말을 확인한 짧은 답입니다. 이번 교환에는 새 설득이나 압박 대응이 기록되지 않았습니다.';
  const replyExcerpt=t.reply.length>80?t.reply.slice(0,79)+'…':t.reply;
  if(/[?？]$/u.test(t.player.trim()))return `질문에 돌아온 답은 “${replyExcerpt}”입니다. 이 질문에는 별도의 설득·방어 점수가 기록되지 않았습니다.`;
  return `부장은 “${replyExcerpt}”라고 답했습니다. 이 교환에서 두 사람의 여유와 버티기가 그대로여서 발언 가산점은 0점입니다.`;
 }
 if(!h.guard&&!h.bossDamage&&!h.playerDamage)return `‘${issue}’에 대해 이미 오간 논점으로 판정돼 같은 효과를 두 번 세지 않았습니다.`;
 if(priorPressure)return `‘${issue}’에 대한 앞선 요구 “${priorPressure.npcQuote}”에 대응해 내 여유를 되찾았습니다.`;
 return `‘${issue}’에 대한 판단입니다. ${h.reason.startsWith('response:')?'앞서 받은 압박에 대응했습니다.':h.reason}`;
}
export function officeReview(g:DialogueGame){
 const m=g.officeMatch;
 if(!m||!g.ending)return null;
 const mission=missions[g.step];
 const judgments=new Map(g.dialogue?.battleEvaluations?.map(h=>[h.id,h] as const));
 const approaches:string[]=[];
 let player=100,boss=100;
 const evaluated=m.exchanges.map((t,i)=>{
  const h=judgments.get(`battle-${t.version}`);
  const bossDamage=Math.min(boss,h?.bossDamage??0),pressure=Math.min(player,h?.playerDamage??0);
  const guard=Math.min(100-player+pressure,h?.guard??0);
  boss-=bossDamage;player+=guard-pressure;
  const weight=bossDamage+guard;
  const approach=h&&weight>0?approachNames[h.argument]:null;
  const introduced=!!approach&&!approaches.includes(approach);
  const varietyPoints=introduced&&approaches.length<2?5:0;
  if(introduced)approaches.push(approach!);
  const issue=mission.terms.find(term=>term.id===h?.target)?.label??mission.title;
  const prior=h?.reason.startsWith('response:')?judgments.get(h.reason.slice(9)):undefined;
  const note=turnReason(t,h,issue,prior);
  const label=approach??(h&&weight===0&&!pressure?'반복된 논점':pressure?'부장의 압박':!t.reply?'마무리 인사':'일반 대화');
  return {number:i+1,...t,approach,introduced,label,note,bossDamage,pressure,guard,weight,varietyPoints};
 });
 const effectiveTurns=evaluated.filter(t=>t.weight>0).length;
 const impact=[0,12,20][Math.min(2,effectiveTurns)];
 const weights=evaluated.map(t=>t.weight),impactCredits=allocateImpact(weights,impact);
 const totalWeight=weights.reduce((a,b)=>a+b,0);
 const turns=evaluated.map((t,i)=>{
  const impactPoints=impactCredits[i],points=impactPoints+t.varietyPoints;
  const basis=t.weight?`부장 버티기 감소 ${t.bossDamage} · 내 여유 회복 ${t.guard}. 전체 변화 ${totalWeight} 중 ${t.weight}만큼 기여해 설득 효과 ${impactPoints}점.`:t.pressure?`부장의 요구로 내 여유가 ${t.pressure} 줄었습니다. 설득 효과 0점.`:'부장 버티기 감소 0 · 내 여유 회복 0. 설득 효과 0점.';
  let variety='';
  if(t.varietyPoints)variety=`처음 효과를 낸 방식 ‘${t.approach}’에 논거의 폭 +5점.`;
  else if(t.approach)variety=t.introduced?'앞서 두 방식으로 논거의 폭 10점을 모두 획득했습니다.':`‘${t.approach}’은 앞선 발언에서 사용해 논거의 폭 추가 점수는 0점입니다.`;
  return {...t,impactPoints,points,basis:[basis,variety].filter(Boolean).join(' ')};
 });
 const best=turns.filter(t=>t.weight>0).sort((a,b)=>b.points-a.points||b.weight-a.weight)[0];
 const pressured=turns.filter(t=>t.pressure>0).sort((a,b)=>b.pressure-a.pressure)[0];
 const win=g.office?.outcome==='success',last=g.log.at(-1);
 const verdict=m.timedOut?'시간 초과':win?'설득 성공':g.ending.endsWith('-agreed')?'합의로 마무리':g.office?.outcome==='partial'?'부분 합의':g.ending.endsWith('-closed')?'대화 마침':'협상 패배';
 const outcome=outcomePoints[verdict],variety=turns.reduce((sum,t)=>sum+t.varietyPoints,0);
 const score={total:outcome+impact+variety,outcome,impact,variety,effectiveTurns,approaches};
 const reason=m.timedOut?rushScenes[mission.id].expired:last?.speaker==='협상 결과'?last.text:
  win?(boss===0?'설득으로 부장 버티기를 100에서 0까지 낮춰 미션을 달성했습니다.':mission.success):
  verdict==='부분 합의'?mission.partial:`부장의 요구가 누적되어 내 여유가 ${player}이 됐습니다.`;
 const decisionTurn=last?.speaker==='협상 결과'
  ? turns.filter(t=>t.reply&&last.text.endsWith(`“${t.reply}”`)).at(-1)?.number
  : last?.speaker==='배틀 결과'?turns.at(-1)?.number:undefined;
 return {verdict,score,reason,decisionTurn,elapsedSeconds:Math.ceil(((m.finishedAt??m.startedAt)-m.startedAt)/1000),best,pressured,turns};
}
export type OfficeReview=NonNullable<ReturnType<typeof officeReview>>;
