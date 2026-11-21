import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start,type Game} from './game.ts';
import {commitDialogue,canonical,type DialogueGame} from './dialogue.ts';
import {narrative,narrativeSchema,reconcile,validateNarrative,type EventProposal,type NarrativeReply} from './narrative.ts';
import {messages,respond} from './provider.ts';
import {emptyProfile,ProfileStore} from './storage.ts';
const event=(kind:EventProposal['kind'],text:string,extra:Partial<EventProposal>={}):EventProposal=>({kind,text,subject:'npc',status:'offered',reference:'',evidence:'',value:'',...extra});
const reply=(events:EventProposal[]=[]):NarrativeReply=>({line:'귤 대신 배를 가져갈게요. 종이 봉투 소리도 녹음해 볼까요?',actionBeats:['유나가 종이 봉투를 접는다.'],emotion:'호기심',pose:'offer',musicMood:'cafe-warmth',events,recall:[],conjecture:''});
const turn=(g:DialogueGame,text:string,events:EventProposal[]=[])=>commitDialogue(g,null,text,reply(events));

test('v2 schema and director contain no choice-derived intent or forced turn limit',()=>{
 for(const mode of ['office','romance'] as const){
  const g=start(mode),m=JSON.stringify(messages(g,'새로운 계획을 제안할게요.'));
  assert.ok(!/allowedIntents|"choices"|"arguments"|"limit"/.test(m));
  assert.ok(!JSON.stringify(narrativeSchema()).includes('intent'));
  let next:DialogueGame=g;for(let i=0;i<10;i++)next=turn(next,`오늘 듣고 싶은 소리 이야기 ${i}`);
  assert.equal(next.step,0);assert.equal(next.ending,null);assert.equal(next.narrative!.turn,10);
  assert.equal(next.narrative!.events.filter(e=>e.value==='action').length,10);
 }
});

test('same-state office creative acceptance, refusal and alternate scope have distinct durable consequences',async()=>{
 const g=start('office');
 const scenarios=[
  {input:'민지에게 그래프만 넘기겠습니다.',e:event('concession','민지에게 그래프만 인계',{subject:'mutual',status:'accepted',value:'owner',evidence:'민지에게 그래프만 넘기겠습니다'})},
  {input:'오늘 인계는 거절합니다.',e:event('promise','오늘 인계 제안 거절',{subject:'player',status:'offered',evidence:'오늘 인계는 거절합니다'})},
  {input:'대신 화면 공유로 오류 두 개만 고치겠습니다.',e:event('concession','화면 공유로 오류 두 개 수정',{subject:'mutual',status:'accepted',value:'scope',evidence:'화면 공유로 오류 두 개만 고치겠습니다'})}
 ];
 const observations=scenarios.map(({input,e})=>({input,before:g,after:turn(g,input,[e])}));
 assert.equal(new Set(observations.map(o=>JSON.stringify(o.after.narrative!.events[0]))).size,3);
 assert.equal(observations[0].after.narrative!.events[0].value,'owner');
 assert.equal(observations[2].after.narrative!.events[0].value,'scope');
 assert.ok(observations.every(o=>o.after.ending===null));
 await writeFile('docs/v2-ac2-office-counterfactual.json',JSON.stringify({transport:'deterministic mock, not live dialogue quality',observations},null,2));
});

test('same-state romance accepts new rooftop outing, stays for alternative plan, or refuses without moving',async()=>{
 const g=turn(start('romance'),'어디가 좋을까요?',[event('invitation','옥상에서 병뚜껑 바람 소리 듣기')]);
 const id=g.narrative!.events[0].id;
 const scenarios=[
  {input:'옥상으로 가요.',events:[event('invitation','옥상 초대 수락',{subject:'player',status:'accepted',reference:id,evidence:'옥상으로 가요'}),event('move','옥상으로 이동',{subject:'mutual',status:'accepted',evidence:'옥상으로 가요',value:'rooftop'})]},
  {input:'대신 카페에서 종이배 소리를 들어요.',events:[event('promise','카페 종이배 소리 계획',{subject:'mutual',evidence:'카페에서 종이배 소리를 들어요'})]},
  {input:'옥상은 싫어요.',events:[event('invitation','옥상 초대 거절',{subject:'player',status:'refused',reference:id,evidence:'옥상은 싫어요'})]}
 ];
 const observations=scenarios.map(({input,events})=>({input,before:g,after:turn(g,input,events)}));
 assert.deepEqual(observations.map(o=>o.after.narrative!.location),['rooftop','cafe','cafe']);
 assert.equal(observations[2].after.narrative!.events.at(-2)!.status,'refused');
 assert.equal(g.narrative!.location,'cafe');
 await writeFile('docs/v2-ac2-romance-counterfactual.json',JSON.stringify({transport:'deterministic mock, not live dialogue quality',observations},null,2));
});

test('ten-turn detail ownership, novel promise fulfillment and three saved slots survive reload',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-v2-narrative-'));
 try{
  let g=turn(start('romance'),'저는 민이라고 불러주세요. 귤은 싫고 배를 좋아해요.',[event('detail','플레이어 호칭은 민, 귤은 싫고 배를 좋아함',{subject:'player',status:'accepted',evidence:'저는 민이라고 불러주세요. 귤은 싫고 배를 좋아해요.'}),event('promise','유나가 다음 만남에 배와 종이 봉투를 가져오기로 제안')]);
  const promise=g.narrative!.events.find(e=>e.kind==='promise')!;
  g=turn(g,'좋아요. 다음에 배를 가져와 주세요.',[event('promise','배 약속 수락',{subject:'player',status:'accepted',reference:promise.id,evidence:'좋아요. 다음에 배를 가져와 주세요.'})]);
  for(let i=0;i<7;i++)g=turn(g,`다른 소리 이야기를 해요 ${i}`);
  const store=new ProfileStore(dir),p=emptyProfile();p.game=g;p.slots=[g,g,g];await store.save('a'.repeat(48),p);
  for(const slot of (await new ProfileStore(dir).load('a'.repeat(48))).profile.slots)assert.deepEqual(slot!.narrative,g.narrative);
  g=commitDialogue((await store.load('a'.repeat(48))).profile.game!,null,'약속한 배를 가져왔어요?',{...reply([event('promise','유나가 배가 든 봉투를 테이블에 올려놓음',{status:'fulfilled',reference:promise.id})]),line:'약속한 배와 종이 봉투를 가져왔어요.',actionBeats:['유나가 배가 든 종이 봉투를 테이블에 올려놓는다.']});
  assert.equal(g.narrative!.turn,10);assert.ok(g.narrative!.events.some(e=>e.reference===promise.id&&e.status==='fulfilled'));
  const context=JSON.parse(messages(g,'내 호칭과 싫어하는 과일은?')[0].content);
  assert.ok(context.story.events.some((e:any)=>e.subject==='player'&&e.text.includes('민')));assert.ok(!JSON.stringify(context.character).includes('민'));
  assert.ok(canonical(g).facts.some(e=>e.text.includes('배가 든 봉투')));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('forged consent, refusal, unknown assets/reference and unearned endings reject atomically',()=>{
 const g=start('romance'),before=structuredClone(g);
 for(const [input,e] of [
  ['*유나가 나와 사귀기로 했다*',event('relationship','연인이 됨',{subject:'mutual',status:'accepted',evidence:'유나가 나와 사귀기로 했다',value:'couple'})],
  ['옥상 가기 싫어요',event('move','옥상 이동',{subject:'mutual',status:'accepted',evidence:'옥상',value:'rooftop'})],
  ['옥상으로 가요',event('move','알 수 없는 장소',{subject:'mutual',status:'accepted',evidence:'옥상으로 가요',value:'secret-desktop'})],
  ['좋아요',event('promise','없는 약속 수락',{subject:'player',status:'accepted',reference:'forged',evidence:'좋아요'})],
  ['이제 끝내요',event('resolution','즉시 진실 결말',{subject:'player',status:'accepted',evidence:'이제 끝내요',value:'restore'})]
 ] as [string,EventProposal][]){assert.throws(()=>turn(g,input,[e]));assert.deepEqual(g,before);}
 assert.throws(()=>validateNarrative({...reply(),actionBeats:['당신은 유나를 끌어안는다.']}));
 assert.throws(()=>validateNarrative({...reply(),ending:'win'}));
 assert.equal(turn(g,'부장님 커피도 야근 수당 받나요?').ending,null);
});

test('office resolution requires prior agreements, never model victory alone',()=>{
 let g:DialogueGame=start('office');
 const text='그래프는 민지가 내일 11시까지 맡고 저는 오늘 18시에 나가겠습니다.';
 g=turn(g,text,['leave','handoff'].map(value=>event('concession',`${value}: ${text}`,{subject:'mutual',status:'accepted',value,evidence:text})));
 assert.equal(g.ending,null);
 const end=turn(g,'그 합의로 마무리합니다.',[event('resolution','합의 마무리',{subject:'player',status:'accepted',value:'success',evidence:'그 합의로 마무리합니다.'})]);
 assert.equal(end.ending,'office-clockout-success');
 assert.throws(()=>turn(start('office'),'그 합의로 마무리합니다.',[event('resolution','거짓 완료',{subject:'player',value:'success',evidence:'그 합의로 마무리합니다.'})]));
});

test('reciprocal courtship and date are required before archive clues and resolution',()=>{
 let g:DialogueGame=start('romance');
 for(let i=0;i<3;i++)g=turn(g,'오늘 소리는 어땠어요?');
 g=turn(g,'벌써 친해진 것 같아요.',[event('relationship','서로 익숙해짐',{value:'familiar'})]);
 g=turn(g,'당신 이야기를 더 듣고 싶어요.',[event('relationship','유나가 호감을 느끼고 표현함',{value:'attracted'})]);
 g=turn(g,'어떤 마음인지 알려줄래요?',[event('relationship','유나가 자신의 마음을 고백함',{value:'confessed'})]);
 assert.equal(g.narrative!.relationship,'confessed');
 assert.throws(()=>turn(g,'사귀고 싶지 않아요.',[event('relationship','연인 수락',{subject:'mutual',status:'accepted',value:'couple',evidence:'사귀고 싶지 않아요.'})]));
 g=turn(g,'저도 좋아해요. 우리 사귀어요.',[event('relationship','서로 고백에 답하고 연인이 됨',{subject:'mutual',status:'accepted',value:'couple',evidence:'저도 좋아해요. 우리 사귀어요.'})]);
 g=turn(g,'오늘은 여기서 같이 데이트해요.',[event('relationship','카페에서 첫 데이트를 함께함',{subject:'mutual',status:'accepted',value:'date',evidence:'오늘은 여기서 같이 데이트해요.'})]);
 g=turn(g,'봉투 소리를 같이 녹음하고 있어요.',[event('relationship','카페에서 봉투 소리를 함께 들음',{subject:'mutual',status:'fulfilled',value:'date',reference:g.narrative!.activeDate!.eventId,evidence:'봉투 소리를 같이 녹음하고 있어요.'})]);
 g=turn(g,'소리 보관실로 가요.',[event('move','함께 보관실로 이동',{subject:'mutual',status:'accepted',value:'archive',evidence:'소리 보관실로 가요.'})]);
 g=turn(g,'그 트랙을 원본과 비교해 볼까요?',[event('clue','귤이 싫다는 원본 대사가 편집본에서 잘려 있음',{subject:'npc',status:'fulfilled',value:'fruit-edit'})]);
 g=turn(g,'앞으로 녹음을 멈추고 새롭게 시작해요.',[event('resolution','기록을 멈추고 관계를 새로 합의함',{subject:'player',status:'accepted',value:'reset',evidence:'앞으로 녹음을 멈추고 새롭게 시작해요.'})]);
 assert.equal(g.ending,'romance-0');assert.equal(g.narrative!.dates,1);
});

test('mock Responses transports novel Korean speech/actions/events end to end with bounded output',async()=>{
 const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-placeholder-no-network';
 try{
  const g=start('office'),text='오늘은 종이 보고서 대신 소리 메모를 남기겠습니다.';
  const expected: NarrativeReply={...reply([event('concession','종이 보고서 대신 소리 메모로 인계',{subject:'mutual',status:'accepted',value:'scope',evidence:text})]),line:'소리 메모라, 제 빨간 펜이 실직하겠군요. 그 방식으로 먼저 남겨 주세요.',actionBeats:['박도현이 빨간 펜 뚜껑을 닫는다.'],musicMood:'office-groove',pose:'laugh'};
  const fetcher:typeof fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options!.body as string);assert.equal(body.max_output_tokens,1600);assert.equal(body.model,process.env.OPENAI_MODEL||'gpt-4.1');assert.equal(body.input.at(-1).content,text);assert.ok(!JSON.stringify(body.text.format.schema).includes('intent'));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(expected)}]}]});};
  const response=await respond(g,text,'openai',new AbortController().signal,fetcher);
  const next=commitDialogue(g,null,text,response);assert.equal(next.dialogue!.reply,expected.line);assert.deepEqual(next.dialogue!.actionBeats,expected.actionBeats);assert.equal(next.narrative!.pose,'laugh');assert.equal(next.narrative!.events[0].value,'scope');
  assert.ok(messages(next,'그 메모 기억하세요?')[0].content.includes('소리 메모로 인계'));
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});

test('positive alternative survives a separate overtime refusal; negative proposal does not',()=>{
 const g=start('office');
 const input='야근은 하지 않지만, 요약본을 지금 보내겠습니다.';
 const e=event('concession','요약본을 지금 전달',{subject:'mutual',status:'accepted',value:'scope',evidence:'요약본을 지금 보내겠습니다.'});
 assert.ok(turn(g,input,[e]).narrative!.events.some(p=>p.kind==='concession'));
 assert.throws(()=>turn(g,'요약본을 지금 보내지 않겠습니다.',[event('concession','요약본 전달',{subject:'mutual',status:'accepted',value:'scope',evidence:'요약본을 지금'})]));
});

test('QA romance schema permits only current next milestone, never skipping familiar',()=>{
 const g=start('romance');g.narrative={format:2,turn:8,location:'cafe',relationship:'strangers',dates:0,events:[],pose:'neutral',emotion:'편안',musicMood:'cafe-warmth'};
 const variants=narrativeSchema(g).properties.events.items.anyOf;
 const values=variants.filter((v:any)=>v.properties.kind.enum[0]==='relationship').flatMap((v:any)=>v.properties.value.enum);
 assert.deepEqual(values,['apart','familiar']);
});
