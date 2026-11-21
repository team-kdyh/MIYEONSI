import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {start,view,endings} from '../server/game';
import {narrative,reconcile} from '../server/narrative';
import {actorPoses,backgroundAsset} from '../src/visualAssets';

test('staged provenance hashes match shipped originals',async()=>{
 const m=JSON.parse(await readFile('public/assets/v2/generation-manifest.json','utf8'));
 expect(m.assets).toHaveLength(6);
 for(const a of m.assets){expect(createHash('sha256').update(await readFile(`public/assets/v2/${a.file}`)).digest('hex')).toBe(a.sha256);expect(a.prompt.length).toBeGreaterThan(100);}
});
for(const mode of ['office','romance'] as const)for(const width of [1440,390])test(`${mode} ${width}: real sheets, validated move, action and reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:width===1440?900:844});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0})));
 await mkdir('docs/qa-screenshots/v2-ac4-recheck',{recursive:true});
 let g=start(mode,0);g.narrative=narrative(g);
 let reply='여기서 잠깐 이야기를 이어 가죠.',beats=['잠시 고개를 들어 바라본다.'],version=0;
 const payload=()=>({game:{...view(g),dialogue:{version,reply,actionBeats:beats}},provider:'offline',slots:[null,null,null],collection:[],endings});
 const poseEntries=Object.entries(actorPoses[mode]);let index=0;
 await page.route('**/api/**',async route=>{
  if(route.request().url().endsWith('/turn')){
   const pose=poseEntries[index++][0] as keyof typeof actorPoses.office;
   const location=index%2?'rooftop':'rainstreet';const text=route.request().postDataJSON().text;
   const result=reconcile(g,text,{line:'이곳의 소리를 조금 더 들어 볼까요?',actionBeats:[actorPoses[mode][pose].label],emotion:'차분함',pose,musicMood:'rooftop-heart',recall:[],conjecture:'',events:index>2?[]:[{kind:'move',subject:'mutual',text:`함께 ${location}에서 대화를 이어간다.`,status:'accepted',reference:'',evidence:text,value:location}]});
   g=result.game;version++;reply='이곳의 소리를 조금 더 들어 볼까요?';beats=[actorPoses[mode][pose].label];
  }
  await route.fulfill({json:payload()});
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 const evidence=[];const cells=new Set<string>();
 for(const [pose,asset] of poseEntries){
  await page.locator('#reply').fill(index===0?'옥상으로 함께 가요.':index===1?'빗길로 함께 가요.':`${pose} 반응의 시각 검사용 대화입니다.`);await page.locator('#reply').press('Enter');
  const sprite=page.locator('.sprite');await expect(sprite).toHaveAttribute('data-pose',pose);
  await expect(sprite).toHaveCSS('background-image',`url("${new URL(asset.sheet,page.url()).href}")`);
  await expect(page.locator('.action-beat')).toHaveText(asset.label);
  await expect(page.locator('.stage')).toHaveCSS('background-image',`url("${new URL(backgroundAsset(g.narrative!.location),page.url()).href}")`);
  await page.evaluate(async()=>{for(const e of document.querySelectorAll('.stage,.sprite')){const url=getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];if(url){const image=new Image();image.src=url;await image.decode();}}});
  await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');
  await expect(page.locator('.sprite-entry')).toHaveCSS('animation-iteration-count','1');
  await expect(sprite).toHaveCSS('aspect-ratio','3 / 4');
  const bounds=await sprite.boundingBox();const panel=await page.locator('.dialogue').boundingBox();
  // The office battle uses a larger portrait behind the bottom dialogue panel.
  // Preserve an unobstructed head/face; romance retains its existing full figure.
  expect(bounds!.y+bounds!.height*(mode==='office'?.3:.92)).toBeLessThan(panel!.y);
  if(mode==='office'){const hud=await page.locator('.battle-hud').boundingBox();expect(hud!.y+hud!.height).toBeLessThan(bounds!.y+bounds!.height*.12);}
  expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
  const png=await readFile(`public${asset.sheet}`),sheetWidth=png.readUInt32BE(16),sheetHeight=png.readUInt32BE(20);
  const screenshot=`docs/qa-screenshots/v2-ac4-recheck/${mode}-${width}-${pose}.png`;
  cells.add(`${asset.sheet}:${asset.column}`);evidence.push({pose,...asset,sourceRegion:{x:asset.column*sheetWidth/4,y:0,width:sheetWidth/4,height:sheetHeight},screenshot,location:g.narrative!.location,committedEvents:g.narrative!.events.filter(e=>e.turn===g.narrative!.turn),bounds,panel});
  await page.screenshot({path:screenshot});
 }
 expect(cells.size).toBe(12);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('checkbox',{name:'효과 감소'}).check();await page.keyboard.press('Escape');
 await expect(page.locator('.sprite-entry')).toHaveCSS('animation-name','none');await expect(page.locator('.action-beat')).toHaveText(beats[0]);await expect(page.locator('.background-arrival')).toHaveCSS('display','none');
 await page.screenshot({path:`docs/qa-screenshots/v2-ac4-recheck/${mode}-${width}-reduced.png`});
 expect(errors).toEqual([]);
 await writeFile(`docs/v2-ac4-${mode}-${width}.json`,JSON.stringify({scope:'Mock model replies through real reconcile and UI; no paid API calls',distinctCells:cells.size,evidence,errors},null,2));
});


