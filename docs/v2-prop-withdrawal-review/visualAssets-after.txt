import type {NarrativeState} from '../server/narrative';
import type {Mode} from '../server/game';

export type SpriteCell={sheet:string;column:number;label:string};
const cell=(sheet:string,column:number,label:string):SpriteCell=>({sheet:`/assets/${sheet}.png`,column,label});
type Pose= NarrativeState['pose'];
// Explicit actor-specific cells: twelve illustrations per actor, not motion presets.
export const actorPoses:Record<Mode,Record<Pose,SpriteCell>>={
 office:{
  neutral:cell('boss-expressions',0,'서류철을 품에 든다'),
  firm:cell('boss-expressions',1,'팔짱을 끼고 반론을 기다린다'),
  turn:cell('boss-expressions',2,'안경을 고쳐 쓴다'),
  smile:cell('boss-expressions',3,'작게 웃으며 손을 편다'),
  listen:cell('v2/boss-actions-a',0,'팔을 모으고 귀를 기울인다'),
  laugh:cell('v2/boss-actions-a',1,'허리에 손을 얹고 웃는다'),
  shy:cell('v2/boss-actions-b',2,'머쓱하게 이마를 짚는다'),
  watch:cell('v2/boss-actions-a',2,'손목시계를 가리킨다'),
  intense:cell('boss-expressions',1,'팔짱을 끼고 단호하게 바라본다'),
  offer:cell('v2/boss-actions-a',3,'서류를 펼쳐 보인다'),
  thinking:cell('v2/boss-actions-b',0,'턱에 손을 대고 생각한다'),
  surprised:cell('v2/boss-actions-b',1,'놀라 안경에 손을 댄다'),
  concern:cell('v2/boss-actions-b',2,'지친 듯 이마를 짚는다'),
  farewell:cell('v2/boss-actions-b',3,'손바닥을 펴며 양보한다'),
 },
 romance:{
  neutral:cell('yuna-expressions',0,'편안히 바라본다'),
  smile:cell('yuna-expressions',1,'두 손을 모으고 미소 짓는다'),
  thinking:cell('yuna-expressions',2,'손목을 감싸며 망설인다'),
  surprised:cell('yuna-expressions',2,'놀라 손목을 감싼다'),
  intense:cell('yuna-expressions',3,'고개를 기울여 강하게 응시한다'),
  watch:cell('v2/yuna-actions-a',0,'주의 깊게 귀를 기울인다'),
  listen:cell('v2/yuna-actions-a',0,'귀 가까이 손을 대고 듣는다'),
  laugh:cell('v2/yuna-actions-a',1,'입가에 손을 대고 웃는다'),
  shy:cell('v2/yuna-actions-a',2,'수줍게 두 손을 모은다'),
  offer:cell('v2/yuna-actions-a',3,'헤드폰 한쪽을 내민다'),
  turn:cell('v2/yuna-actions-b',0,'장난스럽게 손가락을 세운다'),
  concern:cell('v2/yuna-actions-b',1,'녹음기를 가슴에 안는다'),
  firm:cell('v2/yuna-actions-b',2,'카디건 자락을 쥐고 응시한다'),
  farewell:cell('v2/yuna-actions-b',3,'손바닥 위의 테이프를 내민다'),
 }
};
export function spriteCell(mode:Mode,pose:string,legacyExpression=0):SpriteCell{
 return actorPoses[mode][pose as Pose]??cell(`${mode==='office'?'boss':'yuna'}-expressions`,Math.max(0,Math.min(3,legacyExpression)),pose);
}
// Props in the art are literal. An abstract 'offer' must not conjure headphones
// while the committed beat describes a paper boat or a cup instead.
function withdrawnProp(action:string,prop:RegExp):boolean{
 // Deliberately bounded Korean action matching, not an interpretation of consent.
 // The latest named prop anchors the action so putting a different object away
 // does not erase the offered one. A subsequent re-offer restores its illustration.
 const names=[...action.matchAll(/헤드폰|이어컵|테이프|카세트|녹음기/g)];
 let withdrawn=false;
 for(let i=0;i<names.length;i++){
  const name=names[i];if(!prop.test(name[0]))continue;
  const phrase=action.slice(name.index!+name[0].length,names[i+1]?.index??action.length);
  const moves=[...phrase.matchAll(/넣|내려놓|감추|감춘|거두|거둔|치우|치운|내민|내밀|건네|건넨|안는다|들어 보/g)];
  for(const move of moves){
   const tail=phrase.slice(move.index!+move[0].length);
   if(/^(?:지\s*(?:않|못|말)|으?려|을까|을지)/.test(tail))continue;
   withdrawn=/^(넣|내려놓|감추|감춘|거두|거둔|치우|치운)/.test(move[0]);
  }
 }
 return withdrawn;
}
export function presentationPose(mode:Mode,pose:string,beats:readonly string[]=[]):string{
 if(!beats.length)return pose;
 const action=beats.join(' ');
 if(mode==='romance'){
  if(pose==='offer'&&(!/헤드폰|이어컵/.test(action)||withdrawnProp(action,/헤드폰|이어컵/)))return 'smile';
  if(pose==='farewell'&&(!/테이프|카세트/.test(action)||withdrawnProp(action,/테이프|카세트/)))return 'neutral';
  if(pose==='concern'&&(!/녹음기/.test(action)||withdrawnProp(action,/녹음기/)))return 'thinking';
 }
 return pose;
}
export function backgroundAsset(location:string){
 return `/assets/${['rooftop','rainstreet'].includes(location)?'v2/':''}${['office','cafe','riverside','archive','rooftop','rainstreet'].includes(location)?location:'office'}.png`;
}

