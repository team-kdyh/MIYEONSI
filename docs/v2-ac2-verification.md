# v2 AC2 — narrative provider implementation and handoff

2026-11-21. Scope: AC2 implementation, deterministic reconciliation, provider transport mocks and integration regressions. **No paid calls. Actual conversational quality / gpt-4.1 access remains for the designated final conversational-QA owner.** Neither historical v1 live evidence nor mock replies approve v2 live quality.

## Runtime change

`server/provider.ts` now calls official Responses with strict `narrative_turn` output, default gpt-4.1 (environment override retained), `store:false`, and maximum output 1600. The schema contains new Korean speech, separate NPC action beats, emotion, pose, music mood, recall IDs and up to five event proposals. There is no intent field, choice array, or allowed-answer classification in the live request. Office context contains mission title, introduction and objective labels, not old answer samples or turn limits.

`server/narrative.ts` owns immutable event IDs, references, user evidence, places, relationships, promises, concessions and earned resolution gates. Every accepted action beat also persists as an NPC event. Player statements retain their own roles and ownership. An invalid event rejects the entire turn rather than committing a reply that claims its rejected consequence happened. Model speech alone cannot grant an ending. Novel details and plans are not constrained to three authored texts.

`commitDialogue` routes narrative responses into this new reconciliation path. Old choice-based helpers remain solely for historical compatibility/regression coverage; the public `/api/turn` rejects non-null choice submissions, requires free text and always obtains the new response format. New games expose no story choices. Old saves remain readable, with relationship/date evidence migrated when the first new turn is committed. Nothing deletes old saves or the historical API ledger.

Provider selection has an explicit version marker. With a key, both fresh sessions and sessions with the old default offline setting start in OpenAI. Explicitly selecting offline in v2 persists across reloads. Passive state/new/save/load requests do not generate. Offline is a labelled staging preview with no simulated AI story resolution; provider failure does not replace the turn with preview dialogue. Server generation timeout is now 30 seconds, cancellation and exact-once request handling remain intact.

## Checks and evidence

- TypeScript and production build passed.
- Full `npm test`: 123/123, including original meaningful regression checks. Final small ownership/relationship guard refinement additionally passed all 9 narrative tests.
- `playwright.v2-ui.config.ts`: 4/4, both modes at 1440×900 and 390×844. This is a UI regression with browser route fixtures, not a live model review.
- `server/narrative.test.ts`: same-state acceptance, creative alternatives and refusal in both modes; 10 relaxed turns without forced chapter change; 10-turn promise/food/name ownership with disk reload and all three slots; invitation references; invalid assets; fabricated consent; premature resolution; courtship → confession → mutual couple → actual date → archive; mock Responses speech/action/event transport; positive alternative alongside a separate overtime refusal.
- Existing security, failure/restart and persistence tests now use free text and v2 replies. They no longer assert that repeating an answer button inevitably wins. Production timer timeout, 429, invalid schema, cancellation, before/after-commit failure and replay still run.
- Security test verifies old browser default migration to OpenAI and absence of calls on passive loads. Persisted v2 narrative fields receive structural validation.
- `v2-ac2-office-counterfactual.json` and `v2-ac2-romance-counterfactual.json` contain before/input/after mock evidence. `v2-ac2-unit-run.txt`, `v2-ac2-narrative-run.txt`, and `v2-ac2-browser-run.txt` contain test results.

## Final QA / downstream integration

The live owner must reserve new calls in `docs/v2-api-smoke-ledger.json` before making them, then capture exact source hashes and raw public-API before/after turns. The ledger is unchanged at 0/32 additional calls; historical 12 remain intact. Test actual responsiveness, Korean negation, recall, promise consequences, creative counteroffers and invalid-event retry frequency. Exact evidence matching and deterministic prerequisite gates do not prove arbitrary Korean semantic correctness.

Structured fields for asset integration are `game.narrative.pose`, `.emotion`, `.musicMood`, `.location`, and `.events`, plus `game.dialogue.actionBeats`. This AC provides a temporary existing-sheet presentation mapping; actual new sheets, rooftop/rainstreet files and eight music files still belong to asset/music integration. It does not claim that the new pose IDs already represent distinct new drawings. The stage currently needs that integration before rooftop/rainstreet are visually complete.

Office concessions currently expose four capability dimensions (`scope`, `owner`, `deadline`, `boundary`) with free-text details. Subsequent mission QA should refine per-mission objective validation and natural closure as needed; model semantic interpretation of those details requires live evaluation. Romance has prerequisite gates and persistent events; full narrative entertainment and all four ending paths need the subsequent story/QA owners. Thus this report completes the implementation handoff, **not final AC2 live acceptance or a release approval**.
