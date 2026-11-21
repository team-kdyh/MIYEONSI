import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
// An offline comparison artifact made from actual play screenshots, not a
// synthetic sprite gallery. Full-resolution originals remain separately linked.
const browser=await chromium.launch();
try{
 for(const mode of ['office','romance']){
  const receipt=JSON.parse(await readFile(`docs/v2-ac4-${mode}-390.json`,'utf8'));
  const seen=new Set<string>();const rows=receipt.evidence.filter((e:any)=>{const key=`${e.sheet}:${e.column}`;if(seen.has(key))return false;seen.add(key);return true;});
  const cards=await Promise.all(rows.map(async(e:any)=>`<figure><figcaption>${e.pose} · ${e.label}<br>${e.sheet} column ${e.column}</figcaption><img src="data:image/png;base64,${(await readFile(e.screenshot)).toString('base64')}"/></figure>`));
  const html=`<!doctype html><meta charset="utf-8"><title>AC4 ${mode} comparison</title><style>body{margin:0;background:#11101a;color:#fff;font:13px sans-serif}h1,p{margin:14px}main{display:grid;grid-template-columns:repeat(4,260px);gap:8px}figure{margin:0}figcaption{height:54px;font-size:11px;padding:6px}img{width:260px;display:block}</style><h1>${mode}: 12 distinct illustrated states</h1><p>Actual 390×844 play captures. Mock dialogue through real reconciliation. No additional live API calls.</p><main>${cards.join('')}</main>`;
  await writeFile(`docs/v2-ac4-${mode}-comparison.html`,html);
  const page=await browser.newPage({viewport:{width:1064,height:900}});await page.setContent(html);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:`docs/qa-screenshots/v2-ac4-recheck/${mode}-comparison.png`,fullPage:true});await page.close();
 }
}finally{await browser.close();}
