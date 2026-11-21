import {chromium} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:3001',rows=[];
try{
 for(const mode of ['office','romance']){
  const context=await browser.newContext({viewport:{width:1440,height:623}}),page=await context.newPage(),requests=[],errors=[];
  page.on('request',r=>requests.push({method:r.method(),origin:new URL(r.url()).origin,path:new URL(r.url()).pathname}));page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
  const response=await page.goto(origin);if(response.status()!==200)throw Error('Local page unavailable');
  if(await response.text()!==await readFile('dist/index.html','utf8'))throw Error('Served HTML differs from build');
  await page.getByRole('button',{name:mode==='office'?/칼퇴의 기술/:/너의 목소리를 빌려줘/}).click();await page.getByRole('button',{name:'이야기 시작'}).click();
  await page.getByRole('complementary',{name:'현재 이야기'}).waitFor();await page.waitForLoadState('networkidle');
  const data=await page.evaluate(()=>({guide:document.querySelector('.story-guide').textContent,reply:document.querySelector('.text-ink').textContent,choices:document.querySelectorAll('.choices').length,inputBottom:document.querySelector('#reply').getBoundingClientRect().bottom,height:innerHeight,bodyFits:document.documentElement.scrollHeight<=innerHeight,js:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  if(data.choices||!data.bodyFits||data.inputBottom>data.height||errors.length||requests.some(r=>r.origin!==origin||r.path==='/api/turn'))throw Error('Runtime rendering check failed');
  await page.screenshot({path:`docs/reading-review/screenshots/runtime-${mode}.png`});rows.push({mode,...data,errors,requests});await context.close();
 }
 const files=['src/main.tsx','src/ConversationViewport.tsx','src/style.css','server/provider.ts','server/story-guide.ts','server/index.ts','server/reply-error.ts','dist/index.html'];
 const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
 await writeFile('docs/reading-review/runtime.json',JSON.stringify({at:new Date().toISOString(),scope:'Actual launcher server and compiled frontend; isolated fresh browser contexts; no mocked routes, no dialogue turn, no paid call; existing player cookies/saves untouched',hashes,rows},null,2));
 console.log(JSON.stringify({runtime:'pass',modes:2,paidCalls:0}));
}finally{await browser.close();}
