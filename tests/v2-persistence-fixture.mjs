// Isolated persistence transport: no network and no production fallback.
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return nativeFetch(url,options);
 const request=JSON.parse(options.body),text=request.input.at(-1).content;
 const event=(kind,value,subject='player',status='accepted')=>({kind,value,subject,status,text,evidence:text,reference:''});
 const events=text==='저는 지호입니다.'?[event('detail','name'),event('promise','paper-boat','npc','offered')]:text==='사귀고 싶지 않아요.'?[event('relationship','apart')]:text==='관계를 여기서 끝낼게요.'?[event('resolution','leave')]:[];
 return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({line:'말씀을 기억할게요.',actionBeats:['유나가 컵을 내려놓는다.'],emotion:'차분',pose:'listen',musicMood:'cafe-warmth',events,recall:[],conjecture:''})}]}]});
};
