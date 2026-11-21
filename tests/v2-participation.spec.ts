import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {start,view,endings} from '../server/game';
import {commitDialogue,type DialogueGame} from '../server/dialogue';
import type {EventProposal,NarrativeReply} from '../server/narrative';
test('normal romance proposal, future acceptance, refusal and actual interaction bind captures to exact states',async({page})=>{
 const out='docs/v2-contract-followup/participation';await mkdir(out,{recursive:true});
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>localStorage.setItem('afterhours-settings',JSON.stringify({mute:true,speed:0,reduced:false})));
 const trace:unknown[]=[];
 const event=(value:string,text:string,extra:Partial<EventProposal>={}):EventProposal=>({kind:'relationship',value,text,subject:'mutual',status:'accepted',evidence:text,reference:'',...extra});
 function turn(g:DialogueGame,text:string,events:EventProposal[]=[],extra:Partial<NarrativeReply>={}){const response:NarrativeReply={line:'여기서 천천히 이야기해요.',actionBeats:['유나가 고개를 기울인다.'],emotion:'차분함',pose:'neutral',musicMood:'cafe-warmth',events,recall:[],conjecture:'',...extra};const after=commitDialogue(g,null,text,response);trace.push({text,response,before:g,after});return after;}
 let g:DialogueGame=start('romance');for(let i=0;i<3;i++)g=turn(g,'빗소리 이야기를 좀 더 해요.');
 for(const value of ['familiar','attracted','confessed'])g=turn(g,'마음을 들려 주세요.',[event(value,'유나가 마음을 표현한다.',{subject:'npc',evidence:''})]);
 g=turn(g,'좋아요. 우리 사귀어요.',[event('couple','좋아요. 우리 사귀어요.')]);
 const pending=turn(g,'다음 만남은 어떨까요?',[event('date','내일 카페에서 종이배를 접으며 데이트해요.',{status:'offered',subject:'npc',evidence:''})]);
 const offer=pending.narrative!.events.at(-1)!;
 const accepted=turn(pending,'내일 카페에서 데이트하는 데 동의해요.',[event('date','내일 카페에서 데이트하는 데 동의해요.',{reference:offer.id})]);
 expect(accepted.narrative!.activeDate).toBeUndefined();expect(accepted.narrative!.dates).toBe(0);
 const refused=turn(pending,'데이트 제안은 거절해요.',[event('date','데이트 제안은 거절해요.',{status:'refused',reference:offer.id})]);
 const entered=turn(accepted,'오늘 여기서 같이 종이배를 접으며 데이트해요.',[event('date','오늘 여기서 같이 종이배를 접으며 데이트해요.')]);
 const completed=turn(entered,'종이배를 접었어요. 유나 씨 배는 어떤 모양이에요?',[event('date','함께 종이배를 비교함',{status:'fulfilled',reference:entered.narrative!.activeDate!.eventId,evidence:'종이배를 접었어요.'})],{line:'제 배는 조금 기울었네요.',actionBeats:['유나가 접은 종이배를 테이블에 놓는다.'],pose:'smile'});
 expect(completed.narrative!.dates).toBe(1);
 let current=pending;
 await page.route('**/api/**',route=>route.fulfill({json:{game:view(current),provider:'openai',slots:[null,null,null],collection:[],endings}}));
 const captures=[];
 for(const [label,state] of Object.entries({pending,accepted,refused,entered,completed})){
  current=state;await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
  await expect(page.locator('.text-ink')).toHaveText(current.dialogue!.reply);
  await page.evaluate(async()=>{for(const el of document.querySelectorAll('.stage,.sprite')){const url=getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];if(url){const image=new Image();image.src=url;await image.decode();}}});
  await expect(page.locator('.sprite-entry')).toHaveCSS('opacity','1');
  const file=`${out}/${label}.png`;await page.screenshot({path:file});
  captures.push({file,label,turn:current.narrative!.turn,version:current.dialogue!.version,events:current.narrative!.events,state:current,visualActionScope:'NPC solo gesture; no image depicts player participation',jointExperienceFacts:current.narrative!.events.filter(e=>e.kind==='relationship'&&e.value==='date'),reduced:false});
 }
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('checkbox',{name:'효과 감소'}).check();await page.keyboard.press('Escape');
 await expect(page.locator('.sprite-entry')).toHaveCSS('animation-name','none');
 const reducedFile=`${out}/completed-reduced.png`;await page.screenshot({path:reducedFile});captures.push({...captures.at(-1)!,file:reducedFile,reduced:true});
 const hashes=Object.fromEntries(await Promise.all(['server/narrative.ts','server/dialogue.ts','src/main.tsx','src/visualAssets.ts'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 await writeFile(`${out}/trace.json`,JSON.stringify({source:'authored mock; normal sequential turns and explicit branch from pending',hashes,trace,captures},null,2));
});

