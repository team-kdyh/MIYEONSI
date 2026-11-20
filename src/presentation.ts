import type {Game} from '../server/game';
import {chapters} from '../server/romance';

export type PresentationCue={id:string;trigger:string;expression:number;pose:string;background:string;music:string;sound:string;information:string;staticAlternative:string};
// Presentation reads validated state only. It never changes story rules or facts.
export function presentation(g:Game):PresentationCue {
 const base={music:'evening',sound:'chime',staticAlternative:'동일한 사건 문구와 표정을 정적으로 표시'};
 if(g.mode==='office'){
  const a=g.office,last=a?.evidence.at(-1);
  const kind=a?.outcome==='success'||a?.outcome==='partial'?'agreement':a?.outcome==='failure'?'refusal':last?.change?'evidence':last?'objection':'arrival';
  const expressions={arrival:0,objection:1,evidence:2,agreement:3,refusal:1};
  return {...base,id:`office-${kind}`,trigger:`합의 상태 ${kind}`,expression:expressions[kind],pose:['서류를 든 자세','팔짱','안경을 고쳐 쓰기','손바닥을 펴 양보'][expressions[kind]],background:'office',information:a?.feedback||'17시 이후의 협상 · 아래에 현재 반론과 합의 조건이 표시됩니다.'};
 }
 const c=chapters[Math.min(g.step,5)],facts=g.romance?.facts??[];
 const clue=facts.some(f=>f.id==='A17-B17');
 const info=g.ending?'마지막 선택과 기록의 결과가 에필로그에 남았습니다.':g.step===5?clue?'검증 단서: A17/B17의 귀가 발언 삭제 위치를 확인했습니다. D04와 복원 여부를 결정하세요.':'A17/B17 비교는 미확인입니다. 마지막 선택을 결정하세요.':g.step===4?'단서 후보: A17 원본과 B17 전시본의 차이. 비교 선택으로 검증할 수 있습니다.':g.step===3?facts.some(f=>f.id==='couple')?'서로 고백에 답했습니다. 연인으로 첫 데이트를 시작합니다.':'고백을 보류했습니다. 친구로 산책합니다.':c.event;
 const expression=g.ending?2:c.expression;
 return {...base,id:g.ending?'romance-ending':`romance-${c.id}`,trigger:g.ending?'최종 관계 계약 확정':`장 진입: ${c.id}`,expression,pose:['편안한 미소','두 손을 모은 설렘','손목을 잡은 망설임','고개를 기울인 응시'][expression],background:c.background,music:g.step>=4?'archive-theme':'evening',sound:g.step>=4?'tape':'chime',information:info};
}
