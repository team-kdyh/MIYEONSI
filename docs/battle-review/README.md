# Office persuasion battle — parent integration, 2026-11-21

The requested office mode now uses player composure and boss resistance, both starting at100. Free text drives authored dialogue and a separate semantic battle proposal. The server owns bounded damage, recovery, combos, persistence and victory/defeat. The root preview is http://127.0.0.1:3001. This is a playable local candidate, **not commercial release approval**.

## Rules and scope

- Fresh persuasive contributions deal12 damage for the first two scoring exchanges, then20. Consecutive successful exchanges using different argument types add4; counters add4. These are not categories the player must select.
- Actual new coercive demands cost8 composure for the first demand on an issue and24 for subsequent distinct demands. Mere questions, ordinary banter and elapsed turns do not automatically damage either side.
- A grounded response to an unresolved pressure can restore up to8 once. A counter also damages resistance. Repeats do not stack. Gauges clamp at0–100; boss0 wins, player0 loses, simultaneous0 favours the player.
- Final agreement is not required for intermediate persuasion. The same issue can receive multiple genuinely different ideas. Existing8 scenarios retain their different situations and concerns. Legacy games have a neutral100/100 baseline without invented historical hits; completed saves remain completed.
- Office generation uses a focused utterance/events/battle envelope. It no longer creates romance-style joint promise conditions for every work proposal. Existing office records remain readable. Romance state/commitment handling is unchanged. An office repair is discussion-only (`changes:null`) with a newly authored utterance; it cannot retain the same rejected claim by merely keeping battle metadata.
- Main play retains zero story-answer buttons. HUD shows gauges, current pressure, damage and reason. Dialogue expands within the remaining screen space and paginates without dropping characters. Portraits, backgrounds and eight situational tracks remain available.

## Automation outcome — not relabelled

The auto interview exhausted its stored round cap without execution. The settled user request was then frozen as `verification/office-battle.seed.yaml`, seed_88c1403acddc. Execution `exec_4c6ec130ca53` in `orch_50deac2e4dfa` reported5/5 implementation. Its formal evaluation approved only2/5 criteria (AC4/5); AC1/2/3 were rejected. See `worker-official-evaluation.json`.

Chained Ralph job `job_62f5b061d5f7` failed **before a new generation** with `Lost durable lineage advancement claim before completion`. See `ralph-terminal-error.json`. The parent independently corrected and tested a source snapshot after that failure. No successful Ralph convergence, replacement formal approval, or commercial readiness is claimed. The older overall release goal remains paused.

## Actual Responses observations

`docs/battle-api-smoke-ledger.json` contains all24 additional attempts, failures and internal repairs included. The old12+32 ledgers remain unchanged: cumulative68. All calls used an existing server environment key, `store:false`, max1600 output tokens, isolated random ports and synthetic storage. No key or private save was copied into this review. Worker paid calls:0. No further paid calls were made after the cap.

There are19 public HTTP turn receipts:15 committed200 responses and4 rejected400 responses. A200 API transport response is **not** automatically a game-quality pass. Raw request bodies/model responses, their source hashes, and HTTP receipts are in `live/`, `live-receipts/`, and `live-summary.json`.

The first failures revealed fabricated quotation matching, overly strict exact source matching, and inappropriate joint promises. The parent corrected those and separated office context. A natural seven-turn game then reached boss100→88→88→76→52→28→8; the second turn was a paraphrase and scored nothing. The last delegation question was wrongly blocked by a broad past-fact guard matching “결정권이 있는”. After fixing that guard, the same synthetic saved profile was copied byte-for-byte into another isolated run and the same final input reached boss0, `office-clockout-success`, via one internal rewrite. No gauge or success state was injected. The captured sequence replays successfully against the final code (`battle-recorded.test.ts`); replay is not fresh generation.

The final three-turn live probe exposed an overly generous judgment: an explicit refusal with no alternative scored because the NPC invented a tomorrow plan. The parent retained this FAIL, added a bounded rejection guard for that reproduced form, and strengthened the office difficulty/grounding prompt. Ordinary banter in that probe committed without damage. **The final prompt/guard have not been tested with new model generation. Actual live pressure→guard/counter and defeat paths were not established.** Their mechanics are covered by synthetic normal-turn tests. The last live result must not be represented as a pressure/guard pass.

The server's quoted-source checks and bounded Korean sanity guards do not prove general semantic entailment. Semantic repetition and judgment still depend partly on model quality. Broad conversation diversity and human balance testing remain necessary.

## Free verification and final preview

- Full isolated typecheck/build passed. Full unit/HTTP suite:443/443. A subsequent focused run passed12/12, including the newly added eighth-mission introduction check (444 distinct current tests). No paid calls in tests.
- Eight missions each have normal-turn victory and coercion-driven defeat coverage. Tests also cover guard restoration, unresolved-pressure references, repeat/near-repeat scoring, combos, forged references, authority spoofing, rejection consistency, neutral dialogue, cancelled requests, slots, restart, old saves and exactly-once commits.
- Existing35 browser cases were checked. Initial failures included old guide selectors, old full-body geometry, and the added HUD status being mistaken for a pending-response indicator. The updated16-case selection passed15 immediately; the remaining controlled13-second case passed separately after narrowing its selector. The other19 cases passed in the preceding run. Five dedicated battle HUD cases additionally pass at1440×720 and390×844 with reduced motion, large text and complete dialogue reconstruction. Total40 distinct browser cases; this is a union of focused runs, not a fabricated single40/40 log.
- The larger office portrait intentionally extends behind the dialogue panel. The updated artwork tests preserve visible face bounds, HUD clearance, aspect ratio, all12 original cells and unchanged romance geometry. A real long-dialogue overlap at900px height was fixed with proportional height caps before rechecking.
- Root launcher rebuilt and restarted port3001. `root-preview.json` confirms HTTP200,100/100 gauges, visible mobile input, no romance HUD, zero model turns and no page errors. The browser was opened through the existing launcher. `screenshots/root-*.png` show the actual served build.
- All9 pre-existing private profiles remained byte-identical (`preservation.json`). Historical test-generated reports accidentally emitted at old paths were archived under `prior-test-output/` and originals restored. Unrelated diagnostic work was left intact. Old live and official FAIL evidence was not overwritten.

Final source hashes are in `final-source-hashes.json`; scoped integration hashes are in `integration-manifest.json`. Build/test logs, recorded-output fixtures and first failed browser logs are retained in this directory. No dependency changes were needed.

The playable ZIP was rebuilt with128 payload files. `package-audit.json` confirms every ZIP payload matches its declared hash and current source, with no private configuration, saves, dependencies directory or credential-shaped strings. ZIP SHA256: `5fa415429663b9a6b2a7c5b225caf15785ee8d66cc1f6011711f85d8467d9d0a`. The previous playable package was preserved under `artifacts/before-office-battle/`. This byte audit does not substitute for a fresh installation or a commercial release decision.

## Reproduction

Run tests in a separate source snapshot: legacy tests write report files under `docs/`. Copy only source, public assets, configs and test fixtures; do not copy `.env` or private profiles. Use `AFTERHOURS_SKIP_ENV_FILE=1` and a test port such as3099. Free commands:

```powershell
npm run build
npx tsx --test --test-concurrency=1 server/*.test.ts
$env:AFTERHOURS_TEST_PORT='3099'
npx playwright test
npx playwright test --config playwright.battle-hud.config.ts
```

Do not rerun the paid harness: its24-attempt allocation is exhausted. Ordinary player turns use the normal runtime budget independently.
