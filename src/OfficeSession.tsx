import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {bosses,RUSH_SECONDS,rushScenes,temperaments,type OfficeMatch,type OfficeSetup} from '../server/office-match';
import {missions} from '../server/office';
import type {OfficeReview} from '../server/office-review';

export function timeLabel(seconds:number){
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
function MissionArt({id}:{id:string}){
 return <img className="mission-art" src={`/assets/office/missions/${id}.webp`} alt="" width="622" height="310"/>;
}
export function OfficeSetupForm({mission,setup,onMission,onSetup}:{mission:number;setup:OfficeSetup;onMission:(n:number)=>void;onSetup:(s:OfficeSetup)=>void}){
 const change=<K extends keyof OfficeSetup>(key:K,value:OfficeSetup[K])=>onSetup({...setup,[key]:value});
 const m=missions[mission];
 return <div className="office-setup">
  <fieldset><legend>진행 방식</legend><div className="style-picks">
   {(['classic','rush'] as const).map(v=><label key={v} className={setup.style===v?'selected':''}><input type="radio" name="match-style" checked={setup.style===v} onChange={()=>change('style',v)}/><strong>{v==='classic'?'일반 협상':'타임어택'}</strong><small>{v==='classic'?'시간 제한 없이':`${RUSH_SECONDS/60}분 안에 설득`}</small></label>)}
  </div></fieldset>
  <label>직장 미션 선택<select id="office-mission" value={mission} onChange={e=>onMission(Number(e.target.value))}>{missions.map((v,i)=><option value={i} key={v.id}>{i+1}. {v.title}</option>)}</select></label>
  <div className="mission-preview"><MissionArt id={m.id}/><p className="mission-brief">{setup.style==='rush'?rushScenes[m.id].trigger:m.intro.replaceAll('박도현',bosses[setup.boss].name)}</p></div>
  <div className="setup-fields">
   <label>대화 상대<select value={setup.boss} onChange={e=>change('boss',e.target.value as OfficeSetup['boss'])}>{Object.entries(bosses).map(([id,v])=><option key={id} value={id}>{v.name} 부장</option>)}</select></label>
   <label>상대 성격<select value={setup.temperament} onChange={e=>change('temperament',e.target.value as OfficeSetup['temperament'])}>{Object.entries(temperaments).map(([id,v])=><option key={id} value={id}>{v.label}</option>)}</select></label>
  </div>
  <details><summary>내 프로필 · {setup.workplace} {setup.role}</summary><div className="setup-fields">
   <label>직장 또는 팀<input maxLength={36} value={setup.workplace} onChange={e=>change('workplace',e.target.value)}/></label>
   <label>내 직무<input maxLength={36} value={setup.role} onChange={e=>change('role',e.target.value)}/></label>
   <label>내 성별<select value={setup.gender} onChange={e=>change('gender',e.target.value as OfficeSetup['gender'])}>{['미설정','여성','남성','논바이너리'].map(s=><option key={s}>{s}</option>)}</select></label>
  </div></details>
  <p className="setup-rules">부장이 요청을 받아들여 협상이 끝나면 리포트가 열립니다. 먼저 끝내고 싶을 땐 ‘대화 마치기’를 누르세요.{setup.style==='rush'&&' 시작부터 실제 시간이 흐릅니다. 종료 전에 보낸 마지막 대사까지 판정합니다.'}</p>
 </div>;
}

export function MatchClock({deadline,offset,busy,onExpiry}:{deadline:number;offset:number;busy:boolean;onExpiry:()=>void}){
 const remaining=()=>Math.max(0,Math.ceil((deadline-Date.now()-offset)/1000));
 const [seconds,setSeconds]=useState(remaining);
 const latest=useRef({busy,onExpiry});latest.current={busy,onExpiry};
 useEffect(()=>{
  let nextCheck=0;
  function tick(){
   const left=remaining();setSeconds(left);
   if(left===0&&!latest.current.busy&&Date.now()>=nextCheck){nextCheck=Date.now()+3500;latest.current.onExpiry();}
  }
  tick();const id=window.setInterval(tick,250);document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(id);document.removeEventListener('visibilitychange',tick);};
 },[deadline,offset]);
 return <div className={`match-clock ${seconds<=30?'urgent':''}`}><span>타임어택</span><strong role="timer" aria-label="남은 시간">{timeLabel(seconds)}</strong></div>;
}
export function OfficeTranscript({match,review}:{match:OfficeMatch;review?:OfficeReview|null}){
 const name=bosses[match.setup.boss].name;
 return <div className="chat-history"><div className="chat-post"><strong>{name}</strong><p>{match.opening}</p></div>{match.exchanges.map((t,i)=>{
  const turn=review?.turns[i];
  return <article className="chat-pair" key={t.version}>
   {turn&&<div className="turn-grade"><strong>{turn.number}번째 발언 · {turn.label}</strong><b>{turn.points>0?'+':''}{turn.points}점</b></div>}
   <div className="chat-post mine"><strong>나</strong><p>{highlightQuote(t.player,turn?.feedback?.playerQuote)}</p></div>
   {t.reply&&<div className="chat-post"><strong>{name}</strong><p>{highlightQuote(t.reply,turn?.feedback?.bossQuote)}</p></div>}
   {turn&&review&&<div className="turn-feedback"><p>{turn.note}</p><small>{turn.basis}</small>
    {review.decisionTurn===turn.number&&<strong>이 답변으로 {review.verdict} · 결과 점수 {review.score.outcome}점</strong>}
   </div>}
  </article>;
 })}</div>;
}
function highlightQuote(line:string,quote?:string){
 const at=quote?line.indexOf(quote):-1;
 if(!quote||at<0)return line;
 return <>{line.slice(0,at)}<mark>{quote}</mark>{line.slice(at+quote.length)}</>;
}
/** Scrollback is optional. The current reply and composer stay outside it. */
export function StageThread({match,outgoing}:{match:OfficeMatch;outgoing?:string}){
 const box=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(box.current)box.current.scrollTop=box.current.scrollHeight;},[match.exchanges.length,outgoing]);
 if(!match.exchanges.length&&!outgoing)return null;
 return <div ref={box} className="stage-thread" role="region" tabIndex={0} aria-label="이전 채팅">
  <div className="thread-npc">{match.opening}</div>
  {match.exchanges.map((t,i)=><React.Fragment key={t.version}><div className="thread-mine"><b>나</b>{t.player}</div>{(i<match.exchanges.length-1||outgoing)&&<div className="thread-npc">{t.reply}</div>}</React.Fragment>)}
  {outgoing&&<div className="thread-mine"><b>전송 중</b>{outgoing}</div>}
 </div>;
}
export function ReportDetail({review,mission}:{review:OfficeReview;mission:number}){
 const {score}=review,m=missions[mission];
 return <div className="report-detail">
 <div className="report-cover">
  <MissionArt id={m.id}/>
  <div className="report-cover-copy"><p>{m.title}</p><h2>협상 리포트 · {review.verdict}</h2>
   <div className="report-total" role="group" aria-label={`협상 점수 100점 만점에 ${score.total}점`}><span>협상 점수</span><strong>{score.total}</strong><small>/ 100</small></div>
  </div>
 </div>
 <dl className="score-breakdown">
  <div><dt>협상 결과</dt><dd>{score.outcome}<small> / 70</small></dd></div>
  <div><dt>설득 효과</dt><dd>{score.impact}<small> / 20</small></dd></div>
  <div><dt>논거의 폭</dt><dd>{score.variety}<small> / 10</small></dd></div>
 </dl>
 <p className="score-equation">결과 {score.outcome}점 + 발언 {score.impact+score.variety}점 = 총 {score.total}점</p>
 <p>{review.reason}</p><p className="report-meta">{timeLabel(review.elapsedSeconds)} 진행 · {review.turns.length}번의 대화</p>
 <details className="score-rules"><summary>채점 기준 보기</summary>
  <p>설득 성공은 70점, 합의로 마무리하면 55점, 부분 합의는 40점입니다. 그 밖의 결말은 대화에서 얻은 점수로 평가합니다.</p>
  <p>부장의 버티기를 줄이거나 내 여유를 회복한 발언은 {score.effectiveTurns}회입니다. 한 번이면 설득 효과는 12점, 두 번 이상이면 20점입니다. 이 점수를 각 발언이 실제로 바꾼 수치에 비례해 나눕니다. 소수점 나머지가 큰 순서로 1점씩 배분하며 동률이면 앞선 발언이 받습니다.</p>
  <p>효과가 있었던 방법은 {score.approaches.length?score.approaches.join(' · '):'0가지'}입니다. 서로 다른 방법을 처음 사용해 효과를 낸 발언 두 개까지 각각 5점을 받습니다.</p>
 </details>
 {review.best&&<section><h3>흐름을 바꾼 한마디</h3><blockquote>{review.best.player}</blockquote><p>{review.best.note}</p></section>}
 {review.pressured&&<section><h3>가장 거셌던 압박</h3><blockquote>{review.pressured.reply}</blockquote><p>{review.pressured.note}</p></section>}
 {!review.best&&!review.pressured&&<p>{review.turns.length?'주고받은 말은 아래 대화 기록에서 다시 읽을 수 있어요.':'마감 전에 주고받은 대사가 없습니다.'}</p>}
 </div>;
}
