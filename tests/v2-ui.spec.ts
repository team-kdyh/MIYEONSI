import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {start,view,endings} from '../server/game';

for(const viewport of [{width:1440,height:900},{width:390,height:844}])for(const mode of ['office','romance'] as const){
 test(`${mode}: viewport ${viewport.width}, free text, scroll, keyboard and settings`,async({page})=>{
  await page.setViewportSize(viewport);
  await mkdir('docs/qa-screenshots/v2-ui',{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let game:any=null,provider='openai',turns=0;
  const payload=()=>({game,provider,slots:[null,null,null],collection:[],endings});
  await page.route('**/api/**',async route=>{
   const action=new URL(route.request().url()).pathname.split('/').at(-1);
   const body=route.request().postDataJSON();
   if(action==='new'){game={...view(start(body.mode,body.mission)),dialogue:{version:0,reply:''}};}
   if(action==='provider')provider=body.provider;
   if(action==='turn'){
    expect(body).not.toHaveProperty('choice');expect(body.text).toBeTruthy();turns++;
    game.dialogue={version:turns,reply:mode==='office'?'귤 회의라니, 이름은 마음에 드네요. 그럼 자료는 제가 정리할 테니 내일 오전에 다시 이야기하죠.':'귤 껍질 벗기는 소리도 녹음해 본 적 있어요. 이상하죠? 저는 겨울마다 그 소리가 생각나요.',actionBeats:[mode==='office'?'그가 펜을 내려놓는다.':'유나가 컵을 감싸 쥐고 웃는다.']};
    game.log.push({speaker:'나',text:body.text},{speaker:mode==='office'?'박도현':'서유나',text:game.dialogue.reply});
   }
   await route.fulfill({json:payload()});
  });
  await page.goto('/');
  await expect(page.getByRole('button',{name:/칼퇴의 기술/})).toBeEnabled();
  await page.screenshot({path:`docs/qa-screenshots/v2-ui/title-${viewport.width}-${mode}.png`});
  await page.getByRole('button',{name:mode==='office'?/칼퇴의 기술/:/너의 목소리를 빌려줘/}).click();
  await page.getByRole('button',{name:'이야기 시작'}).click();
  await expect(page.locator('.choices')).toHaveCount(0);
  await expect(page.locator('.play .office-contract')).toHaveCount(0);
  await expect(page.locator('.play>.event-caption')).toHaveCount(0);
  const assertLayout=async()=>{
   await page.evaluate(async()=>{const style=getComputedStyle(document.querySelector('.stage')!).backgroundImage;const url=style.match(/url\(["']?(.*?)["']?\)/)?.[1];if(url){const img=new Image();img.src=url;await img.decode();}await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
   const result=await page.evaluate(()=>{
    const sprite=document.querySelector('.sprite')!.getBoundingClientRect(),panel=document.querySelector('.dialogue')!.getBoundingClientRect();
    const input=document.querySelector('#reply')!.getBoundingClientRect(),send=document.querySelector('.input-row button')!.getBoundingClientRect();
    return {pageFits:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth,faceAbovePanel:sprite.top+sprite.height*.3<panel.top,inputVisible:input.bottom<=innerHeight&&input.x>=0,sendVisible:send.right<=innerWidth&&send.bottom<=innerHeight,panelBg:getComputedStyle(document.querySelector('.dialogue')!).backgroundImage};
   });
   expect(result.pageFits).toBe(true);expect(result.faceAbovePanel).toBe(true);expect(result.inputVisible).toBe(true);expect(result.sendVisible).toBe(true);return result;
  };
  await page.getByRole('button',{name:'설정',exact:true}).click();
  await page.getByLabel('읽기 속도').selectOption('40');
  const volume=page.getByRole('slider',{name:'음량'});await volume.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(volume).toHaveValue('1');
  await expect.poll(()=>page.getByTestId('music').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
  await page.getByRole('checkbox',{name:'음소거'}).check();await expect(page.getByTestId('music')).toHaveJSProperty('muted',true);
  await page.getByRole('button',{name:'닫기',exact:true}).focus();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'현재 모드 처음부터 시작'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'설정',exact:true})).toBeFocused();
  await page.locator('#reply').fill('귤 회의를 열면 어때요?');await page.locator('#reply').press('Enter');
  await expect(page.locator('.text-ink')).not.toHaveText(game.dialogue.reply);
  await expect(page.locator('#reply')).toBeFocused();
  await page.getByRole('button',{name:'대사 바로 표시'}).click();await expect(page.locator('.text-ink')).toHaveText(game.dialogue.reply);
  await expect.poll(()=>page.getByTestId('music').evaluate((a:HTMLAudioElement)=>a.volume)).toBe(.01);
  const normal=await assertLayout();
  await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');
  await page.screenshot({path:`docs/qa-screenshots/v2-ui/conversation-${viewport.width}-${mode}.png`});
  await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('checkbox',{name:'효과 감소'}).check();await page.getByRole('checkbox',{name:'큰 글씨'}).check();
  await page.screenshot({path:`docs/qa-screenshots/v2-ui/settings-${viewport.width}-${mode}.png`});
  await page.keyboard.press('Escape');await expect(page.locator('.sprite-entry')).toHaveCSS('animation-name','none');
  game.dialogue.reply='긴 대화에서도 얼굴과 입력창은 이 자리에 남습니다. '.repeat(80);
  await page.reload();await page.getByRole('button',{name:/이어하기/}).click();
  await expect(page.locator('.text-ink')).toHaveText(game.dialogue.reply);
  const long=await assertLayout();
  const scroll=page.getByRole('region',{name:'현재 대화'});expect(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await scroll.focus();await page.keyboard.press('End');await expect.poll(()=>scroll.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  await page.locator('#reply').focus();await page.screenshot({path:`docs/qa-screenshots/v2-ui/long-focus-${viewport.width}-${mode}.png`});
  await page.getByRole('button',{name:'대화 로그'}).click();await expect(page.getByRole('dialog')).toContainText('귤 회의를');
  await page.screenshot({path:`docs/qa-screenshots/v2-ui/log-${viewport.width}-${mode}.png`});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByLabel('읽기 속도')).toHaveValue('40');await expect(volume).toHaveValue('1');await expect(page.getByRole('checkbox',{name:'효과 감소'})).toBeChecked();
  await page.keyboard.press('Escape');
  if(viewport.width===390){await page.setViewportSize({width:390,height:500});await page.locator('#reply').focus();await assertLayout();await page.setViewportSize(viewport);}
  if(mode==='romance'){
   game.step=4;game.scene={...game.scene,title:'음향 보관실'};game.dialogue.reply='이 녹음, 아까 우리가 들었던 것과 조금 다르지 않아요?';game.dialogue.actionBeats=['유나의 손이 재생 버튼 위에서 멈춘다.'];
   await page.reload();await page.getByRole('button',{name:/이어하기/}).click();await assertLayout();
   await page.screenshot({path:`docs/qa-screenshots/v2-ui/suspense-${viewport.width}.png`});
  }
  expect(turns).toBe(1);expect(errors).toEqual([]);
  await writeFile(`docs/v2-ui-${viewport.width}-${mode}.json`,JSON.stringify({viewport,mode,provider:'mock HTTP response, no paid calls',normal,long,turns,errors},null,2));
 });
}
