import {test,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('AC3 four endings and trust contrast through public free-text turns',async({request})=>{
 await request.get('/api/state');
 const common=['종소리를 같이 듣고 싶어요','헤드폰을 돌려줄게요','나도 좋아해요. 사귀어요','내일 원본을 확인해요'];
 const routes=[
  {ending:'romance-0',lines:[...common,'녹음을 멈춰 주세요','다시 시작해요']},
  {ending:'romance-1',lines:[...common,'좋았던 말만 남겨요','같은 하루를 계속 틀어 주세요']},
  {ending:'romance-2',lines:[...common,'편집 흔적을 비교해요','관계를 끝낼게요']},
  {ending:'romance-3',lines:[...common,'편집 흔적을 비교해요','원본을 복원해요']},
  {ending:'romance-0',lines:[common[0],'아직 못 챙겼어요',common[2],'조금 더 함께 있을래요','편집 흔적을 비교해요','원본을 복원해요']}
 ];
 const runs=[];
 for(const route of routes){
  let state=await (await request.post('/api/new',{data:{mode:'romance'}})).json();
  const initial=state.game,turns=[];
  for(const text of route.lines){
   const input={choice:null,text,step:state.game.step,version:state.game.dialogue.version,requestId:crypto.randomUUID()};
   const response=await request.post('/api/turn',{data:input});expect(response.status()).toBe(200);
   state=await response.json();turns.push({input,game:state.game});
  }
  expect(state.game.ending).toBe(route.ending);
  expect(state.game.romance.facts.some((f:{id:string})=>f.id==='couple')).toBe(true);
  expect(state.game.romance.facts.some((f:{id:string})=>f.id==='date-complete')).toBe(true);
  runs.push({initial,turns,expectedEnding:route.ending,result:'pass'});
 }
 const files=['server/romance.ts','server/romance.test.ts','tests/romance.spec.ts'];
 const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
 await writeFile('docs/ac3-repair-evidence.json',JSON.stringify({criterion:3,executedAt:new Date().toISOString(),provider:'offline',paidCalls:0,hashes,runs},null,2));
});
test('romance free input completes a couple story and truth ending on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:/너의 목소리를 빌려줘/}).click();await page.getByRole('button',{name:'이야기 시작'}).click();
 const lines=['종소리를 같이 듣고 싶어요','헤드폰을 돌려줄게요','나도 좋아해요. 사귀어요','내일 원본을 확인해요','편집 흔적을 비교해요','원본을 복원해요'];
 for(let i=0;i<lines.length;i++){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(i===3){await expect(page.locator('.dialogue')).toContainText('연인이 된 뒤 첫 데이트');await expect(page.locator('.stage')).toHaveCSS('background-image',/riverside/);}
  if(i===4)await expect(page.locator('.stage')).toHaveCSS('background-image',/archive/);
  await page.locator('#reply').fill(lines[i]);await page.getByRole('button',{name:'대답하기'}).click();
  if(i<5)await expect(page.locator('.scene-label h2')).toContainText(`${i+2} ·`);
 }
 await expect(page.locator('.scene-label h2')).toContainText('아카이브의 진실');await expect(page.locator('.dialogue')).toContainText('관계를 이어가기로');
 const reveal=page.getByRole('button',{name:'대사 바로 표시'});if(await reveal.count())await reveal.click();
 await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');
 await expect(page.locator('.background-arrival')).toHaveCSS('opacity','0');
 await page.screenshot({path:'test-results/romance-truth-mobile.png',fullPage:true});
});
