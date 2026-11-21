# AC5 v2 — original music integration and verification

2026-11-21. AC5 implementation and objective verification completed. This is not a new overall v2 release/QA verdict.

## Shipped music and provenance

Copied the completed original-workspace `.ralph/v2-audio/` top-level artifacts to `public/assets/audio-v2/`: eight OGG tracks, exact note scores, original `compose.py`, README, manifest and original verification. Existing v1 assets are preserved. WAV masters remain in original staging (not needed by the game). Original melodies/arrangements and synthetic instruments were composed locally; no sampled recordings, downloaded music, model generations or paid API calls were used. Generator and all eight audio hashes match the source manifest. The dependency lock did not change.

| ID / situation | Decoded seconds | BPM / meter | Musical identity |
|---|---:|---|---|
| office-groove | 61.28 | 94 / 4/4 | Dry, lightly swung electric keys, acoustic-style walking bass and brushes. A playful rising question answered by a clipped descent; B moves through G–F#–Bm. |
| office-pressure | 52.36 | 110 / 4/4 | Muted piano/marimba ostinato over low strings; measured ticks and restrained kick. B changes the bass progression and introduces a held upper counterline. |
| cafe-warmth | 72.00 | 80 / 4/4 | Fingerpicked acoustic-style plucks, a gentle piano melody and soft shaker. A lilting two-bar question; B opens to C and A minor with bell answers. |
| rooftop-heart | 60.00 | 72 / 3/4 | Slow three-beat piano waltz with a soft string response. The B section climbs and then leaves space for a confession; no drum kit. |
| rainy-memory | 73.85 | 78 / 4/4 | Wistful tremolo electric piano, widely spaced upper notes and a quiet filtered synthetic rain bed. Syncopated chord answers contrast a more continuous B melody. |
| archive-unease | 64.00 | 60 / 4/4 | Sparse felt piano, distant glass over slow minor pads and synthetic tape flutter. The B section introduces a quiet heartbeat and descending unanswered notes. |
| archive-pursuit | 69.23 | 104 / 5/4 | Restrained five-beat thriller pulse grouped 3+2: low piano/bass and short string swells, with a higher marimba reply in B. No loud stingers. |
| resolution-dawn | 66.67 | 72 / 4/4 | Warm resolved piano theme with a slow string halo; an eight-bar melody opens into a brighter B section and a four-bar cadence. Spacious, no drums. |

Tempo, meter, rhythmic placement, pitch sequences, arrangements and instrumentation vary. `v2-audio-score-analysis.json` compares scores with their first pitch subtracted: all eight normalized arrangements differ, excluding a copied arrangement merely transposed. The 3/4 piano waltz, 5/4 confrontation pulse, swung office keys, plucked cafe arrangement and sparse archive texture are documented in the reproducible score. This supports compositional distinction, not a subjective listening score.

## Playback behavior

`presentation.ts` now uses the validated narrative `musicMood` instead of discarding it for the old evening/archive pair. Earned endings use resolution-dawn; old saves have mode/chapter-compatible v2 cues. No story-state mutation is added. `MusicMixer` retains playheads for repeated cues, coalesces rapid requests to the latest cue, keeps a track at least 8 seconds, and crossfades two real audio elements over 2 seconds. Linear complementary gains avoid a volume swell. A blocked incoming playback cannot fade out the outgoing track. The visible retry button performs playback inside a user gesture. Mute immediately pauses/mutes both music channels and effects; volume applies to both crossfade gains. Home stops playback and clears pending cues. Browser settings persist across reloads.

## Representative paths and evidence

`tests/v2-audio.spec.ts` uses free-text input, mock structured NPC replies, real `reconcile`, real React UI and real OGG media elements. It starts from normal new-game states; it does not inject advanced relationship/date/clue state. Romance progresses through familiarity, attraction, confession, mutual couple/date, rainstreet movement, archive entry, discovery and an earned reset ending. Raw text, accepted events and state are in `v2-audio-office-path.json` and `v2-audio-romance-path.json`.

Six within-path transitions observed (all eight IDs):

1. Office: office-groove → office-pressure (alternative proposal meets deadline resistance).
2. Romance: cafe-warmth → rooftop-heart (confession; couple and date follow).
3. rooftop-heart → rainy-memory (rainstreet recollection).
4. rainy-memory → archive-unease (enter archive after a date).
5. archive-unease → archive-pursuit (edited recording discovery).
6. archive-pursuit → resolution-dawn (earned relationship reset).

For every transition the browser recorded both channels simultaneously playing with nonzero intermediate gain, then the old channel paused and the new channel at target volume. This is normal validated story-flow coverage with mock model outputs, **not proof that a live OpenAI conversation selected these cues**. Final live conversational QA remains the designated owner's responsibility.

## Verification and honest limits

- Build/typecheck pass (`v2-ac5-build-run.txt`).
- Full automatic tests: 138/138 pass (`v2-ac5-unit-run.txt`). Four focused mixer tests cover dwell/coalescing, no restart, mid-fade mute/volume/resume, disposal, autoplay recovery and legacy/ending selection.
- Audio browser tests: original three tests pass (`v2-ac5-browser-run.txt`), plus separate autoplay recovery probe (`v2-ac5-autoplay-run.txt`).
- Existing v2 UI regression: 4/4 pass across both modes and desktop/mobile (`v2-ac5-ui-regression.txt`).
- Chromium decoded every shipped OGG in full: stereo, all >48 seconds, nonzero RMS and peaks below clipping. Numerical samples and hashes: `v2-audio-waveforms.json`. Rendered 64-block RMS envelopes were visually inspected in `v2-audio-waveforms.png` (SVG retained). These envelopes establish variation/non-silence, not melody or enjoyment. Original generator records also preserve loop seams and mastering measurements.
- Actual observation scope: browser playheads advanced and audible-channel gains transitioned during the representative paths. No human ears or agent audio-listening tool auditioned the tracks; full real-time listening, subjective musical fit and device-speaker quality remain unverified. No claim of human listening approval or commercial mastering is made.
- No paid Responses attempts; neither historical nor v2 API ledger was modified.

## Failures preserved

Initial browser run failed two fixture assertions (`v2-ac5-browser-initial-failures.txt`): an unconditional init script reset persisted volume on reload; the mock route omitted the committed NPC log that the ending view reads. Fixed the fixture to seed settings only when absent and append the NPC reply, matching the normal endpoint behavior. The original failing result is preserved. No acceptance threshold, production state gate or evaluator was weakened.
