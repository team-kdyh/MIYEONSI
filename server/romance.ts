import {manipulation} from './interpretation.ts';
import type {Game,Scene} from './game.ts';

export type RelationshipFact={id:string;eventId:string;version:number;kind:'honesty'|'promise'|'autonomy'|'relationship'|'evidence'|'chapter';text:string};
export type RomanceState={version:number;turn:number;facts:RelationshipFact[];details:string[];lastReaction?:string;final?:{relationship:'continuing'|'ended';mutualBoundaries:boolean;loop:boolean;exitRight:boolean;safeExit:boolean;noContactRight:boolean;causeEstablished:boolean;restored:boolean}};
type ChapterContract=Scene&{id:string;background:'cafe'|'riverside'|'archive';entry:string;event:string;completion:string;limit:number;unresolved:string};
export const chapters:ChapterContract[]=[
 {id:'meeting',title:'1 · 닫는 카페의 종소리',background:'cafe',expression:0,entry:'새 게임: 주인공은 29세, 유나는 27세',event:'사라질 카페 종소리를 함께 채집하고 서로 소개한다',completion:'서로 이름을 알고 다음 만남을 제안한다',limit:3,unresolved:'녹음 없이 인사를 나누고 다음 만남으로',text:'문 닫을 카페의 종을 녹음하던 유나가 의자를 내준다. “서유나예요. 없어지는 소리를 모아요. 계산할 때 나는 비명은 제외하고요.” 웃다가 헤드폰 줄을 컵 손잡이에 걸고 만다. 당신이 풀어 주자 귀끝이 붉어진다. “보답으로 커피요. 저는 시나몬을 싫어하는데 늘 시나몬 쿠키를 시켜요. 냄새는 좋거든요. 당신은 어떤 소리를 좋아해요?”',choices:['사실 커피는 잘 몰라요. 종소리는 같이 들어 보고 싶어요.','좋아하는 소리를 이야기하며 조금 더 가까이 앉는다.','녹음 없이 이야기하고 싶어요.']},
 {id:'affection',title:'2 · 금요일의 빈 트랙',background:'cafe',expression:1,entry:'meeting 완료',event:'빌린 헤드폰을 돌려주고 사라지는 소리 전시를 준비한다',completion:'정직과 약속 이행 또는 보류를 확인하고 호감을 표현한다',limit:3,unresolved:'유나는 대여를 연장하고 전시 뒤에 마음을 전하기로 한다',text:'금요일, 유나는 당신 몫의 시나몬 없는 쿠키를 반으로 나눈다. “한 개 사서 두 개처럼 먹는 기술이에요.” 지난번 빌려 준 헤드폰을 가리킨다. 아직 돌려줄 준비가 안 됐다면 말해도 괜찮다. 전시의 빈 트랙에는 당신이 좋아한다고 말한 소리를 남기고 싶단다. “요즘 문종이 울리면 자꾸 먼저 봐요. 손님 기다리는 건 제 일이 아닌데.”',choices:['약속한 헤드폰을 돌려주고, 테스트 녹음을 함께 확인한다.','아직 못 챙겼다고 솔직히 말하고 반납을 미룬다.','오늘은 녹음을 쉬고 쿠키만 나누고 싶어요.']},
 {id:'confession',title:'3 · 고백은 녹음 밖에서',background:'riverside',expression:1,entry:'affection 완료',event:'전시를 마친 뒤 강변에서 서로 마음을 묻는다',completion:'연인이 되거나 고백을 보류하는 사실을 확정한다',limit:3,unresolved:'고백을 보류한 채 다음 산책 약속으로',text:'전시가 끝난 밤, 강물에 자전거 벨이 번진다. 유나는 녹음기를 가방 깊숙이 넣는다. “이 말은 다시 편집하면 안 될 것 같아서요. 좋아해요. 당신이 말하다 생각을 바꾸는 표정까지.” 준비한 문장을 잊은 듯 웃는다. “우리 사귈래요? 대답이 늦어도 기다릴 수 있어요. 아, 이렇게 말하면 너무 면접 같나.”',choices:['나도 좋아해요. 우리 사귀어요.','좋아하지만 대답할 시간이 더 필요해요.','연애는 어렵지만 다음 산책에서 이야기하고 싶어요.']},
 {id:'date',title:'4 · 서툰 둘의 산책',background:'riverside',expression:0,entry:'confession 완료',event:'강변 도시락 데이트와 다음 약속, 이상한 재생음을 경험한다',completion:'데이트 또는 친구 산책을 마치고 원본 청취를 약속한다',limit:3,unresolved:'원본 청취를 제안받고 아카이브로',text:'유나의 도시락에는 계란말이가 죄다 삼각형이다. “사각형은 남들이 많이 하니까.” 강변에서 취향을 맞춰 가며 웃는 동안 그녀의 손이 당신 손 가까이 머문다. 집으로 돌아갈 시간을 말하자 유나는 아쉬워하면서도 가방을 건넨다. 그런데 녹음기에서는 당신 목소리로 “계속 여기 있고 싶어”가 나온다. 당신은 그런 말을 하지 않았다. “자동 재생을 잘못 눌렀나 봐요. 다음에 원본을 같이 들을까요?”',choices:['약속대로 내일 원본을 같이 확인해요. 오늘은 집에 갈게요.','오늘은 조금 더 함께 있을래요.','손잡기는 여기까지. 혼자 돌아가고 싶어요.']},
 {id:'edit',title:'5 · 삭제된 숨',background:'archive',expression:3,entry:'date 완료',event:'원본 A17과 전시본 B17의 편집점을 비교한다',completion:'편집 증거 확보 또는 청취 거부 후 마지막 대면',limit:3,unresolved:'비교를 마치지 못한 채 유나가 반복 프로젝트를 공개한다',text:'아카이브에서 유나는 매일 같은 도시락과 산책을 준비한 달력을 펼친다. “좋았던 하루를 다시 만들면 우리도 그대로일 줄 알았어요.” A17 원본에는 당신이 돌아가겠다는 말이 있고 B17에는 그 말이 없다. 파일함에는 삭제 예약된 작업일지가 있다. 그녀의 웃음이 무너진다. “네가 머뭇거리는 순간이 무서웠어. 그래서 잘랐어.”',choices:['A17과 B17을 직접 비교하고 편집 흔적을 보존한다.','좋았던 말만 남긴 하루를 다시 살아도 괜찮아요.','비교는 그만할게요. 지금 녹음을 멈춰 주세요.']},
 {id:'truth',title:'6 · 내일을 남기는 법',background:'archive',expression:2,entry:'edit 완료',event:'삭제 일지 D04와 복원 원본으로 책임을 확인하고 관계를 결정한다',completion:'엔딩 계약의 최종 사실 확정',limit:3,unresolved:'결정을 미룬 사이 예약 재생이 시작되어 끝없는 하루로',text:'삭제 일지 D04의 작업자는 유나였다. 이별이 두려워 거절을 잘랐고, 편집본을 매일 틀도록 예약했다. 유나는 복원용 원본을 책상에 놓는다. “네 말이 아니란 걸 알면서 내일도 틀 생각이었어. 내가 한 일이야.” 문밖에는 첫날과 다른 빗소리가 난다. 지금 멈추고 기록을 되돌릴지, 관계를 끝낼지, 같은 하루에 남을지 당신이 결정한다.',choices:['일지를 검증하고 원본을 복원해요. 서로 멈출 권리를 지키며 다시 시작해요.','결정하지 않을래요. 같은 하루를 계속 틀어 주세요.','관계를 끝낼게요. 안전하게 떠나고 재연락도 거절하겠어요.']}
];
export const romanceEndings=[
 {id:'romance-0',title:'관계 재설정 · 녹음되지 않은 내일',text:'두 사람은 관계를 이어가되 녹음과 만남을 언제든 거절할 수 있다고 함께 적었다. 유나는 예약 재생을 중단했다. 편집의 전체 경위는 미확인으로 남았지만 다음 데이트는 반복본이 아닌 새 산책이다.'},
 {id:'romance-1',title:'끝없는 하루 · 반복 재생',text:'예약 트랙은 멈추지 않았다. 두 사람의 관계는 계속되지만 떠나겠다는 말을 온전히 남길 방법도, 실질적으로 이 반복에서 이탈할 권리도 확보하지 못했다. 내일의 도시락은 다시 삼각형이다.'},
 {id:'romance-2',title:'안전한 결별 · 온전한 침묵',text:'관계는 끝났다. 유나는 예약 재생을 끄고 연락 목록에서 당신을 지웠다. 당신은 안전하게 문을 나섰고 재접촉을 거절할 권리를 확인했다. 복원하지 않은 자료가 남아도 돌아가 설명할 의무는 없다.'},
 {id:'romance-3',title:'아카이브의 진실 · 삭제되지 않은 우리',text:'A17·B17의 파형과 D04의 작업 시간을 대조했다. 유나가 이별을 피하려고 거절을 삭제하고 반복을 예약했다는 책임이 확인됐다. 원본을 복원하고 재생 예약을 폐기했다. 두 사람은 관계를 이어가기로 했다. 이번에는 서로의 철회권까지 원본에 남겼다.'}
];
export const endingContracts=[
 {id:'romance-2',priority:1,entry:'마지막 장에서 결별 선택',facts:'관계 종료, 안전 이탈, 재접촉 거부권, 반복 중단'},
 {id:'romance-3',priority:2,entry:'마지막 장에서 복원 선택 + A17/B17 비교 증거 + 공동 테스트 또는 원본 청취 약속 이행',facts:'D04 검증, 원본 복원, 원인과 책임 규명, 반복 중단, 관계 지속, 상호 경계'},
 {id:'romance-0',priority:3,entry:'마지막 장에서 재시작 선택, 비교 증거 또는 검증된 신뢰 기록 부족',facts:'관계 지속, 상호 경계, 반복 중단; 경위 미확인'},
 {id:'romance-1',priority:4,entry:'반복 선택 또는 마지막 장 턴 상한 미해결',facts:'관계 지속, 반복 지속, 실질 이탈권 미확보'}
];
export function startRomance():RomanceState{return {version:0,turn:0,facts:[],details:[]};}
// Trust comes from doing something verifiable together, never from agreeing with Yuna.
export function hasVerifiedTrust(r:RomanceState){return r.facts.some(f=>f.id==='shared-test'||f.id==='appointment-kept');}
const reactions=[
 ['유나는 헤드폰 한쪽을 건넨다. “마지막 종소리의 공동 청취자네요. 다음 금요일에도 와 줄래요?” 헤어지기 전 헤드폰을 빌려준다.', '유나가 웃으며 의자를 당긴다. “그 소리, 다음에도 들려줘요.” 다음 금요일에 돌려받기로 하고 헤드폰을 빌려준다.', '유나는 녹음기를 끈다. “그럼 오늘은 저만 기억할게요.” 다음 금요일에 만나기로 하고 헤드폰을 빌려준다.'],
 ['함께 테스트한 녹음에는 두 사람의 웃음과 컵 부딪치는 소리가 남아 있다. “약속 지켜 줘서 고마워요.” 유나가 빈 트랙 이름을 ‘다음 금요일’로 바꾼다.', '“다음에 가져와요. 헤드폰보다 사람이 먼저 왔잖아요.” 유나는 웃지만, 빈 트랙의 재생 버튼을 두 번 누른다.', '유나는 녹음기를 내려놓고 더 큰 쿠키 조각을 당신에게 민다. “오늘의 기록은 부스러기로.” 화면에는 길이가 0초인 삭제 트랙이 잠깐 보인다.'],
 ['유나가 한 박자 늦게 웃는다. “애인 첫날부터 말이 안 나오네.” 둘은 다음 만남을 데이트라고 부르기로 한다.', '“기다리는 동안 대답을 만들어 놓지는 않을게요.” 유나는 다음 산책은 부담 없이 만나자고 한다.', '유나는 잠시 강물을 본 뒤 고개를 끄덕인다. “알겠어요. 다음엔 친구로 걸어요.” 녹음기는 가방 안에 그대로 둔다.'],
 ['“내일, 원본 그대로 들려줄게.” 유나는 배웅하고 아카이브 시간을 적어 준다.', '해가 질 때까지 함께 앉아 있다. 유나는 오늘 날짜를 동그라미 친다. “이 하루를 잃어버리기 싫어.” 다음 만남은 아카이브로 정한다.', '유나는 손을 거두고 길을 비켜 준다. “혼자 가고 싶다는 말도 남겨 둘게.” 원본은 다음 아카이브 방문 때 듣기로 한다.'],
 ['당신은 두 트랙을 같은 시각에서 재생한다. 귀가하겠다는 문장만 B17에서 사라졌다. 유나는 비교 사본을 건네며 삭제 일지의 잠금을 푼다.', '유나는 반복 재생 스위치에 손을 올린다. “정말 이대로여도 돼?” 답을 기다리는 동안 삭제 일지 알림이 켜진다.', '유나는 재생을 멈추고 헤드폰을 벗는다. 비교 사본은 만들지 않았다. 침묵 속에서 삭제 예약 알림만 남는다.']
];
export function romanceScene(g:Game):Scene {
 const c=chapters[Math.min(g.step,5)],r=g.romance;
 let text=c.text;
 if(g.step===3)text=(r?.facts.some(f=>f.id==='couple')?'연인이 된 뒤 첫 데이트다. ':'연인 관계를 시작하지 않고 친구로 만나는 산책이다. ')+text;
 if(g.step===5&&!hasVerifiedTrust(r!))text+='\n함께 검증한 약속의 기록이 부족해 오늘은 복원 작업을 함께 맡길 신뢰까지 생기지 않았다. 다시 시작하더라도 전체 복원은 시간을 두고 확인하기로 한다.';
 if(r?.lastReaction)text=r.lastReaction+'\n\n'+text;
 if(g.step>0&&r?.details.length)text+=`\n유나가 당신의 말을 떠올린다. “${r.details[0]}” 그 말에 어울리는 소리를 함께 찾기로 한다.`;
 return {...c,text};
}
// Only local, chapter-specific intents can change state. Model speech is never an event.
function intent(step:number,text:string):number|null{
 if(step===2){
  if(/사귀.{0,8}(않|싫|못)|좋아하지\s*않|연인이.{0,6}(싫|않)/.test(text))return 2;
  if(/시간.*필요|생각.*시간/.test(text))return 1;
 }
 const rules=[[/커피.*(몰라|모르)|종소리.*(같이|듣)/,/가까이|좋아하는 소리/,/녹음.*(없이|싫|않|말)/],
 [/헤드폰.*(돌려|반납)|테스트.*확인/,/못 챙|미루|아직.*(못|안)/,/녹음.*(쉬|싫)|쿠키만/],
 [/사귀|나도 좋아|연인이/,/시간.*필요|생각.*시간/,/연애.*(어렵|싫)|친구로/],
 [/원본.*(확인|같이)|내일.*약속/,/더.*함께|더.*있/,/혼자.*(갈|돌아)|손잡.*(싫|여기까지)/],
 [/비교|편집.*(보존|흔적)/,/다시.*살|좋았던 말만/,/녹음.*멈|비교.*그만/],
 [/복원|다시 시작|서로.*권리/,/계속.*틀|같은 하루|결정.*않/,/관계.*끝|헤어|떠나|재연락.*거절/]];
 // A refusal takes precedence over keywords quoted earlier in the same sentence.
 for(const i of [2,0,1])if(rules[step][i].test(text))return i;
 return null;
}
export function advanceRomance(game:Game,choice:number|null,text='',interpretedIntent?:string):Game{
 if(game.ending||choice!==null&&(!Number.isInteger(choice)||choice<0||choice>2))throw Error('유효하지 않은 선택입니다.');
 const g=structuredClone(game),r=g.romance??=startRomance(),c=chapters[g.step];
 r.version++;r.turn++;
 const add=(id:string,kind:RelationshipFact['kind'],text:string)=>{if(!r.facts.some(f=>f.id===id))r.facts.push({id,kind,text,eventId:`romance-${r.version}-${id}`,version:r.version});};
 const mapped=interpretedIntent?.match(/^romance:(\d):([012])$/);
 const fallback=mapped&&Number(mapped[1])===g.step?Number(mapped[2]):null;
 const selected=manipulation(text)?null:text.trim()?(g.step===2&&intent(g.step,text)===2?2:interpretedIntent===undefined?intent(g.step,text):fallback):choice;
 g.log.push({speaker:'나',text:text||c.choices[choice??0]});
 if(g.step===0&&text.trim()&&r.details.length===0)r.details.push(text.slice(0,160));
 if(selected===null&&r.turn<c.limit){g.log.push({speaker:'서유나',text:'“조금 더 듣고 싶어요.” 유나는 서둘러 녹음 버튼을 누르지 않는다.'});return g;}
 const s=selected;
 if(g.step===0&&s===0)add('shared-listening','relationship','함께 종소리를 들었다. 개인 취향과 자기소개는 플레이어 발화 기록에 별도로 남겼다.');
 if(g.step===1&&s===0){add('headphone-return','promise','빌린 헤드폰을 돌려주고 함께 작동을 확인했다.');add('shared-test','honesty','테스트 녹음과 설명이 일치함을 함께 확인했다.');}
 if(g.step===2&&s===0)add('couple','relationship','서로 고백에 답하고 연인이 되었다.');
 if(g.step===2&&s!==0)add('confession-deferred','autonomy','유나가 고백의 보류·거절을 받아들였다.');
 if(g.step===3){add('date-complete','relationship',r.facts.some(f=>f.id==='couple')?'연인으로 도시락 데이트를 마쳤다.':'친구로 강변 산책을 마쳤다.');if(s===0)add('archive-appointment','promise','다음 원본 청취 약속을 정했다.');}
 if(s===2&&g.step!==5)add(`boundary-${g.step}`,'autonomy','유나가 녹음·접촉·머무름에 대한 거절을 받아들이고 해당 행동을 중단했다.');
 if(g.step===4&&s===0){add('A17-B17','evidence','A17 원본과 B17 전시본을 재생 비교하여 귀가 발언 삭제 위치를 검증했다.');if(r.facts.some(f=>f.id==='archive-appointment'))add('appointment-kept','promise','약속한 원본 청취에 함께 참석하여 비교를 마쳤다.');}
 add(`chapter-${g.step}`,'chapter',s===null?c.unresolved:g.step===2?(s===0?'서로 고백에 답하고 연인이 되었다.':'고백을 보류하거나 거절하고 친구로 산책하기로 했다.'):c.completion);
 if(g.step===5){
  const id=s===2?'romance-2':s===0?(r.facts.some(f=>f.id==='A17-B17')&&hasVerifiedTrust(r)?'romance-3':'romance-0'):'romance-1';
  const truth=id==='romance-3',loop=id==='romance-1',leave=id==='romance-2';
  if(truth)add('D04-restored','evidence','D04의 유나 작업 서명·시간을 A17/B17 편집점과 대조하고 원본 복원본의 전체 재생을 확인했다.');
  r.final={relationship:leave?'ended':'continuing',mutualBoundaries:!loop&&!leave,loop,exitRight:!loop,safeExit:leave,noContactRight:leave,causeEstablished:truth,restored:truth};
  add('final-contract','relationship',JSON.stringify(r.final));g.ending=id;g.log.push({speaker:'에필로그',text:romanceEndings.find(e=>e.id===id)!.text});
 }else{r.lastReaction=s===null?c.unresolved:reactions[g.step][s];g.step++;r.turn=0;g.log.push({speaker:'서유나',text:romanceScene(g).text});}
 return g;
}
