import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const files=['public/assets/boss-expressions.png','public/assets/v2/boss-actions-a.png','public/assets/v2/boss-actions-b.png','public/assets/yuna-expressions.png','public/assets/v2/yuna-actions-a.png','public/assets/v2/yuna-actions-b.png'];
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:600}});
 const observations=[];
 for(const [i,file] of files.entries()){
  const image=(await readFile(file)).toString('base64');
  await page.setContent(`<body style="margin:0;background:#191523"><img style="display:block;width:1440px;height:auto" src="data:image/png;base64,${image}"></body>`);
  await page.locator('img').evaluate(img=>img.decode());
  const capture=`docs/v2-revision-parent-review/sprite-alpha-${i+1}.png`;
  await page.screenshot({path:capture});
  observations.push({file,capture,scope:'Browser opaque compositing of the original sheet on a dark solid background; no source editing'});
 }
 await writeFile('docs/v2-revision-parent-review/sprite-alpha-index.json',JSON.stringify(observations,null,2));
}finally{await browser.close();}
