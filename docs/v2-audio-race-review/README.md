# Current parent candidate: playback result ordering

The parent reproduced a MusicMixer race independently of the worker's intermittent autoplay-test failure. An older `play()` rejection arriving after a newer successful retry changed `blocked` back to true while the media remained playing. `before.json` records that exact sequence against music source `847118a170857429c573c4331d7cd0db36ec43ba252c2cfbeb8162b71f79ed01`. This is controlled promise scheduling, not a claim that the same sequence caused the worker's one browser failure.

The mixer now tracks the latest request on each audio element, and only the currently selected channel can update the playback-retry state. An outgoing channel's late success cannot hide the incoming channel's failure, and an old failure cannot overwrite a successful retry. The original dwell, crossfade, mute and volume behavior is retained. `after.json` records the fixed result against `e07ecf46842e6663cb9ab6286d66dc5f0acc57c20fe05866e233f2f0060e07cb`. Six music unit tests passed, including both outcome-order regressions.

The parent also removed an internal schema-field name from the player-facing agreement error and changed obsolete “선택” recovery instructions to “대화/대사.” These are error-copy changes; the rejection and transaction rules are unchanged.

## Executed verification

- **371/371** unit tests and typecheck/build passed in the isolated combined candidate (`unit.log`, `build.log`). Current revision semantic and HTTP traces are preserved under `evidence/`.
- **4/4** audio browser tests passed (`browser.log`): eight tracks decoded, both normal mocked story paths used actual media playback/crossfades, and the visible autoplay retry recovered playback. The old failure is preserved as `historical-autoplay-initial-failure.md`; this run is not a guarantee that all intermittent failures are eliminated.
- `source-equivalence.json` verifies that all54 runtime/test source files and51 rendered asset/build files match the original workspace byte-for-byte, with matching package/lock/TypeScript/Vite inputs. Non-rendered support metadata/docs are outside that comparison.
- The original Windows launcher rebuilt/restarted port3001 successfully with the UTF-8 shutdown fix. `runtime.json` records passive HTTP readiness. No actual AI dialogue request was made.
- The rebuilt playable ZIP has **116 payload files,65,837,310 bytes**, SHA-256 `5fb6c879aa980ed1af83cab69d187a5241d47f6a03963faa77c6edb50b3010ec`. `playable-audit.json` matches every payload to current source and checks private-path/credential-shape exclusion. The preceding ZIP remains `artifacts/history/AFTER-HOURS-playable-ca34610.zip`. Fresh dependency installation remains evidence for the earlier14128a7 package, not a new installation claim for this rebuild.

## Remaining release gate

Current model generation is still unverified: the original12 and additional32 paid attempts are consumed; the proposed further24 have no user answer or active ledger. No actual listening approval exists. The literal negotiated-revision grammar, rejected/proposed revision lifecycle, complete generated story experience and independent release criteria remain open. Ralph G1's official0/7 is preserved; G2 runs separately in its worktree. The parent fixes do not alter that official verdict. This is an improved local candidate, **not commercial release approval**.
