import type {NarrativeState} from './narrative.ts';
import {storyGuide} from './story-guide.ts';
import {chapters, romanceEndings, startRomance, romanceScene, advanceRomance, type RomanceState} from './romance.ts';
import {missions, startOffice, officeScene, officeEnd, officeEndings, advanceOffice, type MissionAgreement} from './office.ts';
export type Mode = 'office' | 'romance';
export type Scene = { title:string; text:string; expression:number; choices:string[] };
export const stories:Record<Mode,Scene[]> = {
 office:missions.map((_,i)=>officeScene({mode:'office',step:i,scores:[0,0,0],log:[],ending:null,office:startOffice(i)})),
 romance:chapters

};
export const endings = {
 office:officeEndings,
 romance:romanceEndings
};
export type Game = {narrative?:NarrativeState;mode:Mode; step:number; scores:number[]; log:{speaker:string;text:string}[]; ending:string|null; office?:MissionAgreement; romance?:RomanceState};
export function start(mode:Mode,mission=0):Game {
 const g:Game={mode,step:mode==='office'?mission:0,scores:[0,0,0],log:[],ending:null};
 if(mode==='office')g.office=startOffice(mission);else g.romance=startRomance();
 g.log.push({speaker:mode==='office'?'박도현 · 46':'서유나 · 27',text:sceneFor(g).text});return g;
}
export function sceneFor(g:Game):Scene {if(g.narrative)return {title:g.mode==='office'?missions[g.step].title:({office:'늦은 사무실',cafe:'소리가 머무는 카페',riverside:'강가의 저녁',archive:'소리 보관실',rooftop:'옥상의 바람',rainstreet:'비 내리는 거리'}[g.narrative.location]),text:'',expression:0,choices:[]};return g.mode==='office'?officeScene(g):romanceScene(g);}
export function advance(game:Game, choice:number, text=''):Game {
 if(game.mode==='office')return advanceOffice(game,choice,text);
 return advanceRomance(game,choice,text);
}
export function view(game:Game|null){if(!game)return null;return {...game,scores:undefined,storyGuide:storyGuide(game),scene:game.ending?null:sceneFor(game),end:game.narrative&&game.ending?{id:game.ending,title:endings[game.mode].find(e=>e.id===game.ending)?.title??'이야기의 끝',text:game.log.at(-1)?.text??''}:game.mode==='office'?officeEnd(game):game.ending?endings[game.mode].find(e=>e.id===game.ending):null};}
