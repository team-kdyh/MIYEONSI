// Authored regression transport only. No request is allowed to reach a network.
import {readFile} from 'node:fs/promises';
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')throw Error('Unexpected external URL in commitment fixture');
 if(await readFile(process.env.COMMITMENT_FAILURE,'utf8')==='timeout')return new Promise((resolve,reject)=>{
  const abort=()=>reject(options.signal.reason??Error('aborted'));
  if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});
 });
 const request=JSON.parse(options.body),text=request.input.at(-1).content;
 const context=request.input.find(v=>v.role==='developer'&&v.content.startsWith('{'));
 const story=JSON.parse(context.content).story,c=story.commitments?.[0];
 const original='제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.';
 const offer={kind:'promise',subject:'player',text:original,status:'offered',reference:'',evidence:original,value:'keepsake'};
 const reply={line:'좋아요.',actionBeats:[],emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',events:[],recall:[],conjecture:'',commitmentOffers:[],commitmentProgress:[],commitmentAmendments:[],commitmentRevisions:[]};
 if(text===original){reply.events=[offer];reply.commitmentOffers=[{eventIndex:0,conditions:[{performer:'player',target:'유나',action:'노란 리본을 가져오고'},{performer:'player',target:'유나',action:'편지를 접는'}]}];}
 else if(text==='좋아요.')reply.events=[{...offer,status:'accepted',reference:c.promiseId,evidence:text}];
 else if(text.includes('바꾸는 데 동의해요')){
  reply.line=`좋아요. ${text}`;
  reply.commitmentRevisions=[{promiseId:c.promiseId,conditionId:c.conditions[1].id,expectedVersion:1+c.amendments.length+(c.revisions?.length??0),replacement:{performer:'player',target:'유나',action:'그림을 그리는'},playerQuote:text,npcQuote:reply.line}];
 }else{
  const index=text.includes('리본')?0:1,condition=c.conditions[index];
  reply.commitmentProgress=[{promiseId:c.promiseId,conditionId:condition.id,performer:condition.performer,source:'player',quote:text,eventId:'',actionIndex:-1}];
  if(index===1)reply.events=[{...offer,status:'fulfilled',reference:c.promiseId,evidence:text}];
 }
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(reply)}]}]});
};
