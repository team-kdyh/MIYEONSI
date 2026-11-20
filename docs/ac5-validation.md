# AC 5 — presentation and accessible playback

Implementation: `src/presentation.ts` defines the typed `PresentationCue` contract. It reads server-owned mission evidence, relationship facts and chapter state; presentation never commits facts or changes an ending. `src/StageEffects.tsx` implements typed text, background crossfade and local audio. Original PNGs are unchanged.

## Event mapping

| Trigger from validated state | Expression / pose | Background | Music / effect | Information also shown without effects |
| --- | --- | --- | --- | --- |
| Office arrival | 0, folder held | office | evening / chime | Current objection and required agreement terms |
| Office unmatched/repeated argument | 1, folded arms | office | evening / chime | Server feedback, no unsupported progress |
| Office new secured condition | 2, adjusting glasses | office | evening / chime | Exact secured condition and next objection |
| Office success/partial | 3, conceding palm | office | evening / chime | Outcome and negotiation feedback |
| Office failure | 1, folded arms | office | evening / chime | Unsecured conditions and outcome |
| Meeting chapter | 0, relaxed smile | cafe | evening / chime | Introduction and sound collecting event |
| Affection chapter | 1, clasped hands | cafe | evening / chime | Headphone return and exhibition preparation |
| Confession chapter | 1, clasped hands | riverside | evening / chime | Mutual confession decision |
| Date chapter | 0, relaxed smile | riverside | evening / chime | Validated couple vs deferred-confession distinction |
| Edit chapter | 3, tilted direct gaze | archive | archive-theme / tape | A17/B17 candidate clue; comparison is still required |
| Truth chapter | 2, holding wrist | archive | archive-theme / tape | Verified comparison vs unverified clue; D04/restoration choice |
| Ending contract | 2, holding wrist | archive | archive-theme / tape | Full relationship, restoration and exit outcome in epilogue |

An event caption directly below the stage remains readable at every speed; it is also in the log panel. The existing server scene/log contains canonical story events and evidence. Candidate clues are distinguished from verified clues. No decision depends on hearing a tone, interpreting a color or observing motion.

Character entrances fade/slide for 650 ms, then breathe by 3 px over five seconds. Background changes crossfade the previous original image over 800 ms. Four-column sheets include actual distinct hand/arm poses as well as expressions. Reduced effects remove entry, breathing and crossfade, and display dialogue instantly. OS reduced-motion preference sets the initial preference and also suppresses CSS motion. Audio is controlled independently: mute pauses both audio elements, while volume controls both gains. Leaving play pauses audio. If browser autoplay is denied, a visible replay button is offered.

Reading speed offers 40/20/8 ms per character or immediate display. “대사 바로 표시” reveals the whole line. The full text occupies its final layout from the start, preventing choice/input displacement while typing; assistive technology receives the full line, not each animated fragment. Keyboard Tab/Shift+Tab navigates controls, Enter sends free text, Escape closes panels, and modal focus is contained and restored. Settings persist locally.

## Assets

- Six original PNGs decoded in Chromium: two 2172×724 four-expression sheets and four original backgrounds (dimensions recorded in JSON).
- PNG sources and creation prompts: `public/assets/generation-manifest.json`, `supplemental-manifest.json`.
- Four new original PCM compositions: `evening.wav`, `archive-theme.wav`, `chime.wav`, `tape.wav`. `audio-manifest.json` records note frequencies, duration, synthesis method and project usage rights. No external samples, fonts, or network audio are needed.

## Verification

`tests/presentation.spec.ts` starts from UI-created games, uses offline provider and runs the same six free-text romance choices in four fresh browser contexts: 1440×900 and 390×844, normal motion/audio and reduced effects/mute. It compares every chapter's event text, choices, expression, background and final truth ending. It checks real HTML audio playback time, source loading, volume, mute/pause, CSS animation state, typed reveal, keyboard input/focus, persistence and horizontal overflow. It also plays office arrival → objection → evidence → agreement to exercise all four boss expressions.

`docs/ac5-evidence.json` contains execution timestamp, source SHA-256 hashes, initial conditions, observations and final relationship contract. The normal-motion run deliberately sets slow reading and 1% volume by keyboard to verify both controls; defaults are 20 ms and 35%. Quiet runs retain the same story information and all choices.

Screenshots under `test-results/`:

- `ac5-{1440,390}-{default,quiet}-{0,3,4,5,6}.png`: full pages at meeting, date, clue candidate, verified clue and ending; captures wait for entrance/crossfade completion and reveal dialogue.
- `ac5-input-{1440,390}-{default,quiet}.png`: exact requested viewport dimensions, scrolled to usable free-text input.
- `ac5-office-{1440,390}-{default,quiet}.png`: agreement and approving boss expression.

Mobile uses normal vertical scrolling to preserve readable prose; no horizontal scrolling or overlapping fixed controls. Screenshot files are local verification artifacts, ignored by Git and reproducible with Playwright.

Scope: Chromium/offline UI and server behavior. No paid API calls were made for AC 5. Playback timing verifies the browser audio pipeline, not subjective listening quality or physical speaker output. This criterion does not establish commercial readiness of the whole game.


Final checks on 2026-11-21:

- `npm run build`: TypeScript and Vite build passed.
- `npm test`: 77/77 passed.
- `npx playwright test`: final full run 10/10 passed, including AC5's four-context replay.
- An earlier full browser run returned HTTP 400 in the pre-existing 24-office-outcome test. Its original assertion omitted the response body. Added contextual response reporting; the standalone office run (2/2) and subsequent complete run (10/10) passed. The original transient cause was not established; this is recorded rather than claimed fixed.
- Visually inspected final desktop clue scene, mobile static clue scene and exact mobile input viewport. Prose, static clue caption, choices and input remain readable; long mobile scenes scroll vertically.
