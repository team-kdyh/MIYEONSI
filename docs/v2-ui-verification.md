# v2 AC1 — fullscreen conversation UI

Scope: assigned presentation AC only. Existing v1 evidence and API ledgers were preserved. No paid API calls were made. The v2 narrative engine, new pose/music catalogue and persistence are separate sibling work; this report does not certify those acceptance criteria.

## Implementation

- `src/main.tsx`: no answer buttons or choice state/payload, no persistent agreement/rule panel, no repeated scene paragraphs. Latest NPC speech is typed once; short action beats are separate. Initial introductions are brief. The transcript is an optional modal. Undiscovered endings remain hidden.
- `src/style.css`: original background fills the viewport; large character and dark translucent bottom conversation/composer; internal text scroll, fixed accessible input/send, small navigation. Desktop 1440x900 and mobile 390x844 are checked in both modes, including large text. A 390x500 layout probe covers a reduced usable height.
- Keyboard: Enter submits, IME composition does not submit prematurely, focus returns to input after successful submission, Escape closes menus, Tab wraps inside menus and focus returns to their opener.
- Read speed now affects NPC replies; instant reveal remains available. Reduced motion removes transition animations and immediately reveals text. Mute, volume and settings persistence remain connected to actual audio elements.
- `src/OfficeAgreement.tsx`: mission selection remains a menu, with outdated answer-choice/turn-limit instructions removed.
- `src/presentation.ts`: client scene cues no longer import the server romance execution module. This fixes the reproduced browser development-mode circular import (`Cannot access chapters before initialization`). New v2 asset/state cue integration can replace this presentation mapping without reintroducing server module imports.

## Validation

Commands: `npm run build`; `npx playwright test -c playwright.v2-ui.config.ts`; `git diff --check`.

Build/typecheck passed. Four browser scenarios cover both modes at both required sizes. Tests assert absent choices/rule panels, text-only turn payload, page/horizontal bounds, character face region above dialogue, visible input/send, scrolling a very long reply, keyboard focus, read speed/reveal, reduced animation, audio playback/currentTime, volume/mute and persisted settings. API routes are explicitly mocked; these are real Chromium rendering and interaction tests, not live model conversation-quality evidence. No player save files are used.

Artifacts: `docs/v2-ui-{1440,390}-{office,romance}.json` and `docs/qa-screenshots/v2-ui/` (title, normal conversation, long reply/input focus, settings, log, suspense). Suspense is an explicit UI state fixture, not proof of reaching that scene through live conversation.

## Observed failures and corrections

1. Initial build attempt found dependencies absent; `npm ci --ignore-scripts` installed the unchanged lockfile dependencies.
2. Browser startup exposed the server/client circular import. Build alone had passed; client-only presentation data fixed actual startup.
3. Menu focus restoration previously captured the already-focused modal close control. Capturing the opener before opening now restores focus correctly.
4. The optional 390x500 probe exposed the portrait face moving alongside a too-tall side panel. A short portrait breakpoint keeps the face above a compact bottom panel.
5. Early screenshots could capture a fading character or a not-yet-decoded background. Final probes wait for sprite opacity and decode the actual stage image before capture.

## Visual review and boundaries

Reviewed actual screenshots of both characters on desktop/mobile, large long mobile text, settings, log and archive suspense. The background occupies the full screen; faces remain above the panel; gold office and purple cafe scenes retain the original art; the lower dark glass panel gives clear Korean text contrast without a cream document slab. Mobile long text scrolls inside its region while the input and send stay visible. Menus deliberately obscure the stage while open.

The current illustrated expression sheets are existing originals. This AC does not claim the additional eight-pose sheets or situation-specific music have been integrated. Mock dialogue is labelled as test evidence here, never as a paid OpenAI observation. Native mobile keyboards, hardware IME and human musical enjoyment were not tested; the smaller viewport probe is not a physical-device claim. Historical v1 choice-based browser suites remain historical and are not the v2 UI acceptance command.
