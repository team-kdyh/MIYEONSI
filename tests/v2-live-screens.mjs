import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const dir='docs/qa-screenshots/v2-live';await mkdir(dir,{recursive:true});
const browser=await chromium.launch();const observations=[];
try{for(const width of [1440,390])for(const id of [5,17,25,29,32]){
 const evidence=JSON.parse(await readFile(`docs/v2-live-${String(id).padStart(2,'0')}.json`,'utf8'));
 const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({speed:0,reduced:true,muted:true,volume:30})));
 await page.route('**/api/**',route=>route.fulfill({json:evidence.response.state}));
 await page.goto('http://127.0.0.1:3057');await page.getByRole('button',{name:/이어하기/}).click();
 await page.locator('#reply').fill('잠깐 더 이야기해요.');await page.locator('#reply').focus();await page.waitForTimeout(800);
 const layout=await page.evaluate(()=>{const s=document.querySelector('.sprite').getBoundingClientRect(),d=document.querySelector('.dialogue').getBoundingClientRect(),input=document.querySelector('#reply').getBoundingClientRect();return {fits:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,faceAbovePanel:s.top+s.height*.3<d.top,inputVisible:input.bottom<innerHeight,choiceCount:document.querySelectorAll('.choices button').length};});
 if(!layout.fits||!layout.faceAbovePanel||!layout.inputVisible||layout.choiceCount)throw Error(JSON.stringify(layout));
 await page.screenshot({path:`${dir}/receipt-${id}-${width}.png`});
 observations.push({receipt:id,width,layout,source:'Exact captured successful API state replay, no new model call'});
 if(id===29){await page.getByRole('button',{name:'설정',exact:true}).click();await page.screenshot({path:`${dir}/settings-${width}.png`});await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'대화 로그'}).click();await page.screenshot({path:`${dir}/log-${width}.png`});}
 await page.close();
}}finally{await browser.close();}
await writeFile('docs/v2-live-screen-evidence.json',JSON.stringify(observations,null,2));
console.log('10 exact-response replay layouts passed; 14 screenshots captured.');
