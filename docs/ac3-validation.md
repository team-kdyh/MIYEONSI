# Final AC3 continuation — 2026-11-21

**Verdict: AC3 passes for the implemented story and server-owned branching.** This final review supersedes the historical 8/8 budget and unresolved live-attribution statements below. Runtime source was preserved; no provider behavior, original artwork, saves, dependency lock, or paid-call ledger was changed. Final live source hashes match 7/7 after CRLF normalization (`ac3-final-source-audit.json`). The cumulative paid count is 12/12, with zero new calls.

## Story review against the criterion

The pre-play briefing identifies the protagonist as 29 and Seo Yuna as 27; Yuna is a sound archivist preserving disappearing sounds. Her cinnamon-scent preference, cookie jokes, tangled headphone cord and awkward confession establish a person and mutual attraction before the thriller. This is original authored content in `server/romance.ts`.

| Chapter | Background | Distinct event, consequence and foreshadowing |
|---|---|---|
| 1 — 닫는 카페의 종소리 | Cafe | Save a closing cafe's bell, introduce preferences, share or decline recording; headphone loan establishes the next meeting. |
| 2 — 금요일의 빈 트랙 | Cafe | Return/test headphones or postpone honestly; shared testing establishes verified trust, while repeated playback or a zero-second deleted track foreshadows editing. |
| 3 — 고백은 녹음 밖에서 | Riverside | Yuna puts the recorder away and confesses; acceptance establishes a couple, refusal/deferment explicitly produces a friendship walk. |
| 4 — 서툰 둘의 산책 | Riverside | Couple picnic/date with triangular omelets and negotiated closeness; a fabricated player line interrupts it. An archive appointment can be recorded. |
| 5 — 삭제된 숨 | Archive | Repeated-date calendar exposes fixation. Comparing A17/B17 verifies deletion of the player's departure; refusal or replay leaves different consequences. Keeping the prior appointment establishes trust. |
| 6 — 내일을 남기는 법 | Archive | D04 identifies Yuna's editing and scheduled replay; restoration/resumption, departure or repetition establishes a terminal outcome. |

Chapters 1–5 each have three distinct visible authored reactions. Background locations are intentionally reused across related scenes; the six chapters have distinct events and dialogue. Earlier player detail is recalled as a quoted player statement. The trust test verifies actions, not obedience to Yuna. Final autonomy and evidence distinguish the endings:

- Relationship reset (`romance-0`): restart with mutual boundaries, stop replay, but insufficient comparison evidence or verified trust leaves full restoration unresolved.
- Endless day (`romance-1`): choose repetition or leave the final chapter unresolved; replay continues and practical exit rights are not secured.
- Safe separation (`romance-2`): explicit final departure takes priority regardless of earlier trust/evidence; relationship ends, replay stops, safe exit and no-contact rights are recorded.
- Archive truth (`romance-3`): A17/B17 comparison plus shared testing or the fulfilled archive appointment plus final restoration establishes D04 responsibility, restores the original and stops replay while mutually continuing the relationship.

## Fresh validation

- `npx tsx --test server/romance.test.ts`: **7 passed**, including all 729 six-choice routes terminating, four unique final contracts, confession refusals, distinct chapter consequences, trust/evidence contrasts, free-text truth and an 18-turn unresolved-dialogue limit. Log: `ac3-final-unit-run.txt`.
- `npx playwright test --config playwright.ac3-final.config.ts`: **2 passed**. Five complete normal public-API games use `choice:null`: all four endings plus the evidence-present/trust-absent contrast. No state injection. The second test completes the couple/date/truth path in the 390×844 Chromium UI and verifies chapter progress, backgrounds and horizontal fit. Log: `ac3-final-browser-run.txt`; full inputs/state and source hashes: `ac3-final-evidence.json`.
- Visually inspected `qa-screenshots/ac3-final-truth-mobile.png`: character, archive backdrop, complete ending text, collection action and explicit OFFLINE DEMO label are visible and readable.
- Browser verification uses isolated port 3033 and `.ralph/ac3-final/data`, with an empty OpenAI key. `verification/ac3/romance.spec.ts` preserves the original test logic while writing separate final artifacts, leaving historical evidence intact.
- README already documents Windows play/stop launchers and third-party notices; those files and the dependency lock were preserved.

These fresh runs establish story/state behavior offline. Existing final live calls 11–12 establish only two consecutive natural romance turns and correct player/Yuna preference attribution; they do not establish live completion of every chapter or ending. No claim of universal Korean interpretation, physical-device keyboard testing, or full commercial release approval is made. No runtime change required a new build; the accepted AC4 build/110-test evidence remains applicable to unchanged runtime sources.

---

# AC 3 — romance story verification

## Current repair verification — 2026-11-21

This section supersedes the older ending-condition and test-count descriptions below. Six chapters retain the adult sound-archive romance, confession, couple date, altered recordings and confrontation. Each resolved choice in chapters 1–5 now produces a distinct authored reaction visible at the next scene, including the headphone loan, mutual affection, an accepted refusal and the first deleted-track clues. A declined confession is described as a friendship walk, never an established couple. No original art or shared provider code was changed.

Ending priority remains separation → truth → reset → loop. Truth now requires A17/B17 comparison **and** verified trust: either the returned-headphone joint test or keeping the previously agreed archive listening appointment. Obedience or a self-reported feeling does not supply trust. The final restoration choice records mutual boundaries; explicit separation or replay still overrides earlier trust/evidence. Missing trust is explained before the final choice. A restoration request without the prerequisite records leads to relationship reset with full restoration deferred.

Validation in this repair:

- `npx tsx --test server/romance.test.ts`: 7 passed, including 729 complete choice combinations, four distinct final contracts, maximum 18 unresolved turns, trust/evidence contrasts, per-choice consequences and three confession refusals.
- `npm run build`: passed, including TypeScript.
- `npm test`: 103 passed in the concurrent workspace, including persistence/recovery and the romance regressions.
- `npx playwright test tests/romance.spec.ts`: 2 passed. One test creates five normal games through public HTTP: four endings using free text only, plus the same restoration/evidence route without trust. The other completes the couple/truth path through the mobile UI and checks backgrounds and horizontal overflow.

Exact HTTP inputs, resulting canonical state and source hashes: `ac3-repair-evidence.json`. Mobile ending capture: `../test-results/romance-truth-mobile.png` (visually inspected). The older `ac3-evidence.json` is historical evidence, not a hash record for this revision.

No paid API calls were made. The cumulative limit remains **8/8**. This verifies AC3 story/state behavior with the offline provider, not live language quality; AC4's unresolved live attribution caveat in `ac4-validation.md` remains. No claim of full commercial readiness is made.

## Earlier implementation record

Implemented six original chapters: meeting at the closing cafe, affection and a borrowed-headphone promise, confession, a riverside couple date (or friendship if declined), edited archive recordings, and final confrontation. The protagonist is 29 and Seo Yuna is 27. The title briefing carries ages and horror disclosures; character dialogue carries the story.

`server/romance.ts` owns chapter entry/event/completion/timeout contracts, relationship facts and ending contracts. Every chapter allows at most three turns, including unclassified free text. At the limit unresolved events transition explicitly; the last unresolved chapter ends in the loop. Free text is parsed by chapter-specific local rules and takes precedence over the selected suggestion when supplied. It is not a general natural-language semantic classifier: unsupported paraphrases may consume a turn without resolving the event. Authored suggestions remain a reliable route.

Trust is represented by verified honesty (shared test playback matches the explanation) and fulfilled promises (headphone return and attending promised archive comparison), not obedience points. Self-report alone does not prove honesty. Autonomy records actual respected refusals. A17/B17 and D04 are identifiable verification events. Each fact has an event ID and version and is copied to the canonical ledger, which outlives bounded dialogue history. Player recollections are explicitly quoted as their own words, not promoted to verified events.

Final priority: explicit separation wins; restart with A17/B17 verified comparison yields truth and verifies D04/restores the original; restart without comparison yields relationship reset; continuing replay or unresolved timeout yields endless day. All four final objects differ in relationship status, mutual boundaries, looping, exit rights, safe exit, no-contact right, responsibility verification and restoration. A decision to resume a relationship is explicit even after a deferred confession.

Romance live Responses schema accepts newly composed speech (1–600 characters) independently from validated recall IDs. Model speech cannot change chapter, evidence, relationship facts, or ending. Office dialogue behavior was preserved. Live speech quality was not tested; this task made zero paid calls.

Validation: `npm test` — 76 passed, including every one of 729 suggested-choice combinations, four reachable ending paths, free-text truth, 18-turn timeout, refusal, injection and generated-speech boundaries. `npm run build` — passed including TypeScript. `npx playwright test tests/romance.spec.ts tests/play.spec.ts` — five passed: mobile free-input romance route, backgrounds, no horizontal overflow, ending, persistence/retry smoke and existing UI checks. The mobile screenshot was visually inspected. The final subsequent change only reclassified unverified self-introduction from honesty to relationship; unit/build checks were rerun.

See `ac3-evidence.json` for exact route inputs, source SHA-256 versions and limitations. Screenshot: `../test-results/romance-truth-mobile.png`. Original PNG files were not modified. This evidence covers AC 3, not full-game commercial readiness or sibling acceptance criteria.
