# v2 reducer audit after AC3

2026-11-21 11:58 KST. AC3 story/memory implementation is reported complete, with music/presentation integration still active. This is a current reducer audit before paid conversation QA, not an overall game verdict.

The original evidence JSONs were preserved. Re-execution used the same ordinary fresh-state setup, the same positive controls and schema-valid proposals. Only an optional output suffix was added to the isolated probe scripts; the event schema did not require adaptation.

```powershell
node --import tsx .ralph/v2-review/reducer-probe.ts after-ac3
node --import tsx .ralph/v2-review/agency-probe.ts after-ac3
```

Outputs: `reducer-probe-results-after-ac3.json`, `agency-probe-results-after-ac3.json`. Both captured identical source hashes before/after their execution. No provider/network/API call, production edit, suite run, job polling or signal was performed.

## Actual result: four remain, one safety guard fixed

| Initial issue | Current observation | Disposition |
|---|---|---|
| Valid acceptance plus question/unrelated dislike | The simple relationship acceptance control becomes `couple`. Adding a follow-up question or unrelated food dislike still rejects the whole turn; an accepted move plus a weather question also fails. | **Remains** |
| Refusing separation becomes separation | `헤어지고 싶지 않아요.` with player `status:'refused', value:'apart'` still returns successfully and changes `couple` to `apart`. | **Remains — agency blocker** |
| Offered future date counted as experienced | The same `status:'offered', value:'date'` proposal is now rejected atomically; the game remains unchanged and `dates` cannot increase through that path. | **Original unsafe transition fixed**; this does not prove a natural model response chooses a valid pending invitation |
| Correct repeated detail fails reply | Repeating the correctly owned `플레이어의 이름은 지호다.` event still rejects the entire dialogue. | **Remains** |
| Named player action committed as NPC | After recording player name 지호, input `오늘 카페가 조용하네요.` plus action `지호는 유나의 손을 잡는다.` still commits the fabricated action as an NPC event. | **Remains — agency blocker** |

All seven reducer proposals pass the current schema. Source objects remain unchanged by the reducer, including the error paths. The safe NPC action controls (`유나가 당신을 바라보며 웃는다.`, `유나가 컵 테두리를 가볍게 두드린다.`) both pass. No invalid setup or missing required field accounts for the observed issues.

The future-date probe's generic `expectationMet:false` means it expected a retained pending proposal and instead received an error. It must **not** be read as evidence that the old premature-date mutation remains: `returned:false`, unchanged source object and the new accepted-status guard show that specific unsafe mutation is closed. A future invitation should be represented through the separate valid invitation contract and reviewed in an actual model transcript.

## Exact source hashes

| File | SHA256 |
|---|---|
| `server/narrative.ts` | `b22323aa2cf5fe2d23729e4b026c9982d03865ad07964051f4a3d383821361b1` |
| `server/game.ts` | `f8b7619574b1181461e9cf22d1b073c220718dec704758780e226fc68ff3fbf0` |
| `server/provider.ts` | `c248a81d24cf7fd82f3cc5ccb86d3d566cce232fbc0548574883ebdf047d235f` |
| `server/dialogue.ts` | `428f8bfbfb965a4fa0736eece601d643b473aaabbd749d30d01705a4e695b448` |
| `server/index.ts` | `e4627fe5595e7f5ad877de761bb4b72e14574e037dee6ab83e183a83016ba2f4` |

The narrative/provider hashes also match the AC3 worker's `docs/v2-ac3-source-hashes.json`.

Relevant current narrative lines: `34–35` split clauses but do not split ordinary periods; `52,59` use clause consent, while the couple/date branches still call full-input `consent(text)` at `71,73`; `67,72` specifically permit the refused/apart combination and then apply it; `73` now requires accepted status for dates; `95,98` skip duplicates then reject the reply for unequal event count; `29,99` implement the pronoun-only action guard and unconditional NPC action-event projection.

## AC3 coverage read, with limits

Read `docs/v2-ac3-verification.md`, `docs/v2-ac3-unit-run.txt`, `docs/v2-ac3-source-hashes.json`, `server/v2-story.test.ts` and the relevant ten-turn test in `server/narrative.test.ts`. The saved log reports **134/134 passing**, and the worker correctly labels this deterministic/mock evidence with paid quality approval deferred. This audit did not rerun that suite.

- **Eight office missions:** fixtures provide new plans using remote review, a lunch walk, recorded handoff, source links, asynchronous discussion and changed remote days. Each mission now requires its own objective IDs; generic scope/owner/deadline/boundary bookkeeping cannot finish a credit-recovery mission. This addresses the earlier generic-goal integration concern. The tests inject correct model events; they do not demonstrate that the real model identifies the right goals or that a novel plan's meaning satisfies them. They currently cover successful resolution and absent-objective refusal, not a live sample of all outcome classes.
- **Pacing:** each office case retains the scene after five no-event chat turns; `narrative.test.ts` checks ten no-event turns without automatic chapter advancement. Romance fixtures require ordered familiarity, attraction, confession, coupling, date and archive transition and reject same-turn coupling/date acceleration. These prove mechanical gates and absence of the old fixed three-turn jump, not natural romance pacing.
- **Four endings:** injected events can reach the four thematic outcomes. Two different clue value IDs are required for restore; repeated wording of the same clue ID does not substitute. Leaving blocks later couple-only outcomes. Again, these are reachability fixtures, not generated narrative quality observations.
- **Memory and persistence:** the ten-turn fixture records the player's name/fruit dislike/preference and an NPC promise, accepts it, adds seven intervening conversational turns, saves three slots and reloads through a new store, then injects the NPC's promise fulfillment. It verifies durable typed events, prompt inclusion and canonical fact retention. It does **not** ask the actual model to recall that memory or originate the fulfillment and therefore cannot replace the planned 12-turn real conversation.
- **Refusal scope gap:** AC3's negative tests correctly reject accepting a relationship when the user says they do not want it. They do not cover the opposite proposition, refusing to separate; the retained failed probe above demonstrates why both polarities are necessary.

## Before paid QA

Fix and re-probe the four observed issues first so the bounded 32-call allocation is not spent on predictable reducer errors. Keep this report and the initial findings historical; use new result filenames/source hashes after repair. Then review actual Korean conversations and viewport captures with `critic-plan.md`. No source audit or mock suite can establish universal natural-language quality, listening quality, or a publication-ready experience.
