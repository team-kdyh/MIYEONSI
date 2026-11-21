import React,{useLayoutEffect,useRef,useState} from 'react';

/** Each new reply begins at its first line; reading never moves the input. */
export function ConversationViewport({resetKey,children}:{resetKey:string;children:React.ReactNode}){
 const scroll=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
 const [hasMore,setHasMore]=useState(false);
 const measure=()=>{const el=scroll.current;if(el)setHasMore(el.scrollHeight-el.clientHeight-el.scrollTop>4);};
 useLayoutEffect(()=>{
  const el=scroll.current;if(!el)return;
  el.scrollTop=0;measure();
  const observer=new ResizeObserver(measure);observer.observe(el);
  if(content.current)observer.observe(content.current);
  return()=>observer.disconnect();
 },[resetKey]);
 return <div className="conversation-viewport">
  <div ref={scroll} className="conversation-scroll" tabIndex={0} role="region" aria-label="현재 대화" aria-live="polite" onScroll={measure}>
   <div ref={content} className="scroll-content">{children}</div>
  </div>
  {hasMore&&<span className="scroll-hint" aria-hidden="true">아래로 스크롤하여 계속 읽기 ↓</span>}
 </div>;
}
