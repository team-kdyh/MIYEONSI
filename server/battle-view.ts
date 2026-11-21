import {battleTotals} from './battle-rules.ts';
import type {DialogueGame} from './dialogue.ts';
import {missions} from './office.ts';

/** Read-only projection of committed judgments. Never accepts UI/model gauge values. */
export function battleView(game:DialogueGame){
 if(game.mode!=='office')return null;
 const history=game.dialogue?.battleEvaluations??[];
 const last=history.at(-1);
 // Loading a slot bumps the concurrency version, but does not create an exchange.
 const turnVersion=[...(game.dialogue?.ledger??[])].reverse().find(e=>e.kind==='user_claim')?.version;
 const exchange=last?.id===`battle-${turnVersion}`?last:null;
 const unresolved=[...history].reverse().find(h=>h.kind==='pressure'&&!history.some(r=>r.reason===`response:${h.id}`)&&!game.narrative?.events.some(e=>e.kind==='concession'&&e.status==='accepted'&&e.value===h.target));
 const available=missions[game.step].terms.filter(t=>!game.narrative?.events.some(e=>e.kind==='concession'&&e.status==='accepted'&&e.value===t.id));
 const term=available.find(t=>t.id===(unresolved?.target??last?.target))??available[0];
 return {
  ...battleTotals(game),
  pressure:unresolved?.reason??term?.objection??'현재 쟁점의 합의가 확인되었습니다.',
  exchange:exchange?{id:exchange.id,playerDamage:exchange.playerDamage,bossDamage:exchange.bossDamage,guard:exchange.guard,combo:exchange.combo,reason:exchange.reason.startsWith('response:')?`${exchange.kind==='counter'?'반격':'방어'} · ${exchange.npcQuote}`:exchange.reason}:null,
 };
}
export type BattleView=NonNullable<ReturnType<typeof battleView>>;
