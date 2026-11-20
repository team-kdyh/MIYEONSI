import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('AC5: assets, cues, accessible parity, keyboard and audio at both sizes',async({browser})=>{
 test.setTimeout(120000);
 const evidence:any[]=[];
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const runs:any[][]=[];
  for(const reduced of [false,true]){
   const context=await browser.newContext({viewport});const page=await context.newPage();
   await page.goto('/');
   await page.getByRole('button',{name:'설정',exact:true}).click();
   await page.getByRole('checkbox',{name:'효과 감소'}).setChecked(reduced);
   await page.getByRole('checkbox',{name:'음소거'}).setChecked(reduced);
   const volume=page.getByRole('slider',{name:'음량'});await volume.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
   await expect(volume).toHaveValue('1');
   await page.getByLabel('읽기 속도').selectOption('40');
   await page.getByRole('button',{name:'닫기',exact:true}).focus();await page.keyboard.press('Shift+Tab');
   await expect(page.getByLabel('읽기 속도')).toBeFocused();await page.keyboard.press('Escape');
   await page.getByRole('button',{name:/너의 목소리를 빌려줘/}).click();await page.getByRole('button',{name:'이야기 시작'}).click();
   const dimensions=await page.evaluate(async()=>Promise.all(['yuna-expressions','boss-expressions','office','cafe','riverside','archive'].map(async name=>{const i=new Image();i.src=`/assets/${name}.png`;await i.decode();return {name,width:i.naturalWidth,height:i.naturalHeight};})));
   expect(dimensions.every(d=>d.width>1000&&d.height>500)).toBe(true);
   if(!reduced){
    await expect(page.locator('.text-ink')).not.toHaveText(await page.locator('.text-reserve').textContent()||'');
    await page.getByRole('button',{name:'대사 바로 표시'}).click();
    await expect(page.locator('.text-ink')).toHaveText(await page.locator('.text-reserve').textContent()||'');
    await expect.poll(()=>page.getByTestId('music').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(.1);
    expect(await page.getByTestId('music').evaluate((a:HTMLAudioElement)=>a.volume)).toBe(.01);
   }else{await expect(page.getByRole('button',{name:'대사 바로 표시'})).toHaveCount(0);}
   const observations:any[]=[];
   const lines=['종소리를 같이 듣고 싶어요','헤드폰을 돌려줄게요','나도 좋아해요. 사귀어요','내일 원본을 확인해요','편집 흔적을 비교해요','원본을 복원해요'];
   for(let step=0;step<=6;step++){
    if(step<6)await expect(page.locator('.scene-label h2')).toContainText(`${step+1} ·`);else await expect(page.locator('.ending-actions')).toBeVisible();
    const info=await page.locator('.play>.event-caption').innerText();const choices=await page.locator('.choices button').allTextContents();
    const animation=await page.locator('.sprite').evaluate(e=>getComputedStyle(e).animationName);
    expect(animation).toBe(reduced?'none':'breathe');
    const sound=await page.getByTestId('music').evaluate((a:HTMLAudioElement)=>({muted:a.muted,paused:a.paused,src:a.currentSrc,ready:a.readyState}));
    expect(sound.muted).toBe(reduced);if(reduced)expect(sound.paused).toBe(true);
    if(!reduced){await expect.poll(()=>page.getByTestId('music').evaluate((a:HTMLAudioElement)=>a.readyState)).toBeGreaterThan(1);expect(sound.paused).toBe(false);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    observations.push({step,info,choices,expression:await page.locator('.sprite').getAttribute('data-expression'),background:await page.locator('.stage').evaluate(e=>getComputedStyle(e).backgroundImage.split('/').at(-1)),animation,sound});
    if([0,3,4,5,6].includes(step)){
     const reveal=page.getByRole('button',{name:'대사 바로 표시'});if(await reveal.count())await reveal.click();
     await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');
     if(!reduced)await expect(page.locator('.background-arrival')).toHaveCSS('opacity','0');
     await page.screenshot({path:`test-results/ac5-${viewport.width}-${reduced?'quiet':'default'}-${step}.png`,fullPage:true});
    }
    if(step===5){await page.getByRole('button',{name:'대화 로그'}).click();await expect(page.getByRole('dialog')).toContainText(info);await page.keyboard.press('Escape');}
    if(step<6){
     const input=page.locator('#reply');await input.fill(lines[step]);await input.scrollIntoViewIfNeeded();
     const box=await input.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width);
     expect(await input.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;})).toBe(true);
     if(step===4)await page.screenshot({path:`test-results/ac5-input-${viewport.width}-${reduced?'quiet':'default'}.png`});
     await input.press('Enter');
    }
   }
   const game=(await (await context.request.get('/api/state')).json()).game;
   runs.push(observations.map(({step,info,choices,expression,background})=>({step,info,choices,expression,background})));
   expect(game.ending).toBe('romance-3');
   evidence.push({viewport,reduced,mute:reduced,provider:'offline',initial:'UI new romance',dimensions,observations,ending:game.ending,final:game.romance.final});
   await page.getByRole('button',{name:'타이틀로 돌아가기'}).click();await expect(page.getByTestId('music')).toHaveJSProperty('paused',true);
   await page.getByRole('button',{name:/칼퇴의 기술/}).click();await page.getByRole('button',{name:'이야기 시작'}).click();
   for(const [index,line] of ['음 안녕하세요','고객 마감 메일은 내일 오전 10시입니다. 오늘 18시에 퇴근하겠습니다.','남은 표는 부장님이 내일 10시까지 맡아 주세요.'].entries()){
    await expect(page.locator('.sprite')).toHaveAttribute('data-expression',String(index));
    await page.locator('#reply').fill(line);await page.locator('#reply').press('Enter');
   }
   await expect(page.locator('.sprite')).toHaveAttribute('data-expression','3');
   evidence.push({viewport,reduced,provider:'offline',mode:'office',initial:'UI new mission 0',expressions:[0,1,2,3],events:['arrival','objection','evidence','agreement'],result:'pass'});
   await page.screenshot({path:`test-results/ac5-office-${viewport.width}-${reduced?'quiet':'default'}.png`,fullPage:true});
   await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByLabel('읽기 속도').selectOption('0');
   await page.getByRole('checkbox',{name:'음소거'}).check();await expect(page.getByTestId('music')).toHaveJSProperty('paused',true);
   await page.keyboard.press('Escape');await page.reload();
   await page.getByRole('button',{name:/이어하기/}).click();await expect(page.getByRole('button',{name:'대사 바로 표시'})).toHaveCount(0);
   await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByLabel('읽기 속도')).toHaveValue('0');await expect(page.getByRole('slider',{name:'음량'})).toHaveValue('1');
   await context.close();
  }
  expect(runs[1]).toEqual(runs[0]);
 }
 const files=['src/main.tsx','src/style.css','src/presentation.ts','src/StageEffects.tsx','tests/presentation.spec.ts','server/office.ts','server/romance.ts'];
 const codeVersion=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 await mkdir('docs',{recursive:true});await writeFile('docs/ac5-evidence.json',JSON.stringify({executedAt:new Date().toISOString(),codeVersion,claim:'AC5 identical story information and choices across presentation settings',provider:'offline',paidCalls:0,runs:evidence},null,2));
});
