import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,open,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {view,endings} from './game.ts';
import type {DialogueGame,Reply} from './dialogue.ts';
import type {Provider} from './provider.ts';

export type CommittedTurn={id:string;hash:string;beforeVersion:number;afterVersion:number;response:Reply;events:unknown[];log:DialogueGame['log'];unlocks:string[];result:unknown};
export type Profile={game:DialogueGame|null;collection:string[];slots:(DialogueGame|null)[];provider?:Provider;requests?:number;committed:CommittedTurn[];epoch:number};
export const emptyProfile=():Profile=>({game:null,collection:[],slots:[null,null,null],committed:[],epoch:0});
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validGame(g:unknown):boolean {
 if(g===null)return true;
 const v=g as DialogueGame;
 if(!v||!['office','romance'].includes(v.mode)||!Number.isInteger(v.step)||v.step<0||v.step> (v.mode==='office'?7:5)||!Array.isArray(v.scores)||v.scores.some(n=>!Number.isFinite(n))||!Array.isArray(v.log)||v.log.some(e=>typeof e?.speaker!=='string'||typeof e?.text!=='string')||!(v.ending===null||endings[v.mode].some(e=>e.id===v.ending)))return false;
 if(!v.dialogue||!Number.isSafeInteger(v.dialogue.version)||v.dialogue.version<0||!Array.isArray(v.dialogue.facts)||!Array.isArray(v.dialogue.ledger)||typeof v.dialogue.reply!=='string')return false;
 if(v.mode==='office'&&(!v.office||!Number.isInteger(v.office.turn)||!Array.isArray(v.office.evidence)||!v.office.secured))return false;
 if(v.mode==='romance'&&(!v.romance||!Number.isInteger(v.romance.turn)||!Array.isArray(v.romance.facts)||!Array.isArray(v.romance.details)))return false;
 try{view(v);return true;}catch{return false;}
}
export function validateProfile(p:Profile){
 if(!p||!validGame(p.game)||!Array.isArray(p.slots)||p.slots.length!==3||!p.slots.every(validGame)||!Array.isArray(p.collection)||p.collection.some(id=>!Object.values(endings).flat().some(e=>e.id===id))||!Array.isArray(p.committed)||!Number.isSafeInteger(p.epoch)||p.epoch<0||!['offline','openai',undefined].includes(p.provider)||!Number.isInteger(p.requests??0)||(p.requests??0)<0||p.committed.some(t=>typeof t.id!=='string'||typeof t.hash!=='string'||!Number.isInteger(t.beforeVersion)||t.afterVersion!==t.beforeVersion+1||!t.response||!Array.isArray(t.log)||!Array.isArray(t.events)||!Array.isArray(t.unlocks)||!t.result))throw Error('저장 데이터 검증 실패');
}
export class StorageError extends Error {}
export class ProfileStore {
 constructor(readonly directory:string){}
 private file(id:string){if(!/^[a-f0-9]{48}$/.test(id))throw Error('잘못된 세션');return path.join(this.directory,id+'.json');}
 private async read(file:string){const e=JSON.parse(await readFile(file,'utf8'));if(e.format!==1||e.checksum!==digest(e.profile))throw Error('저장 형식 또는 체크섬 불일치');validateProfile(e.profile);return e.profile as Profile;}
 private async atomic(file:string,p:Profile){
  validateProfile(p);await mkdir(this.directory,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';
  try{const f=await open(tmp,'wx');try{await f.writeFile(JSON.stringify({format:1,checksum:digest(p),profile:p}),'utf8');await f.sync();}finally{await f.close();}await rename(tmp,file);}finally{await unlink(tmp).catch(()=>{});}
 }
 async load(id:string):Promise<{profile:Profile;recovery?:string}>{
  const file=this.file(id);let missing=false;
  try{return {profile:await this.read(file)};}catch(e){missing=(e as NodeJS.ErrnoException).code==='ENOENT';}
  try{const profile=await this.read(file+'.bak');await this.atomic(file,profile);return {profile,recovery:'최신 저장을 읽지 못해 마지막 유효 저장을 복구했습니다. 진행을 확인해 주세요.'};}catch(e){if(missing&&(e as NodeJS.ErrnoException).code==='ENOENT')return {profile:emptyProfile()};}
  throw new StorageError('저장 형식이 다르거나 손상되었고 유효한 이전 저장도 없습니다. 저장을 초기화하고 새 게임을 시작할 수 있습니다.');
 }
 async save(id:string,p:Profile){const file=this.file(id);let previous:Profile|undefined;try{previous=await this.read(file);}catch{}if(previous)await this.atomic(file+'.bak',previous);await this.atomic(file,p);}
 async reset(id:string){const p=emptyProfile();await this.atomic(this.file(id)+'.bak',p);await this.atomic(this.file(id),p);return p;}
}
