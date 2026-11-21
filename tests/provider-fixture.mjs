// Loaded only by the isolated AC7 test child. No production endpoint or mock fallback.
import {readFile} from 'node:fs/promises';
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return original(url,options);
 const mode=(await readFile(process.env.AC7_FIXTURE,'utf8')).trim();
 if(mode==='429')return new Response('',{status:429});
 if(mode==='timeout')return new Promise((_resolve,reject)=>{
  const abort=()=>reject(new DOMException('Aborted','AbortError'));
  if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});
 });
 const reply=mode==='schema'?{line:'잘못된 응답',recall:['forged-fact'],conjecture:'',ending:'romance-3'}:{line:'말씀을 들었습니다. 지금 조건을 확인하겠습니다.',recall:[],conjecture:'',actionBeats:['박도현이 서류를 살핀다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',events:[]};
 if(mode==='event')reply.events=[{kind:'move',subject:'mutual',status:'accepted',value:'rooftop',text:'옥상으로 함께 이동했다.',evidence:'없는 인용문',reference:''}];
 if(mode==='commitment'){reply.events=[{kind:'promise',subject:'npc',status:'offered',value:'tea',text:'유나는 차를 가져온다.',evidence:'',reference:''}];reply.commitmentOffers=[{eventIndex:0,conditions:[{performer:'npc',target:'player',action:'없는 행동'}]}];}
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(reply)}]}]});
};
