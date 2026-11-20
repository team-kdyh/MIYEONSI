import {test,expect} from '@playwright/test';

test('AC6 delivered but not displayed turn survives reload and retries once',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/너의 목소리를 빌려줘/}).click();
 await page.getByRole('button',{name:'이야기 시작'}).click();
 let delivered:any,requestId='';
 await page.route('**/api/turn',async route=>{
  requestId=route.request().postDataJSON().requestId;
  const response=await route.fetch();delivered=await response.json();
  // Server completed delivery to the transport; prevent client JSON/render.
  await route.abort('connectionreset');
 },{times:1});
 await page.locator('.choices button').first().click();
 await page.getByRole('button',{name:'대답하기'}).click();
 await expect(page.getByRole('button',{name:'같은 요청 다시 시도'})).toBeVisible();
 expect(delivered.game.dialogue.version).toBe(1);
 await page.reload();
 await expect(page.getByRole('alert')).toContainText('표시가 확인되지 않은 선택');
 const retryResponse=page.waitForResponse(r=>r.url().endsWith('/api/turn'));
 await page.getByRole('button',{name:'같은 요청 다시 시도'}).click();
 const replay=await retryResponse;expect(replay.request().postDataJSON().requestId).toBe(requestId);
 expect(await replay.json()).toEqual(delivered);
 await page.getByRole('button',{name:/이어하기/}).click();
 await expect(page.locator('.scene-top')).toContainText('02 / 06');
 await page.getByRole('button',{name:'대화 로그'}).click();
 await expect(page.locator('.log')).toHaveCount(delivered.game.log.length);
 expect(await page.evaluate(()=>sessionStorage.getItem('afterhours-pending'))).toBeNull();
});

test('AC6 conflicting stale tab recovers server state without advancing',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/칼퇴의 기술/}).click();await page.getByRole('button',{name:'이야기 시작'}).click();
 await expect(page.locator('#reply')).toBeVisible();
 const state=await (await page.request.get('/api/state')).json();
 const committed=await (await page.request.post('/api/turn',{data:{requestId:'other-tab-request',text:'',choice:0,step:state.game.step,version:state.game.dialogue.version}})).json();
 await page.locator('#reply').fill('새로운 대사');await page.getByRole('button',{name:'대답하기'}).click();
 await expect(page.getByRole('alert')).toContainText('현재 상태를 복구했습니다');
 await expect(page.locator('.scene-top')).toContainText('1 / 6턴');
 expect((await (await page.request.get('/api/state')).json()).game).toEqual(committed.game);
 await expect(page.getByRole('button',{name:'같은 요청 다시 시도'})).toHaveCount(0);
});
