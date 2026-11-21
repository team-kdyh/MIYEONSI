# Bounded G2 merge review

2026-11-21. Only the G2 commitment-state changes were merged into the isolated `.ralph/v2-state-parent-probe`. Original production source and the active Ralph worktree were not edited. No API, runtime polling, server execution or tests were run by this merge reviewer; final verification belongs to the parent. The formal evaluator's result is separate.

The exact two G2 source/test files and the full `docs/v2-state-followup` tree were frozen at `.ralph/v2-state-g2-snapshot`. All 172 copied files had identical hashes before, after and within the copy; `snapshot-manifest.json` records every file. The pre-merge parent source is retained under `parent-before/server/commitments.ts` in that snapshot.

| `server/commitments.ts` version | SHA256 |
| --- | --- |
| Immutable G1 | `0e3b7da41c214ef3cb241e5df58c2ff9628231a021be0d1708292d373743ae48` |
| Frozen G2 | `777f8c04abd6f1d44f0022fb9392b30f2debb825ffde73e140b0b1355f7e87e4` |
| Parent before merge | `e0a5b51e5dacf02cef1fde39a2bf182215647ba332f7b46eab9d090a3f21bcd6` |
| Merged isolated candidate | `d29ef52d07bae1e71f2e05e24f394c201bd666be0cc91e9d489c54aef83e9b4a` |

The added `server/commitments-followup.test.ts` is byte-identical to G2, SHA256 `fbcaff89e889081faddd8cd69b8fb16513b9982d3012e3cb14796689514b37cb`.

The bounded differences are:

- Explicit limits of 128 commitments, 6 conditions, 8 acceptance references, 32 amendments, 64 assessments and 1 evidence event per condition. The existing six-condition checks remain; new validation/write checks cover the other accumulating state. Overflow throws rather than evicting obligations or evidence.
- A shared `refused(c)` predicate checks prior and same-turn promise refusal for both amendments and progress. The parent's `hasAcceptance` provisional same-turn acceptance and reconciliation comments remain intact.
- A repeated, already-evidenced performance still passes the existing ownership/source/target validation but does not mark the commitment touched or append a redundant assessment. Real new progress and amendments still trigger server-derived assessment.
- Four G2 tests were copied: prior/same-turn refused delegation, the 33rd amendment rejecting without mutating the input, duplicate progress preserving the sidecar, and normal partial progress/delegation through automatic and all manual save slots before NPC completion. The last test writes `docs/v2-state-followup/amendment-persistence.json` relative to its working directory; the immutable worker artifact remains in the snapshot.

The original-obligation coverage helper, empty-action guard, original-performer validation and registration coverage are unchanged from the parent's previously reviewed integration. Recipient-suffix handling and sentence-scoped amendment consent are retained. Reversing only the recorded G2 edits exactly reconstructs the pre-merge parent source after newline normalization. The parent source precondition was checked before writing. `bounded-merge.patch` records the integration difference; `g1-to-g2.patch` preserves the unmodified worker difference.

`narrative.ts`, `provider.ts`, `storage.ts`, `dialogue.ts`, `game.ts` and `index.ts` were unchanged, with exact hashes in `manifest.json`. In particular, canonical record wording and free dialogue remain as previously reviewed; there is no UI or provider expansion.

Remaining limits are unchanged: condition coverage is bounded object/predicate/performer coverage, not general Korean entailment or independent colour/time/quantity validation. Particleless canonical offers remain a known conservative false rejection. Only performer delegation is represented; arbitrary replacement of action/target and generalized versioned applicability are outside this merge. Typed states exceeding the new bounds reject validation rather than being truncated. Fresh model compliance and overall release quality remain unverified. Copied worker test logs are historical evidence for the worker version, not passing results for this merged candidate.
