# Isolated lifecycle patch — bounded findings, not release approval

Prepared on 2026-11-21. All writes stayed in this prototype directory. No production/worktree/save/credential/ledger writes, no `.env` access, no network or paid calls. The active source and ORIGINAL integration target still matched the required base files at 04:11:54 UTC. The 31 original snapshot files remain byte-for-byte unchanged.

The four supplied failures D2/O1/O3/O4 reproduced before edits and pass with the candidate. A full-quote current-date invitation now checks the relevant date sentence; unrelated tomorrow work no longer blocks it. Fulfillment traces acceptance references back to the offered owner. A different accepting actor does not acquire that owner's obligation. Completion requires current speech/action evidence or previously shown NPC performance after the offer, while explicit noncompletion/future statements cannot supply it. Receipt31 retains its legitimate historical delivery evidence.

Deliverables: `source.patch`, exact `base-hashes.json` and `candidate-hashes.json`, and exact candidate files under `candidate/server/`. The patch changes `narrative.ts`, adds `narrative-lifecycle-regression.test.ts`, and adjusts two existing positive fixtures to show the delivery they already asserted. No assertions were removed or weakened: one fixture now shows the paper boat being put down, and the other actually shows the pear bag delivered instead of saying it will be brought later. Provider/schema/status contracts are unchanged.

## Verification and preserved failures

| Evidence | Result |
| --- | --- |
| Initial focused suite, `baseline-unit.tap` | 12/20 passed; all four requested defects and four adjacent cases failed |
| Original existing suites, `base-existing-1.tap` | 75/75 passed |
| First candidate existing suites, `candidate-existing-1.tap` | 73/75; two contradictory positive fixtures identified and preserved |
| Rejected verb-restricted implementation, `creative-controls-before.tap` | 24/27; origami, new drawing subject, and demonstrative completion failed |
| Earlier unchanged baseline plus added tests, `base-delivery-tests.tap` | 91/103; 12 failures including D2/O1/O3/O4 |
| Earlier candidate, `candidate-delivery-tests.tap` | 103/103 passed (28 new cases + 75 existing) |
| Final unchanged baseline, `base-particleless-tests.tap` | 92/104; the same 12 failures |
| Final candidate, `candidate-particleless-tests.tap` | 104/104 passed (29 new cases + 75 existing) |
| Final focused TypeScript check, `focused-typecheck-particleless.txt` | Passed, exit 0 |
| Final `historical-replay-particleless.json` | 32 captured replies independently replayed with exact implementation hashes; base and final candidate both 27 committed/5 rejected; no changed statuses, milestones, endings, or normalized added events; receipt31 stays committed |

The final follow-up removes an artificial object-particle requirement: both “노란 리본을 가져왔어요.” and natural “노란 리본 가져왔어요.” now pass the same linked completion check. It adds no verb exceptions. The `겠` exclusion rejects hypothetical/future speech as completion evidence. Old replay files remain preserved; the final 32-receipt replay is tied to the final hashes. None of these replays is a continuous conversation or new model generation. Actual original receipt statuses and bodies were not changed. New test evidence explicitly says controlled fixture states and no production state mutation.

Early harness errors are also preserved: `free-checks.json` records a Windows absolute `--import` URL failure, and `focused-typecheck.txt` records an incorrect local compiler path. Corrected checks use the local installation, sanitized synthetic credential environment, sandbox-owned temporary storage, and blocked network transports. There were zero API calls.

## Concrete remaining semantic limits

The independent reviewer supplied six additional probes. `independent-edge-baseline.json`, `independent-edge-before.json`, and `independent-edge-final.json` preserve exact inputs and source hashes. The final candidate rejects future `가져오겠어요` and counterfactual `가져왔다면`, and accepts completed delivery followed by an unrelated future sentence. Three **pre-existing** mismatches remain and are not hidden by the passing targeted suite:

1. A model can relabel a ribbon fulfillment proposal as “유나가 노트를 덮었다.” and a matching notebook action still passes. Allowing the proposal's novel object to connect creative actions also lets the proposal support its own wrong referent.
2. An NPC merely looking at the promised ribbon can pass as fulfillment because it is a visible action involving that object.
3. A player saying “노란 리본을 찾아봤어요.” can pass as delivery because completed searching and completed delivery share the same object.

The independent reviewer also reproduced “친구가 노란 리본을 가져왔어요.” as player fulfillment. The actor guard recognizes the known NPC/player labels, not every arbitrary third party. This fourth result was reported by that reviewer; it is not included in this agent's six-row probe files.

These same three probes commit in the original baseline. The candidate fixes the four requested reproductions and preserves creative positive controls; it does **not** prove arbitrary Korean semantic entailment or all lifecycle correctness. I do not recommend treating this patch or its 104 targeted passing tests as full lifecycle/release approval. A universal lexical matcher was deliberately not expanded. Parent integration can review this bounded improvement and retain these counterexamples for further work.

## Integration guard

Base `server/narrative.ts`: `a5abec4c7ef351c548048887b82cf403295ac35eb7e36028730aef56a85709ef`.

Final candidate `server/narrative.ts`: `175f9dbd3c0b095946f5278e22f984d9b95a1335aa63236788e334635baf24e8`.

Final patch SHA-256: `33d19c9bf66239826c446514c8975dcd9cda5f92adee0911bf768a23e8ba9e8d`.

Verify all changed base files against `candidate-hashes.json` before applying or copying. The new regression file has a null base hash because it did not exist in the active source snapshot. Parent owns integration and full application verification. Additional paid API approval remains pending; this patch provides no approval.
