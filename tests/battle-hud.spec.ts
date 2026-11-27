import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {start,view,endings} from '../server/game';
import {commitDialogue,type DialogueGame} from '../server/dialogue';
import type {NarrativeReply} from '../server/narrative';

const persuade='오늘은 요약을 먼저 보내고 18시에 나가겠습니다.';
const pressure='부장님 말씀도 듣겠습니다.';
function reply(text:string):NarrativeReply{
 const pushing=text===pressure,scoring=pushing||text===persuade;
 const line=pushing?'고객이 오늘 숫자를 기다린다는데요? 지금 보내세요.':text===persuade?'좋습니다. 오늘은 요약만 받고 18시에 퇴근하시죠.':('긴 이야기도 빠짐없이 읽습니다. 🙂\n').repeat(20);
 return {line,actionBeats:['박도현이 서류를 내려놓는다.'],emotion:'차분함',pose:'listen',musicMood:'office-groove',recall:[],conjecture:'',events:text===persuade?[{kind:'concession',subject:'mutual',status:'accepted',value:'leave',text,evidence:text,reference:''}]:[],battle:scoring?{kind:pushing?'pressure':'persuasion',target:'leave',argument:pushing?'boundary':'alternative',playerQuote:text,npcQuote:line,reason:pushing?'당장 숫자를 보내라는 압박에 여유가 줄었습니다.':'요약을 먼저 보내는 대안으로 퇴근에 합의했습니다.',concessionIndex:pushing?-1:0,pressureId:'',premises:[]}:null};
}
for(const size of [{width:1440,height:720},{width:390,height:844}])for(const reduced of [false,true])test(`unobstructed stage, reading and layout ${size.width} reduced=${reduced}`,async({page})=>{
 await page.setViewportSize(size);await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,large:true})));
 let game:DialogueGame=start('office');
 await page.route('**/api/**',async r=>{if(r.request().url().endsWith('/turn')){const {text,requestId}=r.request().postDataJSON();game=commitDialogue(game,null,text,reply(text),requestId);}await r.fulfill({json:{game:view(game),provider:'openai',slots:[null,null,null],collection:[],endings}});});
 await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
 await expect(page.getByRole('meter')).toHaveCount(0);
 for(const text of [pressure,persuade]){await page.locator('#reply').fill(text);await page.locator('#reply').press('Enter');await expect(page.locator('#reply')).toHaveValue('');}
 expect(view(game)!.battle).toMatchObject({player:92,boss:88});
 // Slot restoration may bump the transport version without another spoken turn.
 game=JSON.parse(JSON.stringify(game));game.dialogue!.version++;
 await page.reload();await page.getByRole('button',{name:/이어하기/}).click();
 await expect(page.locator('.battle-hud')).toHaveCount(0);
 expect(view(game)!.battle?.boss).toBe(88);
 await mkdir('docs/battle-ac1',{recursive:true});
 await page.locator('#reply').fill('잠깐 다른 이야기도 해요.');await page.locator('#reply').press('Enter');
 await expect(page.locator('.battle-exchange')).toHaveCount(0);
 await expect(page.getByRole('navigation',{name:'대사 읽기'})).toBeVisible();
 let reconstructed='';
 for(let n=0;n<150;n++){
  reconstructed+=await page.locator('.text-ink').textContent()??'';
  await expect(page.locator('#reply')).toBeInViewport({ratio:1});
  const fits=await page.evaluate(()=>{const box=(s:string)=>document.querySelector(s)!.getBoundingClientRect(),dialogue=box('.dialogue'),sprite=box('.sprite'),reading=box('.conversation-scroll'),form=box('form');return sprite.top+sprite.height*.3<dialogue.top&&reading.bottom<=form.top&&form.bottom<=dialogue.bottom&&document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;});expect(fits).toBe(true);
  const next=page.getByRole('button',{name:'계속 읽기'});if(await next.isDisabled())break;await next.click();
 }
 expect(reconstructed).toBe(reply('other').line);
 await page.screenshot({path:`docs/battle-ac1/reading-${size.width}-${reduced}.png`});
});
test('romance never displays battle HUD',async({page})=>{
 for(const size of [{width:1440,height:720},{width:390,height:844}]){
  await page.setViewportSize(size);await page.route('**/api/**',r=>r.fulfill({json:{game:view(start('romance')),provider:'offline',slots:[],collection:[],endings}}));
  await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();await expect(page.getByRole('complementary',{name:'설득 배틀'})).toHaveCount(0);await expect(page.locator('#reply')).toBeInViewport({ratio:1});
 }
});
