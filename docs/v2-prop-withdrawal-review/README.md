# Parent visual-prop correction — 2026-11-21

The parent reproduced a visible action/sprite contradiction in the 503f817 candidate: after the player declined headphones, the authored NPC beat said Yuna put them into her bag, but the sprite continued extending them. A cassette withdrawal produced the same mismatch. Both 1440×900 and390×844 browser cases failed before the correction (`before.log`). The parent directly opened the mobile headphone and desktop cassette screenshots before and after; the withdrawn props disappear in the corrected images.

`presentationPose` now detects bounded Korean put-away/withdrawal actions for the three literal illustrated props. A later re-offer restores its prop, negated/intended withdrawal is distinguished, and putting a different named prop away does not cancel the offered prop. This is a small visual consistency rule, not general Korean understanding, player consent, or a change to narrative state. Exact prior/current source snapshots are preserved alongside this report.

The new browser regression starts a normal romance game and commits five successive player inputs and authored NPC replies through `commitDialogue`. It captures offer → refusal/withdrawal → re-offer → cassette offer → withdrawal, with complete before/after states in each JSON. These are **mock responses, not new OpenAI observations**, and do not establish the pending-date/accepted-date/participation timeline criterion. Screenshots use logical viewports, not a physical mobile keyboard. The two targeted checks passed after the correction (`after.log`); the unit control also covers negation, re-offers, unrelated props and recorder withdrawal.

## Verification tied to this candidate

- Typecheck/build, **375/375 unit tests and27/27 browser tests** passed in the isolated combined snapshot (`unit.log`, `browser.log`, `build.log`). No paid API call occurred.
- `source-equivalence.json` verifies106 runtime/test/rendered files byte-for-byte against the original workspace, plus package/build/browser inputs. Non-rendered metadata is outside that comparison.
- Passive HTTP on3001 returned200 and exactly the new `dist/index.html` bytes. The existing server serves the changed frontend; backend production source did not change in this correction (`runtime.json`).
- Windows PowerShell5.1 packaging initially failed with `Unable to find type [IO.Compression.ZipArchiveMode]` at package-playable.ps1:34. Adding an explicit `System.IO.Compression` assembly load fixed the actual same-command run (`package-ps51.log`). The earlier archive was preserved before the packaging attempt. No packaging failure was passed off as a game startup failure.
- Current playable ZIP: **116 payload files,65,811,912 bytes**, SHA-256 `528667ded81655124b2a4f9b5010fa5f109a51a8ea40e28a908db99de83248e0`. Every payload matches current source and manifest; private paths and credential-shaped content are absent (`playable-audit.json`). The prior ZIP remains `artifacts/history/AFTER-HOURS-playable-503f817.zip`. This is a verified rebuild, not another fresh dependency installation.

An initial local test-launch command used the wrong working-directory-relative copy paths and failed before the intended test ran. It was corrected; the genuine two browser failures in `before.log` were obtained afterwards from the unchanged candidate and preserved. The full run had no failed tests.

## Open release evidence

The active Ralph worktree was not modified by this parent fix. G1/G2 official0/7 verdicts remain intact, and G3 was still running at this checkpoint. Previous374/25 evidence is now historical. Current actual-model conversation quality, full participation visuals, listening assessment and the remaining G3 state work are not certified by this UI fix. The12+32 paid attempts remain consumed; the proposed additional24 has no answer and no active approval ledger. The candidate remains local and unreleased.
