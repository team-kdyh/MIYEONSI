import {validCommitments} from './commitments.ts';
import {locations,poses,moods,kinds} from './narrative.ts';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,open,rename,unlink,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {view,endings} from './game.ts';
import type {DialogueGame,Reply} from './dialogue.ts';
import type {Provider} from './provider.ts';
import {missions} from './office.ts';

export type CommittedTurn={id:string;hash:string;beforeVersion:number;afterVersion:number;response:Reply;events:unknown[];log:DialogueGame['log'];unlocks:string[];result:unknown};
export type Profile={game:DialogueGame|null;collection:string[];slots:(DialogueGame|null)[];provider?:Provider;providerSelectionVersion?:2;requests?:number;committed:CommittedTurn[];epoch:number};
export const emptyProfile=():Profile=>({game:null,collection:[],slots:[null,null,null],committed:[],epoch:0});
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validGame(g:unknown):boolean {
 if(g===null)return true;
 const v=g as DialogueGame;
 if(!v||!['office','romance'].includes(v.mode)||!Number.isInteger(v.step)||v.step<0||v.step> (v.mode==='office'?7:5)||!Array.isArray(v.scores)||v.scores.some(n=>!Number.isFinite(n))||!Array.isArray(v.log)||v.log.some(e=>typeof e?.speaker!=='string'||typeof e?.text!=='string')||!(v.ending===null||endings[v.mode].some(e=>e.id===v.ending)))return false;
 if(!v.dialogue||!Number.isSafeInteger(v.dialogue.version)||v.dialogue.version<0||!Array.isArray(v.dialogue.facts)||!Array.isArray(v.dialogue.ledger)||typeof v.dialogue.reply!=='string')return false;
 const history=v.dialogue.battleEvaluations;
 if(history!==undefined){
  if(!Array.isArray(history)||v.mode!=='office'&&history.length)return false;
  let previous=0;
  for(const h of history){
   const version=Number(/^battle-(\d+)$/.exec(h?.id)?.[1]);
   if(!Number.isSafeInteger(version)||version<=previous||version>v.dialogue.version||!missions[v.step]?.terms.some(t=>t.id===h.target)||!['pressure','persuasion','guard','counter'].includes(h.kind)||!['alternative','evidence','boundary'].includes(h.argument)||!['playerQuote','npcQuote','reason'].every(k=>typeof h[k as keyof typeof h]==='string')||![0,8,24].includes(h.playerDamage)||![0,12,16,20,24,28].includes(h.bossDamage)||![0,8].includes(h.guard)||![0,1].includes(h.combo)||h.kind==='pressure'&&(h.bossDamage!==0||h.guard!==0||h.combo!==0)||h.kind!=='pressure'&&h.playerDamage!==0||h.kind==='guard'&&h.bossDamage!==0)return false;
   previous=version;
  }
 }
 if(v.mode==='office'&&(!v.office||!Number.isInteger(v.office.turn)||!Array.isArray(v.office.evidence)||!v.office.secured))return false;
 if(v.mode==='romance'&&(!v.romance||!Number.isInteger(v.romance.turn)||!Array.isArray(v.romance.facts)||!Array.isArray(v.romance.details)))return false;
 if(v.narrative){const n=v.narrative;if(n.format!==2||!Number.isSafeInteger(n.turn)||n.turn<0||!locations.includes(n.location)||!poses.includes(n.pose)||!moods.includes(n.musicMood)||!['strangers','familiar','attracted','confessed','couple','apart'].includes(n.relationship)||!Number.isSafeInteger(n.dates)||n.dates<0||!Array.isArray(n.events)||n.events.some(e=>typeof e.id!=='string'||!kinds.includes(e.kind)||typeof e.text!=='string'||typeof e.evidence!=='string'||typeof e.reference!=='string'||!Number.isSafeInteger(e.turn)||e.turn>n.turn||!['npc','player','mutual','world'].includes(e.subject)||!['offered','accepted','refused','fulfilled'].includes(e.status)))return false;}
 if(v.narrative&&!validCommitments(v.narrative))return false;
 const date=v.narrative?.activeDate;
 if(date&&(!locations.includes(date.location)||date.location!==v.narrative!.location||v.narrative!.relationship!=='couple'||!Number.isSafeInteger(date.turn)||date.turn>v.narrative!.turn||!v.narrative!.events.some(e=>e.id===date.eventId&&e.turn===date.turn&&e.kind==='relationship'&&e.value==='date'&&e.status==='accepted')))return false;
 try{view(v);return true;}catch{return false;}
}
export function validateProfile(p:Profile){
 if(!p||!validGame(p.game)||!Array.isArray(p.slots)||p.slots.length!==3||!p.slots.every(validGame)||!Array.isArray(p.collection)||p.collection.some(id=>!Object.values(endings).flat().some(e=>e.id===id))||!Array.isArray(p.committed)||!Number.isSafeInteger(p.epoch)||p.epoch<0||!['offline','openai',undefined].includes(p.provider)||!Number.isInteger(p.requests??0)||(p.requests??0)<0||p.committed.some(t=>typeof t.id!=='string'||typeof t.hash!=='string'||!Number.isInteger(t.beforeVersion)||t.afterVersion!==t.beforeVersion+1||!t.response||!Array.isArray(t.log)||!Array.isArray(t.events)||!Array.isArray(t.unlocks)||!t.result))throw Error('저장 데이터 검증 실패');
}
export class StorageError extends Error {}
export class ProfileStore {
 constructor(readonly directory:string){}
 private async preserve(file:string){
  try{await copyFile(file,file+'.preserved-'+randomUUID());}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 }
 private file(id:string){if(!/^[a-f0-9]{48}$/.test(id))throw Error('잘못된 세션');return path.join(this.directory,id+'.json');}
 private async read(file:string){const e=JSON.parse(await readFile(file,'utf8'));if(e.format!==1||e.checksum!==digest(e.profile))throw Error('저장 형식 또는 체크섬 불일치');validateProfile(e.profile);
  // Absent history is the neutral baseline in battleView/battleTotals.
  // Do not rewrite old endings, logs, versions, slots or request journals.
  return e.profile as Profile;
 }
 private async atomic(file:string,p:Profile){
  validateProfile(p);await mkdir(this.directory,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';
  try{const f=await open(tmp,'wx');try{await f.writeFile(JSON.stringify({format:1,checksum:digest(p),profile:p}),'utf8');await f.sync();}finally{await f.close();}await rename(tmp,file);}finally{await unlink(tmp).catch(()=>{});}
 }
 async load(id:string):Promise<{profile:Profile;recovery?:string}>{
  const file=this.file(id);let missing=false;
  try{return {profile:await this.read(file)};}catch(e){missing=(e as NodeJS.ErrnoException).code==='ENOENT';}
  try{const profile=await this.read(file+'.bak');await this.preserve(file);await this.atomic(file,profile);return {profile,recovery:'최신 저장을 읽지 못해 마지막 유효 저장을 복구했습니다. 진행을 확인해 주세요.'};}catch(e){if(missing&&(e as NodeJS.ErrnoException).code==='ENOENT')return {profile:emptyProfile()};}
  throw new StorageError('저장 형식이 다르거나 손상되었고 유효한 이전 저장도 없습니다. 저장을 초기화하고 새 게임을 시작할 수 있습니다.');
 }
 async save(id:string,p:Profile){const file=this.file(id);let previous:Profile|undefined;try{previous=await this.read(file);}catch{}if(previous)await this.atomic(file+'.bak',previous);await this.atomic(file,p);}
 async reset(id:string){
  const file=this.file(id);await this.preserve(file);await this.preserve(file+'.bak');
  const p=emptyProfile();p.epoch=Date.now();
  for(const candidate of [file,file+'.bak'])try{p.epoch=Math.max(p.epoch,(await this.read(candidate)).epoch+1);}catch{}
  // A browser may still hold a pending request from before reset. Do not reuse its version.
  await this.atomic(file+'.bak',p);await this.atomic(file,p);return p;
 }
}
