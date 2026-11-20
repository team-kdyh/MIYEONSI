import {missionOf} from './office.ts';
import {sceneFor,type Game} from './game.ts';

// The model may classify an utterance, never supply state, scores or an ending.
export function allowedIntents(g:Game){
 if(g.ending)return [];
 if(g.mode==='romance')return sceneFor(g).choices.map((meaning,i)=>({id:`romance:${g.step}:${i}`,meaning}));
 const m=missionOf(g),a=g.office;
 const t=m.terms.find(t=>!a?.secured[t.id])??m.terms.find(t=>a?.secured[t.id]!==t.required);
 return t?[...t.arguments,t.offer].map(a=>({id:`${t.id}:${a.id}`,meaning:a.sample})):[];
}
export function manipulation(text:string){return /ignore|system|developer|지시.{0,8}무시|규칙.{0,8}무시|즉시.{0,8}(승리|성공|엔딩)|점수|상태.{0,6}(변경|조작|설정)|ending|secured|intent\s*[:=]/i.test(text);}
