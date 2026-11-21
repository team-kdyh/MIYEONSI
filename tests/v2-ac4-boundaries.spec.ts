import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {start,view,endings,type Game} from '../server/game';
import {reconcile,narrative,type EventProposal,type NarrativeReply} from '../server/narrative';
import {backgroundAsset,actorPoses,presentationPose} from '../src/visualAssets';

const event=(extra:Partial<EventProposal>):EventProposal=>({kind:'relationship',subject:'npc',status:'fulfilled',text:'유나가 마음을 말한다.',reference:'',evidence:'',value:'',...extra});
const response=(pose:NarrativeReply['pose'],events:EventProposal[]=[],line='조금 더 이야기해요.'):NarrativeReply=>({line,pose,events,actionBeats:[`유나가 ${actorPoses.romance[pose].label}.`],emotion:'차분함',musicMood:'cafe-warmth',recall:[],conjecture:''});

for(const width of [1440,390])for(const reduced of [false,true])test(`agency visuals ${width} reduced=${reduced}`,async({page})=>{
 const dir='docs/qa-screenshots/v2-ac4-boundaries';await mkdir(dir,{recursive:true});
 await page.setViewportSize({width,height:width===1440?900:844});
 await page.addInitScript(reduced=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced})),reduced);
 let g:Game=start('romance');g.narrative=narrative(g);
 let current=response('neutral'),next=current;
 const payload=()=>({game:{...view(g),dialogue:{version:g.narrative!.turn,reply:current.line,actionBeats:current.actionBeats}},provider:'offline',slots:[null,null,null],collection:[],endings});
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){g=reconcile(g,route.request().postDataJSON().text,next).game;current=next;}
  await route.fulfill({json:payload()});
 });
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 const trace:any[]=[];
 async function turn(id:string,text:string,r:NarrativeReply,location:string,relationship:string,dates=0){
  const before=structuredClone(g.narrative);next=r;
  await page.locator('#reply').fill(text);await page.locator('#reply').press('Enter');
  await expect(page.locator('.action-beat')).toHaveText(r.actionBeats.join(' '));
  await expect(page.locator('.sprite')).toHaveAttribute('data-pose',r.pose);
  await expect(page.locator('.stage')).toHaveCSS('background-image',`url("${new URL(backgroundAsset(location),page.url()).href}")`);
  expect(g.narrative!.location).toBe(location);expect(g.narrative!.relationship).toBe(relationship);expect(g.narrative!.dates).toBe(dates);
  if(reduced){await expect(page.locator('.sprite-entry')).toHaveCSS('animation-name','none');await expect(page.locator('.background-arrival')).toHaveCSS('display','none');}
  else {await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');await expect(page.locator('.sprite-entry')).toHaveCSS('animation-iteration-count','1');}
  const screenshot=`${dir}/${width}-${reduced?'reduced':'motion'}-${id}.png`;
  await page.screenshot({path:screenshot});trace.push({id,input:text,response:r,before,after:structuredClone(g.narrative),screenshot});
 }
 await turn('move-offered','바람 소리를 듣고 싶어요.',response('offer',[event({kind:'invitation',status:'offered',value:'rooftop',text:'유나가 옥상에서 바람 소리를 듣자고 제안한다.'})],'옥상에서 들어 볼까요?'),'cafe','strangers');
 const offered=g.narrative!.events.find(e=>e.kind==='invitation')!.id;
 await turn('move-refused','옥상에는 안 갈래요.',response('listen',[event({kind:'invitation',subject:'player',status:'refused',reference:offered,value:'rooftop',evidence:'옥상에는 안 갈래요.',text:'플레이어가 옥상 초대를 거절했다.'})],'그럼 여기서 들어요.'),'cafe','strangers');
 await turn('move-accepted','지금 옥상으로 가요.',response('smile',[event({kind:'move',subject:'mutual',status:'accepted',value:'rooftop',evidence:'지금 옥상으로 가요.',text:'두 사람이 옥상으로 이동한다.'})]),'rooftop','strangers');
 await turn('familiar','대화가 편해졌어요.',response('laugh',[event({value:'familiar'})]),'rooftop','familiar');
 await turn('attracted','당신 이야기를 더 듣고 싶어요.',response('shy',[event({value:'attracted'})]),'rooftop','attracted');
 await turn('confessed','어떤 마음이에요?',response('thinking',[event({value:'confessed',text:'유나가 좋아한다고 고백한다.'})],'저는 당신을 좋아해요.'),'rooftop','confessed');
 await turn('couple-offered','생각할 시간이 필요해요.',response('listen',[event({status:'offered',value:'couple',text:'유나가 연인이 되고 싶다는 마음을 전하고 답을 기다린다.'})]),'rooftop','confessed');
 await turn('couple-refused','지금은 사귀지 않을래요.',response('concern',[event({subject:'player',status:'refused',value:'couple',evidence:'지금은 사귀지 않을래요.',text:'플레이어가 지금 연인이 되는 것을 거절했다.'})]),'rooftop','confessed');
 await turn('couple-accepted','이제 저도 좋아해요. 우리 사귀어요.',response('smile',[event({subject:'mutual',status:'accepted',value:'couple',evidence:'우리 사귀어요.',text:'두 사람이 연인이 되기로 합의했다.'})]),'rooftop','couple');
 await turn('date-offered','데이트는 어떻게 할까요?',response('offer',[event({status:'offered',value:'date',text:'유나가 다음 주 빗길 데이트를 제안한다.'})]),'rooftop','couple');
 await turn('date-refused','다음 주 데이트는 하지 않을래요.',response('listen',[event({subject:'player',status:'refused',value:'date',evidence:'다음 주 데이트는 하지 않을래요.',text:'플레이어가 다음 주 데이트를 거절했다.'})]),'rooftop','couple');
 await turn('date-future-accepted','내일 같이 데이트해요.',response('smile',[event({subject:'mutual',status:'accepted',value:'date',evidence:'내일 같이 데이트해요.',text:'내일 데이트하기로 약속했다.'})]),'rooftop','couple');
 expect(g.narrative!.activeDate).toBeUndefined();
 await turn('date-started','오늘 여기서 같이 데이트해요.',response('laugh',[event({subject:'mutual',status:'accepted',value:'date',evidence:'오늘 여기서 같이 데이트해요.',text:'옥상에서 데이트를 시작했다.'})]),'rooftop','couple');
 const dateId=g.narrative!.activeDate!.eventId;
 await turn('date-participated','지금 같이 종이배를 접고 있어요.',{...response('smile',[event({subject:'mutual',status:'fulfilled',reference:dateId,value:'date',evidence:'지금 같이 종이배를 접고 있어요.',text:'옥상 데이트에서 종이배를 함께 접었다.'})]),actionBeats:['유나가 종이배를 나란히 놓는다.']},'rooftop','couple',1);
 await writeFile(`docs/v2-ac4-boundaries-${width}-${reduced}.json`,JSON.stringify({scope:'Deterministic model fixture through real reconcile and browser; not live OpenAI',trace},null,2));
});

for(const width of [1440,390])test(`captured real replies use committed visuals ${width}`,async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width,height:width===1440?900:844});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
 const trace=[];
 let state:any;
 await page.route('**/api/**',route=>route.fulfill({json:state}));
 for(const id of [4,5,6,12,26,28,29,32]){
  const receipt=JSON.parse(await readFile(`docs/v2-live-${String(id).padStart(2,'0')}.json`,'utf8'));
  state=receipt.response.state;
  await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
  const g=state.game,pose=presentationPose(g.mode,g.narrative.pose,g.dialogue.actionBeats);
  await expect(page.locator('.sprite')).toHaveAttribute('data-pose',pose);
  await expect(page.locator('.action-beat')).toHaveText(g.dialogue.actionBeats.join(' · '));
  await expect(page.locator('.stage')).toHaveCSS('background-image',`url("${new URL(backgroundAsset(g.narrative.location),page.url()).href}")`);
  const screenshot=`docs/qa-screenshots/v2-ac4-boundaries/receipt-${id}-${width}.png`;
  await page.screenshot({path:screenshot});
  trace.push({receipt:id,source:`docs/v2-live-${String(id).padStart(2,'0')}.json`,mode:g.mode,requestedPose:g.narrative.pose,renderedPose:pose,location:g.narrative.location,actionBeats:g.dialogue.actionBeats,screenshot});
 }
 await writeFile(`docs/v2-ac4-captured-${width}.json`,JSON.stringify({scope:'Exact historical real response state rendered with current UI. No fresh generation.',trace},null,2));
});
