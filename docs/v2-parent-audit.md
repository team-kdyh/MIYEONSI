# Parent independent audit — current development evidence

These parent-owned review artifacts are added without editing active worker source or tests. AC3/AC4 are still implementing, so findings refer to the source hashes captured in the JSON, not an assertion that later fixes failed. No network or paid API was used. Original script/probe source lives at C:/Users/gjtjw/Desktop/대화형 스토리진행/.ralph/v2-review/.

## Reproduced reducer defects to reconcile before final live QA

All seven reducer proposals were schema-valid; positive control passed; input game objects remained unchanged. The probe asserts successful reproduction of failures, NOT a game acceptance pass.

- Acceptance followed by a question, or acceptance plus an unrelated food dislike, is rejected as a whole turn by broad consent/negation guards.
- `status:refused,value:apart` with '헤어지고 싶지 않아요' commits a breakup from couple.
- `status:offered,value:date` with a future-date proposal increments completed date count.
- Repeating an exact known player-name detail rejects the entire reply instead of preserving the harmless existing memory.
- After the player's name 지호 is actually recorded, an NPC action '지호는 유나의 손을 잡는다' following an unrelated cafe observation is accepted as a canonical NPC event: this fabricates player agency. Safe NPC action controls pass. The earlier '당신을 바라본다' false positive was already corrected by the worker and is NOT an open finding.

Evidence: [reducer](v2-parent-reducer-probe.json), [agency](v2-parent-agency-probe.json), [assertions](v2-parent-probe-assertions.json). Source snapshots are hash-linked. Re-run appropriate cases on the final source and preserve both historical failures and final observations. Do not consume the paid-call allocation proving these offline issues.

## Visual observations

See [independent visual review](v2-parent-visual-review.md): full-stage/choice-free layout is a clear improvement, but initial title/mobile sprites are distorted by independent width/height instead of native543:724 aspect ratio, and long text scroll affordance is weak. New pose integration may change those styles; inspect final screenshots rather than blindly accepting either old failure or old pass.

## Integration boundary

AC6 explicitly scoped its storage fixture as synthetic because the narrative engine was not yet present. Final regression must use the actual new story/event schema. Mock browser conversation is layout evidence only. The old v1 QA score and old live12 calls do not grade this redesign. Final transcript quality and observable story differences remain essential.


## After AC3/AC4 scoped completion: reproduced again

Fresh offline probes with new source hashes are in `v2-parent-reducer-after-ac3.json` and `v2-parent-agency-after-ac3.json`; analysis `v2-parent-architecture-after-ac3.md`. Four issues still reproduce: compound acceptance is rejected, refused breakup reverses the meaning, duplicate correct memory rejects the turn, and known-name player agency is fabricated. Offered date no longer advances; it is now rejected atomically, so the original safety bug is fixed. Controls still pass.

Latest pose review (`v2-parent-visual-after-ac4.md`) confirms play sprite ratio fixed, actual poses readable, but title-character ratio remains distorted and boss A changes scale/baseline visibly. These are concrete current findings to reconcile, not a request to relax acceptance criteria. Parent is preparing isolated prototype patches outside the active worktree; they are NOT integrated or claimed fixed here.
