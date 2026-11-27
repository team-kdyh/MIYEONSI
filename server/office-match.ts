import type {DialogueGame} from './dialogue.ts';
import {missions} from './office.ts';

export const bosses = {
 park: {name:'박도현', age:46, voice:'건조한 농담을 섞는 부장. 제안이 통하면 자기가 한 농담도 슬쩍 접는다.'},
 yun: {name:'윤서진', age:45, voice:'현장 경험이 많은 부장. 짧고 분명하게 말하고, 팀원이 짚은 위험에는 솔직히 반응한다.'},
} as const;
export const temperaments = {
 pragmatic:{label:'실무형',direction:'결정에 필요한 정보부터 본다. 이미 답을 들은 질문은 반복하지 않는다.'},
 warm:{label:'온화한 편',direction:'먼저 사정을 듣고 배려한다. 팀원이 떠안을 공백에는 부드럽게 되묻는다.'},
 exacting:{label:'깐깐한 편',direction:'근거와 실행 가능성을 따진다. 빈틈 하나를 짚되 답이 충분하면 물러선다.'},
} as const;
export type OfficeSetup = {
 style:'classic'|'rush'; boss:keyof typeof bosses; temperament:keyof typeof temperaments;
 workplace:string; role:string; gender:'미설정'|'여성'|'남성'|'논바이너리';
};
export const defaultSetup:OfficeSetup = {style:'classic',boss:'park',temperament:'pragmatic',workplace:'기획팀',role:'팀원',gender:'미설정'};
export const RUSH_SECONDS=180;
export const rushScenes:Record<string,{trigger:string;expired:string}> = {
 clockout:{trigger:'퇴근 셔틀이 출발하기 전에 추가 보고서 이야기를 마쳐야 한다.',expired:'셔틀 문이 닫혔다. 오늘 업무 범위를 정할 기회가 지나갔다.'},
 dinner:{trigger:'식당에서 마지막 인원 확인 전화를 기다린다.',expired:'식당에 최종 인원이 넘어갔다. 참석을 조정할 시간이 지났다.'},
 weekend:{trigger:'주말 근무표가 곧 전 팀에 발송된다.',expired:'주말 근무표가 발송됐다. 이번 편성은 마감됐다.'},
 vacation:{trigger:'휴가를 반영할 근무표 결재가 곧 닫힌다.',expired:'근무표 결재가 닫혔다. 이번 일정에는 휴가를 반영하지 못했다.'},
 credit:{trigger:'발표 자료를 띄우기 전에 기여 표기를 조정해야 한다.',expired:'발표가 시작됐다. 첫 화면에 뜬 자료를 고칠 기회가 지나갔다.'},
 meeting:{trigger:'회의실 예약이 잠기기 전에 회의 시간을 줄여야 한다.',expired:'회의실 예약이 확정됐다. 회의 시간을 조정할 기회를 놓쳤다.'},
 delegation:{trigger:'업무 배정표를 공유하기 전에 재고표 담당을 정해야 한다.',expired:'배정표가 배포됐다. 담당을 다시 논의할 시간이 지났다.'},
 remote:{trigger:'다음 근무 일정이 게시되기 전에 재택 계획을 설득해야 한다.',expired:'근무 일정이 게시됐다. 이번 일정에는 재택 계획을 넣지 못했다.'},
};
const openingLines:Record<string,[string,string]> = {
 clockout:['가방 닫기 전에 잠깐. 고객이 볼 숫자, 오늘 어디까지 낼 수 있어요?','이 보고서 오늘 달라네요. 퇴근 전에 손댈 수 있는 부분이 어디까지죠?'],
 dinner:['예약 인원에 한 자리 넣어 뒀어요. 오늘 저녁, 같이 갈 수 있죠?','식당에서 인원을 묻네요. 금요일 저녁 일정이 어때요?'],
 weekend:['주말 배포표에 한 칸이 비었네요. 토요일에 잠깐 봐줄 수 있죠?','토요일 점검 담당이 비었어요. 어떻게 하는 게 좋겠어요?'],
 vacation:['휴가 신청서 봤어요. 그 사흘에 고객 문의가 들어오면요?','휴가 날짜는 봤어요. 그동안 가장 손이 갈 일이 뭐죠?'],
 credit:['발표 첫 장은 기획팀 일동으로 넣었어요. 걸리는 게 있어요?','분석표에 팀 이름만 올라갔네요. 발표 전에 할 얘기 있어요?'],
 meeting:['두 시간이면 자료를 첫 장부터 볼 수 있겠죠?','회의실은 두 시간 잡았어요. 지금 꼭 같이 볼 안건이 뭔가요?'],
 delegation:['재고표 좀 봐줘요. 이 팀에서 손이 제일 빠르잖아요.','옆 팀 재고표가 왔네요. 오늘 맡을 여력이 있어요?'],
 remote:['수요일마다 빈자리가 생기는 건데, 진행 상황은 어떻게 보죠?','수요일 재택 신청 봤어요. 팀이랑 맞물리는 일은 어떻게 할까요?'],
};
export type OfficeExchange={version:number;player:string;reply:string};
export type OfficeMatch={setup:OfficeSetup;opening:string;startedAt:number;deadline:number|null;finishedAt:number|null;timedOut:boolean;exchanges:OfficeExchange[]};
export function readSetup(input:unknown):OfficeSetup{
 if(input===undefined)return {...defaultSetup};
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('협상 설정을 확인해 주세요.');
 const s=input as OfficeSetup;
 if(Object.keys(s).some(k=>!Object.hasOwn(defaultSetup,k))||!['classic','rush'].includes(s.style)||!Object.hasOwn(bosses,s.boss)||!Object.hasOwn(temperaments,s.temperament)||!['미설정','여성','남성','논바이너리'].includes(s.gender))throw Error('협상 설정을 확인해 주세요.');
 for(const v of [s.workplace,s.role])if(typeof v!=='string'||!v.trim()||v.length>36||/[\u0000-\u001f\u007f]/u.test(v))throw Error('직장과 직무는 각각 1~36자로 입력해 주세요.');
 return {...s,workplace:s.workplace.trim(),role:s.role.trim()};
}
export function newMatch(step:number,setup:OfficeSetup,now=Date.now()):OfficeMatch{
 const opening=openingLines[missions[step].id][setup.boss==='park'?0:1];
 return {setup,opening,startedAt:now,deadline:setup.style==='rush'?now+RUSH_SECONDS*1000:null,finishedAt:null,timedOut:false,exchanges:[]};
}
export function validMatch(m:OfficeMatch){
 try{readSetup(m.setup);}catch{return false;}
 return !!m.setup&&Number.isSafeInteger(m.startedAt)&&m.startedAt>0&&m.deadline===(m.setup.style==='rush'?m.startedAt+RUSH_SECONDS*1000:null)&&
  typeof m.opening==='string'&&typeof m.timedOut==='boolean'&&(m.finishedAt===null||Number.isSafeInteger(m.finishedAt)&&m.finishedAt>=m.startedAt)&&
  (!m.timedOut||m.deadline!==null&&m.finishedAt===m.deadline)&&Array.isArray(m.exchanges)&&m.exchanges.every((t,i)=>t&&Number.isSafeInteger(t.version)&&t.version>(m.exchanges[i-1]?.version??0)&&typeof t.player==='string'&&typeof t.reply==='string');
}
/** Resolve elapsed wall time once. A turn admitted before the bell gets its judgment first. */
export function settleClock(g:DialogueGame|null,now=Date.now()):boolean{
 const m=g?.officeMatch;
 if(!g||!m||m.finishedAt!==null)return false;
 if(g.ending){m.finishedAt=Math.min(now,m.deadline??now);return true;}
 if(m.deadline===null||now<m.deadline)return false;
 const mission=missions[g.step];
 m.finishedAt=m.deadline;m.timedOut=true;
 g.ending=`office-${mission.id}-failure`;
 g.office!.outcome='failure';
 g.log.push({speaker:'협상 결과',text:rushScenes[mission.id].expired});
 return true;
}
