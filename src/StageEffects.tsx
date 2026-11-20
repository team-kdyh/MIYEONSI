import React,{useEffect,useRef,useState} from 'react';
import type {PresentationCue} from './presentation';

export function TypedText({text,speed,reduced}:{text:string;speed:number;reduced:boolean}){
 const [count,setCount]=useState(0);
 useEffect(()=>{setCount(0);if(reduced||speed===0)return;const timer=setInterval(()=>setCount(n=>{const next=Math.min(text.length,n+2);if(next===text.length)clearInterval(timer);return next;}),speed*2);return()=>clearInterval(timer);},[text,speed,reduced]);
 const complete=reduced||speed===0||count>=text.length;
 return <><p className="typed-text"><span className="sr-only">{text}</span><span className="text-reserve" aria-hidden="true">{text}</span><span className="text-ink" aria-hidden="true">{complete?text:text.slice(0,count)}</span></p>{!complete&&<button className="reveal" onClick={()=>setCount(text.length)}>대사 바로 표시</button>}</>;
}

export function BackgroundTransition({background}:{background:string}){
 const previous=useRef(background),[old,setOld]=useState(background);
 useEffect(()=>{setOld(previous.current);previous.current=background;},[background]);
 return <div className="background-arrival" key={background} style={{backgroundImage:`url(/assets/${old}.png)`}}/>;
}

export function Soundscape({cue,mute,volume}:{cue:PresentationCue|null;mute:boolean;volume:number}){
 const music=useRef<HTMLAudioElement>(null),effect=useRef<HTMLAudioElement>(null);
 const [blocked,setBlocked]=useState(false);
 useEffect(()=>{
  const nodes=[music.current,effect.current];
  for(const node of nodes){if(!node)continue;node.volume=volume/100;node.muted=mute;if(mute||!cue)node.pause();else void node.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));}
  return()=>{for(const node of nodes)node?.pause();};
 },[cue?.id,cue?.music,mute,volume]);
 return <><audio ref={music} data-testid="music" loop src={cue?`/assets/${cue.music}.wav`:undefined}/><audio ref={effect} data-testid="effect" src={cue?`/assets/${cue.sound}.wav`:undefined}/>{blocked&&!mute&&cue&&<button onClick={()=>{void music.current?.play().then(()=>setBlocked(false));void effect.current?.play();}}>배경음 재생</button>}</>;
}
