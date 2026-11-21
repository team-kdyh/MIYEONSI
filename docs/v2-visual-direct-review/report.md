# Direct visual review — frozen parent checkpoint

Reviewed 2026-11-21. Reviewer: /root/v2_visual_assets. This is an actual image inspection, not a coordinate-only or test-count verdict. No production code, images, saves, runtime state, or paid API was changed.

## Result and limits

The current captured composition meets the requested visual direction: a full-stage illustrated background, a readable 2D character, and a dark translucent bottom conversation panel without white page slabs or story-answer choices. All four long-dialogue frames retain the character's face and the input/send area. The 24 distinct current sprite illustrations preserve their informative hands and props in the inspected 390-pixel frames. I did not observe head clipping, adjacent sprite-cell leakage, checkerboard transparency, or an obvious cutout halo in these frames.

This is a bounded visual finding, not a release approval. The captures use controlled model replies, and pose tests explicitly request each pose. They do not prove that new OpenAI dialogue chooses appropriate poses, uses all twelve naturally, remembers promises, respects consent, or provides an enjoyable story. Animation timing, sound, real mobile keyboard behavior, and full session pacing were not experienced in this image-only review. Fresh provider and mutual-promise behavior remains unverified.

## Provenance correction

The parent initially copied the old `v2-art` directory into the parent-final artifact folder and treated that copy as if it represented the current browser run. Inspection of the executed test and its JSON showed that this inference was wrong: `tests/v2-art.spec.ts` actually writes `docs/qa-screenshots/v2-ac4-recheck/`. The copied `v2-art` frames are historical, with different, larger character framing.

I first opened those 24 historical frames, then reported the mismatch. The parent corrected `docs/v2-parent-final/evidence-preservation.json` and preserved the actual 60 current recheck outputs. I then opened all 24 distinct current 390-pixel originals individually, plus the parent's two galleries assembled from the corrected current receipts. All 24 individually opened root recheck files are byte-identical to their newly preserved parent-final recheck counterparts; see `current-capture-copy-verification.json`. Historical hand/prop clipping is not being reported as a current defect. No assertion that a file was rerendered is inferred merely from its absence from a changed-files list.

The four long-focus frames are genuine current test writes, preserved before historical restoration. Current artifacts are found under:

- UI: `docs/v2-parent-final/artifacts/docs/qa-screenshots/v2-ui/`; writer `tests/v2-ui.spec.ts:65`, receipts `docs/v2-parent-final/artifacts/docs/v2-ui-{1440,390}-{office,romance}.json`.
- Pose and reduced-motion frames: `docs/v2-parent-final/artifacts/docs/qa-screenshots/v2-ac4-recheck/`; writer `tests/v2-art.spec.ts:46-55`, receipts `docs/v2-parent-final/artifacts/docs/v2-ac4-{office,romance}-{1440,390}.json`.
- Parent's current comparison galleries: `docs/v2-visual-direct-review/current/{office,romance}-comparison.png`. They aid comparison but do not replace individual inspection.
- Historical boundary frames: `docs/qa-screenshots/v2-ac4-boundaries/`; writer `tests/v2-ac4-boundaries.spec.ts`, adjacent trace `docs/v2-ac4-boundaries-390-true.json`.

The older root comparison galleries and historical v2-art frames remain separately classified in `opened-images.json`. They are not additional current states.

## Dependency scope

`dependency-comparison.json` compares 25 relevant files with `docs/v2-parent-final/candidate.json`, checkpoint `v2-parent-20261121-fcb42511`. The renderer, CSS, presentation mapping, main UI, all twelve PNG assets, and relevant test files match exactly. A final read-only recheck found no drift from that comparison.

The exception is `server/narrative.ts`: checkpoint SHA256 `fcb42511a5ad93a7be77dc4e436a1bb3a12d770ee9b958c9c9bece3441d9e673`, reviewed root SHA256 `5aa03219df2bcf3bb2794f604f66d3ebfde55bee13b8cee671face35de42b0f1`. Therefore the checkpoint can support unchanged rendering of the same state, but it cannot certify current acceptance/refusal/date semantics or the next Ralph state schema. Those affected boundary paths need a new run against the eventual integrated candidate.

## Four long-dialogue frames

All paths below are relative to `docs/v2-parent-final/artifacts/docs/qa-screenshots/v2-ui/`; exact SHA256 and dimensions are in `opened-images.json`.

| Opened frame | Direct visual observation |
|---|---|
| long-focus-1440-office.png | Warm office scene and centered boss remain prominent. Dark dialogue panel has strong text contrast; input and send control remain visible. No page overflow or white slab is visible. |
| long-focus-1440-romance.png | Yuna's complete face remains above the panel with ample background atmosphere. The panel confines the long reply. A partially cut line at the upper scroll boundary makes the scroll position less immediately clear. |
| long-focus-390-office.png | Face and upper-body gesture survive the narrow viewport; composer is on screen. Long text scrolls within the panel, but a clipped upper line makes the boundary feel abrupt. |
| long-focus-390-romance.png | Character focus and input remain intact. The lower text fades toward the scroll hint; this conveys continuation, but the final visible line competes with the fade/hint. |

The partial lines are observations of the displayed scroll position, not proof that content is unreachable. A clearer top-edge scroll affordance could improve polish. The small secondary metadata and header labels at 390 pixels deserve practical touch and reading checks. The subdued send control is shown with an empty input, so its appearance is not evidence of poor contrast for an enabled control.

Short controlled pose replies leave substantial unused space in the chat panel. This reserves stable space for longer dialogue and avoids shifting the composer, but it can make quiet moments visually sparse. This is a design tradeoff, not an observed blocker.

Subjective image-only scores, not acceptance grades: readability 4/5, character focus 4/5, aesthetic coherence 4/5. The remaining point reflects the small mobile secondary text, scroll-edge polish, and a few similar gesture families.

## Twelve distinct illustrations per actor

Columns are zero-based. The named screenshot is `docs/qa-screenshots/v2-ac4-recheck/{actor}-390-{pose}.png`; an exact byte-identical preserved copy exists in the current artifact directory. Only distinct sheet/column combinations are counted. Labels, CSS motions, and aliases do not add illustrations.

### Park Dohyeon

| Pose | Sheet / column | Observed face, body, hand or prop difference |
|---|---|---|
| neutral | boss-expressions / 0 | Asymmetric raised brow and tilted head; upright folder pressed to torso, free hand pocketed. |
| firm | boss-expressions / 1 | Chin lifted, skeptical narrowed gaze, arms firmly crossed with watch on the front wrist. |
| turn | boss-expressions / 2 | Wide eyes, open mouth and sweat mark; one hand adjusts glasses, other hand remains pocketed. |
| smile | boss-expressions / 3 | Closed eyes, soft crooked smile and head tilt; one palm offered upward, other hand pocketed. |
| listen | v2/boss-actions-a / 0 | Leveler head and direct eyes with a firm mouth; arms crossed in a narrower, less lifted posture. Similar gesture family to firm, but a different drawing. |
| laugh | v2/boss-actions-a / 1 | Half-lidded smirk; hand clearly rests on hip with elbow out, other arm hangs down. Current framing exposes the hip hand. |
| watch | v2/boss-actions-a / 2 | Furrowed direct gaze; one wrist raised while the opposite index finger points at the watch. |
| offer | v2/boss-actions-a / 3 | One hand holds the upper edge of a blank document; opposite palm supports and presents it. The document is visible. |
| thinking | v2/boss-actions-b / 0 | Fingers support chin; opposite forearm supports the elbow. Inward brows and questioning head angle. |
| surprised | v2/boss-actions-b / 1 | Glasses-touch and open-mouthed surprise; unlike turn, the other hand rises near the chest instead of staying pocketed. |
| concern | v2/boss-actions-b / 2 | Lowered head and closed eyes; spread hand across forehead, opposite arm down. Tired silhouette reads clearly. |
| farewell | v2/boss-actions-b / 3 | Closed-eye resigned smile and upward palm; unlike smile, free hand rests on hip with wider elbow and body lean. |

The firm/listen, turn/surprised, and smile/farewell pairs are distinct illustrations, but not six radically different gesture families. Their second arm, head angle, and posture do much of the differentiation. Some apparent facial scale and linework variation exists between generations of boss art; no severe continuity break was observed. A face-only crop would understate the difference and would be a poor basis for this count.

### Seo Yuna

| Pose | Sheet / column | Observed face, body, hand or prop difference |
|---|---|---|
| neutral | yuna-expressions / 0 | Upright head and shoulders, direct calm gaze, small closed smile, arms lowered. |
| smile | yuna-expressions / 1 | Closed laughing eyes and open mouth; both hands interlaced high beneath the chin, shoulders drawn slightly inward. |
| thinking | yuna-expressions / 2 | Worried inner brows and slightly open mouth; one hand wraps the opposite wrist near the chest. |
| intense | yuna-expressions / 3 | Head tilted down and sideways, narrow direct gaze and controlled smile; arms behind the body. |
| listen | v2/yuna-actions-a / 0 | Hand cups the ear, head leans toward it, soft attentive gaze; opposite arm lowered. |
| laugh | v2/yuna-actions-a / 1 | Eyes shut in laughter; fingertips lightly cover the mouth, opposite arm hangs down. Distinct from the two-hand chin clasp. |
| shy | v2/yuna-actions-a / 2 | Blushing downward/sideward gaze and inward shoulders; hands clasped low at waist and actually visible in current framing. |
| offer | v2/yuna-actions-a / 3 | Foreshortened extended hand offers one headphone cup; the remaining arc/cup hangs visibly, with an inviting small smile. |
| turn | v2/yuna-actions-b / 0 | Index finger raised beside cheek, half-lidded playful smile, other hand relaxed by side. |
| concern | v2/yuna-actions-b / 1 | Worried brows and mouth; both hands clutch a handheld recorder at chest height. |
| firm | v2/yuna-actions-b / 2 | Bends forward, lowers head and looks up intensely; one hand grips cardigan near chest and the other is lower by thigh. |
| farewell | v2/yuna-actions-b / 3 | Somber open eyes; one hand on upper chest, other palm extended with a cassette. The cassette is visible in the current frame. |

Identity, clothing, hair accessories, and art direction remain coherent across Yuna's sheets. Her gestures have a wider prop/hand vocabulary than the boss's. The larger historical framing obscured the low clasp or cassette in some cases; the current framing preserves them at the cost of smaller facial micro-expressions.

Alias exclusions: office intense shares firm; office shy shares concern. Romance surprised shares thinking; romance watch shares listen. The current gallery may use one of these aliases to name a cell; this does not increase the 12-per-actor count.

## Boundary and reduced-motion images

Six historical 390-pixel reduced-motion boundary frames were opened individually. `boundary-capture-index.json` preserves exact inputs, event IDs, state values, screenshot hashes, and the adjacent trace SHA256. These are controlled fixture/reducer traces, not new generated conversation.

| Capture ID | Observed presentation | Historical adjacent state |
|---|---|---|
| move-offered | Café remains; headphone offer gesture; rooftop invitation appears in text. | invitation offered; cafe; no active date |
| move-refused | Café remains; ear-cupping listening gesture; reply accepts staying. | invitation refused; cafe |
| move-accepted | Backdrop changes to sunset rooftop; two-hand smiling gesture. | accepted movement; rooftop |
| date-future-accepted | Rooftop remains with the same smiling illustration. | future date accepted; dates 0; no active date |
| date-started | Rooftop remains; hand-at-mouth laughing pose. | active date ID f1464788-1771-40eb-a08f-d48775a78030; dates 0 |
| date-participated | Rooftop remains; safe smiling pose with textual paper-boat action. | dates 1; active date cleared; completion references the same date ID |

The final paper-boat beat is carried by text and a general smiling pose; the image does not literally show putting paper boats down. This is a bounded 2D pose system, not illustration generation for every novel action. The visible frame avoids conjuring headphones for that action, but cannot prove every generated prop/pose combination will be appropriate.

I also directly opened the current archived office-390-reduced.png and romance-390-reduced.png: character, action text, dialogue and composer remain visible, with hand/hip and cassette gestures intact. A still image does not prove that animation or flashes are absent over time. The existing test source checks animation-name none and hides the arrival layer; I did not rerun that temporal/computed-style test in this review.

Because the reducer has changed, the historical boundary traces must not be presented as current semantic validation. The eventual Ralph candidate needs current offered/refused/accepted movement and future-versus-active date traces, with event IDs and screenshots captured together. Static renderer reuse is justified by matching dependency hashes; fresh mutual/partial-promise behavior and live model quality are not.

## Evidence inventory and next verification

`opened-images.json` records 64 unique directly opened PNGs with exact absolute/relative paths, SHA256, dimensions, and provenance classes: 4 current long-focus, 24 current distinct pose originals, 2 current reduced-motion frames, 2 corrected current galleries, 24 historical pose originals, 6 historical boundary frames, and 2 older galleries. The three date boundary frames were reopened individually after a batch output was truncated, so this report does not rely on an unseen truncated output.

`current-capture-copy-verification.json` records all 24 exact current-original/archive matches. `dependency-comparison.json` records source/asset reuse and the reducer exception. `boundary-capture-index.json` carries boundary event identifiers.

No further sprite redraw or broad layout redesign is justified by these frames alone. Before release claims, verify the integrated new-state boundary paths, live dialogue-to-action coherence, and actual mobile keyboard/scroll interaction. The visual improvement is real and directly observed; overall game quality and current provider behavior require their separate evidence.

