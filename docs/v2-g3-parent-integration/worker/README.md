# Contract follow-up candidate — release incomplete

2026-11-21. This is the current downstream Seed execution, not a new external Ralph verdict. Original FAIL judgments, the old terminal jobs, both paid ledgers, and the previous review archives remain unchanged. Paid calls: **0**; 12 + 32 consumed, proposed 24 unanswered. No approval ledger was created. Root3001 and original private saves were not modified; no root `.env` was read or copied.

## What was reproduced and changed

The letter → drawing implementation already existed and was reviewed before editing. It is not a newly discovered failure. The newer evidence-binding guard did reproduce a different defect: a normal player utterance explicitly reporting both ribbon delivery and letter folding could support the first obligation, but reusing that same immutable source for the second obligation was rejected solely because its original condition ID differed. `applicability-before.log` preserves that failure and its passing negative control.

`evidence-applicability.ts` now records separate evidence/target-obligation/contract-version relations with terms, original reference, raw quote and reasons. Each target independently passes actor, recipient, predicate/object and completion checks. Original events and their original obligation references remain unchanged. New evidence also records whether it came from an NPC action or a completed statement and the occurrence contract version. An unaffected explicit relation is carried forward under the new version; an unknown legacy relation is not invented. A different actor or an omitted second action remains insufficient. Restore checks relation references and terms as well as source semantics. Existing malformed-save controls still reject reassignment. The positive demonstrated reuse is **two player obligations**, not a claim of general cross-actor entailment.

`revision-negotiation.ts` adds bounded proposal and response records independent of the original promise. Proposed terms, base version, proposer and quote are preserved. Responses retain actor, full source, exact quote span, interpretation and HTTP request ID (null for direct reducer tests). Refusal and withdrawal close the change proposal, not the original promise. Ambiguity leaves it pending. After both agreement responses, application is validated on a detached state. A failed application records a not-applied attempt while retaining the original contract; it does not become party refusal or a confirmed amendment. Successful application links the existing revision history. Same-request HTTP retries return the committed transition once. Legacy direct `commitmentRevisions` remains supported; the new pending lifecycle uses `revisionProposals` / `revisionResponses`.

`performance-interpretation.ts` records diagnostic meaning and obligation matching separately, with raw text/span, parser-component hash and independent reasons. Stored diagnostics are read unchanged, not silently reclassified. Missing legacy diagnostics remain missing. The diagnostic never creates a world nonperformance event, clears prior evidence, or authorizes completion. The tests distinguish matched performance, acceptance, future intention, explicit nonperformance, other actor, other recipient and unresolved paraphrase. These are bounded Korean checks, **not general semantic understanding**. For example, “편지를 정성껏 마무리했어요” remains unresolved. The earlier “리본을 지참해서 유나에게 왔어요” support limitation remains recorded in the prior audit. Normal free speech is not restricted to test phrases.

A final normal-turn negative control also reproduced a model-scope error: a change-refusal quote could be emitted as a refusal event on the original promise. The server now ignores that wrongly scoped event, preserves the proposal response, and permits later original performance. Separately explicit original-promise withdrawal remains supported. `refusal-scope-before.log` preserves the failure; the final lifecycle tests cover both directions.

The provider schema/instructions now expose the lifecycle fields. Current actual model generation, displayed-speech alignment, and compliance with these fields remain **unexecuted**, because no approved allocation exists.

## Bounds and persistence

Existing bounds remain: 128 promises, six conditions, eight response-extension rows, 32 combined amendments/content revisions, 64 completion assessments and one active evidence ID per condition. Additional bounds: 256 explicit applicability relations per promise; 64 interpretation diagnostics per narrative; 64 revision proposals, eight responses and eight application attempts per proposal. Capacity fails atomically; no obligation/history is truncated to obtain completion. Normal history length can therefore eventually require a rejected turn; no unbounded retention is claimed.

Legacy format 1 disk envelopes and narrative format 2 remain additive/read-only on load. New missing fields are not synthesized. Old completion without condition evidence remains historical and insufficient. The historical-fixture regression initially failed because it removed the modern commitment sidecar but accidentally retained newly generated diagnostics referencing that sidecar. The fixture now also removes diagnostics that did not exist in that old format. Assertions about original bytes, missing evidence, read idempotence and no invented completion remain unchanged; malformed current references still reject.

| Boundary / source | Executed observations | Not established |
|---|---|---|
| Normal new-game proposal/response turns | Pending, refused, ambiguous, both agree but application fails, applied; raw before/input/mock reply/after records | Actual model wording or universal agreement interpretation |
| Store + all three slot payloads + new store instance | Semantic equality of proposals/responses/attempts, original promise, active terms, evidence and diagnostics | Every boundary × every slot × every negative case Cartesian product |
| Refusal restore | Original letter performance can still complete with the earlier ribbon | Live model following the rejected proposal correctly |
| Actual filesystem write failure | Last committed pending state remains; unsaved changed state logged separately | An unsaved diagnostic is not claimed saved history |
| HTTP transport, restart, cancellation, production timeout, retry | Normal lifecycle; request IDs; duplicate proposal/refusal/application; prior committed state retained; three pre/post slots; subsequent drawing completion | Every delivery failure timing, actual remote API |
| Applicability | Normal two-action source, separate relations, all slot payloads/disk reload; omitted action/other actor controls; original malformed-save failure preserved | General multi-actor reuse; all applicability-limit boundary combinations |
| Limits / invalid references | Existing 32-revision bounds and stale refs; eight response and 64 diagnostic limits; malformed lifecycle/revision links | Exhaustive 64-proposal/eight-attempt/256-relation boundary grid |

## Execution receipts

Production and ordinary test execution used `.ralph/contract-followup`, with synthetic storage and mock external transports. The copy contains no `.env`. Browser ports: 3195/3196; Windows launcher: 3077. Dependency installation was reused through a node_modules junction and lock-hash stamp; no fresh npm installation is claimed. The first UI invocation selected the isolated config from the worktree cwd and generated UI output there; subsequent runs used the isolated cwd. Preserved prior review captures and archives were not replaced.

| Receipt | Result / attribution |
|---|---|
| `applicability-before.log` | New normal-path positive fails; negative passes. Original failure retained. |
| `applicability-after.log`, `applicability-fixed.log` | First implementation lost NPC action source type (12/13), then explicit source metadata restored 13/13. |
| `unit-first.log` | 375/376; historical fixture mismatch above. |
| `unit-final.log` | Intermediate 379/379, before the final refusal-row control. |
| `unit-confirmed.log`, `unit-confirmed-run.json` | Pre-final-scope checkpoint: 380/380; command, time, cwd, exit 0. |
| `applicability-trace-run.log` | Final test-only trace/assertion addition: 2/2; production unchanged. |
| `unit-release-candidate.log`, `unit-release-candidate-run.json` | Final production source: 381/381, exit 0. Final test-only literal type annotation rerun: lifecycle-final-tests.log, 8/8. |
| `build-release-candidate.log`, `build-release-final.log` | First build caught a newly added test’s widened string literal; explicit literal type fixed it. Final typecheck + Vite build exit 0, with receipt. |
| `browser.log` | Prior same-renderer checkpoint: 25/25. |
| `participation-first.log` | New capture test failed at final hash collection due to wrong `src/App.tsx` filename; corrected to actual `src/main.tsx`. No UI criterion was relaxed. |
| `browser-confirmed.log` | Includes an image-decode failure during a concurrent launcher rebuild of the same dist; retain as a failure. Overlapping build is a suspected cause, not a proven product repair. See subsequent serial rerun receipt. |
| `executed/docs/v2-ac7-current/launcher.json` | Two `play.cmd -NoBrowser -Port 3077` / HTTP200 / `stop.cmd` cycles; both process exits confirmed. |

The serial rerun `browser-serial.log` passed 26/26, but the final promise-refusal guard was being added during that execution; it is not labelled a frozen-source run. The final frozen-source browser result is separately recorded in `browser-release-candidate.log` / `browser-release-candidate-run.json`. Test counts belong to these executions and candidate hashes; they do not replace the earlier 333/367/370 reports or any original FAIL.

## Claim-by-claim review and remaining gates

`candidate.json` binds source, tests, lockfile, scripts, assets and read-only parent/archive comparisons. `package-receipt.json` hashes every delivered entry. `direct-review.json` records this reviewer's image access and observations. The saved visual review captures predate the final promise-refusal guard. Renderer/asset bytes and the date/move branches used by these captures are unchanged; only this limited visual evidence is reused. Final browser execution uses the fixed server. Launcher observations likewise predate that guard; launcher scripts, lockfile and startup code are unchanged, and final HTTP tests boot/restart the final server. No real-model claim is inherited.

The review archive includes actual source, raw traces, logs, images and original music files, excluding keys and real saves. Archive CRC access is not a claim that every entry was semantically/perceptually reviewed. A future evaluator's access remains unobserved.

| AC / evidence ID | Directly inspected or executed | Current limit / next required observation |
|---|---|---|
| 1 / UI-4 | Four original long-text images opened; fresh browser keyboard Enter/End, focus and settings controls; current rendered long-text captures | Rendering uses mock speech. Face/input/send and scroll-boundary observations are in direct review; numeric bounds are auxiliary. |
| 2 / NORMAL, APPLICABILITY, LIFECYCLE-HTTP | Normal traces, actual source, mock semantic and HTTP persistence checks; independently justified reuse and proposal lifecycle | Latest real two-mode counterfactual/common-followup/restore effects and dialogue claim alignment require approved model calls. Bounded parser cases do not prove general entailment. |
| 3 / EXPERIENCE | Existing eight mission, romance, ending, memory and refusal regressions rerun; generated state trace files delivered | All eight latest real mission negotiations and followup use; continuous dating/editing/confrontation experience; four normal live ending paths; 10+ real turns and exact memory reuse after restore remain missing. Each mission is separately listed in the prior audit's coverage table; none is promoted here. |
| 4 / ART-24, PARTICIPATION | Both 12-cell boards and 24 individual 390px rendered states opened; fresh proposal/acceptance/refusal/participation captures and same-state reduced motion | NPC solo gestures are distinct from player participation. No claim all poses appeared in live generation. Continuous animation-video review remains separate from settled frames and browser animation assertions. |
| 5 / AUDIO | Eight original files and automatic decode/playback/crossfade/dwell/mute/volume checks; source audio delivered | No direct listening and zero transitions counted as heard. Eight-track musical comparison and six event-linked game-output recordings/listening require a capable auditory review environment. Original audio files are not captured game output. |
| 6 / STORE, HTTP, LEGACY | New normal-state persistence traces plus existing recovery, legacy, performer/recipient and partial/joint controls | Bounded mock evidence; the unexecuted boundary combinations above remain explicit. No private save inspected. |
| 7 / DELIVERY | Build/type/unit/browser receipts, scoped launcher cycles, source/asset manifest and review ZIP | Overall release and actual model QA remain incomplete. This execution does not issue an independent Ralph grade or change the old grader. |

Free next work: broader applicability/lifecycle capacity and interruption combinations, continuous animation capture/review, and game-output audio recording. Approval-dependent work: latest real generation, counterfactuals, all mission/romance/endings and memory-use experience. Review-tool-dependent work: direct auditory judgment. These missing observations are not waived by this report or its passing tests.

## Final frozen-source result

Final production unit execution: **381/381**. Final lifecycle test-only type annotation: **8/8**. Final typecheck/build: exit **0**. Final frozen-source browser: **26/26**, exit **0**, no concurrent build. All four final long-text images were opened after that run and separately hashed in `direct-review.json`. Earlier failures and the intermediate mixed-source serial run remain preserved. No live-model calls or direct listening; overall release remains incomplete.
