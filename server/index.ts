import {narrative} from './narrative.ts';
import express from 'express';
import {randomBytes} from 'node:crypto';
import {ProfileStore,StorageError,type Profile} from './storage.ts';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {start,view,endings,stories,sceneFor,type Game} from './game.ts';
import {canonical,commitDialogue,type DialogueGame} from './dialogue.ts';
import {respond,type Provider} from './provider.ts';
import {createHash} from 'node:crypto';
import {loadEnvFile} from 'node:process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{loadEnvFile(path.join(root,'.env'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('환경설정 파일을 읽지 못했습니다.');}
const port=Number(process.env.PORT||3001);
const store=new ProfileStore(process.env.AFTERHOURS_DATA_DIR||path.join(root,'.local-data'));
function selectedProvider(p:Profile):Provider{return p.providerSelectionVersion===2&&p.provider?p.provider:(process.env.OPENAI_API_KEY?'openai':'offline');}
function payload(p:Profile){const provider=selectedProvider(p);return {game:view(p.game),collection:p.collection,slots:p.slots.map(g=>g?{mode:g.mode,step:g.step,ending:g.ending}:null),endings,provider,model:(provider==='openai'?process.env.OPENAI_MODEL||'gpt-4.1':null)};}
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'4kb'}));
const locks=new Set<string>(); const rates=new Map<string,{count:number;until:number}>();
app.use('/api',async(req,res,next)=>{
 res.setHeader('Cache-Control','no-store');
 // Local-only host validation also blocks browser DNS rebinding to this listener.
 if(!['127.0.0.1','localhost'].includes((req.headers.host||'').split(':')[0])){res.status(403).json({error:'허용되지 않은 호스트입니다.'});return;}
 if(req.headers.origin && !['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:3001','http://localhost:3001',`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)) {res.status(403).json({error:'허용되지 않은 요청입니다.'});return;}
 let id=req.headers.cookie?.match(/(?:^|; )afterhours=([a-f0-9]{48})(?:;|$)/)?.[1];
 if(!id){id=randomBytes(24).toString('hex');res.cookie('afterhours',id,{httpOnly:true,sameSite:'strict',maxAge:31536000000});}
 res.locals.id=id;next();
});
app.all('/api/:action',async(req,res)=>{
 const id:string=res.locals.id; if(locks.has(id)){res.status(409).json({error:'앞선 대화를 처리 중입니다.'});return;}locks.add(id);
 try{
 const a=req.params.action;
 if(req.method==='POST'){
  const fields:Record<string,string[]>={reset:[],new:['mode','mission'],provider:['provider'],turn:['text','choice','requestId','version','step'],save:['slot'],load:['slot']};
  if(!req.body||Array.isArray(req.body)||typeof req.body!=='object'||fields[a]&&Object.keys(req.body).some(k=>!fields[a].includes(k)))throw Error('요청 필드가 올바르지 않습니다.');
 }
 if(req.method==='POST'&&a!=='turn'){
  const now=Date.now();for(const [key,value] of rates)if(value.until<now)rates.delete(key);
  let rate=rates.get(id);if(!rate){rate={count:0,until:now+3600000};rates.set(id,rate);}
  if(++rate.count>300){res.status(429).json({error:'시간당 요청 한도입니다. 잠시 후 다시 시도하세요.'});return;}
 }
 if(a==='reset'&&req.method==='POST'){res.json(payload(await store.reset(id)));return;}
 const loaded=await store.load(id);let p=loaded.profile;
 if(req.method==='POST'){
 const now=Date.now();let rate=rates.get(id);if(!rate||rate.until<now){rate={count:0,until:now+3600000};rates.set(id,rate);}
 if(a==='new'){if(!['office','romance'].includes(req.body.mode))throw Error('모드를 선택하세요.');const version=p.game?Math.max(p.epoch,canonical(p.game).version)+1:p.epoch;p.game=start(req.body.mode,req.body.mission??0);p.game.dialogue=canonical(p.game);p.game.narrative=narrative(p.game);p.game.dialogue.version=version;p.epoch=version;p.requests=0;}
 else if(a==='provider'){if(!['offline','openai'].includes(req.body.provider))throw Error('제공자를 선택하세요.');p.provider=req.body.provider;p.providerSelectionVersion=2;}
 else if(a==='turn'){
 if(!p.game)throw Error('진행 중인 게임이 필요합니다.');
 const {text,choice,requestId,version}=req.body;
 if(typeof text!=='string'||text.length>500||!text.trim())throw Error('입력은 1–500자의 자유 대사여야 합니다.');
 if(choice!=null)throw Error('이야기는 자유 대사로 진행됩니다.');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw Error('요청 식별자가 필요합니다.');
 const hash=createHash('sha256').update(JSON.stringify({text,choice,version,step:req.body.step})).digest('hex');
 const old=p.committed?.find(t=>t.id===requestId);if(old){if(old.hash!==hash){res.status(409).json({error:'동일 요청의 내용이 다릅니다. 현재 상태를 복구했습니다.',state:payload(p)});return;}if(old.afterVersion!==canonical(p.game).version){res.status(409).json({error:'이미 처리한 대화 이후 이야기가 진행됐습니다. 현재 상태를 복구했습니다. 새 대사를 입력하세요.',state:payload(p)});return;}res.json(payload(p));return;}
 if(++rate.count>300){res.status(429).json({error:'시간당 요청 한도입니다. 잠시 후 다시 시도하세요.'});return;}
 if(p.game.ending)throw Error('이미 끝난 이야기입니다.');
 if(version!==canonical(p.game).version||req.body.step!==p.game.step){res.status(409).json({error:'다른 화면에서 이야기가 진행됐습니다. 현재 상태를 복구했습니다. 새 대사를 입력하세요.',state:payload(p)});return;}
 if((p.requests??0)>=100)throw Error('이 세션의 AI 요청 한도(100회)에 도달했습니다. 새 게임을 시작하세요.');
 p.requests=(p.requests??0)+1;
 // Count attempts durably even when the provider fails; never persist a failed turn.
 await store.save(id,p);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
 const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
 try{
 const reply=await respond(p.game,text.trim()||(choice!=null?sceneFor(p.game).choices[choice]:''),selectedProvider(p),controller.signal);
 if(controller.signal.aborted)throw Error('응답이 취소되었거나 시간이 초과되었습니다. 다시 시도하세요.');
 const beforeVersion=canonical(p.game).version;
 p.game=commitDialogue(p.game,choice??null,text.trim(),reply);
 p.epoch=canonical(p.game).version;
 const unlocks=p.game.ending&&!p.collection.includes(p.game.ending)?[p.game.ending]:[];
 if(p.game.ending&&!p.collection.includes(p.game.ending))p.collection.push(p.game.ending);
 const result=payload(p);p.committed.push({id:requestId,hash,beforeVersion,afterVersion:p.epoch,response:reply,events:canonical(p.game).facts.filter(f=>f.version===p.epoch),log:structuredClone(p.game.log),unlocks,result});
 // Old request versions remain stale even after journal eviction; never reuse epochs.
 p.committed=p.committed.slice(-128);
 if(process.env.NODE_ENV==='test'&&req.headers['x-test-failure']==='before-commit')throw Error('확정 전 실패 주입');
 await store.save(id,p);
 if(process.env.NODE_ENV==='test'&&req.headers['x-test-failure']==='after-commit'){res.destroy();return;}
 res.json(result);return;
 }catch(e){if(controller.signal.aborted)throw Error('응답이 취소되었거나 시간이 초과되었습니다. 다시 시도하세요.');throw e;}finally{clearTimeout(timer);res.off('close',cancel);}
 }
 else if(a==='save'||a==='load'){const slot=req.body.slot;if(!Number.isInteger(slot)||slot<0||slot>2)throw Error('저장 칸이 올바르지 않습니다.');if(a==='save'){if(!p.game)throw Error('진행 중인 게임이 없습니다.');p.slots[slot]=structuredClone(p.game);}else{if(!p.slots[slot])throw Error('빈 저장 칸입니다.');p.game=structuredClone(p.slots[slot]);if(p.game){const d=canonical(p.game);d.version=Math.max(d.version,p.epoch)+1;p.epoch=d.version;p.game.dialogue=d;}}}
 else {res.status(404).json({error:'없는 기능입니다.'});return;}
 await store.save(id,p);
 }else if(req.method!=='GET'||a!=='state'){res.sendStatus(404);return;}
 res.json({...payload(p),...(loaded.recovery?{recovery:loaded.recovery}:{})});
 }catch(e){let message=e instanceof Error?e.message:'처리하지 못했습니다.';if(process.env.OPENAI_API_KEY&&message.includes(process.env.OPENAI_API_KEY))message='서버 요청에 실패했습니다. 다시 시도하세요.';res.status(e instanceof StorageError?503:400).json({error:message,canReset:e instanceof StorageError});}finally{locks.delete(id);}
});
app.use(express.static(path.join(root,'dist')));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({error:'요청 형식이 올바르지 않습니다.'});});
app.listen(port,'127.0.0.1',()=>console.log(`AFTER HOURS http://127.0.0.1:${port} · provider selectable`));
