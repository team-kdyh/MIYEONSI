import type {Game} from './game.ts';
import {missions} from './office.ts';
import {narrative} from './narrative.ts';

export type StoryGuide={chapterLabel:string;title:string;place:string;situation:string};
const places:Record<string,string>={office:'퇴근 전 사무실',cafe:'소리가 머무는 카페',riverside:'강가의 산책길',rooftop:'옥상의 바람',rainstreet:'비 내리는 거리',archive:'소리 보관실'};
const officeSituations=[
 '퇴근 직전, 부장이 추가 보고서를 부탁했다.',
 '금요일 저녁, 부장이 팀 회식을 권하고 있다.',
 '주말을 앞두고 갑작스러운 업무 이야기가 나왔다.',
 '휴가 신청서를 사이에 두고 부장과 마주 앉았다.',
 '내가 만든 분석표에서 내 이름이 빠져 있다.',
 '끝날 줄 알았던 회의가 다시 길어지고 있다.',
 '새 업무의 담당과 범위를 두고 이야기가 시작됐다.',
 '재택근무를 두고 부장과 서로의 생각을 나누는 중이다.'
];
/** Current circumstances, not a checklist the player must satisfy each turn. */
export function storyDirection(g:Game):StoryGuide&{nextBeat:string}{
 const s=narrative(g),place=places[s.location]??'이야기 속 장소';
 if(g.ending)return {chapterLabel:'에필로그',title:'당신이 남긴 이야기',place,situation:'이번 만남의 마지막 장면.',nextBeat:'이미 끝난 이야기다. 새 사건을 만들지 않는다.'};
 if(g.mode==='office'){
  const mission=missions[g.step]??missions[0];
  const last=s.events.filter(e=>e.kind==='concession'&&e.status==='accepted').at(-1);
  return {chapterLabel:`직장 이야기 ${g.step+1}`,title:mission.title,place,situation:last?`지금까지 나눈 이야기: ${last.text}`:officeSituations[g.step]??officeSituations[0],nextBeat:'부장의 업무 걱정과 건조한 유머를 유지하며 방금 건넨 말에 답한다. 질문이면 설명하고 농담이면 받아 주며 새 대안이면 실제 내용을 논의한다. 매번 퇴근 시각이나 담당을 다시 말하라고 요구하지 않는다. 화제가 자연스럽게 돌아올 때 업무 이야기를 이어갈 수 있다. 협상이 막히면 NPC의 새 대안이나 작은 사무실 사건으로 다음 계기를 만든다. 대화 속 실제 합의만 기록하고, 아직 논의 중인 방법을 플레이어가 수락했다고 쓰지 않는다.'};
 }
 if(s.relationship==='apart')return {chapterLabel:'마지막 대화',title:'서로에게 남길 거리',place,situation:'둘 사이에 거리를 두자는 말이 오갔다.',nextBeat:'거리 두기를 존중하며 지금의 말에 답한다. 친구 대화나 작별 등 플레이어가 원하는 방향을 받아들이며 호감과 재연락을 강제하지 않는다.'};
 if(s.events.some(e=>e.kind==='clue'&&e.status==='fulfilled'))return {chapterLabel:'6장',title:'남겨진 목소리',place,situation:'함께 남겼던 녹음과 원본 사이의 차이를 확인했다.',nextBeat:'확인된 단서와 실제 발화가 갈등의 배경이다. 책임에 대한 설명, 침묵, 다른 화제나 떠나겠다는 말에도 반응한다. 결론을 대신 정하지 않는다.'};
 if(s.dates>0)return {chapterLabel:'5장',title:'다르게 들리는 밤',place,situation:s.location==='archive'?'함께 남긴 소리를 찾아 보관실에 왔다.':'함께 보낸 데이트가 두 사람의 기억으로 남았다.',nextBeat:'데이트의 실제 기억과 지금의 화제를 받아 준다. 녹음과 실제 대화의 작은 어긋남을 다음 계기로 삼을 수 있지만 따뜻한 일상을 더 원하면 함께 머문다. 원본 확인이나 이동은 제안하고 플레이어의 뜻을 기다린다.'};
 if(s.relationship==='couple')return {chapterLabel:'4장',title:'둘만의 하루',place,situation:s.activeDate?'함께 정한 데이트를 보내고 있다.':'서로의 마음을 확인하고 연인이 되었다.',nextBeat:'연인의 기쁨과 서툰 농담으로 현재 말에 답한다. 자유롭게 활동을 제안하거나 함께 쉬고 이야기할 수 있다. 이미 하는 활동에 반응하고, 미래 약속과 실제 데이트 참여·완료를 구분한다.'};
 if(s.relationship==='confessed')return {chapterLabel:'3장',title:'아직 하지 못한 말',place,situation:'유나가 조심스럽게 자신의 마음을 전했다.',nextBeat:'지금의 대답을 받아 준다. 망설임이나 화제 전환도 허용하며 즉시 수락을 요구하지 않는다. 실제로 사귀기로 하기 전에는 연인으로 쓰지 않는다.'};
 if(s.relationship==='attracted')return {chapterLabel:'3장',title:'아직 하지 못한 말',place,situation:'대화 사이에 서로를 향한 호감이 느껴지기 시작했다.',nextBeat:'실제로 나눈 작은 기억과 현재 화제를 바탕으로 따뜻함을 보여 준다. 자연스러운 순간 자신의 마음을 말할 수 있지만 플레이어의 감정을 대신 쓰지 않는다.'};
 if(s.relationship==='familiar')return {chapterLabel:'2장',title:'조금 더 가까운 밤',place,situation:'처음의 어색함이 조금씩 풀리고 있다.',nextBeat:'지금 화제와 앞서 나눈 취향을 기억하며 자신의 작은 실수나 농담으로 답한다. 데이트나 고백으로 매번 대화를 몰지 않는다.'};
 return {chapterLabel:'1장',title:'사라지는 소리',place,situation:'문 닫을 무렵의 카페에서 소리를 모으는 유나를 만났다.',nextBeat:'따뜻하지만 조금 어색한 첫 만남이다. 이름이나 좋아하는 소리를 순서대로 캐묻지 말고 지금 플레이어가 꺼낸 화제에 답한다. 취향 질문, 농담, 머뭇거림도 그 자체로 대화가 된다.'};
}
export function storyGuide(g:Game):StoryGuide{const {nextBeat,...guide}=storyDirection(g);return guide;}
