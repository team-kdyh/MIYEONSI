import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const requests=[],errors=[];
 page.on('request',r=>requests.push({method:r.method(),origin:new URL(r.url()).origin,path:new URL(r.url()).pathname}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3001/');
 await page.getByRole('button',{name:/칼퇴의 기술/}).waitFor({state:'visible'});
 await page.waitForLoadState('networkidle');
 await page.screenshot({path:'docs/v2-revision-parent-review/title.png'});
 await page.getByRole('button',{name:/너의 목소리를 빌려줘/}).click();
 await page.getByRole('button',{name:'이야기 시작'}).click();
 await page.locator('#reply').waitFor({state:'visible'});
 await page.waitForLoadState('networkidle');
 const finish=page.getByRole('button',{name:'대사 바로 표시'});
 if(await finish.isVisible())await finish.click();
 await page.locator('.sprite').evaluate(async el=>{const src=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(src){const img=new Image();img.src=src;await img.decode();}});
 await page.locator('.sprite-entry').evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished));});
 await page.screenshot({path:'docs/v2-revision-parent-review/romance-start.png'});
 const summary=await page.evaluate(()=>({title:document.title,providerLabel:document.querySelector('.provider-footer')?.textContent??document.querySelector('footer')?.textContent??'',inputVisible:!!document.querySelector('#reply'),choices:document.querySelectorAll('.choices button').length}));
 if(errors.length||requests.some(r=>r.origin!=='http://127.0.0.1:3001')||requests.some(r=>r.path.endsWith('/turn')))throw Error('Unexpected errors/external request/model turn during passive install check');
 await writeFile('docs/v2-revision-parent-review/page.json',JSON.stringify({at:new Date().toISOString(),scope:'Original integrated server and built frontend; existing server credential stays private; no API route mocks; no dialogue turn sent',summary,errors,requests},null,2));
 console.log(JSON.stringify({rendered:true,consoleErrors:errors.length,dialogueTurns:0}));
}finally{await browser.close();}

