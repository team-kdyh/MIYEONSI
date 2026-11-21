# Independent sequential-candidate review — bounded lifecycle defects

Captured **2026-11-21 04:26:29 UTC**, before any later worker edits. This is a read-only frozen snapshot of `C:/Users/gjtjw/.ouroboros/worktrees/대화형 스토리진행/ralph-afterhours-v2-seq-7b46bae`, not a verdict on its eventual generation result.

`server/narrative.ts` SHA256: **1652aecf8c1d02e2ba0e19c813fece5898ebe57b16480519bd4836c23b9030ba**. All six copied module hashes were stable before/copy/after; see `snapshot-manifest.json`. Production sources, the active worker, private saves and `.env` were untouched. No API calls, servers, model mocks presented as live evidence, or Ouroboros polling/signals were used.

## Method and exact shared setup

Run from the original workspace:

```text
npx tsx .ralph/v2-seq-independent-review/probe.ts
```

The harness imports only copied local reducer modules and forbids `fetch`. Each synthetic case starts with `start('romance')`, creates a normal offered promise through `reconcile`, and then proposes fulfillment through `reconcile` using the actual offer's generated ID. It does not inject a narrative/profile state. Every input game remained byte-identical after its reducer call, including rejections.

Shared offer fields:

```json
{"kind":"promise","subject":"npc or player","status":"offered","text":"노란 리본을 가져오는 약속","value":"independent-promise","reference":"","evidence":"player offer input, otherwise empty"}
```

NPC offer input: `다음에 리본을 가져와 줄 수 있어요?`

Player offer input: `제가 다음에 노란 리본을 가져올게요.`

Shared fulfillment fields: same kind/subject/value, `status: fulfilled`, `text: 노란 리본 약속을 이행했다.`, `reference: actual offer ID`, and `evidence: exact player input` for player-owned promises, empty for NPC-owned promises. Default reply is `알겠어요.`, with the table's action beats; remaining fields are `emotion: 차분함`, `pose: listen`, `musicMood: cafe-warmth`, `recall: []`, `conjecture: ""`.

These are validation probes of possible model proposals, not evidence that a new model produced them. The strongest findings require only common inflections and subject ownership, not universal natural-language inference.

## Minimal concrete failures

| Case | Owner / fulfillment input | NPC action beats | Expected | Observed |
|---|---|---|---|---|
| Ordinary present transfer | NPC / `리본은요?` | `유나가 노란 리본을 건넨다.` | Commit | Reject |
| Past transfer | NPC / `리본은요?` | `유나가 노란 리본을 건넸다.` | Commit | Reject |
| Topic adverb | Player / `이번에는 노란 리본 가져왔어요.` | None | Commit | Reject |
| Topic adverb | Player / `오늘은 노란 리본 가져왔어요.` | None | Commit | Reject |
| Object left behind | Player / `노란 리본 놓고 왔어요.` | None | Reject | Commit |
| Object dropped/lost | Player / `노란 리본을 놓쳤어요.` | None | Reject | Commit |

Matched controls isolate these findings:

- `유나가 노란 리본을 건네준다.` commits under the identical NPC setup. Thus the valid `건넨다`/`건넸다` failures are not due to a missing offer, reference, owner or object.
- `노란 리본 가져왔어요.`, `노란 리본을 가져왔어요.` and `오늘 노란 리본 가져왔어요.` all commit. Adding topic-marked `이번에는`/`오늘은` alone blocks the valid player delivery.
- NPC `이번에는 유나가 노란 리본을 건네준다.` and `오늘은 유나가 노란 리본을 건네준다.` reject, while the same beat without that adverb commits. This avoids conflating the adverb failure with the transfer inflection failure.

Source-level cause in the frozen snapshot: the delivery regex contains `건네` but not inflected `건넨/건넸`, and includes the overly broad `놓` substring. The actor regex extracts `이번에` or `오늘` as an unapproved performer from the topic adverbs. These local explanations fit the matched executions; no source modifications are proposed by this audit.

## Other requested natural forms

Under the same NPC setup, each of `유나가 노란 리본을 내민다.`, `유나가 노란 리본을 꺼내 보여준다.`, `유나가 노란 리본을 드려요.` and `유나가 노란 리본을 전해요.` rejects. The first two visibly show the brought object. The polite narration variants and line-only `자, 노란 리본 드려요.` / `약속한 노란 리본 전해요.` also reject; line-only present transfer is weaker evidence and is **not needed** for the core defect finding above.

Recipient/actor distinction controls pass when the transfer verb is supported:

- Player `친구에게 노란 리본을 가져왔어요.` and `유나에게 노란 리본을 가져왔어요.` commit.
- NPC `유나가 당신에게 노란 리본을 건네준다.` commits.
- Player `친구가 노란 리본을 가져왔어요.` rejects, and NPC `친구가 노란 리본을 건네준다.` rejects. The source therefore distinguishes these tested recipients and actors; it does not simply reject all mentions of another person.

## Creative activities remain open, but incomplete actions still fulfill

Both requested positive controls pass:

1. Offer input `작은 종이배를 접어 줄래요?`, NPC offer text `유나가 작은 종이배를 접어 주기로 제안한다.`, then input `종이배는요?`, fulfillment text `유나가 작은 종이배를 접었다.`, action `유나가 작은 종이배를 접는다.` → commits.
2. Offer input `그림을 그려 줄래요?`, NPC offer text `유나가 그림을 그려주기로 제안한다.`, then input `어떤 그림인가요?`, fulfillment text `유나가 고양이를 그렸다.`, action `유나가 고양이를 그린다.` → commits. The new drawing subject need not repeat the original object.

Two paired negative controls wrongly commit with those same offers:

| Offer | Later input | Fulfillment proposal text | Sole action beat | Expected / observed |
|---|---|---|---|---|
| Draw a picture, as above | `그림은요?` | `유나가 그림을 그려 주는 약속을 이행했다.` | `유나가 그림을 바라본다.` | Reject / commit |
| Fold a paper boat, as above | `종이배는요?` | `유나가 작은 종이배를 접는 약속을 이행했다.` | `유나가 작은 종이배를 만지작거린다.` | Reject / commit |

There are no prior action beats in these cases. Looking at a picture or touching a paper boat does not demonstrate doing the promised drawing/folding. This is the same bounded completion issue as the original ribbon-looking defect, while the valid creative controls show why closing the activity vocabulary would be inappropriate.

## Preserved controls and historical evidence

All original four negative controls now reject: unrelated note-closing proposal self-support, merely looking at a promised ribbon, player searching for it, and a friend bringing it. Particleless player delivery, `그걸 가져왔어요.` and `다 했어요.` with one pending owned promise commit.

The **historical** `docs/v2-live-31.json` response replays successfully on this frozen reducer. Its NPC `파란 종이 한 장 가져오기` promise is fulfilled using the real recorded prior action at turn13: `가방에서 조그맣게 접어둔 파란 종이를 꺼내고 노트 위에 펼쳐 놓는다`. This preserves the earlier actual-performance evidence. It is neither a fresh API call nor proof that every word/actor interpretation in that historical reply is correct.

The final 33-case matrix has 17 expected outcomes and 16 mismatches, including the explicitly weaker polite/line-only probes. Those totals are coverage accounting, **not a quality grade**. `probe-results.json` preserves exact offers, IDs, inputs, proposals, replies, before/after states and errors. `probe-results-first32.json` preserves the initial pass before the supported-transfer controls were clarified. The final source snapshot is unchanged between runs.

Recommendation to the parent: treat the common `건넨다`, topic-adverb and `놓고 왔어요` contrasts as concrete unresolved candidate defects, retain the original four negative controls and creative positives, and evaluate any later fix on its own exact source hash. This audit neither demands exhaustive Korean NLU nor grants release approval. Fresh-model verification remains unavailable under the consumed API allocation.
