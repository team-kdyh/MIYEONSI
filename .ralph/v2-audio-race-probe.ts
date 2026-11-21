import {MusicMixer} from '../src/music.ts';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
class Media{
 dataset:Record<string,string>={};src='';loop=false;muted=false;volume=0;paused=true;
 pending:{resolve:()=>void;reject:()=>void}[]=[];
 play(){return new Promise<void>((resolve,reject)=>this.pending.push({resolve:()=>{this.paused=false;resolve();},reject:()=>reject(Error('earlier playback request failed'))}));}
 pause(){this.paused=true;}
 removeAttribute(key:string){if(key==='data-track')delete this.dataset.track;}
}
const nodes=[new Media(),new Media()],changes:boolean[]=[];
const mixer=new MusicMixer(nodes as unknown as HTMLAudioElement[],blocked=>changes.push(blocked));
mixer.request('cafe-warmth');mixer.resume();
nodes[0].pending[1].resolve();await new Promise(r=>setImmediate(r));
const afterNewSuccess={paused:nodes[0].paused,blocked:changes.at(-1)};
nodes[0].pending[0].reject();await new Promise(r=>setImmediate(r));
const afterOldFailure={paused:nodes[0].paused,blocked:changes.at(-1)};
mixer.dispose();
const destination=process.argv[2];if(!/^docs\/v2-audio-race-review\/(?:before|after)\.json$/.test(destination??''))throw Error('Explicit evidence destination required');
mkdirSync('docs/v2-audio-race-review',{recursive:true});
const result={scope:'Deterministic media-promise scheduling with actual MusicMixer; no network or audio listening; not claimed as the root cause of the separate browser flake',sourceHash:createHash('sha256').update(readFileSync('src/music.ts')).digest('hex'),afterNewSuccess,afterOldFailure,changes,pass:afterOldFailure.paused===false&&afterOldFailure.blocked===false};
writeFileSync(destination,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
