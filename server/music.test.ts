import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MusicMixer,musicFor} from '../src/music.ts';
import {start} from './game.ts';
class Media {
 dataset:Record<string,string>={};src='';loop=false;muted=false;volume=0;paused=true;plays=0;reject=false;
 play(){this.plays++;if(this.reject)return Promise.reject(Error('gesture required'));this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 removeAttribute(name:string){if(name==='data-track')delete this.dataset.track;}
}
function fixture(){let now=0;const nodes=[new Media(),new Media()];let blocked=false;const mixer=new MusicMixer(nodes as unknown as HTMLAudioElement[],v=>blocked=v,()=>now);return {nodes,mixer,time:(v:number)=>{now=v;mixer.tick();},blocked:()=>blocked};}
test('music dwell coalesces rapid moods, retains playhead and crossfades linearly',()=>{
 const {nodes,mixer,time}=fixture();mixer.request('cafe-warmth');assert.equal(nodes[0].plays,1);
 time(1000);mixer.request('rooftop-heart');mixer.request('rainy-memory');time(7999);assert.equal(nodes[1].plays,0);
 mixer.request('cafe-warmth');time(8000);assert.equal(nodes[1].plays,0);assert.equal(nodes[0].plays,1);
 mixer.request('rainy-memory');assert.equal(nodes[1].dataset.track,'rainy-memory');assert.equal(nodes[1].volume,0);
 time(9000);assert.equal(nodes[0].volume,.175);assert.equal(nodes[1].volume,.175);assert.equal(nodes[0].paused,false);
 time(10000);assert.equal(nodes[0].paused,true);assert.equal(nodes[1].volume,.35);
 mixer.request('rainy-memory');assert.equal(nodes[1].plays,1);mixer.dispose();assert.ok(nodes.every(n=>n.paused));
});
test('mute pauses both channels during transition, volume applies to both, stop clears pending cues',()=>{
 const {nodes,mixer,time}=fixture();mixer.request('office-groove');time(8000);mixer.request('office-pressure');time(9000);
 mixer.settings(true,70);assert.ok(nodes.every(n=>n.muted&&n.paused));time(10000);mixer.settings(false,20);time(11000);
 assert.ok(nodes.every(n=>!n.muted));assert.equal(nodes[0].volume,.1);assert.equal(nodes[1].volume,.1);
 mixer.request(null);time(30000);assert.ok(nodes.every(n=>n.paused&&n.volume===0&&!n.dataset.track));
 mixer.request('cafe-warmth');assert.equal(nodes[0].dataset.track,'cafe-warmth');
});
test('blocked playback is caught and user resume retries without creating a new track',async()=>{
 const f=fixture();f.nodes[0].reject=true;f.mixer.request('office-groove');await new Promise(r=>setImmediate(r));assert.equal(f.blocked(),true);
 f.nodes[0].reject=false;f.mixer.resume();await new Promise(r=>setImmediate(r));assert.equal(f.blocked(),false);assert.equal(f.nodes[0].paused,false);assert.equal(f.nodes[0].plays,2);
});
test('ended and legacy saves use appropriate v2 score without rewriting story state',()=>{
 const g=start('romance');assert.equal(musicFor(g),'cafe-warmth');g.step=3;assert.equal(musicFor(g),'rooftop-heart');g.step=4;assert.equal(musicFor(g),'archive-unease');g.step=5;assert.equal(musicFor(g),'archive-pursuit');g.ending='romance-0';assert.equal(musicFor(g),'resolution-dawn');
});
