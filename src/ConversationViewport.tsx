import React,{useLayoutEffect,useRef,useState} from 'react';
import {TypedText} from './StageEffects';
type Page={action:string;line:string};

/** Grow to fit a reply; paginate only when the screen cannot hold it. Never discard text. */
export function ConversationViewport({resetKey,action,text,speed,reduced}:{resetKey:string;action:string;text:string;speed:number;reduced:boolean}){
 const viewport=useRef<HTMLDivElement>(null),measureAction=useRef<HTMLParagraphElement>(null),measureLine=useRef<HTMLParagraphElement>(null);
 const [pages,setPages]=useState<Page[]>([{action,line:text}]),[index,setIndex]=useState(0);
 useLayoutEffect(()=>setIndex(0),[resetKey]);
 useLayoutEffect(()=>{
  const el=viewport.current,panel=el?.closest('.dialogue') as HTMLElement|null;
  if(!el||!panel)return;
  const measure=()=>{
   document.documentElement.style.setProperty('--game-height',`${window.visualViewport?.height??innerHeight}px`);
   const a=measureAction.current!,t=measureLine.current!,style=getComputedStyle(panel);
   const number=(v:string)=>parseFloat(v)||0;
   const chrome=[...panel.children].filter(c=>c!==el).reduce((sum,c)=>{const s=getComputedStyle(c);return sum+c.getBoundingClientRect().height+number(s.marginTop)+number(s.marginBottom);},0);
   const space=number(getComputedStyle(el).marginTop)+number(getComputedStyle(el).marginBottom);
   const budget=Math.max(40,number(style.maxHeight)-chrome-space-number(style.paddingTop)-number(style.paddingBottom)-number(style.borderTopWidth)-number(style.borderBottomWidth)-(speed&&!reduced?34:0)-4);
   const height=(beat:string,line:string)=>{a.textContent=beat;a.style.display=beat?'block':'none';t.textContent=line;t.style.display=line?'block':'none';return (beat?a.getBoundingClientRect().height+8:0)+(line?t.getBoundingClientRect().height:0);};
   let next:Page[]=[];
   if(height(action,text)<=budget)next=[{action,line:text}];
   else {
    const limit=Math.max(30,budget-38);let beat=Array.from(action),words=Array.from(text);
    while(beat.length||words.length){
     const take=(chars:string[],fits:(s:string)=>boolean)=>{let lo=0,hi=chars.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fits(chars.slice(0,mid).join('')))lo=mid;else hi=mid-1;}if(lo>0&&lo<chars.length){const breakAt=chars.slice(0,lo).lastIndexOf(' ');if(breakAt>lo*.7)lo=breakAt+1;}return lo;};
     const na=beat.length?Math.max(1,take(beat,s=>height(s,'')<=limit)):0,partA=beat.splice(0,na).join('');
     const nt=beat.length?0:take(words,s=>height(partA,s)<=limit);
     const partT=words.splice(0,nt||(!partA?1:0)).join('');next.push({action:partA,line:partT});
    }
   }
   setPages(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(panel);observer.observe(el);
  const mutations=new MutationObserver(measure);mutations.observe(panel,{childList:true});mutations.observe(panel.closest('.app')!,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);
  return()=>{observer.disconnect();mutations.disconnect();window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);};
 },[action,text,speed,reduced]);
 const current=Math.min(index,pages.length-1),page=pages[current];
 const move=(n:number)=>setIndex(Math.max(0,Math.min(pages.length-1,n)));
 return <div ref={viewport} className="conversation-viewport">
  <div className="reading-measure" aria-hidden="true"><p ref={measureAction} className="measure-action"/><p ref={measureLine} className="measure-line"/></div>
  <div className="conversation-scroll" tabIndex={0} role="region" aria-label="현재 대화" aria-live="polite" onKeyDown={e=>{if(e.target!==e.currentTarget)return;const key=e.key;if(['PageDown','ArrowRight',' ','PageUp','ArrowLeft','End','Home'].includes(key)){e.preventDefault();move(key==='End'?pages.length-1:key==='Home'?0:current+(['PageUp','ArrowLeft'].includes(key)?-1:1));}}}>
   {page.action&&<p className="action-beat">{page.action}</p>}
   {page.line&&<TypedText key={`${resetKey}-${current}`} text={page.line} speed={speed} reduced={reduced}/>}
  </div>
  {pages.length>1&&<nav className="reading-controls" aria-label="대사 읽기"><button aria-label="이전 부분" disabled={current===0} onClick={()=>move(current-1)}>←</button><span>대사 {current+1} / {pages.length}</span><button disabled={current===pages.length-1} onClick={()=>move(current+1)}>계속 읽기 →</button></nav>}
 </div>;
}
