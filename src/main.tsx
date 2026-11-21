import {CharacterSprite} from './CharacterSprite';
import {ConversationViewport} from './ConversationViewport';
import {collectionCatalogue,collectionSummary} from './collection';
import {backgroundAsset,spriteCell} from './visualAssets';
import {presentation} from './presentation';
import {Soundscape,BackgroundTransition} from './StageEffects';
import {OfficeMissionPicker} from './OfficeAgreement';
import {missions} from '../server/office';
import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import type {Game,Scene,Mode} from '../server/game';
import type {StoryGuide} from '../server/story-guide';
import './style.css';
type End={id:string;title:string;text:string};
type State={game:(Game&{storyGuide?:StoryGuide;dialogue?:{version:number;reply:string;actionBeats?:string[]}}&{scene:Scene|null;end:End|null})|null;collection:string[];slots:({mode:Mode;step:number;ending:string|null}|null)[];endings:Record<Mode,End[]>;provider:string};
type Panel='settings'|'collection'|'save'|'log'|'tutorial'|null;
const modeName=(mode:Mode)=>mode==='office'?'직장 미션':'로맨스 스릴러';
function App(){
 const [state,setState]=useState<State|null>(null),[playing,setPlaying]=useState(false),[panel,setPanel]=useState<Panel>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState(''),[pending,setPending]=useState<Mode>('office');
 const [officeMission,setOfficeMission]=useState(0);
 const [canReset,setCanReset]=useState(false);
 const [errorKind,setErrorKind]=useState<'rejected'|'recover'|'notice'>('notice');
 const retry=useRef<{action:string;body:object;outcome?:'rejected'}|null>((()=>{try{return JSON.parse(sessionStorage.getItem('afterhours-pending')||'null')}catch{return null}})()),active=useRef<AbortController|null>(null);
 const [settings,setSettings]=useState(()=>{try{return {...{reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,mute:false,large:false,volume:35,speed:20},...JSON.parse(localStorage.getItem('afterhours-settings')||'{}')}}catch{return {reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,mute:false,large:false,volume:35,speed:20}}});
 useEffect(()=>{localStorage.setItem('afterhours-settings',JSON.stringify(settings));},[settings]);
 function clearRetry(){retry.current=null;sessionStorage.removeItem('afterhours-pending');}
 async function api(action='state',body?:object){
  if(active.current)return false;setBusy(true);setError('');
  if(body){clearRetry();if(action==='turn'){retry.current={action,body};sessionStorage.setItem('afterhours-pending',JSON.stringify(retry.current));}}
  const controller=new AbortController();active.current=controller;const timer=setTimeout(()=>controller.abort(),32000);
  try{
   const r=await fetch('/api/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal});const data=await r.json();
   if(!r.ok){
    setCanReset(!!data.canReset);
    if(data.state){setState(data.state);clearRetry();setErrorKind('notice');setError('저장된 진행을 다시 불러왔어요. 입력한 말을 확인한 뒤 보내 주세요.');return false;}
    if(data.code==='reply_rejected'&&data.committed===false){
     if(retry.current){retry.current.outcome='rejected';sessionStorage.setItem('afterhours-pending',JSON.stringify(retry.current));}
     setErrorKind('rejected');setError(data.error);return false;
    }
    setErrorKind(retry.current?'recover':'notice');setError(data.error||'이야기를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.');return false;
   }
   setState(data);setCanReset(false);
   if(body){clearRetry();if(action==='turn'){setDraft('');}}
   setErrorKind(retry.current?.outcome==='rejected'?'rejected':retry.current?'recover':'notice');
   if(retry.current){const pending=retry.current.body as {text?:string};if(pending.text)setDraft(pending.text);}
   setError(data.recovery||(retry.current?(retry.current.outcome==='rejected'?'아직 받지 못한 답장이 있어요. 보내신 말은 고치지 않고 그대로 다시 보낼 수 있어요.':'아직 받지 못한 답변이 있어요. 이어받기를 누르면 중복 없이 이어갈 수 있어요.'):''));return true;
  }catch{setErrorKind(retry.current?'recover':'notice');setError(retry.current?'답변을 받는 중 연결이 끊겼어요. 보내던 말은 보관했습니다.':'서버에 연결하지 못했어요. 연결을 확인한 뒤 다시 불러와 주세요.');return false;}
  finally{clearTimeout(timer);active.current=null;setBusy(false);}
 }
 useEffect(()=>{void api();},[]);
 async function begin(){if(await api('new',{mode:pending,mission:pending==='office'?officeMission:0})){setPlaying(true);setPanel(null);setDraft('');}}
 async function turn(){if(!draft.trim()||!state?.game||retry.current)return;if(await api('turn',{text:draft,step:state.game.step,version:state.game.dialogue?.version??0,requestId:crypto.randomUUID()})){setDraft('');replyInput.current?.focus();}}
 const replyInput=useRef<HTMLInputElement>(null),menuOpener=useRef<HTMLElement|null>(null);
 const g=state?.game,mode=g?.mode||'office',cue=g?presentation(g):null;
 const catalogue=state?collectionCatalogue(state.endings,state.collection):null;
 const recoveryNotice=error&&<div className={playing&&g&&!panel?'reply-notice':'error'} role="alert"><p>{error}</p><div>{canReset&&<button disabled={busy} onClick={()=>{if(window.confirm('복구할 수 없는 저장을 초기화할까요? 모든 슬롯과 해금이 지워집니다.'))void api('reset',{});}}>저장 초기화 후 새로 시작</button>}{retry.current&&<button disabled={busy} onClick={()=>{const r=retry.current;if(r)void api(r.action,r.body);}}>{errorKind==='rejected'?'답변 다시 받기':'이어받기'}</button>}{errorKind==='rejected'?<button disabled={busy} onClick={()=>{clearRetry();setError('');setErrorKind('notice');replyInput.current?.focus();}}>입력으로 돌아가기</button>:<button disabled={busy} onClick={()=>void api()}>진행 불러오기</button>}</div></div>;
 useEffect(()=>{if(!panel)return;return()=>menuOpener.current?.focus();},[panel]);
 return <div onClickCapture={e=>{const button=(e.target as HTMLElement).closest('button');if(button&&!panel)menuOpener.current=button;}} className={`app ${playing&&g?'is-playing':''} ${settings.reduced?'reduced':''} ${settings.large?'large':''}`}>
 <header><button className="wordmark" onClick={()=>setPlaying(false)}>AFTER HOURS <span>퇴근 후에</span></button><nav aria-label="게임 메뉴"><button onClick={()=>setPanel('save')}>세이브</button><button onClick={()=>setPanel('collection')}>컬렉션</button><button onClick={()=>setPanel('settings')}>설정</button></nav></header>
 <main>{!playing||!g?<section className="title-screen">
 <div className="title-art"><div className="title-character"/><span className="art-caption">SEOUL, 18:07<br/>아직 끝나지 않은 당신의 하루.</span></div>
 <div className="title-copy"><p className="eyebrow">AN ORIGINAL INTERACTIVE NOVEL</p><h1>AFTER<br/><em>HOURS</em><small>퇴근 후에</small></h1><p className="intro">퇴근을 위한 한마디.<br/>누군가를 놓아주는 한마디.<br/>오늘 밤, 당신은 무엇을 남길까요?</p>
 <div className="mode-grid"><button disabled={busy||!state} onClick={()=>{setPending('office');setPanel('tutorial');}}><span>01 / OFFICE COMEDY</span><strong>칼퇴의 기술 ↗</strong><small>박도현 부장과 마지막 업무를 협상하세요.</small></button><button disabled={busy||!state} onClick={()=>{setPending('romance');setPanel('tutorial');}}><span>02 / ROMANCE THRILLER</span><strong>너의 목소리를 빌려줘 ↗</strong><small>서유나와 밤의 소리, 작은 약속을 나누세요.</small></button></div>
 {g&&<button className="continue" onClick={()=>{setPlaying(true);}}>이어하기 · {modeName(g.mode)} · {g.ending?'에필로그':g.mode==='office'?missions[g.step]?.title:g.storyGuide?.chapterLabel||'이야기 진행 중'} →</button>}
 <p className="fine">성인 인물의 비노골적 로맨스 · 심리적 긴장 포함<br/>직장 8개 미션 · 서로 다른 협상과 결말</p></div>
 </section>:<section className={`play ${mode} ${mode==='romance'&&g.step>=4?'tense':''}`}>
 <div className="scene-top"><span>{modeName(mode)}</span><button onClick={()=>setPanel('log')}>대화 로그</button></div>
 <div className="stage" data-cue={cue?.id} style={{backgroundImage:`url(${backgroundAsset(cue?.background||"office")})`}}><BackgroundTransition background={cue?.background||"office"}/>{g.storyGuide?<aside className="story-guide" aria-label="현재 이야기"><p className="chapter-label">{g.storyGuide.chapterLabel} · {g.storyGuide.place}</p><h2>{g.ending?g.end?.title:g.storyGuide.title}</h2><p className="stage-situation">{g.storyGuide.situation}</p></aside>:<div className="scene-label"><h2>{g.ending?g.end?.title:g.scene?.title}</h2></div>}<CharacterSprite mode={mode} pose={cue?.pose||"neutral"} expression={cue?.expression||0} turn={cue?.id||"arrival"} actionBeats={g.dialogue?.actionBeats}/></div>
 <div className="dialogue"><div className="speaker">{g.ending?'EPILOGUE':mode==='office'?'박도현':'서유나'}<span>{g.ending?'당신이 남긴 이야기':mode==='office'?'기획팀 부장':'사운드 아키비스트'}</span>{busy&&<span className="thinking" role="status">답장을 기다리는 중…</span>}</div>
 <ConversationViewport resetKey={`${g.step}-${g.dialogue?.version}-${g.ending}`} action={g.dialogue?.actionBeats?.join(' · ')||spriteCell(mode,cue?.pose||"neutral",cue?.expression).label} text={g.ending?(g.end?.text||g.dialogue?.reply||''):g.dialogue?.reply||(mode==='office'?'잠깐, 퇴근 전에 이 일 이야기 좀 할까요?':'여기 앉아도 돼요? 방금 컵 내려놓는 소리가 참 좋았거든요.')} speed={settings.speed} reduced={settings.reduced}/>
 {!panel&&recoveryNotice}
 {g.scene?<form onSubmit={e=>{e.preventDefault();void turn();}}><label htmlFor="reply">나의 대사 <span>당신의 말로 이어 가세요</span></label><div className="input-row"><input ref={replyInput} id="reply" autoComplete="off" maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&e.nativeEvent.isComposing)e.preventDefault();}} placeholder="어떤 말을 건넬까요…" readOnly={busy||!!retry.current}/><button className="primary" disabled={busy||!!retry.current||!draft.trim()}>{busy?'기록 중…':'전송 →'}</button></div><small>{draft.length} / 500 · 대화는 자동 저장됩니다.</small></form>:<div className="ending-actions"><button className="primary" onClick={()=>setPanel('collection')}>컬렉션 보기</button><button onClick={()=>setPlaying(false)}>타이틀로 돌아가기</button>{mode==='office'&&<button disabled={busy} onClick={async()=>{if(await api('new',{mode:'office',mission:g.step})){setDraft('');}}}>이 미션 다시 도전</button>}{mode==='office'&&<button onClick={()=>{setPending('office');setOfficeMission((g.step+1)%8);setPanel('tutorial');}}>다른 직장 미션</button>}</div>}</div></section>}
 </main><Soundscape cue={playing?cue:null} mute={settings.mute} volume={settings.volume}/><footer><span className="status-dot"/> {state?.provider==='openai'?'OPENAI · 서버 연결 모드':'오프라인 미리보기'} <span>{state?.provider==='openai'?'AI 캐릭터 대화':'원본 시나리오 · 외부 AI 호출 없음'}</span>{busy&&<button onClick={()=>active.current?.abort()}>응답 취소</button>}</footer>
 {(!playing||!g||panel)&&recoveryNotice}
 {panel&&<div className="overlay" onClick={e=>{if(e.target===e.currentTarget&&!busy)setPanel(null);}}><section className="modal" role="dialog" aria-modal="true" aria-label={{settings:'설정',collection:'엔딩 컬렉션',save:'저장과 불러오기',log:'대화 로그',tutorial:'플레이 안내'}[panel]} onKeyDown={e=>{if(e.key==='Escape'&&!busy)setPanel(null);if(e.key==='Tab'){const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}><button autoFocus className="close" disabled={busy} onClick={()=>setPanel(null)} aria-label="닫기">✕</button>
 {panel==='tutorial'&&<><p className="eyebrow">BEFORE THE FIRST LINE</p><h2>{modeName(pending)} 시작하기</h2>{pending==='office'?<OfficeMissionPicker value={officeMission} onChange={setOfficeMission}/>:<><p>29세인 당신은 사라지는 소리를 모으는 서유나(27)를 만납니다. 퇴근 뒤 작은 카페에서, 아직 이름 없는 이야기가 시작됩니다.</p><p>떠오른 말을 자유롭게 입력하세요. 함께 머물러 이야기하거나 새로운 계획을 제안할 수 있습니다. 지난 대화는 로그에서 다시 읽을 수 있습니다.</p></>}<p>진행은 자동 저장됩니다. 세이브 메뉴의 세 칸에 분기 직전 기록을 남길 수도 있습니다. 새 게임을 시작하면 현재 자동 저장은 교체됩니다.</p>{pending==='romance'&&<div className="notice">공포 예고: 집착, 동의 없는 편집, 관계의 불편함을 다룹니다. 모든 로맨스 인물은 성인입니다. 실제 개인정보나 기기에 접근하는 연출은 없습니다. 설정에서 효과를 줄이고 언제든 타이틀로 나갈 수 있습니다.</div>}<button className="primary" disabled={busy} onClick={()=>void begin()}>이야기 시작 →</button></>}
 {panel==='settings'&&<><p className="eyebrow">YOUR OWN PACE</p><h2>편안한 속도로</h2><label>대화 제공자 <select aria-label="대화 제공자" disabled={busy} value={state?.provider||'offline'} onChange={e=>void api('provider',{provider:e.target.value})}><option value="offline">오프라인 미리보기 · 외부 호출 없음</option><option value="openai">OpenAI · 서버 환경변수 사용</option></select></label>{([['reduced','효과 감소','무대의 움직임과 긴장 효과를 끕니다.'],['mute','음소거','배경음과 모든 효과음을 끕니다.'],['large','큰 글씨','대사의 글씨를 키웁니다.']] as const).map(([key,label,desc])=><label className="setting" key={key}><div><strong>{label}</strong><small>{desc}</small></div><input type="checkbox" checked={settings[key]} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/></label>)}<label className="range-setting">음량 {settings.volume}%<input aria-label="음량" type="range" min="0" max="100" value={settings.volume} onChange={e=>setSettings({...settings,volume:Number(e.target.value)})}/></label><label className="range-setting">읽기 속도<select aria-label="읽기 속도" value={settings.speed} onChange={e=>setSettings({...settings,speed:Number(e.target.value)})}><option value={40}>천천히</option><option value={20}>보통</option><option value={8}>빠르게</option><option value={0}>즉시 표시</option></select></label><p className="fine">설정은 이 브라우저에 보관됩니다. 효과 감소에서는 대사를 즉시 표시합니다. 음악은 첫 재생 동작 후 시작되며, 사건 정보는 무음에서도 그대로 표시됩니다.</p>{g&&<button onClick={()=>{setPending(g.mode);setPanel('tutorial');}}>현재 모드 처음부터 시작</button>}</>}
 {panel==='collection'&&<><p className="eyebrow">THINGS WE LEAVE BEHIND</p><h2>엔딩 컬렉션 <small>{state?.collection.length||0} / {catalogue?Object.values(catalogue).flat().length:0}</small></h2>{state&&catalogue&&Object.entries(catalogue).map(([m,ends])=><div key={m}><h3>{modeName(m as Mode)}</h3>{ends.map(e=><article className="end-card" key={e.id}><strong>{state.collection.includes(e.id)?e.title:'아직 쓰이지 않은 이야기'}</strong><p>{state.collection.includes(e.id)?collectionSummary(e,g):'아직 당신의 말이 닿지 않은 결말입니다.'}</p></article>)}</div>)}</>}
 {panel==='save'&&<><p className="eyebrow">A PLACE TO RETURN</p><h2>저장과 불러오기</h2><p>자동 저장은 항상 최신 진행을 유지합니다. 수동 저장은 덮어쓰기 전까지 남습니다.</p>{state?.slots.map((slot,i)=><div className="save-slot" key={i}><strong>0{i+1}</strong><div>{slot?`${modeName(slot.mode)} · ${slot.ending?'엔딩':`${slot.step+1}장면`}`:'비어 있는 기록'}</div><button disabled={busy||!g} onClick={()=>{if(!slot||window.confirm('이 저장 칸을 현재 진행으로 덮어쓸까요?'))void api('save',{slot:i});}}>저장</button><button disabled={busy||!slot} onClick={async()=>{if(await api('load',{slot:i})){setPlaying(true);setPanel(null);setDraft('');}}}>불러오기</button></div>)}<p className="fine">저장 데이터는 로컬 서버에 보관됩니다. 브라우저 쿠키가 기록을 연결하므로 같은 주소와 브라우저를 사용하세요.</p></>}
 {panel==='log'&&<><p className="eyebrow">OUR CONVERSATION</p><h2>대화 로그</h2>{g?.log.map((entry,i)=><article className="log" key={i}><strong>{entry.speaker}</strong><p>{entry.text}</p></article>)}</>}
 </section></div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);



