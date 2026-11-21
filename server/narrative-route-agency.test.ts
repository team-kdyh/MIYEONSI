import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {start} from './game.ts';
import {commitDialogue,type DialogueGame} from './dialogue.ts';
import {type EventProposal,type NarrativeReply} from './narrative.ts';
import {emptyProfile,ProfileStore} from './storage.ts';

const event=(extra:Partial<EventProposal>):EventProposal=>({kind:'relationship',subject:'npc',status:'accepted',text:'유나가 관계의 변화를 말한다.',reference:'',evidence:'',value:'',...extra});
const reply=(events:EventProposal[]=[],actionBeats:string[]=[]):NarrativeReply=>({line:'이야기를 듣고 있어요.',events,actionBeats,emotion:'차분함',pose:'listen',musicMood:'cafe-warmth',recall:[],conjecture:''});
function advance(g:DialogueGame,text:string,events:EventProposal[]=[],actions:string[]=[]){
 const before=structuredClone(g);
 try{return commitDialogue(g,null,text,reply(events,actions));}finally{assert.deepEqual(g,before,'Input must remain unchanged, including rejected proposals.');}
}
function confession():DialogueGame{
 let g=start('romance');for(let i=0;i<3;i++)g=advance(g,`카페 소리 이야기를 해요 ${i}`);
 for(const [value,text] of [['familiar','이제 조금 편해졌네요.'],['attracted','당신을 더 알아가고 싶어요.'],['confessed','저를 어떻게 생각해요?']])g=advance(g,text,[event({value})]);
 assert.equal(g.narrative!.relationship,'confessed');return g;
}
function couple(){const text='저도 좋아해요. 우리 사귀어요.';return advance(confession(),text,[event({subject:'mutual',value:'couple',evidence:text})]);}
function enteredDate(){const text='오늘 여기서 데이트해요.';const g=advance(couple(),text,[event({subject:'mutual',value:'date',evidence:text})]);assert.ok(g.narrative!.activeDate);assert.equal(g.narrative!.dates,0);return g;}
const dateFinish=(g:DialogueGame,text:string)=>event({subject:'mutual',status:'fulfilled',value:'date',reference:g.narrative!.activeDate!.eventId,evidence:text,text:'함께 종이배를 접으며 데이트를 경험했다.'});
const action=['유나가 작은 종이배를 접어 컵 옆에 놓는다.'];

test('route R1: a short refusal cannot finalize a separated relationship; explicit departure can',async()=>{
 const text='우리 관계는 여기서 끝내고 헤어질래요.';const g=advance(couple(),text,[event({subject:'player',value:'apart',evidence:text})]);
 const dir=await mkdtemp(path.join(tmpdir(),'afterhours-route-refusal-')),store=new ProfileStore(dir),p=emptyProfile();p.game=g;p.slots[0]=g;await store.save('a'.repeat(48),p);
 for(const refusal of ['안 돼요.','안돼요.','안 됩니다.'])assert.throws(()=>advance(g,refusal,[event({kind:'resolution',subject:'player',value:'leave',evidence:refusal})]));
 assert.deepEqual((await new ProfileStore(dir).load('a'.repeat(48))).profile,p);
 const departure='여기서 이야기를 끝내고 떠날게요.';const ended=advance(g,departure,[event({kind:'resolution',subject:'player',value:'leave',evidence:departure})]);assert.equal(ended.ending,'romance-2');
 p.game=ended;p.collection.push(ended.ending!);await store.save('a'.repeat(48),p);assert.deepEqual((await store.load('a'.repeat(48))).profile,p);
});
test('route R2: future-only location plans cannot move now; present movement remains valid',()=>{
 const g=advance(start('romance'),'카페에서 이야기해요.');
 for(const text of ['내일 옥상에서 만나요.','다음 주 옥상에서 만나요.','내일 옥상에서 만나요. 오늘 회사 회의가 있어요.','오늘은 회사에 있고 내일 옥상에서 만나요.'])assert.throws(()=>advance(g,text,[event({kind:'move',subject:'mutual',value:'rooftop',evidence:text})]));
 for(const text of ['지금 옥상으로 같이 가요.','지금 옥상으로 같이 가요. 내일 회사 회의가 있어요.','지금 옥상으로 가서 내일 공연 계획을 세워봐요.'])assert.equal(advance(g,text,[event({kind:'move',subject:'mutual',value:'rooftop',evidence:text})]).narrative!.location,'rooftop');
});
test('route R3: postponed or future-only activity cannot complete an entered date',()=>{
 const g=enteredDate();
 for(const text of ['오늘 데이트는 미루고 다음 주에 만나요.','오늘 데이트는 취소할게요.','다음 주에 같이 종이배를 접어요.'])assert.throws(()=>advance(g,text,[dateFinish(g,text)],action));
 assert.equal(g.narrative!.dates,0);assert.ok(g.narrative!.activeDate);
});
test('route controls: novel current activity and unrelated future work remain allowed',()=>{
 for(const text of ['저는 종이배를 접었어요. 같이 물에 띄워요.','저는 종이배를 접었어요. 내일 회사 회의는 연기해요.','저는 다음 소리를 녹음했어요.','저는 종이배를 접었어요. 내일 데이트는 취소할게요.','데이트는 취소하지 말아요. 저는 종이배를 접었어요.']){
  const g=enteredDate(),next=advance(g,text,[dateFinish(g,text)],action);assert.equal(next.narrative!.dates,1);assert.equal(next.narrative!.activeDate,undefined);
 }
});
test('route controls: sentence-scoped current date survives unrelated tomorrow work',()=>{
 const text='오늘 여기서 데이트해요. 내일은 회사 회의가 있어요.',g=advance(couple(),text,[event({subject:'mutual',value:'date',evidence:text})]);assert.ok(g.narrative!.activeDate);assert.equal(g.narrative!.dates,0);
});
test('route controls: short consent to current and future date offers preserves distinct consequences',()=>{
 for(const offerText of ['지금 여기서 데이트해요.','내일 여기서 데이트해요.']){
  const offered=advance(couple(),'데이트 제안이 궁금해요.',[event({subject:'mutual',status:'offered',value:'date',evidence:'데이트 제안이 궁금해요.',text:offerText})]);
  const ref=offered.narrative!.events.at(-1)!.id;
  for(const text of ['네','응','좋아요']){const accepted=advance(offered,text,[event({subject:'mutual',value:'date',reference:ref,evidence:text})]);assert.equal(!!accepted.narrative!.activeDate,offerText.startsWith('지금'));assert.equal(accepted.narrative!.dates,0);}
 }
});
test('route controls: short consent cannot execute a referenced future invitation as movement',()=>{
 for(const offerText of ['내일 옥상에서 만나요.','지금 옥상으로 가요.']){
  const g=advance(start('romance'),'다음 장소를 제안해 주세요.',[event({kind:'invitation',subject:'npc',status:'offered',text:offerText,value:'rooftop'})]);
  const e=event({kind:'move',subject:'mutual',value:'rooftop',reference:g.narrative!.events.at(-1)!.id,evidence:'좋아요'});
  if(offerText.startsWith('내일'))assert.throws(()=>advance(g,'좋아요',[e]));else assert.equal(advance(g,'좋아요',[e]).narrative!.location,'rooftop');
 }
});
