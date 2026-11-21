import type {Game} from './game.ts';
import {missions} from './office.ts';
import {narrative} from './narrative.ts';
export type StoryGuide={chapterLabel:string;title:string;place:string;objective:string;progress:string};
const places:Record<string,string>={office:'퇴근 전 사무실',cafe:'소리가 머무는 카페',riverside:'강가의 산책길',rooftop:'옥상의 바람',rainstreet:'비 내리는 거리',archive:'소리 보관실'};
/** A roadmap from confirmed state, never a timer, intent selector or new fact. */
export function storyDirection(g:Game):StoryGuide&{nextBeat:string}{
 const s=narrative(g),place=places[s.location]??'이야기 속 장소';
 if(g.ending)return {chapterLabel:'에필로그',title:'당신이 남긴 이야기',place,objective:'이번 만남의 마지막 말을 읽어 보세요.',progress:'이야기 마침',nextBeat:'이미 끝난 이야기다. 새 사건을 만들지 않는다.'};
 if(g.mode==='office'){
  const mission=missions[g.step]??missions[0],agreed=new Set(s?.events.filter(e=>e.kind==='concession'&&e.status==='accepted').map(e=>e.value)??[]);
  const remaining=mission.terms.filter(t=>!agreed.has(t.id)),done=mission.terms.length-remaining.length;
  return {chapterLabel:`직장 이야기 ${g.step+1}`,title:mission.title,place,objective:remaining.length?`${remaining.map(t=>t.label).join(' · ')}을 함께 정하기`:'정한 조건을 확인하고 오늘의 대화 마무리하기',progress:`${done} / ${mission.terms.length}개 항목 합의`,nextBeat:remaining.length?`지금 미해결인 ${remaining.map(t=>t.label).join(', ')}에서 부장의 구체적인 걱정을 드러내고 플레이어의 새 대안에 답한다. 잡담도 받아 주되 적절한 순간 이 업무로 자연스럽게 돌아온다. 책임과 기한을 대신 채우거나 합의 없이 마무리하지 않는다.`:'앞선 합의의 실제 내용만 간결하게 되짚고 오늘 일을 마칠지 묻는다. 플레이어가 마무리할 때만 resolution을 제안한다.'};
 }
 const relation=s?.relationship??'strangers',clues=s?.events.filter(e=>e.kind==='clue'&&e.status==='fulfilled')??[];
 if(relation==='apart')return {chapterLabel:'마지막 대화',title:'서로에게 남길 거리',place,objective:'앞으로 어떤 거리를 두고 싶은지 이야기하기',progress:'당신의 뜻을 전할 시간',nextBeat:'거절과 거리 두기를 존중한다. 호감이나 고백을 다시 강제하지 말고 플레이어가 원하는 마무리와 재연락 여부를 묻는다.'};
 if(clues.length)return {chapterLabel:'6장',title:'남겨진 목소리',place,objective:'확인한 녹음의 차이를 유나와 이야기하고 앞으로의 관계 정하기',progress:'원본을 마주하는 중',nextBeat:'확인된 단서와 이전의 실제 발화를 바탕으로 편집 이유를 대면한다. 필요하면 구별되는 작업 기록을 함께 확인하자고 제안한다. 플레이어가 어떤 관계와 기록을 남길지 결정할 때까지 결말을 대신 정하지 않는다.'};
 if((s?.dates??0)>0)return {chapterLabel:'5장',title:'다르게 들리는 밤',place,objective:'함께 남긴 소리에서 달라진 부분 확인하기',progress:s?.location==='archive'?'소리 보관실에서 원본 확인 중':'데이트 뒤의 작은 위화감',nextBeat:'데이트의 실제 기억을 먼저 받아 준 뒤, 녹음과 실제 대화 사이의 작은 어긋남을 자연스럽게 드러낸다. 원본을 함께 확인할지 제안하고 이동 동의를 기다린다. 곧바로 고백을 집착으로 뒤집거나 강제로 장소를 옮기지 않는다.'};
 if(relation==='couple')return {chapterLabel:'4장',title:'둘만의 하루',place,objective:s?.activeDate?'함께 정한 활동을 즐기며 둘만의 기억 남기기':'서로 하고 싶은 일을 이야기하고 첫 데이트 시작하기',progress:s?.activeDate?'데이트를 함께 보내는 중':'첫 데이트를 기다리며',nextBeat:s?.activeDate?'현재 데이트의 활동과 서로 기억한 취향에 반응한다. NPC의 작은 행동과 서툰 농담을 보여 준다. 실제 함께한 활동 후에만 완료 사건을 제안한다.':'연인이 된 기쁨과 어색함을 충분히 보여 주고 앞서 나눈 취향을 바탕으로 구체적인 데이트를 제안한다. 플레이어의 참여 동의와 미래 약속을 구분한다.'};
 if(relation==='confessed'||relation==='attracted')return {chapterLabel:'3장',title:'아직 하지 못한 말',place,objective:relation==='confessed'?'유나의 마음을 듣고 자신의 마음 전하기':'서로에게 어떤 마음인지 천천히 이야기하기',progress:relation==='confessed'?'유나가 마음을 전했어요':'호감을 알아가는 중',nextBeat:relation==='confessed'?'고백에 대한 플레이어의 실제 답을 기다리고 받아들인다. 사귀기로 동의하기 전에는 연인이라고 부르지 않는다.':'쌓인 실제 대화의 작은 기억으로 자신의 호감을 보여 준다. 적절한 순간 자신의 마음을 말할 수 있지만 플레이어의 호감을 대신 쓰지 않는다.'};
 if(relation==='familiar')return {chapterLabel:'2장',title:'조금 더 가까운 밤',place,objective:'함께 보내고 싶은 시간과 서로의 취향 알아가기',progress:'서로 편안해진 사이',nextBeat:'앞서 나눈 이름과 취향을 기억하며 자신의 작은 취향이나 실수를 꺼낸다. 다음에 함께 하고 싶은 일을 제안하고 플레이어의 말에서 실제 호감이 자라날 여지를 준다.'};
 return {chapterLabel:'1장',title:'사라지는 소리',place,objective:'서로의 이름과 좋아하는 소리를 알아가기',progress:'카페에서의 첫 만남',nextBeat:'따뜻한 첫 만남이다. 플레이어 말에 구체적으로 반응하고 자신의 취향이나 소리 수집 이야기를 짧게 나눈다. 한 번에 하나의 쉬운 화제로 대화를 이어 간다. 가벼운 취향 대화를 복잡한 의무나 물건 준비 약속으로 바꾸지 않는다.'};
}
export function storyGuide(g:Game):StoryGuide{const {nextBeat,...guide}=storyDirection(g);return guide;}
