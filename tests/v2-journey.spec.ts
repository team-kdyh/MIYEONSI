import {test,expect} from '@playwright/test';

test('free text UI cancels and retries one request, earns an office ending, and restarts the same mission',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
 const pageErrors:string[]=[],requests:any[]=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('request',request=>{if(request.url().endsWith('/api/turn'))requests.push(request.postDataJSON());});
 await page.goto('/');await page.getByRole('button',{name:/칼퇴의 기술/}).click();
 await expect(page.locator('#office-mission option')).toHaveCount(8);
 await page.getByRole('button',{name:/이야기 시작/}).click();
 await expect(page.locator('#reply')).toBeVisible();
 await expect(page.locator('.choices button')).toHaveCount(0);
 const initial=await (await page.request.get('/api/state')).json();
 expect(initial.provider).toBe('openai');
 await expect(page.getByRole('complementary',{name:'현재 이야기'})).toContainText('추가 보고서를 부탁했다');

 // Cancel before the first request reaches the server, then click the real retry UI.
 let release!:()=>void;
 const cancelled=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/turn',async route=>{await cancelled;await route.abort('aborted').catch(()=>{});},{times:1});
 const first='오늘 18시에 퇴근하겠습니다. <img src=x onerror="window.__v2Executed=true">';
 await page.locator('#reply').fill(first);await page.locator('#reply').press('Enter');
 await expect.poll(()=>requests.length).toBe(1);
 await page.getByRole('button',{name:'응답 취소',exact:true}).click();release();
 await expect(page.getByRole('button',{name:'이어받기',exact:true})).toBeEnabled();
 await expect(page.locator('#reply')).toHaveValue(first);
 expect((await (await page.request.get('/api/state')).json()).game).toEqual(initial.game);
 const retryResponse=page.waitForResponse(response=>response.url().endsWith('/api/turn'));
 await page.getByRole('button',{name:'이어받기',exact:true}).click();
 const retried=await retryResponse;expect(retried.status()).toBe(200);
 expect(requests[1]).toEqual(requests[0]);
 let state=await retried.json();
 expect(state.game.dialogue.version).toBe(initial.game.dialogue.version+1);
 expect(state.game.ending).toBeNull();
 expect(state.game.narrative.events.some((event:any)=>event.kind==='concession'&&event.value==='leave')).toBe(true);
 await expect(page.getByRole('complementary',{name:'현재 이야기'})).toContainText('오늘 18시 퇴근에 합의함');
 await expect(page.locator('#reply')).toHaveValue('');
 expect(await page.evaluate(()=>sessionStorage.getItem('afterhours-pending'))).toBeNull();

 for(const text of ['남은 도표는 부장님이 내일 10시까지 맡아 주세요.','이 합의로 마무리해요.']){
  await page.locator('#reply').fill(text);
  const response=page.waitForResponse(result=>result.url().endsWith('/api/turn'));
  await page.getByRole('button',{name:/전송/}).click();
  const result=await response;expect(result.status()).toBe(200);state=await result.json();
  await expect(page.getByRole('complementary',{name:'현재 이야기'})).toContainText(state.game.ending?'이번 만남의 마지막 장면':'남은 도표를 내일 10시까지 맡기로');
 }
 expect(requests).toHaveLength(4);expect(requests.every(body=>!('choice' in body))).toBe(true);
 expect(state.game.ending).toBe('office-clockout-success');
 expect(state.game.narrative.turn).toBe(3);
 expect(state.collection).toContain('office-clockout-success');
 await expect(page.locator('.ending-actions')).toBeVisible();
 await expect(page.locator('#reply')).toHaveCount(0);
 await page.getByRole('button',{name:'대화 로그'}).click();
 await expect(page.locator('.log').filter({hasText:first})).toHaveCount(1);
 await expect(page.locator('.log img')).toHaveCount(0);
 expect(await page.evaluate(()=>('__v2Executed' in window))).toBe(false);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'타이틀로 돌아가기'}).click();
 await page.getByRole('button',{name:/이어하기/}).click();
 await expect(page.locator('.ending-actions')).toBeVisible();
 await page.getByRole('button',{name:'컬렉션 보기',exact:true}).click();
 await expect(page.locator('.end-card strong').filter({hasText:'17:50 추가 업무에서 칼퇴 · 성공'})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.screenshot({path:testInfo.outputPath('earned-office-ending-390.png')});
 await page.getByRole('button',{name:'이 미션 다시 도전'}).click();
 await expect(page.locator('#reply')).toHaveValue('');
 const restarted=await (await page.request.get('/api/state')).json();
 expect(restarted.game.step).toBe(initial.game.step);
 expect(restarted.game.ending).toBeNull();expect(restarted.game.narrative.turn).toBe(0);
 expect(restarted.collection).toContain('office-clockout-success');
 expect(pageErrors).toEqual([]);
 await testInfo.attach('scope',{body:JSON.stringify({transport:'fake Responses; real UI and public HTTP; no paid calls',committedTurns:3,requests:4,cancelledBeforeDelivery:1,ending:state.game.ending}),contentType:'application/json'});
});
