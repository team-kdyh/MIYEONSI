import React from 'react';
import type {BattleView} from '../server/battle-view';

export function BattleHud({battle}:{battle:BattleView}){
 const hit=battle.exchange;
 return <aside className="battle-hud" aria-label="설득 배틀">
  <div className="battle-gauges">{([{key:'player',label:'플레이어 여유',value:battle.player,damage:hit?.playerDamage??0},{key:'boss',label:'부장 버티기',value:battle.boss,damage:hit?.bossDamage??0}]).map(g=><div className={`battle-gauge ${g.key}`} key={g.key}>
   <div className="battle-label"><strong>{g.label}</strong><span>{g.value} / 100</span></div>
   <div className="battle-track" role="meter" aria-label={g.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.value}>
    <div className="battle-fill" style={{width:`${g.value}%`}}/>
   </div>
   <span key={hit?.id??'quiet'} className={`battle-damage ${g.damage?'is-hit':''}`}>{g.damage?`−${g.damage}`:g.key==='player'&&hit?.guard?`방어 +${hit.guard}`:'피해 0'}</span>
  </div>)}</div>
  <p className="battle-pressure"><b>현재 압박</b> {battle.pressure}</p>
  <p className="battle-exchange" role="status"><b>직전 교환</b> {hit?<>{hit.guard>0&&'방어 · '}{hit.combo>0&&'연계 · '}{hit.reason}</>:'피해 없음 · 대화하며 협상의 실마리를 찾아보세요.'}</p>
 </aside>;
}
