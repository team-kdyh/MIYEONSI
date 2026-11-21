import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {start,view,endings} from '../server/game';
import {commitDialogue,type DialogueGame} from '../server/dialogue';
import type {NarrativeReply} from '../server/narrative';

// Authored NPC outputs through normal successive commits; no live model or private save.
for(const width of [1440,390])test(`prop withdrawal ${width}: a declined offer disappears and a renewed offer returns`,async({page})=>{
 await page.setViewportSize({width,height:width===1440?900:844});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
 const folder=process.env.AFTERHOURS_PROP_EVIDENCE??'docs/qa-screenshots/v2-prop-withdrawal';await mkdir(folder,{recursive:true});
 let game:DialogueGame=start('romance'),index=0;
 const cases=[
  {text:'어떤 소리를 녹음했어요?',line:'카페 문에 달린 종이요. 한번 들어 볼래요?',beat:'유나가 헤드폰 한쪽을 내민다.',pose:'offer',expected:'offer'},
  {text:'지금은 헤드폰 안 쓸래요. 그냥 이야기해요.',line:'좋아요. 그럼 잠깐 넣어 둘게요.',beat:'유나가 헤드폰을 가방에 넣고 고개를 끄덕인다.',pose:'offer',expected:'smile'},
  {text:'아, 그 종소리는 궁금하네요. 다시 들려줄래요?',line:'그럼요. 아까 마지막에 바람 소리도 들어갔어요.',beat:'유나가 헤드폰을 꺼내 한쪽을 다시 내민다.',pose:'offer',expected:'offer'},
  {text:'그 테이프는 뭐예요?',line:'예전에 녹음한 골목 소리예요. 잠깐 볼래요?',beat:'유나가 테이프를 손바닥에 올려 내민다.',pose:'farewell',expected:'farewell'},
  {text:'테이프는 괜찮아요. 가방에 넣어 둬요.',line:'알겠어요. 잃어버리기 전에 넣어 둬야겠네요.',beat:'유나가 테이프를 가방에 넣고 손을 내려놓는다.',pose:'farewell',expected:'neutral'},
 ];
 const trace:unknown[]=[];
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){
   const c=cases[index++],text=route.request().postDataJSON().text;expect(text).toBe(c.text);
   const response:NarrativeReply={line:c.line,actionBeats:[c.beat],pose:c.pose as NarrativeReply['pose'],emotion:'차분함',musicMood:'cafe-warmth',recall:[],conjecture:'',events:[]};
   const before=structuredClone(game);game=commitDialogue(game,null,text,response);trace.push({text,response,before,after:game});
  }
  await route.fulfill({json:{game:view(game),provider:'offline',slots:[null,null,null],collection:[],endings}});
 });
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 const actual:string[]=[];
 for(const [i,c] of cases.entries()){
  await page.locator('#reply').fill(c.text);await page.locator('#reply').press('Enter');
  await expect(page.locator('.action-beat')).toHaveText(c.beat);
  await page.evaluate(async()=>{for(const e of document.querySelectorAll('.stage,.sprite')){const url=getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];if(url){const image=new Image();image.src=url;await image.decode();}}});
  actual.push(await page.locator('.sprite').getAttribute('data-pose')??'missing');
  await expect(page.locator('#reply')).toBeInViewport({ratio:1});await page.screenshot({path:`${folder}/${width}-${i+1}.png`});
 }
 await writeFile(`${folder}/${width}.json`,JSON.stringify({scope:'Authored mock NPC dialogue; normal commitDialogue; no paid requests; logical viewport, no physical mobile keyboard.',width,expected:cases.map(c=>c.expected),actual,trace},null,2));
 expect(actual).toEqual(cases.map(c=>c.expected));
});
