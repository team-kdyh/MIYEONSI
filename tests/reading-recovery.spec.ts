import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {start,view,endings} from '../server/game';
const shots='docs/reading-review';
const text='음, 그런 대답도 괜찮아요. 사실 저도 방금 생각이 났거든요. 모를 때는 모른다고 솔직하게 말해주는 소리, 그게 좀 특별하게 들릴 때가 있어요. 오늘은 그런 순간이 하나 더 생긴 셈이죠.';
for(const size of [{width:1440,height:623},{width:1280,height:720},{width:390,height:844}])test(`reply grows without scrolling at ${size.width}x${size.height}`,async({page})=>{
 await mkdir(shots,{recursive:true});await page.setViewportSize(size);
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
 const game={...view(start('romance')),dialogue:{version:0,reply:text,actionBeats:['유나가 손가락을 머리카락 뒤로 넘긴다. · 짧게 고개를 끄덕인다.']}};
 await page.route('**/api/**',r=>r.fulfill({json:{game,provider:'openai',slots:[null,null,null],collection:[],endings}}));
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 await expect(page.locator('.text-ink')).toHaveText(text);await expect(page.getByRole('navigation',{name:'대사 읽기'})).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'현재 이야기'})).toContainText('카페에서 소리를 모으는 유나');
 await expect(page.locator('#reply')).toBeInViewport({ratio:1});
 const layout=await page.evaluate(()=>{const r=document.querySelector('.conversation-scroll')!,p=document.querySelector('.dialogue')!.getBoundingClientRect(),sprite=document.querySelector('.sprite')!.getBoundingClientRect();return {fits:r.scrollHeight<=r.clientHeight+1,body:document.documentElement.scrollHeight<=innerHeight,face:sprite.top+sprite.height*.3<p.top};});
 expect(layout).toEqual({fits:true,body:true,face:true});
 await page.screenshot({path:`${shots}/reading-${size.width}-${size.height}.png`});
});
test('rejected reply preserves text, explains recovery in the dialogue, and retries the same turn',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mkdir(shots,{recursive:true});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true})));
 let game={...view(start('romance')),dialogue:{version:0,reply:text,actionBeats:['유나가 웃는다.']}};let reject=true;const ids:string[]=[];
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){const body=route.request().postDataJSON();ids.push(body.requestId);if(reject){await route.fulfill({status:400,json:{code:'reply_rejected',committed:false,error:'답변이 현재 이야기와 맞지 않아 이어 가지 못했어요. 입력한 말과 이전 진행은 그대로 남아 있어요.'}});return;}game={...game,dialogue:{version:1,reply:'빗소리는 창문마다 다르게 들리죠. 저는 그 차이가 좋아요.',actionBeats:['유나가 창밖을 바라본다.']}};}
  await route.fulfill({json:{game,provider:'openai',slots:[null,null,null],collection:[],endings}});
 });
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 await page.locator('#reply').fill('빗소리가 좋아요.');await page.locator('#reply').press('Enter');
 await expect(page.getByRole('alert')).toContainText('이전 진행은 그대로');await expect(page.getByRole('alert')).not.toContainText(/근거|확정|요청|검증/);
 await expect(page.locator('.dialogue [role=alert]')).toBeVisible();await expect(page.locator('#reply')).toHaveValue('빗소리가 좋아요.');
 await expect(page.getByRole('button',{name:'전송 →',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'답변 다시 받기'})).toBeInViewport({ratio:1});
 await page.screenshot({path:`${shots}/rejected-mobile.png`});
 await page.reload();await page.getByRole('button',{name:/이어하기/}).click();await expect(page.getByRole('button',{name:'답변 다시 받기'})).toBeVisible();
 reject=false;await page.getByRole('button',{name:'답변 다시 받기'}).click();expect(ids).toHaveLength(2);expect(ids[1]).toBe(ids[0]);
 await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('.text-ink')).toHaveText(game.dialogue.reply);await expect(page.locator('#reply')).toHaveValue('');
 reject=true;await page.locator('#reply').fill('다른 말');await page.locator('#reply').press('Enter');await page.getByRole('button',{name:'입력으로 돌아가기'}).click();await expect(page.locator('#reply')).toBeFocused();await expect(page.locator('#reply')).toHaveValue('다른 말');expect(await page.evaluate(()=>sessionStorage.getItem('afterhours-pending'))).toBeNull();
});

test('small screen and large text preserve every action and dialogue character across reading pages',async({page})=>{
 await page.setViewportSize({width:390,height:500});await mkdir(shots,{recursive:true});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:true,large:true})));
 const speech=('긴 이야기도 한 글자도 빠뜨리지 않고 읽어요.\n').repeat(20),actions=['유나가 창가에 앉아 빗방울을 바라본다. '.repeat(5),'유나가 조용히 컵을 내려놓는다. '.repeat(5),'유나가 접힌 편지를 가리킨다. '.repeat(5)],beat=actions.join(' · ');
 const game={...view(start('romance')),dialogue:{version:0,reply:speech,actionBeats:actions}};
 await page.route('**/api/**',r=>r.fulfill({json:{game,provider:'openai',slots:[null,null,null],collection:[],endings}}));
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();await expect(page.getByRole('navigation',{name:'대사 읽기'})).toBeVisible();
 let allAction='',allSpeech='',count=0;
 for(;count<200;count++){
  const part=await page.locator('.conversation-scroll').evaluate(e=>({action:e.querySelector('.action-beat')?.textContent||'',line:e.querySelector('.text-ink')?.textContent||''}));allAction+=part.action;allSpeech+=part.line;
  const bounds=await page.evaluate(()=>{const panel=document.querySelector('.dialogue')!.getBoundingClientRect(),region=document.querySelector('.conversation-scroll')!.getBoundingClientRect(),form=document.querySelector('.dialogue form')!.getBoundingClientRect(),sprite=document.querySelector('.sprite')!.getBoundingClientRect();return {textBeforeForm:region.bottom<=form.top,formInPanel:form.bottom<=panel.bottom,face:sprite.top+sprite.height*.3<panel.top,body:document.documentElement.scrollHeight<=innerHeight};});
  expect(bounds).toEqual({textBeforeForm:true,formInPanel:true,face:true,body:true});await expect(page.locator('#reply')).toBeInViewport({ratio:1});
  const next=page.getByRole('button',{name:'계속 읽기'});if(await next.isDisabled())break;await next.click();
 }
 expect(count).toBeLessThan(200);expect(allAction).toBe(beat);expect(allSpeech).toBe(speech);
 await page.screenshot({path:`${shots}/reading-large-390-500.png`});
});
