# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v2-audio.spec.ts >> autoplay rejection shows a visible gesture retry and recovers real playback
- Location: tests\v2-audio.spec.ts:92:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('button', { name: '배경음 재생', exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('button', { name: '배경음 재생', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: '배경음 재생', exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - button "AFTER HOURS 퇴근 후에" [ref=e5] [cursor=pointer]:
      - text: AFTER HOURS
      - generic [ref=e6]: 퇴근 후에
    - navigation "게임 메뉴" [ref=e7]:
      - button "세이브" [ref=e8] [cursor=pointer]
      - button "컬렉션" [ref=e9] [cursor=pointer]
      - button "설정" [ref=e10] [cursor=pointer]
  - main [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]: 직장 미션
        - button "대화 로그" [ref=e15] [cursor=pointer]
      - generic [ref=e16]:
        - generic [ref=e18]:
          - generic [ref=e19]: AFTER HOURS / THE LAST TASK
          - heading "17:50 추가 업무에서 칼퇴" [level=2] [ref=e20]
        - generic:
          - img "박도현 부장 · 서류철을 품에 든다"
      - generic [ref=e21]:
        - generic [ref=e22]: 박도현기획팀 부장
        - region "현재 대화" [ref=e24]:
          - generic [ref=e25]:
            - paragraph [ref=e26]: 서류철을 품에 든다
            - paragraph [ref=e27]:
              - generic [ref=e28]: 잠깐 이야기합시다.
              - generic [aria-hidden] [ref=e29]: 잠깐 이야기합시다.
        - generic [ref=e30]:
          - generic [ref=e31]: 나의 대사 당신의 말로 이어 가세요
          - generic [ref=e32]:
            - textbox "나의 대사 당신의 말로 이어 가세요" [ref=e33]:
              - /placeholder: 어떤 말을 건넬까요…
            - button "전송 →" [disabled] [ref=e34]
          - generic [ref=e35]: 0 / 500 · 대화는 자동 저장됩니다.
  - button "배경음 재생" [active] [ref=e36] [cursor=pointer]
  - contentinfo [ref=e37]:
    - text: 오프라인 미리보기
    - generic [ref=e39]: 원본 시나리오 · 외부 AI 호출 없음
```

# Test source

```ts
  1   | import {test,expect} from '@playwright/test';
  2   | import {readFile,writeFile} from 'node:fs/promises';
  3   | import {createHash} from 'node:crypto';
  4   | import {start,view,endings} from '../server/game';
  5   | import {narrative,reconcile,type EventProposal,type NarrativeReply} from '../server/narrative';
  6   | import {musicIds} from '../src/music';
  7   | 
  8   | test('all eight shipped compositions decode, match provenance and have non-silent distinct waveforms',async({page})=>{
  9   |  await page.goto('/');
  10  |  const manifest=JSON.parse(await readFile('public/assets/audio-v2/manifest.json','utf8'));
  11  |  expect(manifest.tracks.map((t:any)=>t.id).sort()).toEqual([...musicIds].sort());
  12  |  const rows=[];
  13  |  for(const track of manifest.tracks){
  14  |   expect(createHash('sha256').update(await readFile(`public/assets/audio-v2/${track.file}`)).digest('hex')).toBe(track.sha256);
  15  |   const result=await page.evaluate(async(id)=>{
  16  |    const ctx=new AudioContext();const buffer=await ctx.decodeAudioData(await (await fetch(`/assets/audio-v2/${id}.ogg`)).arrayBuffer());
  17  |    const data=buffer.getChannelData(0);let peak=0,sum=0;const blocks=[];
  18  |    for(let b=0;b<64;b++){let square=0;const from=Math.floor(b*data.length/64),to=Math.floor((b+1)*data.length/64);for(let i=from;i<to;i++){peak=Math.max(peak,Math.abs(data[i]));square+=data[i]*data[i];}sum+=square;blocks.push(Math.sqrt(square/(to-from)));}
  19  |    await ctx.close();return {duration:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,peak,rms:Math.sqrt(sum/data.length),blocks};
  20  |   },track.id);
  21  |   expect(result.duration).toBeGreaterThanOrEqual(48);expect(result.peak).toBeLessThan(1);expect(result.rms).toBeGreaterThan(.01);expect(result.channels).toBe(2);
  22  |   rows.push({id:track.id,sha256:track.sha256,bpm:track.bpm,meter:track.meter,instruments:track.instruments,composition:track.composition,...result});
  23  |  }
  24  |  expect(new Set(rows.map(r=>r.sha256)).size).toBe(8);
  25  |  await writeFile('docs/v2-audio-waveforms.json',JSON.stringify({scope:'Chromium decoded shipped OGG; not human listening approval',tracks:rows},null,2));
  26  |  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" viewBox="0 0 1000 760"><rect width="1000" height="760" fill="#111827"/><text x="24" y="30" fill="white" font-size="20">AFTER HOURS — decoded RMS envelopes (64 blocks per track)</text>${rows.map((r,j)=>`<text x="24" y="${70+j*85}" fill="white" font-size="16">${r.id} · ${r.duration.toFixed(2)}s · ${r.bpm} BPM · ${r.meter}</text>${r.blocks.map((v:number,i:number)=>`<rect x="${24+i*14.7}" y="${112+j*85-v*220}" width="12" height="${v*220}" fill="#c4b5fd"/>`).join('')}`).join('')}</svg>`;
  27  |  await writeFile('docs/v2-audio-waveforms.svg',svg);
  28  | });
  29  | 
  30  | for(const mode of ['office','romance'] as const)test(`${mode}: normal validated conversation path with real playback and crossfades`,async({page})=>{
  31  |  test.setTimeout(120000);
  32  |  await page.addInitScript(()=>{if(!localStorage.getItem('afterhours-settings'))localStorage.setItem('afterhours-settings',JSON.stringify({volume:35,speed:0}));});
  33  |  let game=start(mode);game.narrative=narrative(game);let version=0;let reply='잠깐 이야기해요.';
  34  |  const event=(kind:EventProposal['kind'],value:string,subject:EventProposal['subject']='mutual',status:EventProposal['status']='accepted'):EventProposal=>({kind,value,subject,status,text:`${value}에 관한 대화 ${version}`,evidence:'',reference:''});
  35  |  const steps: {text:string;music:NarrativeReply['musicMood'];events:EventProposal[];line:string}[]=mode==='office'?[
  36  |   {text:'보고서도 퇴근하고 싶대요.',music:'office-groove',events:[],line:'보고서 연차는 제 결재로 안 됩니다. 커피 휴가는 가능하죠.'},
  37  |   {text:'오늘 수치 대신 내일 검증한 요약을 보내면 어때요?',music:'office-pressure',events:[event('complication','deadline','npc','offered')],line:'고객은 오늘 기다립니다. 오늘 보낼 범위를 조금만 더 정해 봅시다.'},
  38  |  ]:[
  39  |   {text:'어떤 소리를 좋아하세요?',music:'cafe-warmth',events:[],line:'찻잔 내려놓는 소리요. 가끔 마지막 음이 삐끗해서 좋아요.'},
  40  |   {text:'저는 빗소리도 좋아해요.',music:'cafe-warmth',events:[],line:'창문 가까운 자리가 좋겠네요.'},
  41  |   {text:'다음에도 이야기해요.',music:'cafe-warmth',events:[event('relationship','familiar','npc')],line:'또 들려주세요. 조용한 이야기도요.'},
  42  |   {text:'좋아하는 향도 궁금해요.',music:'cafe-warmth',events:[],line:'시나몬이요. 겨울을 조금 먼저 꺼내는 향 같아요.'},
  43  |   {text:'같이 있으면 즐거워요.',music:'cafe-warmth',events:[event('relationship','attracted','npc')],line:'저도 자꾸 시계를 늦게 보게 돼요.'},
  44  |   {text:'유나는 어떤 마음이에요?',music:'rooftop-heart',events:[event('relationship','confessed','npc')],line:'좋아해요. 이 말은 편집하지 않을래요.'},
  45  |   {text:'좋아요. 우리 사귀어요. 옥상으로 함께 가요.',music:'rooftop-heart',events:[event('relationship','couple'),event('move','rooftop')],line:'오늘 바람 소리를 오래 기억할 것 같아요.'},
  46  |   {text:'좋아요. 오늘 함께 데이트해요.',music:'rooftop-heart',events:[event('relationship','date')],line:'뜨거운 차를 챙길게요. 옥상은 생각보다 춥더라고요.'},
  47  |   {text:'좋아요. 함께 차를 마시며 옥상 바람 소리를 들어요.',music:'rooftop-heart',events:[event('relationship','date','mutual','fulfilled')],line:'저도 차를 마셨어요. 오늘 바람은 찻잔에서도 울리네요.'},
  48  |   {text:'좋아요. 비 내리는 거리로 함께 가요.',music:'rainy-memory',events:[event('move','rainstreet')],line:'그날도 이렇게 비가 왔어요. 잊은 줄 알았는데.'},
  49  |   {text:'좋아요. 보관실로 함께 가요.',music:'archive-unease',events:[event('move','archive')],line:'테이프 끝에 빈 소리가 있어요. 원래는 없었는데.'},
  50  |   {text:'녹음의 삭제된 부분을 확인해 주세요.',music:'archive-pursuit',events:[event('clue','edited-gap','npc','fulfilled')],line:'여기, 제가 지운 부분이에요. 이제 숨기지 않을게요.'},
  51  |   {text:'좋아요. 기록을 두고 관계를 다시 시작해요.',music:'resolution-dawn',events:[event('resolution','reset','player')],line:'처음부터 들을까요. 이번에는 멈추고 싶으면 말해 주세요.'},
  52  |  ];
  53  |  const payload=()=>({game:{...view(game),dialogue:{version,reply,actionBeats:[]}},provider:'offline',slots:[null,null,null],collection:[],endings});
  54  |  const records:any[]=[];
  55  |  await page.route('**/api/**',async route=>{
  56  |   if(route.request().url().endsWith('/turn')){
  57  |    const step=steps[version],text=route.request().postDataJSON().text;expect(text).toBe(step.text);
  58  |    const completesDate=step.events.some(e=>e.kind==='relationship'&&e.value==='date'&&e.status==='fulfilled');
  59  |    if(completesDate){expect(game.narrative!.dates).toBe(0);expect(game.narrative!.activeDate).toBeDefined();}
  60  |    const result=reconcile(game,text,{line:step.line,actionBeats:completesDate?['유나가 차를 한 모금 마시며 바람 소리에 귀를 기울인다.']:[],pose:'listen',emotion:'대화',musicMood:step.music,recall:[],conjecture:'',events:step.events.map(e=>({...e,reference:completesDate?game.narrative!.activeDate!.eventId:e.reference,evidence:e.subject==='mutual'||e.subject==='player'?text:''}))});
  61  |    if(completesDate){expect(result.game.narrative!.dates).toBe(1);expect(result.game.narrative!.activeDate).toBeUndefined();}
  62  |    game=result.game;game.log.push({speaker:mode==='office'?'박도현':'서유나',text:step.line});reply=step.line;version++;records.push({text,reply,music:game.narrative!.musicMood,location:game.narrative!.location,relationship:game.narrative!.relationship,accepted:result.accepted,ending:game.ending});
  63  |   }
  64  |   await route.fulfill({json:payload()});
  65  |  });
  66  |  await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
  67  |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  68  |  const audio=()=>page.locator('audio[data-track]');
  69  |  let last=mode==='office'?'office-groove':'cafe-warmth';
  70  |  await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.some(n=>!n.paused&&n.currentTime>0))).toBe(true);
  71  |  const transitions:any[]=[];
  72  |  for(const step of steps){
  73  |   await page.locator('#reply').fill(step.text);await page.locator('#reply').press('Enter');await expect(page.locator('.text-ink')).toHaveText(step.line);
  74  |   if(step.music===last)continue;
  75  |   await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.filter(n=>!n.paused&&n.volume>.02&&n.volume<.33).length),{timeout:12000,intervals:[80]}).toBe(2);
  76  |   const overlap=await audio().evaluateAll((ns:HTMLAudioElement[])=>ns.map(n=>({id:n.dataset.track,time:n.currentTime,volume:n.volume,paused:n.paused})));
  77  |   await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.filter(n=>!n.paused&&n.volume>=.349).map(n=>n.dataset.track)),{timeout:4000}).toEqual([step.music]);
  78  |   transitions.push({from:last,to:step.music,overlap});last=step.music;
  79  |  }
  80  |  expect(transitions).toHaveLength(mode==='office'?1:5);
  81  |  await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('checkbox',{name:'음소거'}).check();
  82  |  expect(await audio().evaluateAll((ns:HTMLAudioElement[])=>ns.every(n=>n.muted&&n.paused))).toBe(true);
  83  |  await page.getByRole('slider',{name:'음량'}).fill('17');await page.getByRole('checkbox',{name:'음소거'}).uncheck();
  84  |  await expect.poll(()=>audio().evaluateAll((ns:HTMLAudioElement[])=>ns.some(n=>!n.paused&&Math.abs(n.volume-.17)<.001))).toBe(true);
  85  |  await page.reload();await page.getByRole('button',{name:/이어하기/}).click();await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByRole('slider',{name:'음량'})).toHaveValue('17');
  86  |  expect(errors).toEqual([]);
  87  |  await writeFile(`docs/v2-audio-${mode}-path.json`,JSON.stringify({scope:'Mock model replies, real reconcile, UI and media playback. No paid API. No direct state injection or music-only UI control.',transitions,records,errors},null,2));
  88  | });
  89  | 
  90  | 
  91  | 
  92  | test('autoplay rejection shows a visible gesture retry and recovers real playback',async({page})=>{
  93  |  await page.addInitScript(()=>{
  94  |   const original=HTMLMediaElement.prototype.play;let rejected=false;
  95  |   HTMLMediaElement.prototype.play=function(){if(this.src.includes('audio-v2')&&!rejected){rejected=true;return Promise.reject(new DOMException('Gesture required','NotAllowedError'));}return original.call(this);};
  96  |  });
  97  |  const g=start('office');g.narrative=narrative(g);
  98  |  await page.route('**/api/**',route=>route.fulfill({json:{game:{...view(g),dialogue:{version:0,reply:'잠깐 이야기합시다.'}},provider:'offline',slots:[null,null,null],collection:[],endings}}));
  99  |  await page.goto('/');await page.getByRole('button',{name:/이어하기/}).click();
> 100 |  const retry=page.getByRole('button',{name:'배경음 재생',exact:true});await expect(retry).toBeVisible();await retry.click();await expect(retry).toHaveCount(0);
      |                                                                                                                                            ^ Error: expect(locator).toHaveCount(expected) failed
  101 |  await expect.poll(()=>page.getByTestId('music').evaluate((n:HTMLAudioElement)=>!n.paused&&n.currentTime>0)).toBe(true);
  102 | });
  103 | 
```