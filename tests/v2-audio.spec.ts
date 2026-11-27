import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {start,view,endings} from '../server/game';
import {narrative,reconcile,type EventProposal,type NarrativeReply} from '../server/narrative';
import {moods} from '../server/narrative';
import {musicAsset} from '../src/music';

test('all eight shipped compositions decode, match provenance and have non-silent distinct waveforms',async({page})=>{
 await page.goto('/');
 const manifest=JSON.parse(await readFile('public/assets/audio-v2/manifest.json','utf8'));
 expect(manifest.tracks.map((t:any)=>t.id).sort()).toEqual([...moods].sort());
 const rows=[];
 for(const track of manifest.tracks){
  expect(createHash('sha256').update(await readFile(`public/assets/audio-v2/${track.file}`)).digest('hex')).toBe(track.sha256);
  const result=await page.evaluate(async(id)=>{
   const ctx=new AudioContext();const buffer=await ctx.decodeAudioData(await (await fetch(`/assets/audio-v2/${id}.ogg`)).arrayBuffer());
   const data=buffer.getChannelData(0);let peak=0,sum=0;const blocks=[];
   for(let b=0;b<64;b++){let square=0;const from=Math.floor(b*data.length/64),to=Math.floor((b+1)*data.length/64);for(let i=from;i<to;i++){peak=Math.max(peak,Math.abs(data[i]));square+=data[i]*data[i];}sum+=square;blocks.push(Math.sqrt(square/(to-from)));}
   await ctx.close();return {duration:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,peak,rms:Math.sqrt(sum/data.length),blocks};
  },track.id);
  expect(result.duration).toBeGreaterThanOrEqual(48);expect(result.peak).toBeLessThan(1);expect(result.rms).toBeGreaterThan(.01);expect(result.channels).toBe(2);
  rows.push({id:track.id,sha256:track.sha256,bpm:track.bpm,meter:track.meter,instruments:track.instruments,composition:track.composition,...result});
 }
 expect(new Set(rows.map(r=>r.sha256)).size).toBe(8);
 await writeFile('docs/v2-audio-waveforms.json',JSON.stringify({scope:'Chromium decoded shipped OGG; not human listening approval',tracks:rows},null,2));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" viewBox="0 0 1000 760"><rect width="1000" height="760" fill="#111827"/><text x="24" y="30" fill="white" font-size="20">AFTER HOURS — decoded RMS envelopes (64 blocks per track)</text>${rows.map((r,j)=>`<text x="24" y="${70+j*85}" fill="white" font-size="16">${r.id} · ${r.duration.toFixed(2)}s · ${r.bpm} BPM · ${r.meter}</text>${r.blocks.map((v:number,i:number)=>`<rect x="${24+i*14.7}" y="${112+j*85-v*220}" width="12" height="${v*220}" fill="#c4b5fd"/>`).join('')}`).join('')}</svg>`;
 await writeFile('docs/v2-audio-waveforms.svg',svg);
});

test('all five new office selections load distinct stereo music with audible headroom',async({page})=>{
 await page.goto('/');
 const files=(['office-groove','office-pressure','office-deadline','office-homebound','office-reflection'] as const).map(musicAsset);
 expect(new Set(files).size).toBe(5);
 for(const file of files){
  const stats=await page.evaluate(async url=>{
   const ctx=new AudioContext();
   try{
    const asset=await fetch(url);if(!asset.ok)throw Error(url);
    const audio=await ctx.decodeAudioData(await asset.arrayBuffer()),samples=audio.getChannelData(0);
    let sum=0,peak=0;for(const s of samples){sum+=s*s;peak=Math.max(peak,Math.abs(s));}
    return {seconds:audio.duration,channels:audio.numberOfChannels,rms:Math.sqrt(sum/samples.length),peak};
   }finally{await ctx.close();}
  },file);
  expect(stats.seconds).toBeGreaterThan(28);expect(stats.channels).toBe(2);expect(stats.rms).toBeGreaterThan(.07);expect(stats.peak).toBeLessThan(1);
 }
});

for(const mode of ['office','romance'] as const)test(`${mode}: normal validated conversation path with real playback and crossfades`,async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>{if(!localStorage.getItem('afterhours-settings'))localStorage.setItem('afterhours-settings',JSON.stringify({volume:35,speed:0}));});
 let game=start(mode);game.narrative=narrative(game);let version=0;let reply='잠깐 이야기해요.';
 const event=(kind:EventProposal['kind'],value:string,subject:EventProposal['subject']='mutual',status:EventProposal['status']='accepted'):EventProposal=>({kind,value,subject,status,text:`${value}에 관한 대화 ${version}`,evidence:'',reference:''});
 const steps: {text:string;music:NarrativeReply['musicMood'];events:EventProposal[];line:string}[]=mode==='office'?[
  {text:'보고서도 퇴근하고 싶대요.',music:'office-groove',events:[],line:'보고서 연차는 제 결재로 안 됩니다. 커피 휴가는 가능하죠.'},
  {text:'오늘 수치 대신 내일 검증한 요약을 보내면 어때요?',music:'office-pressure',events:[event('complication','deadline','npc','offered')],line:'고객은 오늘 기다립니다. 오늘 보낼 범위를 조금만 더 정해 봅시다.'},
 ]:[
  {text:'어떤 소리를 좋아하세요?',music:'cafe-warmth',events:[],line:'찻잔 내려놓는 소리요. 가끔 마지막 음이 삐끗해서 좋아요.'},
  {text:'저는 빗소리도 좋아해요.',music:'cafe-warmth',events:[],line:'창문 가까운 자리가 좋겠네요.'},
  {text:'다음에도 이야기해요.',music:'cafe-warmth',events:[event('relationship','familiar','npc')],line:'또 들려주세요. 조용한 이야기도요.'},
  {text:'좋아하는 향도 궁금해요.',music:'cafe-warmth',events:[],line:'시나몬이요. 겨울을 조금 먼저 꺼내는 향 같아요.'},
  {text:'같이 있으면 즐거워요.',music:'cafe-warmth',events:[event('relationship','attracted','npc')],line:'저도 자꾸 시계를 늦게 보게 돼요.'},
  {text:'유나는 어떤 마음이에요?',music:'rooftop-heart',events:[event('relationship','confessed','npc')],line:'좋아해요. 이 말은 편집하지 않을래요.'},
  {text:'좋아요. 우리 사귀어요. 옥상으로 함께 가요.',music:'rooftop-heart',events:[event('relationship','couple'),event('move','rooftop')],line:'오늘 바람 소리를 오래 기억할 것 같아요.'},
  {text:'좋아요. 오늘 함께 데이트해요.',music:'rooftop-heart',events:[event('relationship','date')],line:'뜨거운 차를 챙길게요. 옥상은 생각보다 춥더라고요.'},
  {text:'좋아요. 함께 차를 마시며 옥상 바람 소리를 들어요.',music:'rooftop-heart',events:[event('relationship','date','mutual','fulfilled')],line:'저도 차를 마셨어요. 오늘 바람은 찻잔에서도 울리네요.'},
  {text:'좋아요. 비 내리는 거리로 함께 가요.',music:'rainy-memory',events:[event('move','rainstreet')],line:'그날도 이렇게 비가 왔어요. 잊은 줄 알았는데.'},
  {text:'좋아요. 보관실로 함께 가요.',music:'archive-unease',events:[event('move','archive')],line:'테이프 끝에 빈 소리가 있어요. 원래는 없었는데.'},
  {text:'녹음의 삭제된 부분을 확인해 주세요.',music:'archive-pursuit',events:[event('clue','edited-gap','npc','fulfilled')],line:'여기, 제가 지운 부분이에요. 이제 숨기지 않을게요.'},
  {text:'좋아요. 기록을 두고 관계를 다시 시작해요.',music:'resolution-dawn',events:[event('resolution','reset','player')],line:'처음부터 들을까요. 이번에는 멈추고 싶으면 말해 주세요.'},
 ];
 const payload=()=>({game:{...view(game),dialogue:{version,reply,actionBeats:[]}},provider:'offline',slots:[null,null,null],collection:[],endings});
 const records:any[]=[];
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){
   const step=steps[version],text=route.request().postDataJSON().text;expect(text).toBe(step.text);
   const completesDate=step.events.some(e=>e.kind==='relationship'&&e.value==='date'&&e.status==='fulfilled');
   if(completesDate){expect(game.narrative!.dates).toBe(0);expect(game.narrative!.activeDate).toBeDefined();}
   const result=reconcile(game,text,{line:step.line,actionBeats:completesDate?['유나가 차를 한 모금 마시며 바람 소리에 귀를 기울인다.']:[],pose:'listen',emotion:'대화',musicMood:step.music,recall:[],conjecture:'',events:step.events.map(e=>({...e,reference:completesDate?game.narrative!.activeDate!.eventId:e.reference,evidence:e.subject==='mutual'||e.subject==='player'?text:''}))});
   if(completesDate){expect(result.game.narrative!.dates).toBe(1);expect(result.game.narrative!.activeDate).toBeUndefined();}
   game=result.game;game.log.push({speaker:mode==='office'?'박도현':'서유나',text:step.line});reply=step.line;version++;records.push({text,reply,music:game.narrative!.musicMood,location:game.narrative!.location,relationship:game.narrative!.relationship,accepted:result.accepted,ending:game.ending});
  }
  await route.fulfill({json:payload()});
 });
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const audio=()=>page.locator('audio[data-track]');
 let last=mode==='office'?'office-groove':'cafe-warmth';
 await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.some(n=>!n.paused&&n.currentTime>0))).toBe(true);
 const transitions:any[]=[];
 for(const step of steps){
  await page.locator('#reply').fill(step.text);await page.locator('#reply').press('Enter');await expect(page.locator('.text-ink')).toHaveText(step.line);
  if(step.music===last)continue;
  await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.filter(n=>!n.paused&&n.volume>.02&&n.volume<.33).length),{timeout:12000,intervals:[80]}).toBe(2);
  const overlap=await audio().evaluateAll((ns:HTMLAudioElement[])=>ns.map(n=>({id:n.dataset.track,time:n.currentTime,volume:n.volume,paused:n.paused})));
  await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.filter(n=>!n.paused&&n.volume>=.349).map(n=>n.dataset.track)),{timeout:4000}).toEqual([step.music]);
  transitions.push({from:last,to:step.music,overlap});last=step.music;
 }
 expect(transitions).toHaveLength(mode==='office'?1:5);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('checkbox',{name:'음소거'}).check();
 expect(await audio().evaluateAll((ns:HTMLAudioElement[])=>ns.every(n=>n.muted&&n.paused))).toBe(true);
 await page.getByRole('slider',{name:'음량'}).fill('17');await page.getByRole('checkbox',{name:'음소거'}).uncheck();
 await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.some(n=>!n.paused&&Math.abs(n.volume-.17)<.001))).toBe(true);
 await page.reload();await page.getByRole('button',{name:/이어하기/}).click();await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByRole('slider',{name:'음량'})).toHaveValue('17');
 expect(errors).toEqual([]);
 await writeFile(`docs/v2-audio-${mode}-path.json`,JSON.stringify({scope:'Mock model replies, real reconcile, UI and media playback. No paid API. No direct state injection or music-only UI control.',transitions,records,errors},null,2));
});



test('autoplay rejection shows a visible gesture retry and recovers real playback',async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLMediaElement.prototype.play;let rejected=false;
  HTMLMediaElement.prototype.play=function(){if(/\/assets\/(?:audio-v2|office-score)\//.test(this.src)&&!rejected){rejected=true;return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}return original.call(this);};
 });
 const g=start('office');g.narrative=narrative(g);
 await page.route('**/api/**',route=>route.fulfill({json:{game:{...view(g),dialogue:{version:0,reply:'잠깐 이야기합시다.'}},provider:'offline',slots:[null,null,null],collection:[],endings}}));
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 const retry=page.getByRole('button',{name:'배경음 재생',exact:true});await expect(retry).toBeVisible();await retry.click();await expect(retry).toHaveCount(0);
 await expect.poll(()=>page.getByTestId('music').evaluate((n:HTMLAudioElement)=>!n.paused&&n.currentTime>0)).toBe(true);
});
