import React from 'react';
import type {Mode} from '../server/game';
import {spriteCell,presentationPose,yunSprite} from './visualAssets';
import {bosses} from '../server/office-match';

export function CharacterSprite({mode,pose:requestedPose,expression,turn,actionBeats=[],boss='park'}:{mode:Mode;pose:string;expression:number;turn:string;actionBeats?:string[];boss?:keyof typeof bosses}){
 const pose=presentationPose(mode,requestedPose,actionBeats);
 const asset=mode==='office'&&boss==='yun'?yunSprite(pose):spriteCell(mode,pose,expression);
 return <div className="sprite-entry" key={`${mode}-${turn}-${asset.sheet}-${asset.column}`}>
  <div role="img" aria-label={`${mode==='office'?bosses[boss].name+' 부장':'서유나'} · ${asset.label}`} data-actor={mode==='office'?boss:'yuna'} data-sheet={asset.sheet.includes("boss-actions-a")?"boss-actions-a":undefined} data-pose={pose} data-expression={asset.column} className={`sprite ${mode}`} style={{backgroundImage:`url(${asset.sheet})`,backgroundPosition:`${asset.column*100/3}% center`}}/>
 </div>;
}
