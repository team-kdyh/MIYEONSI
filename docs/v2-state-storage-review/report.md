# Independent commitment persistence review

2026-11-21. Read-only review of the completed implementation snapshot from `ralph-afterhours-v2-state-49c8729`. Production and the Ralph worktree were not edited. No API, network, environment-file, private-save, or runtime-job access occurred. Proposed replies are controlled test inputs, not observed model speech.

Two concrete validation defects were reproduced. Persistence kept the state it was given, including one incorrectly accepted completion. A small isolated patch fixes these two reproductions; it is not a complete natural-language validator or release approval.

## Frozen source

The exact snapshot and initial source SHA256 values are in `snapshot-manifest.json`. All 11 sampled files still matched the live worktree at the final read-only stability check:

| File | Base SHA256 |
|---|---|
| server/commitments.ts | 0e3b7da41c214ef3cb241e5df58c2ff9628231a021be0d1708292d373743ae48 |
| server/narrative.ts | 9f9c696431d134a0a9db50f6c6c2c7872f0f1970fd87ce6f2da575ec74a13ca3 |
| server/storage.ts | dc866ea96e5af12d75622f5b534cefced07fb9c1141134e9da8f651e92c0226b |

These are the new worker sources, not root's older 5aa narrative checkpoint.

## R1: the promised target is bypassed by an ordinary recipient particle

Normal sequence through `start('romance')` and `commitDialogue`, without injected game state:

1. Player: “제가 유나에게 노란 리본을 가져오는 약속을 할게요.”
2. Controlled offer records one condition: performer player, target 유나, action “노란 리본을 가져오는”.
3. Player: “좋아요.” The offered promise is accepted by its generated ID.
4. Player: “친구에게만 노란 리본을 건넸어요.” The controlled response proposes progress for that exact condition and a fulfilled event for the original promise.

Observed: the condition and original promise become completed. Its evidence event contains the delivery to **friend only**, while the condition still says target 유나. The resulting state, IDs and wrong evidence survive save, three slots, a new ProfileStore, and a separate fresh Node process.

Matched controls on the same accepted starting state:

| Actual player text | Expected | Base result | Isolated patch |
|---|---|---|---|
| 유나에게만 노란 리본을 건넸어요. | accept | accept | accept |
| 유나한테만 노란 리본을 건넸어요. | accept | accept | accept |
| 친구에게 노란 리본을 건넸어요. | reject | reject | reject |
| 친구에게만 노란 리본을 건넸어요. | reject | **accept** | reject |
| 친구한테만 노란 리본을 건넸어요. | reject | **accept** | reject |
| 유나에게는 안 주고 친구에게만 줬어요. | reject | reject | reject |

The original recipient expression only recognizes whitespace immediately after 에게/한테. Adding 만 makes the wrong recipient disappear from that check. This is not merely a damaged-file scenario: normal validated turns create the incorrect stored evidence.

The patch preserves recipient identity across a bounded set of attached particles and polite 께. It does not canonicalize arbitrary names or claim general Korean entailment. It does not repair previously saved bad evidence automatically or rewrite user files.

## R2: an unrelated refusal prevents explicit accepted delegation

Normal accepted two-condition promise: “제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.” The letter condition is still pending and originally belongs to the player.

Player: “오늘은 야근 안 할게요. 편지는 대신 맡아 주세요.”
NPC: “제가 편지를 대신 맡을게요.”

The proposal contains the exact quotes “편지는 대신 맡아 주세요.” and “제가 편지를 대신 맡을게요.” and the existing letter condition ID. Base result: the whole turn is rejected. Removing the unrelated first sentence accepts the identical amendment. The cause is checking consent across the entire player text and NPC line instead of the relevant quoted sentence. An unrelated NPC refusal before its explicit acceptance has the same problem.

Patch controls:

| Case | Base result | Isolated patch |
|---|---|---|
| Plain explicit two-party delegation | accept | accept |
| Unrelated earlier player refusal of overtime | **reject** | accept |
| Unrelated earlier future work plan | accept | accept |
| Unrelated earlier NPC refusal of rooftop visit | **reject** | accept |
| Player quote followed by comma and “아니요 취소할게요” in same sentence | reject | reject |
| “편지는 대신 맡아 주세요 라는 말은 아니에요” | reject | reject |
| NPC taking phrase followed by “라고 말한 건 아니에요” | reject | reject |
| NPC “제가 편지를 대신 맡을게요.” inside quotation marks, followed by “라고 말하지 않았어요” | reject | reject |

The patch adds a sentence-only mode to the existing quote-aware context function. Amendment checks retain the whole relevant sentence, including denial after a comma or quoted fragment. Other callers retain their existing default clause behavior. Both exact quotes must still contain explicit delegation wording; original actor, target, action and condition IDs remain unchanged.

## What persisted correctly

The P1 control uses only normal turns:

- Start, offer and acceptance of the player’s ribbon plus letter promise.
- Player ribbon delivery records one condition as partial.
- Save to current game and all three slots; reopen in a new store and a fresh hidden Node process.
- Explicit mutual agreement delegates the letter condition to NPC.
- Save/reopen again. Original performer remains player; current performer is NPC; target remains 유나; condition ID and prior ribbon evidence ID remain the same. Amendment history retains previous performer and its exact quotes.
- A later attempt to count the old player performer for that delegated condition is rejected atomically.
- The NPC’s actual action beat “유나가 편지를 접는다.” completes the remaining condition and the original promise.
- Completed state survives the same save/reopen checks.

At every reopen, the complete stored profile and all slots are deep-equal, and reading leaves the profile’s original bytes unchanged. The fresh-process helper imports only the copied storage/reducer modules, uses explicit synthetic profile paths, and starts with `windowsHide: true`. It does not start an HTTP server or load provider credentials.

This confirms serialization and identity preservation for this path. It does not independently repeat every HTTP cancellation, timeout, or retry-journal case. Existing worker tests cover that separate transport scope; this review did not rerun their separate mock HTTP transport suite.

## Legacy sidecar absence

L1 is explicitly a migration-only fixture: a genuine normal completion is converted into the older shape by removing the new condition sidecar and condition-evidence event. It is not used to claim normal new-game progression and contains no private save data.

Observed:

- Profile and original events remain readable; read does not modify on-disk bytes.
- `narrative(game)` marks the unmatched legacy completion as evidence-insufficient in its cloned view.
- No condition progress is invented, and the absent sidecar stays absent on read.
- An attempted progress record using a missing old condition ID is rejected.
- An unrelated resumed turn does not add dates, advance relationship, or create an ending.

This is a focused legacy-promise check. It does not prove every legacy date/clue/milestone combination. Current ending guards do not directly use promise-completed flags as their sole ending condition, so no broad legacy-ending guarantee is inferred.

## Verification and handoff

- Independent baseline regressions: 2/4 pass, 2/4 fail on the two reproduced families.
- Same portable regressions on isolated patch: 4/4 pass.
- Existing copied worker `server/commitments.test.ts` on the patch: 7/7 pass.
- Diagnostic matrix: 16 rows. Base has four failing rows representing the two defect families; patch has zero failing rows.
- Separate fresh process reopens were run by the diagnostic, in addition to ordinary store reopen tests.

Public evidence: `baseline-results.json` and `patched-results.json` contain exact controlled requests, replies, before/after states, IDs, errors and source hashes. `verification.json` records commands and outcomes. `recipient-amendment.patch` is the minimal source diff; `commitments-storage-review.test.ts` is portable to server/ after the parent safely integrates. Apply only these hunks, never replace the complete commitments.ts from this snapshot: the other reviewer is independently tightening original-condition coverage in register/validation.

The parent's separately reproduced same-turn acceptance-plus-performance ordering failure is **not fixed here**. This review uses accepted-then-performance paths. The parent owns that ordering investigation, and it must remain a stated limitation until separately resolved. Fresh actual generated dialogue remains unverified.

Internal working folder: `.ralph/v2-state-independent-storage-review/`. No patch was applied to root or the active worker source.

