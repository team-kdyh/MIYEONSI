import {test,expect} from '@playwright/test';

test('AC6 failed save delivery offers state recovery without replaying a mutation',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/칼퇴의 기술/}).click();await page.getByRole('button',{name:/이야기 시작/}).click();
 await expect(page.locator('#reply')).toBeVisible();
 const initial=await (await page.request.get('/api/state')).json();
 await page.route('**/api/save',async route=>{await route.fetch();await route.abort('connectionreset');},{times:1});
 await page.getByRole('button',{name:'세이브',exact:true}).click();
 await page.locator('.save-slot').first().getByRole('button',{name:'저장',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('상태 다시 확인');
 await expect(page.getByRole('button',{name:'같은 요청 다시 시도'})).toHaveCount(0);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 const recoveryResponse=page.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='GET');
 await page.getByRole('button',{name:'상태 다시 확인'}).click();
 const recovered=await recoveryResponse;expect(recovered.status()).toBe(200);
 await expect(page.getByRole('alert')).toHaveCount(0);
 const saved=await recovered.json();
 expect(saved.game).toEqual(initial.game);expect(saved.slots[0]).toBeTruthy();
});

test('AC6 unrecoverable storage displays an explicit confirmed reset path',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({status:503,json:{error:'저장 형식이 다르거나 손상되었고 유효한 이전 저장도 없습니다.',canReset:true}}),{times:1});
 await page.goto('/');
 await expect(page.getByRole('alert')).toContainText('손상');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'저장 초기화 후 새로 시작'}).click();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/칼퇴의 기술/})).toBeEnabled();
});

test('AC6 reload restores all three manual slots, relationship, log and unlocked ending',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('button',{name:/칼퇴의 기술/})).toBeEnabled();
 let s=await (await page.request.post('/api/new',{data:{mode:'romance'}})).json();
 const snapshots:any[]=[];
 for(let slot=0;slot<3;slot++){
  const text=['저는 지호입니다.','사귀고 싶지 않아요.','관계를 여기서 끝낼게요.'][slot];
  const response=await page.request.post('/api/turn',{data:{text,step:s.game.step,version:s.game.dialogue.version,requestId:crypto.randomUUID()}});
  expect(response.ok()).toBeTruthy();s=await response.json();
  expect(s.game.narrative.events.some((e:any)=>e.kind==='promise')).toBeTruthy();
  snapshots.push(structuredClone(s.game));
  expect((await page.request.post('/api/save',{data:{slot}})).ok()).toBeTruthy();
 }
 expect(s.game.ending).toBeTruthy();
 const ending=s.endings.romance.find((e:any)=>e.id===s.game.ending);
 for(let slot=0;slot<3;slot++){
  await page.reload();
  await page.getByRole('button',{name:'세이브',exact:true}).click();
  await expect(page.locator('.save-slot')).toHaveCount(3);
  await page.locator('.save-slot').nth(slot).getByRole('button',{name:'불러오기'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const restored=await (await page.request.get('/api/state')).json();
  expect({...restored.game,dialogue:{...restored.game.dialogue,version:0}}).toEqual({...snapshots[slot],dialogue:{...snapshots[slot].dialogue,version:0}});
  expect(restored.collection).toContain(s.game.ending);
  await page.reload();await page.getByRole('button',{name:/이어하기/}).click();
  await page.getByRole('button',{name:'대화 로그'}).click();
  await expect(page.locator('.log')).toHaveCount(snapshots[slot].log.length);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name:'컬렉션',exact:true}).click();
  await expect(page.locator('.end-card strong').filter({hasText:ending.title})).toBeVisible();
 }
});

test('AC6 pending response from another timeline recovers current state',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('button',{name:/칼퇴의 기술/})).toBeEnabled();
 const initial=await (await page.request.post('/api/new',{data:{mode:'romance'}})).json();
 const body={text:'오늘은 소리 이야기를 해요.',step:initial.game.step,version:initial.game.dialogue.version,requestId:crypto.randomUUID()};
 expect((await page.request.post('/api/turn',{data:body})).ok()).toBeTruthy();
 const current=await (await page.request.post('/api/new',{data:{mode:'office',mission:4}})).json();
 await page.evaluate(body=>sessionStorage.setItem('afterhours-pending',JSON.stringify({action:'turn',body})),body);
 await page.reload();
 await page.getByRole('button',{name:'같은 요청 다시 시도'}).click();
 await expect(page.getByRole('alert')).toContainText('현재 상태를 복구했습니다');
 await expect(page.getByRole('button',{name:/이어하기/})).toContainText('직장 미션');
 expect((await (await page.request.get('/api/state')).json())).toEqual(current);
 expect(await page.evaluate(()=>sessionStorage.getItem('afterhours-pending'))).toBeNull();
});

test('AC6 delivered but not displayed turn survives reload and retries once',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/너의 목소리를 빌려줘/}).click();
 await page.getByRole('button',{name:/이야기 시작/}).click();
 let delivered:any,requestId='';
 await page.route('**/api/turn',async route=>{
  requestId=route.request().postDataJSON().requestId;
  const response=await route.fetch();delivered=await response.json();
  // Server completed delivery to the transport; prevent client JSON/render.
  await route.abort('connectionreset');
 },{times:1});
 await page.locator('#reply').fill('귤 껍질 소리를 들어 본 적 있어요?');
 await page.getByRole('button',{name:/전송/}).click();
 await expect(page.getByRole('button',{name:'같은 요청 다시 시도'})).toBeVisible();
 expect(delivered.game.dialogue.version).toBe(1);
 await page.reload();
 await expect(page.getByRole('alert')).toContainText('표시가 확인되지 않은 대화');
 const retryResponse=page.waitForResponse(r=>r.url().endsWith('/api/turn'));
 await page.getByRole('button',{name:'같은 요청 다시 시도'}).click();
 const replay=await retryResponse;expect(replay.request().postDataJSON().requestId).toBe(requestId);
 expect(await replay.json()).toEqual(delivered);
 await page.getByRole('button',{name:/이어하기/}).click();
 expect((await (await page.request.get('/api/state')).json()).game.dialogue.version).toBe(delivered.game.dialogue.version);
 await page.getByRole('button',{name:'대화 로그'}).click();
 await expect(page.locator('.log')).toHaveCount(delivered.game.log.length);
 expect(await page.evaluate(()=>sessionStorage.getItem('afterhours-pending'))).toBeNull();
});

test('AC6 conflicting stale tab recovers server state without advancing',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/칼퇴의 기술/}).click();await page.getByRole('button',{name:/이야기 시작/}).click();
 await expect(page.locator('#reply')).toBeVisible();
 const state=await (await page.request.get('/api/state')).json();
 const committed=await (await page.request.post('/api/turn',{data:{requestId:'other-tab-request',text:'오늘은 소리 이야기를 해요.',step:state.game.step,version:state.game.dialogue.version}})).json();
 await page.locator('#reply').fill('새로운 대사');await page.getByRole('button',{name:/전송/}).click();
 await expect(page.getByRole('alert')).toContainText('현재 상태를 복구했습니다');
 await expect(page.locator('#reply')).toHaveValue('새로운 대사');
 expect((await (await page.request.get('/api/state')).json()).game).toEqual(committed.game);
 await expect(page.getByRole('button',{name:'같은 요청 다시 시도'})).toHaveCount(0);
});

test('v2 browser settings and explicit provider survive refresh and a new game',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('checkbox',{name:/효과 감소/}).check();await page.getByRole('checkbox',{name:/음소거/}).check();
 await page.getByRole('checkbox',{name:/큰 글씨/}).check();await page.getByLabel('음량',{exact:true}).fill('17');
 await page.getByLabel('읽기 속도',{exact:true}).selectOption('0');
 await page.getByLabel('대화 제공자',{exact:true}).selectOption('offline');
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:/칼퇴의 기술/}).click();await page.getByRole('button',{name:/이야기 시작/}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 for(const name of [/효과 감소/,/음소거/,/큰 글씨/])await expect(page.getByRole('checkbox',{name})).toBeChecked();
 await expect(page.getByLabel('음량',{exact:true})).toHaveValue('17');await expect(page.getByLabel('읽기 속도',{exact:true})).toHaveValue('0');
 await expect(page.getByLabel('대화 제공자',{exact:true})).toHaveValue('offline');
});
