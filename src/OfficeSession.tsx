import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {bosses,RUSH_SECONDS,rushScenes,temperaments,type OfficeMatch,type OfficeSetup} from '../server/office-match';
import {missions} from '../server/office';
import type {OfficeReview} from '../server/office-review';

export function timeLabel(seconds:number){
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function OfficeSetupForm({mission,setup,onMission,onSetup}:{mission:number;setup:OfficeSetup;onMission:(n:number)=>void;onSetup:(s:OfficeSetup)=>void}){
 const change=<K extends keyof OfficeSetup>(key:K,value:OfficeSetup[K])=>onSetup({...setup,[key]:value});
 const m=missions[mission];
 return <div className="office-setup">
  <fieldset><legend>진행 방식</legend><div className="style-picks">
   {(['classic','rush'] as const).map(v=><label key={v} className={setup.style===v?'selected':''}><input type="radio" name="match-style" checked={setup.style===v} onChange={()=>change('style',v)}/><strong>{v==='classic'?'일반 협상':'타임어택'}</strong><small>{v==='classic'?'시간 제한 없이':`${RUSH_SECONDS/60}분 안에 설득`}</small></label>)}
  </div></fieldset>
  <label>직장 미션 선택<select id="office-mission" value={mission} onChange={e=>onMission(Number(e.target.value))}>{missions.map((v,i)=><option value={i} key={v.id}>{i+1}. {v.title}</option>)}</select></label>
  <p className="mission-brief">{setup.style==='rush'?rushScenes[m.id].trigger:m.intro.replaceAll('박도현',bosses[setup.boss].name)}</p>
  <div className="setup-fields">
   <label>대화 상대<select value={setup.boss} onChange={e=>change('boss',e.target.value as OfficeSetup['boss'])}>{Object.entries(bosses).map(([id,v])=><option key={id} value={id}>{v.name} 부장</option>)}</select></label>
   <label>상대 성격<select value={setup.temperament} onChange={e=>change('temperament',e.target.value as OfficeSetup['temperament'])}>{Object.entries(temperaments).map(([id,v])=><option key={id} value={id}>{v.label}</option>)}</select></label>
  </div>
  <details><summary>내 프로필 · {setup.workplace} {setup.role}</summary><div className="setup-fields">
   <label>직장 또는 팀<input maxLength={36} value={setup.workplace} onChange={e=>change('workplace',e.target.value)}/></label>
   <label>내 직무<input maxLength={36} value={setup.role} onChange={e=>change('role',e.target.value)}/></label>
   <label>내 성별<select value={setup.gender} onChange={e=>change('gender',e.target.value as OfficeSetup['gender'])}>{['미설정','여성','남성','논바이너리'].map(s=><option key={s}>{s}</option>)}</select></label>
  </div></details>
  <p className="setup-rules">새 근거나 대안으로 부장 버티기를 0까지 낮추세요. 압박을 받으면 내 여유가 줄고, 반박에 성공하면 회복할 수 있어요.{setup.style==='rush'&&' 시작부터 실제 시간이 흐릅니다. 종료 전에 보낸 마지막 대사까지 판정합니다.'}</p>
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
 return <div className="chat-history"><div className="chat-post"><strong>{name}</strong><p>{match.opening}</p></div>{match.exchanges.map((t,i)=><div className="chat-pair" key={t.version}><div className="chat-post mine"><strong>나</strong><p>{t.player}</p></div><div className="chat-post"><strong>{name}</strong><p>{t.reply}</p></div>{review&&<small>{i+1}번째 대화 · {review.turns[i]?.note}</small>}</div>)}</div>;
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
export function ReportDetail({review}:{review:OfficeReview}){
 return <div className="report-detail"><p>{review.reason}</p><p>{timeLabel(review.elapsedSeconds)} 진행 · {review.turns.length}번의 대화</p>
 {review.best&&<section><h3>흐름을 바꾼 한마디</h3><blockquote>{review.best.player}</blockquote><p>{review.best.note}</p></section>}
 {review.pressured&&<section><h3>가장 거셌던 압박</h3><blockquote>{review.pressured.reply}</blockquote><p>{review.pressured.note}</p></section>}
 {!review.best&&!review.pressured&&<p>{review.turns.length?'이번 대화에서는 서로의 게이지가 움직이지 않았습니다.':'마감 전에 주고받은 대사가 없습니다.'}</p>}
 </div>;
}
