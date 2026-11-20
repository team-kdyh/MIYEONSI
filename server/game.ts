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
export type Game = {mode:Mode; step:number; scores:number[]; log:{speaker:string;text:string}[]; ending:string|null; office?:MissionAgreement; romance?:RomanceState};
export function start(mode:Mode,mission=0):Game {
 const g:Game={mode,step:mode==='office'?mission:0,scores:[0,0,0],log:[],ending:null};
 if(mode==='office')g.office=startOffice(mission);else g.romance=startRomance();
 g.log.push({speaker:mode==='office'?'박도현 · 46':'서유나 · 27',text:sceneFor(g).text});return g;
}
export function sceneFor(g:Game):Scene {return g.mode==='office'?officeScene(g):romanceScene(g);}
export function advance(game:Game, choice:number, text=''):Game {
 if(game.mode==='office')return advanceOffice(game,choice,text);
 return advanceRomance(game,choice,text);
}
export function view(game:Game|null){if(!game)return null;return {...game,scores:undefined,scene:game.ending?null:sceneFor(game),end:game.mode==='office'?officeEnd(game):game.ending?endings[game.mode].find(e=>e.id===game.ending):null};}
