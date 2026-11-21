# Independent route audit — three concrete validation failures

2026-11-21. This audit uses a frozen copy of the **original root** code, not the concurrently active Ralph worktree. `snapshot-manifest.json` records before/copy/after hashes for nine source files. `server/narrative.ts` SHA-256 is `5597bad918c7aa1e79ae0e59a92b3ee233d70a1f9b65db0929fd010af5cee8f0`.

I read the current parent review, current narrative/date/agency/short-reply tests, provider instructions/schema, commit path, and persistence validation. I then ran exactly three focused negative proposal-validation scenarios and one matched positive control for each. No production changes, private save access, `.env` access, provider calls, external network, or runtime polling occurred.

Run from the original workspace:

```text
.\node_modules\.bin\tsx.cmd .ralph/v2-independent-route-audit/probe.ts
```

`results.json` retains the exact proposed replies, real generated reference IDs, before/after game states, and restored state summaries. All fixture states are built from `start('romance')` through normal `commitDialogue` calls; no narrative state is injected. `fetch` is disabled. Synthetic profiles exist only under this audit's `scratch/` folder. Reducer inputs are asserted unchanged after calls.

**These are possible structured model proposals tested against server validation, not actual generated OpenAI speech.** The event kinds, subjects, statuses, and values used are permitted by the current `narrativeSchema`. A model must still make the demonstrated mistake for a user to encounter the consequence. The point is that these unsafe proposals are not rejected by the server's claimed consistency checks.

| Scenario | User input | Mistaken model proposal | Expected consequence | Observed durable consequence |
| --- | --- | --- | --- | --- |
| R1: short refusal after separation | `안 돼요.` | player resolution / accepted / leave | No ending from this refusal | `ending = romance-2` |
| R2: future location plan | `내일 옥상에서 만나요.` | mutual move / accepted / rooftop | Keep current cafe scene; future plan may be recorded separately | `location = rooftop` immediately |
| R3: postpone the entered date | `오늘 데이트는 미루고 다음 주에 만나요.` | mutual relationship / fulfilled / date, referencing the actual activeDate ID | Do not record the deferred shared experience as completed | `dates: 0 → 1`, activeDate deleted |

All three wrong states passed `ProfileStore.save`, were restored byte-equivalent through a new store instance, and remained in a synthetic save slot. The ending also survived the same collection addition rule used by the server route. This demonstrates accepted consequence persistence, **not an independent persistence defect or an actual HTTP test**.

## Why each finding is bounded and concrete

**R1.** The setup earns the couple state through ordinary narrative transitions, then a player-grounded separation transitions to `apart` without an ending. The tested turn quotes `안 돼요.` exactly as its evidence. The refusal matcher covers `싫`, `거절`, `않`, `아니`, and selected `안 할/안 갈/안 해` forms, but not `안 돼요`. Absence of a matched refusal becomes consent, and the `leave` resolution branch only needs the prior `apart` state. A real positive control, `여기서 이야기를 끝내고 떠날게요.`, reaches the same ending. The refusal must not be equivalent to that explicit departure.

**R2.** The starting state is a normal cafe conversation with no past move. The move gate verifies accepted status, mutual subject, evidence substring, allowed location, and non-refusal; it does not distinguish tomorrow's meeting from movement now. The provider instructions explicitly say a mere plan should remain an invitation. `지금 옥상으로 같이 가요.` correctly moves under the same setup. Thus the failure is present/future execution semantics, not a missing location asset or unavailable route.

**R3.** The setup earns a couple, then records `오늘 여기서 데이트해요.` as accepted; dates remains zero and activeDate exists. On the following turn, the player explicitly postpones that date. The proposed fulfillment references the correct activeDate ID and includes one NPC action: `유나가 작은 종이배를 접어 컵 옆에 놓는다.`. The reducer accepts it because the scene/turn/reference match and actionBeats is nonempty. It does not require the player's current actual activity or recognize postponement. The positive control `저는 종이배를 접었어요. 같이 물에 띄워요.` with the same NPC action correctly completes once. Existing tests guard future dates without activeDate and same-turn completion, but do not cover postponement after scene entry.

The third case also unlocks the structural precondition for archive movement and clue progression, making it more than a cosmetic counter error. I did not execute a further ending chain, so no unobserved endpoint is claimed.

## Interpretation

Three negative probes failed; three positive controls passed. These totals are coverage accounting, not a quality grade. Provider prompts already advise against the demonstrated mistakes, but prompts and accepted JSON shapes do not supply the missing server checks. A fix should preserve natural short consent, positive present movement, and real shared activities rather than force players into preset answers or a closed activity vocabulary.

No production patch is included. These results apply only to the frozen original-root source hash above; they must not be attributed to a later Ralph candidate without rerunning the same controlled probes on that candidate.

## Follow-up isolated correction

After this read-only audit, the parent separately authorized an isolated prototype. `prototype/README.md` documents that later work against frozen sequential base SHA `1053990da5c64c51e902cd81321714ea0e90a73c6584ceeddce23e6464896971`. The final candidate has 132/132 selected regressions, a successful type check, and unchanged historical31 replay. The original findings and states above remain unchanged. No production integration was performed by this auditor.
