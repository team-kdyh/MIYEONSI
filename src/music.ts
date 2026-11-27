import type {Game} from '../server/game';

export const musicIds=['office-groove','office-pressure','cafe-warmth','rooftop-heart','rainy-memory','archive-unease','archive-pursuit','resolution-dawn','office-deadline','office-homebound','office-reflection'] as const;
export type MusicId=typeof musicIds[number];
export const MUSIC_DWELL_MS=8000;
export const MUSIC_FADE_MS=2000;
export function musicFor(g:Game):MusicId {
 if(g.ending&&g.mode==='office')return /-(success|agreed)$/.test(g.ending)?'office-homebound':'office-reflection';
 if(g.ending)return 'resolution-dawn';
 if(g.narrative&&musicIds.includes(g.narrative.musicMood))return g.narrative.musicMood;
 if(g.mode==='office')return g.office?.evidence.length?'office-pressure':'office-groove';
 return g.step>=5?'archive-pursuit':g.step>=4?'archive-unease':g.step>=2?'rooftop-heart':'cafe-warmth';
}

const officeScore:Partial<Record<MusicId,string>>={
 'office-groove':'corner-desk','office-pressure':'red-pencil','office-deadline':'last-shuttle',
 'office-homebound':'green-light','office-reflection':'empty-platform',
};
export function musicAsset(id:MusicId){return officeScore[id]?`/assets/office-score/${officeScore[id]}.ogg`:`/assets/audio-v2/${id}.ogg`;}
const immediate=(id:MusicId)=>['office-deadline','office-homebound','office-reflection'].includes(id);

// Two real media elements retain their playheads across dialogue updates. Only
// the latest pending mood survives the dwell window; silence is immediate.
export class MusicMixer {
 private current=-1;
 private desired:MusicId|null=null;
 private started=0;
 private fadeStart:number|null=null;
 private gains=[0,0];
 private muted=false;
 private volume=.35;
 private disposed=false;
 private playRequests=[0,0];
 constructor(private nodes:HTMLAudioElement[],private blocked:(value:boolean)=>void,private now=()=>performance.now()){}
 request(id:MusicId|null){
  this.desired=id;
  if(!id){this.nodes.forEach(n=>{n.pause();n.removeAttribute('data-track');});this.current=-1;this.fadeStart=null;this.gains=[0,0];this.apply();this.blocked(false);return;}
  this.tick();
 }
 settings(mute:boolean,volume:number){
  const resume=this.muted&&!mute;this.muted=mute;this.volume=Number.isFinite(volume)?Math.max(0,Math.min(100,volume))/100:.35;
  this.apply();if(mute)this.nodes.forEach(n=>n.pause());else if(resume)this.resume();
 }
 private play(node:HTMLAudioElement){
  const index=this.nodes.indexOf(node),attempt=++this.playRequests[index];
  const latest=()=>!this.disposed&&this.playRequests[index]===attempt;
  void node.play().then(()=>{
   if(!latest())return;
   if(this.muted||!this.desired)node.pause();
   else if(index===this.current)this.blocked(false);
  }).catch(()=>{if(latest()&&!this.muted&&this.desired&&index===this.current)this.blocked(true);});
 }
 resume(){if(this.desired&&!this.muted)this.nodes.forEach((node,i)=>{if(i===this.current||this.gains[i]>0)this.play(node);});}
 private apply(){this.nodes.forEach((n,i)=>{n.muted=this.muted;n.volume=this.gains[i]*this.volume;});}
 tick(){
  if(this.disposed||!this.desired)return;
  const time=this.now();
  if(this.fadeStart!==null){
   // Autoplay rejection must not fade the outgoing track to silence.
   if(this.muted&&immediate(this.desired)&&this.nodes[this.current].dataset.track!==this.desired){this.gains[this.current]=1;this.gains[1-this.current]=0;this.fadeStart=null;this.apply();}
   else if(this.muted||this.nodes[this.current].paused){this.fadeStart=time;return;}
  }
  if(this.fadeStart!==null){
   const p=Math.min(1,(time-this.fadeStart)/MUSIC_FADE_MS);
   this.gains[this.current]=p;this.gains[1-this.current]=1-p;this.apply();
   if(p===1){this.nodes[1-this.current].pause();this.fadeStart=null;}
  }
  if(this.fadeStart!==null)return;
  if(this.current>=0&&(this.nodes[this.current].dataset.track===this.desired||!immediate(this.desired)&&time-this.started<MUSIC_DWELL_MS))return;
  const previous=this.current;this.current=previous<0?0:1-previous;
  const next=this.nodes[this.current];next.src=musicAsset(this.desired);next.dataset.track=this.desired;next.loop=true;
  this.started=time;this.gains[this.current]=previous<0?1:0;this.fadeStart=previous<0?null:time;this.apply();
  if(!this.muted)this.play(next);
 }
 dispose(){this.disposed=true;this.nodes.forEach(n=>n.pause());}
}
