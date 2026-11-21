# v2 AC6 — persistence and request safety

2026-11-21. This is the AC6 worker's scoped verification, not a release grade or a live conversational review. No paid API calls were made. Both paid-call ledgers and all tracked v1 evidence files were left unchanged.

## Changes

- A profile without an explicit provider defaults to OpenAI when the server has a key. An existing explicit offline preference is preserved. The default model and public model label both use `gpt-4.1`; environment overrides remain supported. State, new-game, save and load operations never generate.
- API responses are not cached. Local Host and Origin checks reject rebinding/cross-origin probes. Mutation fields are allowlisted, so client-supplied game state/events/provider changes cannot be smuggled into a turn. The existing 500-character/4-KiB limits, one request per profile lock, 300/hour limiter, durable 100-attempt game cap and 10-second cancellation timeout remain enforced. Reset now also observes the rate limit.
- The commit journal retains the latest 128 turns. Monotonic versions still reject evicted or abandoned timeline requests. Reset uses a fresh epoch and archives both original files before replacement; stale pre-reset requests cannot become new turns. Corrupt current saves are also preserved before backup recovery.
- Existing format-1 v1 saves are accepted without rewriting their bytes on read. Whole-game autosave and three slots preserve additive story fields. No user save directory was used by tests.
- Existing regression tests now write only `docs/v2-*` evidence instead of overwriting v1 evidence.
- Browser recovery tests were adapted to the free-text composer. A reproduced failure showed the error banner covering the save dialog close button. A narrow CSS change moves the banner down while a modal is open; recovery then passes without forced clicks.

## Executed verification

- `npm run build`: TypeScript and production build passed.
- `npm test`: 114 passed, 0 failed, 0 skipped. Includes real local-process restart, before/after-commit interruption, duplicate/conflicting requests, all three slots, unlock preservation, corrupt backup recovery, mock malformed/429 replies, actual production timeout and cancellation.
- `npx playwright test --config playwright.v2-persistence.config.ts`: initially 6/7, with the banner collision above. After the CSS fix: 7/7. Tests cover save-delivery recovery, explicit reset, slots/log/unlock reload, stale timeline recovery, lost turn delivery and replay, conflicting tabs, and settings/provider persistence.
- After the final reset-epoch fix: `node --import tsx --test server/v2-security.test.ts server/persistence.test.ts`: 3/3 passed. The new regression proves a pre-reset pending request returns 409 and makes no model call.
- A mock transport that refuses all external fetches proves zero calls on passive/state/new/save/load operations, explicit model failure without offline substitution, and only explicit offline switching. Raw HTTP was used for the Host probe because Node fetch normalizes that header.
- Key-pattern scan over public assets, dist, source, scripts and docs: zero matches. `.env` is not tracked. Packaging uses an explicit allowlist excluding `.env`, `.local-data`, runtime logs and node_modules. No private credential was printed, read for this audit, or copied into an artifact.

Evidence: `v2-ac6-audit.json`, `v2-security-evidence.json`, `v2-legacy-save-evidence.json`, `v2-persistence-evidence.json`, `v2-recovery-evidence.json`, `v2-input-evidence.json`, `v2-interruption-evidence.json`.

## Integration boundary for the next owner

At this worker's inspection, `server/dialogue.ts` and the semantic provider still expose the old intent schema; the sibling story-engine redesign has not appeared in this workspace. The additive promise/event/location round-trip fixture is explicitly synthetic. It establishes storage fidelity, **not** that novel model events are already generated, reconciled or asset-validated. Existing old-choice API tests are retained as legacy regression coverage and are not v2 narrative quality evidence. Final AC6 acceptance for the new event engine requires rerunning these tests with that engine and its actual generated event schema; this report does not claim that integration or the overall Seed is finished. Settings remain browser-local by design. Actual key/model access and paid conversational QA belong to the final QA owner.
