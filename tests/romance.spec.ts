import {test,expect} from '@playwright/test';
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
 await page.screenshot({path:'test-results/romance-truth-mobile.png',fullPage:true});
});
