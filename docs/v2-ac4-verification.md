# AC4 — v2 original illustration integration

2026-11-21. Scope: illustration assets, actor-specific pose catalogue, scene backgrounds and presentation verification. This is not live conversational QA or approval of all v2 criteria.

## Implementation

- Copied six finished parent-generated files into `public/assets/v2/`: four four-column character sheets, rooftop and rainstreet. Checked every SHA256 against the staging manifest before copying. Preserved v1 originals. `public/assets/v2/generation-manifest.json` contains exact prompts, reference identities, generator, original output locations, dimensions, alpha checks, hashes and the rejected/revised boss sheet history.
- `src/visualAssets.ts` explicitly maps each actor to 12 distinct sheet/cell pairs (4 original + 8 new). Fourteen semantic pose IDs include two aliases per actor, **not** fourteen claimed illustrations. `watch` and `intense` avoid forcing a watch gesture into a bashful response or an intense gaze into a surprised response. The provider receives the actor-specific Korean descriptions with its existing structured pose enum.
- `CharacterSprite` selects an actual PNG cell and restarts the short, single entrance fade on each committed narrative turn; it settles rather than looping. Existing server-approved action beats remain visible separately from speech. Accessible image descriptions and static action text retain information with reduced motion. CSS preserves the original cell's 3:4 ratio, including mobile.
- Background paths resolve rooftop/rainstreet to the versioned assets. Both the main stage and previous-background crossfade use that same resolver. Location is read from committed narrative state, never inferred from player text by the UI. Legacy save presentation keeps original sheets.

## Verification

- `npm run build`: passed, including TypeScript.
- `npm test`: 134 passed, zero failures; ordinary tests, no paid API.
- `npx playwright test --config playwright.v2-art.config.ts`: five tests cover shipped-file hashes, all 12 distinct cells per character at 1440x900 and 390x844, real server reconciliation of two location moves, current action text, image decoding, face above dialogue, one-shot entrance and reduced motion. HTTP/model replies are explicitly mocked; this is actual browser rendering with the real reconcile function, not evidence of live model quality.
- `npx playwright test --config playwright.v2-ui.config.ts`: four existing UI regressions passed (keyboard, settings, overflow, long text and reduced motion).
- Per-pose browser screenshots: `docs/qa-screenshots/v2-art/`. Machine receipts: `docs/v2-art-{office,romance}-{1440,390}.json`. The 60 screenshots include semantic aliases; distinct illustration count is 24 total, not 60.

## Visual review and fixes

Inspected all six character sheets (two original, four new) directly. Hair, clothing, clip/glasses and facial identity remain recognizably consistent. New hands/props/gestures are drawn rather than approximated by CSS: headphone offer, recorder held to chest, teasing finger, cassette offer; watch pointing, document offer, thinking, tired forehead. The revised boss A sheet has transparent margins. Its figure is slightly smaller than B, but remains legible; no cells bleed into neighboring figures.

Reviewed actual desktop and mobile screenshots for both actors, rooftop/rainstreet, headphone/document/watch gestures and laughter. Faces remain above the dialogue surface, hand gestures at chest height remain readable, and backgrounds fill the viewport. First review found mobile sprites vertically stretched by the old fixed-width styling; corrected to the original 3:4 aspect ratio and regenerated screenshots. The lower body is intentionally covered by the dialogue panel; it is not relied upon for gesture information.

Initial browser fixture attempted identical move events repeatedly and hit the existing duplicate-event guard. Preserved this finding here; changed the art fixture to two distinct moves followed by conversation in that location, without altering the validator. Repeated legitimate return visits deserve separate narrative QA; this asset test does not prove that behavior.

No paid Responses calls, key reads, private-save changes, old-evidence rewrites or runtime signals. Final conversational QA must use fresh implementation hashes: provider input now includes the visual catalogue and the pose enum has two additional IDs. Musical integration remains the separate AC5 scope.
