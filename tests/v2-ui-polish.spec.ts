import {test,expect,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {start,view,endings,type Mode} from '../server/game';
import {narrative} from '../server/narrative';

const screenshots='docs/qa-screenshots/v2-parent-polish';
function scene(mode:Mode='office',reply='보고서 범위를 이야기해 봅시다.'){
 const game=start(mode);game.narrative=narrative(game);
 return {...view(game),dialogue:{version:0,reply,actionBeats:[mode==='office'?'박도현이 고개를 끄덕인다.':'유나가 고개를 끄덕인다.']}};
}
async function prepare(page:Page){
 await mkdir(screenshots,{recursive:true});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
}
async function imagesReady(page:Page){
 await page.evaluate(async()=>{for(const element of document.querySelectorAll('.title-art,.title-character,.sprite,.stage')){
  const urls=[...getComputedStyle(element).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(match=>match[1]);
  await Promise.all(urls.map(async url=>{const image=new Image();image.src=url;await image.decode();}));
 }});
}

for(const width of [1440,390])test(`polish ${width}: title discovery and next reply returns to its first line`,async({page})=>{
 await page.setViewportSize({width,height:width===1440?900:844});await prepare(page);
 let game:any=null;
 const payload=()=>({game,provider:'openai',slots:[null,null,null],collection:[],endings});
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn'))game.dialogue={version:1,reply:'새 답변의 첫 줄입니다. '.repeat(70),actionBeats:['박도현이 서류를 내려놓는다.']};
  await route.fulfill({json:payload()});
 });
 await page.goto('/');
 const buttons=page.locator('.mode-grid button');await expect(buttons).toHaveCount(2);await expect(buttons.first()).toBeEnabled();
 if(width===390){
  for(const button of await buttons.all())await expect(button).toBeInViewport({ratio:1});
  const title=await page.locator('.title-character').boundingBox();expect(title!.width/title!.height).toBeCloseTo(.75,3);
  await imagesReady(page);await page.screenshot({path:`${screenshots}/title-390.png`});
 }
 game=scene('office','이전 답변의 첫 줄입니다. '.repeat(100));
 await page.reload();await page.getByRole('button',{name:/이어하기/}).click();await imagesReady(page);
 const scroll=page.getByRole('region',{name:'현재 대화'});
 await expect(page.getByRole('navigation',{name:'대사 읽기'})).toBeVisible();
 expect(await scroll.evaluate(element=>element.scrollHeight<=element.clientHeight+1)).toBe(true);
 await scroll.focus();await page.keyboard.press('End');
 await expect(page.getByRole('button',{name:'계속 읽기'})).toBeDisabled();
 await page.locator('#reply').fill('다음 이야기를 들려 주세요.');await page.locator('#reply').press('Enter');
 await expect(page.locator('.text-ink')).toContainText('새 답변의 첫 줄입니다.');
 await expect(page.getByRole('button',{name:'이전 부분'})).toBeDisabled();
 await expect(page.getByRole('navigation',{name:'대사 읽기'})).toBeVisible();
 await expect(page.locator('#reply')).toBeInViewport({ratio:1});
 await page.screenshot({path:`${screenshots}/next-reply-${width}.png`});
});

test('collection keeps a legacy unlock without advertising retired routes or inventing current epilogue',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);
 let game:any=scene('romance'),collection:string[]=[];
 const legacy=endings.office.find(ending=>ending.id.endsWith('-partial'))!;
 const romance=endings.romance.find(ending=>ending.id==='romance-0')!;
 await page.route('**/api/**',route=>route.fulfill({json:{game,provider:'openai',slots:[null,null,null],collection,endings}}));
 const openCollection=async()=>{await page.reload();await page.getByRole('button',{name:'컬렉션',exact:true}).click();};
 await page.goto('/');await page.getByRole('button',{name:'컬렉션',exact:true}).click();
 await expect(page.getByRole('heading',{name:/엔딩 컬렉션/})).toContainText('0 / 20');
 await expect(page.locator('.end-card')).toHaveCount(20);
 await expect(page.getByRole('dialog')).not.toContainText(legacy.title);
 collection=[legacy.id,romance.id];await openCollection();
 await expect(page.getByRole('heading',{name:/엔딩 컬렉션/})).toContainText('2 / 21');
 await expect(page.locator('.end-card')).toHaveCount(21);
 await expect(page.locator('.end-card strong').filter({hasText:legacy.title})).toHaveCount(1);
 const card=page.locator('.end-card').filter({has:page.locator('strong').filter({hasText:romance.title})});
 await expect(card.locator('p')).toHaveText('반복을 멈추고 두 사람의 관계를 다시 정리하는 결말입니다.');
 await expect(card).not.toContainText('A17');await expect(card).not.toContainText('D04');
 await card.scrollIntoViewIfNeeded();await page.screenshot({path:`${screenshots}/collection-legacy-390.png`});
 const actual='어제 함께 만든 파란 리본을 창가에 남겼다.';
 game={...game,ending:romance.id,scene:null,end:{id:romance.id,title:romance.title,text:actual}};await openCollection();
 await expect(card.locator('p')).toHaveText(actual);
 await card.scrollIntoViewIfNeeded();await page.screenshot({path:`${screenshots}/collection-actual-390.png`});
});

test('a controlled thirteen-second reply stays pending and then reaches the player',async({page})=>{
 test.setTimeout(25000);await page.setViewportSize({width:390,height:844});await prepare(page);
 let game:any=scene(),release!:()=>void,requests=0;
 const held=new Promise<void>(resolve=>{release=resolve;});
 const failures:string[]=[];page.on('requestfailed',request=>{if(request.url().endsWith('/turn'))failures.push(request.failure()?.errorText||'failed');});
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){
   requests++;await held;
   game.dialogue={version:1,reply:'오래 기다려 주셨네요. 그 범위라면 오늘 마칠 수 있겠습니다.',actionBeats:['서류를 살핀다.','고개를 끄덕인다.']};
  }
  await route.fulfill({json:{game,provider:'openai',slots:[null,null,null],collection:[],endings}});
 });
 try{
  await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();await imagesReady(page);
  await page.locator('#reply').fill('핵심 세 항목부터 정리하겠습니다.');await page.locator('#reply').press('Enter');
  await expect.poll(()=>requests).toBe(1);
  const started=Date.now();
  // Real controlled delay protects against reintroducing the old 12-second client abort.
  await new Promise(resolve=>setTimeout(resolve,13000));
  await expect(page.locator('.thinking[role=status]')).toContainText('답장을 기다리는 중');
  await expect(page.getByRole('button',{name:'응답 취소',exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#reply')).toHaveValue('핵심 세 항목부터 정리하겠습니다.');
  await page.screenshot({path:`${screenshots}/pending-13s-390.png`});release();
  await expect(page.locator('.text-ink')).toContainText('오래 기다려 주셨네요.');
  expect(Date.now()-started).toBeGreaterThanOrEqual(13000);
  await expect(page.locator('.thinking[role=status]')).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.action-beat')).toHaveText('서류를 살핀다. · 고개를 끄덕인다.');
  await expect(page.locator('#reply')).toHaveValue('');expect(failures).toEqual([]);
  await page.screenshot({path:`${screenshots}/reply-after-13s-390.png`});
 }finally{release();}
});
