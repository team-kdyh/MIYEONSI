# Independent lifecycle patch review

2026-11-21. Read-only source/test review and pure reducer probes. No provider, network, credentials, profile writes, state injection, or production edits. Only this review file was written by the reviewer. Child implementation and its 103-test run are separate evidence.

**Verdict: a bounded improvement for D2/O1/O3/O4, not approval of the entire lifecycle contract. Resolve the newly reproduced natural-language overrestriction before calling this final.**

Reviewed base `server/narrative.ts` SHA-256 `a5abec4c7ef351c548048887b82cf403295ac35eb7e36028730aef56a85709ef`; original root matched it during review. Final candidate SHA-256 `1f623facef4f432d58520bb5e0230822cfaae123b1a1bb061bb899f7208a11d2`. Patch SHA-256 `efab00229b0871f58c9019b0eb47fde2ffaba7ac36988c56140d35506ae2f6a9`.

The candidate separates a current date sentence from unrelated future work, follows reference chains to the original commitment owner, preserves another actor's acceptance without transferring performance ownership, and rejects explicit noncompletion/future-only fulfillment. Creative origami, a new drawing subject, and a single pending demonstrative completion are positive controls. The positive completion-verb enum was removed. I inspected the original four assertions and the two edited existing fixtures: no assertions were removed or weakened; the existing fixtures now actually narrate the delivery their assertions already claimed. These are fixture corrections, not evidence of live model performance.

The preserved `candidate-delivery-tests.tap` reports 103/103, versus baseline 91/103; I inspected the output and did not repeat that full run. Historical 32-response replay was performed by the child on the immediate predecessor of the final future-marker change, not new live calls. That scope must remain explicit.

## Independently reproduced overrestriction

All probes start a fresh normal romance game, record a player-owned offer through `reconcile`, then attempt fulfillment with the exact player line as evidence. The offered promise is bringing a yellow ribbon. No narrative state is injected.

| Player input | Candidate result |
| --- | --- |
| 노란 리본을 가져왔어요. | committed, one fulfillment |
| 노란 리본 가져왔어요. | rejected |
| 그걸 가져왔어요. | committed, one fulfillment |
| 약속 지켰어요. | rejected |

Omitting the Korean object particle does not change the first pair's meaning, but the non-action past-tense branch requires `을/를` or a short completion word set. This is a real new conversational restriction. The final row is more ambiguous, so it is a limitation rather than an equally strong blocker. A correction should preserve the already matching referent/completion controls without turning a longer whitelist into a player input format.

## Independently reproduced remaining false completion

These separate probes use the same normal offer/turn path. Each incorrectly committed one fulfillment:

1. NPC ribbon promise, fulfilled proposal relabelled as `유나가 노트를 덮었다.`, visible action `유나가 노트를 덮는다.`. Proposal terms are merged with offer terms, so an unrelated proposal can support its own referent.
2. NPC ribbon promise, visible action `유나가 노란 리본을 바라본다.`. Merely acting on or looking at the object does not fulfill bringing it.
3. Player ribbon promise, player line `노란 리본을 찾아봤어요.`. Completed searching is not completed delivery.
4. Player ribbon promise, player line `친구가 노란 리본을 가져왔어요.`. The named-NPC guard does not cover arbitrary third-party performers.

The first three also commit in the child's preserved original baseline probes. I independently observed the fourth on the final candidate; I have not claimed a separate baseline run for that fourth row. Future `내일 노란 리본을 가져오겠어요.` and counterfactual `노란 리본을 가져왔다면 좋겠어요.` were independently rejected as expected.

These defects must not disappear from quality reporting just because targeted regression tests pass. They are not a reason to reinstate a fixed action vocabulary or to fabricate completed actions. The patch can be considered for scoped integration after the particle-omission regression is addressed, but arbitrary semantic entailment and release readiness remain unproven.
