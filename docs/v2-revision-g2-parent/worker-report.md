# Current Seed evidence audit — release incomplete

2026-11-21. This downstream execution reviewed the existing content revision implementation before changing code. The letter-to-drawing fix was already present; it is not reported as a newly reproduced failure. Earlier FAIL verdicts, paid ledgers, private saves and the original root preview remain untouched. No nested auto session, session signal, paid call, new ledger or parent integration was performed.

## Reproduced defect and bounded repair

`binding-before.log` preserves a new failing storage test: after normal offer, acceptance and ribbon performance, a deliberately malformed copy assigned the ribbon evidence ID to the letter obligation and marked both complete. Storage validation incorrectly accepted it. This malformed-state negative control is **not** a normal completion path.

`server/commitments.ts` now requires server-created condition evidence to retain its original condition reference during restoration and event reuse. `server/commitment-revisions.ts` checks the same reference in historical applicability records. NPC action events remain a separate source type; their normal semantic validation is unchanged. The repair neither rewrites source evidence nor synthesizes missing legacy records. `binding-final.log` covers malformed current references, historical references and language contrasts. Existing content-revision, joint, partial, actor, recipient and legacy controls remain enabled.

## Execution receipts

All commands ran in `.ralph/seed-evidence-audit`, an isolated source copy with no `.env`, synthetic temporary saves, and preinstalled dependencies through a node_modules junction. The lock hash was recorded for launcher reuse; no fresh npm installation is claimed. Browser ports were 3191 and 3192; launcher port 3193. Production sources in that copy were updated to the exact repaired source before the final checks. `candidate.json` records component hashes and compares the original review ZIP and the parent root without overwriting either.

| Evidence | Execution/result | Scope |
|---|---|---|
| UNIT-BASE / `unit.log` | npm test: 367/367 | Existing candidate before repair; raw output directly read |
| BIND-BEFORE / `binding-before.log` | 1/2; missing expected exception | New malformed-reference defect, preserved |
| UNIT-FIRST / `unit-final.log` | 368/369 | One cancellation recovery check received transient processing response; no failure deleted |
| RECOVERY / `recovery-recheck.log` | 1/1, same production source | Isolated repeat; does not prove intermittent issue fixed |
| UNIT-CURRENT / `unit-confirmation.log` | 370/370 | Entire suite after reference repair and three added tests |
| BIND-CURRENT / `binding-final.log` | 3/3 | Final test-only addition of one unrecognized paraphrase after the full run; production unchanged |
| BUILD / `build-final.log` | typecheck and Vite build passed | Current production source; launcher separately rebuilds it |
| BROWSER-FIRST / `browser.log` | 24/25 | Desktop continuation-button wait timed out; full raw failure retained |
| BROWSER-CURRENT / `browser-final.log` | 25/25 | Full rerun on current production source; no UI changes or timeout relaxation |
| LAUNCH / `launcher-*.log`, `launcher-*-observation.json` | play.cmd, HTTP200/title, stop.cmd, relaunch HTTP200/title, stop | Detached process observed from another shell; root3001 untouched |

The first browser error-context copy used an incorrect relative path and failed; that extra artifact is not claimed delivered. The original failure stack and location remain in `browser.log`. Neither transient failure was repaired by this change or erased by a repeat pass.

## Claims, observations and remaining gates

All current hashes and bundled file hashes are in `candidate.json` and `package-receipt.json`. Prior evidence stays tied to its prior hashes. The current reviewer opened the four original `v2-content-revision-run/captures/long-focus-*` PNGs and the two `v2-ac4-recheck/*-comparison.png` boards. This is independent access during this execution, not merely reliance on the preceding review. Image observations and fresh capture scope are recorded in `direct-review.json`.

| AC / claim | Evidence and observation kind | Current result / remaining observation |
|---|---|---|
| 1 / layout, keyboard, settings | Four directly opened long-text images; browser UI/keyboard/settings tests, raw logs and fresh captures | Face/input/send visible at both sizes; main text readable; scroll-edge clipping and overlapping fade hint remain. Numeric layout checks are auxiliary. Physical phone keyboard not observed. |
| 2 / revision semantics | `traces/semantic-trace.json`, `traces/http-trace.json`, source, mock-response unit tests | Normal ribbon partial → letter replacement → drawing completion retained; refusal/stale/capacity controls run. No new live-model claim alignment or real counterfactual generation. |
| 2 / Korean interpretation | `performance-contrasts.json` with source span, original mock turns, before/after and hashes | Three brought-ribbon forms and “갖다 놓았어요” accepted; acceptance/future/negative/other actor/other recipient rejected. “지참해서 유나에게 왔어요” was not recognized. Server exposes boolean matching and a generic rejection, not separate actor/tense/polarity uncertainty assessments. Rejection commits no nonperformance fact. This required diagnostic representation remains incomplete. |
| 3 / missions and romance | Current automated regressions and bundled regenerated state traces | Mock checks cannot supply latest real negotiations, experience continuity, four live earned endings, or 10+ live turns with actual later memory quotations. See per-path table below. |
| 4 / illustrated distinctions | Two directly opened twelve-state boards and current browser art controls | Actual hand/head/body/prop differences observed. All individual full-resolution states and all pending/accepted-not-participating/refused/participating timelines have not been directly reviewed here. |
| 5 / music | Eight shipped files, browser decoding/playback/dwell/fade/mute/volume checks | No direct listening performed. Zero transitions counted as directly heard. Eight-track perceptual comparison and six normal-path output recordings/listening remain required. File access/API calls do not substitute for hearing. |
| 6 / persistence | Normal revision and HTTP traces plus current storage/recovery suite | Mock normal-turn partials, slots, restart, timeout, cancellation, retry and stale/capacity validation; current malformed-reference fix verified. Not an exhaustive Cartesian product of all conditions, slots and interruption boundaries. No real private saves inspected. |
| 7 / delivery | Source/asset/lock/script hashes, raw checks, launcher receipts, CRC-checked archive | Reviewable local candidate, not release approval. Original structured-check FAILs retained. Future evaluator access and direct review remain pending until actually performed. |

No AC_COMPLETE marker is issued for a criterion with required missing observations. Source repair and passing free checks do not discharge the live or perceptual requirements.

## Experience coverage and dependencies

| Path | Current evidence | Missing current observation |
|---|---|---|
| clockout | `traces/v2-ac3-clockout-state-trace.json` | Real alternative agreement → changed work conditions → later application |
| dinner | `traces/v2-ac3-dinner-state-trace.json` | Same real sequence for this mission |
| weekend | `traces/v2-ac3-weekend-state-trace.json` | Same real sequence for this mission |
| vacation | `traces/v2-ac3-vacation-state-trace.json` | Same real sequence for this mission |
| credit | `traces/v2-ac3-credit-state-trace.json` | Same real sequence for this mission |
| meeting | `traces/v2-ac3-meeting-state-trace.json` | Same real sequence for this mission |
| delegation | `traces/v2-ac3-delegation-state-trace.json` | Same real sequence for this mission |
| remote | `traces/v2-ac3-remote-state-trace.json` | Same real sequence for this mission |
| romance-0 | v2-story.test.ts ending regression | One normal continuous experience, earned final facts, actual generation and negative prerequisites |
| romance-1 | Same automated test family | Same missing live path for this ending |
| romance-2 | Same automated test family | Same missing live path for this ending |
| romance-3 | Same automated test family | Same missing live path for this ending |
| attributed memory | `traces/v2-ac3-memory-trace.json` | 10+ actual turns, restored subject/status, exact later speech quotes and event use; a stored-but-unused fact is not positive recall |

The eight trace files are mock state-transition evidence, not a claim that every required experience connection is present. Current actual mission dialogue, continuous getting-to-know/date/editing/confrontation experience, generated ending paths, both-mode real counterfactual followups, memory use and displayed speech alignment require a genuinely approved successor allocation and the designated final conversational-QA owner. Existing12+32 attempts are consumed; proposed24 remains unanswered.

Full pose/participation capture review and richer diagnostic interpretation records are free work still outstanding. Audio output capture is free, but direct auditory review requires a capable listening environment. A persistent proposed/rejected content-amendment lifecycle is still not implemented; accepted revision records and atomic rejected turns do not substitute for that lifecycle. These are explicit remaining requirements, not waived scope or invented passes.

The final read-only parent comparison found different commitments, content-revision and narrative bytes in the original root; provider and storage bytes match. No parent file was overwritten. This report's tests and repaired source belong to this worktree, not the root3001 preview. `executed-source-comparison.json` confirms the six inspected production/test files match the executed isolated copy. No scoped verification listener remained on3191/3192/3193 after completion.

The new archive contains current source plus historical evidence and this additive audit. Prior source-dependent claims are not automatically inherited. Review ZIP CRC/hash access was checked, but not every image/audio/trace entry was directly perceived or semantically reviewed. No commercial readiness assurance is made.
