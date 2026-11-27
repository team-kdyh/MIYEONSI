import {MusicMixer,musicIds,type MusicId} from './music';
import {backgroundAsset} from './visualAssets';
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
 return <div className="background-arrival" key={background} style={{backgroundImage:`url(${backgroundAsset(old)})`}}/>;
}

export function Soundscape({cue,mute,volume,deadline,clockOffset=0}:{cue:PresentationCue|null;mute:boolean;volume:number;deadline?:number|null;clockOffset?:number}){
 const music=useRef<HTMLAudioElement>(null),incoming=useRef<HTMLAudioElement>(null),effect=useRef<HTMLAudioElement>(null);
 const mixer=useRef<MusicMixer|null>(null),[blocked,setBlocked]=useState(false);
 useEffect(()=>{
  const player=new MusicMixer([music.current!,incoming.current!],setBlocked);mixer.current=player;
  const timer=setInterval(()=>player.tick(),40);
  return()=>{clearInterval(timer);player.dispose();mixer.current=null;};
 },[]);
 useEffect(()=>{mixer.current?.settings(mute,volume);if(effect.current){effect.current.volume=Math.max(0,Math.min(100,Number.isFinite(volume)?volume:35))/100;effect.current.muted=mute;if(mute)effect.current.pause();}},[mute,volume]);
 const track=cue&&musicIds.includes(cue.music as MusicId)?cue.music as MusicId:null;
 useEffect(()=>{
  const remaining=deadline?deadline-Date.now()-clockOffset-30000:Infinity;
  if(track&&remaining<=0){mixer.current?.request('office-deadline');return;}
  mixer.current?.request(track);
  if(track&&Number.isFinite(remaining)){
   const alarm=window.setTimeout(()=>mixer.current?.request('office-deadline'),remaining);
   return()=>clearTimeout(alarm);
  }
 },[track,deadline,clockOffset]);
 useEffect(()=>{
  const node=effect.current;if(!node)return;
  if(!cue||mute){node.pause();return;}
  node.src=`/assets/${cue.sound}.wav`;void node.play().catch(()=>{});
  return()=>node.pause();
 },[cue?.id,cue?.sound,mute]);
 return <><audio ref={music} data-testid="music" preload="auto"/><audio ref={incoming} data-testid="music-incoming" preload="auto"/><audio ref={effect} data-testid="effect"/>{blocked&&!mute&&cue&&<button className="audio-resume" onClick={()=>mixer.current?.resume()}>배경음 재생</button>}</>;
}
