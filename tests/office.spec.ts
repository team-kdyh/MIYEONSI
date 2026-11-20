import {test,expect} from '@playwright/test';
import {missions} from '../server/office';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('24 mission outcomes through public API, with semantic repetition and new persuasion',async({request})=>{
 const evidence:unknown[]=[];
 await request.get('/api/state');
 for(const [index,m] of missions.entries())for(const outcome of ['success','partial','failure']){
  let state=await (await request.post('/api/new',{data:{mode:'office',mission:index}})).json();
  const initial=structuredClone(state.game),turns:unknown[]=[];
  const turn=async(text:string)=>{
   const before=structuredClone(state.game.office.secured);
   const response=await request.post('/api/turn',{data:{choice:null,text,step:state.game.step,version:state.game.dialogue.version,requestId:crypto.randomUUID()}});
   expect(response.status(),`${m.id}/${outcome}: ${await response.text()}`).toBe(200);state=await response.json();
   turns.push({input:text,before,after:state.game.office.secured,events:state.game.dialogue.facts,evidence:state.game.office.evidence.at(-1),version:state.game.dialogue.version});
  };
  if(outcome==='success'){
   await turn(m.terms[0].arguments[0].sample);
   const secured=structuredClone(state.game.office.secured);
   await turn(m.terms[0].arguments[0].paraphrase);expect(state.game.office.secured).toEqual(secured);expect(state.game.office.evidence.at(-1).valid).toBe(false);
   await turn(m.terms[1].arguments[0].paraphrase);
  }else if(outcome==='partial'){
   for(const t of m.terms)await turn(t.offer.sample);await turn('협상 마무리');
  }else for(let i=0;i<m.limit;i++)await turn('잘 부탁드립니다. 정말 감사합니다.');
  expect(state.game.office.outcome).toBe(outcome);
  expect(state.game.ending).toBe(`office-${m.id}-${outcome}`);
  expect(state.game.end.text).toContain('설득 과정');expect(state.game.end.text).toContain('다시 도전');
  for(const t of m.terms)expect(state.game.office.secured[t.id]).toBe(outcome==='success'?t.required:outcome==='partial'?t.compromise:undefined);
  evidence.push({criterion:2,mission:m.id,claim:`${outcome} through validated public HTTP input`,provider:'offline',initial,allowedInputPath:'POST /api/new then POST /api/turn, choice=null',turns,final:state.game.office,result:'pass'});
 }
 const files=['server/office.ts','server/game.ts','server/dialogue.ts','server/index.ts','src/main.tsx','src/OfficeAgreement.tsx','tests/office.spec.ts'];
 const codeVersion=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 await writeFile('docs/ac2-api-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),codeVersion,paidApiCalls:0,scope:'24 offline HTTP routes; not a live OpenAI evaluation',evidence},null,2));
});

test('mission picker, free-text agreements, ending feedback and retry on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:/칼퇴의 기술/}).click();
 await expect(page.locator('#office-mission option')).toHaveCount(8);
 await page.locator('#office-mission').selectOption('3');
 await expect(page.getByRole('dialog')).toContainText('8월 12–14일 승인');
 await page.getByRole('button',{name:'이야기 시작'}).click();
 await expect(page.locator('.scene-label h2')).toHaveText('휴가 승인');
 for(const t of missions[3].terms){await page.locator('#reply').fill(t.arguments[0].paraphrase);await page.getByRole('button',{name:'대답하기'}).click();await expect(page.locator('.office-contract')).toContainText(t.required);}
 await expect(page.locator('.ending-actions')).toBeVisible();await expect(page.locator('.dialogue')).toContainText('김대리 / 8월 11일 인수인계');
 const skip=page.getByRole('button',{name:'대사 바로 표시'});
 if(await skip.isVisible())await skip.click();
 await expect(page.locator('.dialogue')).toContainText('1턴 · 승인된 휴가 날짜');
 await expect(page.locator('.dialogue')).toContainText('2턴 · 인수인계 책임·시점');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/office-vacation-success-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'이 미션 다시 도전'}).click();await expect(page.locator('.scene-top')).toContainText('0 / 6턴');await expect(page.locator('#reply')).toHaveValue('');
 await page.locator('.choices button').nth(1).click();await page.getByRole('button',{name:'대답하기'}).click();
 await expect(page.locator('.office-contract')).toContainText('8월 12–13일 승인');
 await page.screenshot({path:'test-results/office-vacation-negotiation-mobile.png',fullPage:true});
});

