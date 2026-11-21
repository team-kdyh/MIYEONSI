// Deliberately absent from npm test. Only the parent's final QA owner executes this.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,open,unlink,readdir,copyFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
if(process.argv[2]!=='--parent-final-qa'||!process.env.OPENAI_API_KEY)throw Error('Parent flag and existing environment key required; no env files are read');
const plan=JSON.parse(await readFile(process.argv[3],'utf8'));
if(!Array.isArray(plan)||!plan.length||plan.some(s=>!Number.isInteger(s.mission)||s.mission<0||s.mission>7||!Array.isArray(s.turns)||!s.turns.length||s.turns.some((t:unknown)=>typeof t!=='string'||!t||t.length>1200)))throw Error('Expected [{mission:0..7,turns:[text,...]}]');
const owner=await open('docs/battle-api-smoke-ledger.json.owner','wx');
let child:ReturnType<typeof spawn>|undefined;
try{
 const dir=resolve('docs/battle-ac5/live',randomUUID());await mkdir(dir,{recursive:true});
 let resumedCookie='';
 if(plan[0].resume){
  if(plan.length!==1||!/^[a-f0-9-]{36}$/.test(plan[0].resume))throw Error('Only an existing isolated QA run can be resumed');
  const source=resolve('docs/battle-ac5/live',plan[0].resume,'data');
  const files=(await readdir(source)).filter(f=>/^[a-f0-9]{48}\.json$/.test(f));
  if(files.length!==1)throw Error('Expected one existing QA profile');
  await mkdir(dir+'/data');await copyFile(source+'/'+files[0],dir+'/data/'+files[0]);
  resumedCookie='afterhours='+files[0].slice(0,-5);
  await writeFile(dir+'/resume.json',JSON.stringify({source,originalFile:files[0],bytePreservingCopy:true}));
 }
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 if(port===3001)throw Error('Preview port prohibited');
 child=spawn(process.execPath,['--import','tsx','tests/battle-live-server.ts'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),AFTERHOURS_DATA_DIR:dir+'/data',AFTERHOURS_SKIP_ENV_FILE:'1',BATTLE_LIVE_OWNER:'parent-final-qa'},stdio:['ignore','pipe','pipe']});
 await Promise.race([once(child.stdout!,'data'),once(child,'exit').then(()=>{throw Error('Isolated server exited');}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),10000).unref())]);
 let cookie=resumedCookie,number=0;
 const call=async(action:string,body?:object)=>{const r=await fetch(`http://127.0.0.1:${port}/api/${action}`,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,data:await r.json()};};
 for(const scenario of plan){
  let before=scenario.resume?await call('state'):await call('new',{mode:'office',mission:scenario.mission});
  if(before.status!==200||before.data.provider!=='openai')throw Error('OpenAI scenario startup failed');
  for(const text of scenario.turns){
   const input={text,step:before.data.game.step,version:before.data.game.dialogue.version,requestId:randomUUID()};
   const receipt:any={kind:'REAL_MODEL_PARENT_QA',before,input};
   try{receipt.response=await call('turn',input);}catch{receipt.delivery='unknown';}
   await writeFile(`${dir}/turn-${++number}.json`,JSON.stringify(receipt,null,2));
   if(receipt.response?.status!==200)throw Error('Stopped on failed/unknown delivery; inspect evidence before continuing');
   before=receipt.response;if(before.data.game.ending)break;
  }
 }
 console.log('Parent QA receipts saved in '+dir);
}finally{
 if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
 await owner.close();await unlink('docs/battle-api-smoke-ledger.json.owner');
}
