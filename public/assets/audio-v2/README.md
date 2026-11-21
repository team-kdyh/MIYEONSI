# AFTER HOURS — original v2 score

Eight original instrumental pieces, composed and synthesized locally for the new character-chat game. No existing music, downloaded samples, model generations, or field recordings are used. `compose.py` is the complete reproducible source; each `*.score.json` records the exact note/percussion arrangement.

| File | Scene / emotional role | Musical identity |
|---|---|---|
| `office-groove.ogg` | Ordinary office banter, a plausible plan | D major, 94 BPM, lightly swung electric keys, walking bass and brushes |
| `office-pressure.ogg` | Objection, deadline pressure, a difficult concession | E minor, 110 BPM, muted piano/marimba ostinato, restrained string support |
| `cafe-warmth.ogg` | First meeting and easy reciprocal conversation | G major, 80 BPM, fingerpicked acoustic-style plucks, piano and light shaker |
| `rooftop-heart.ogg` | Attraction, confession, tender shared moments | B-flat major, 72 BPM in 3/4, spacious piano waltz with strings |
| `rainy-memory.ogg` | Personal recollection, uncertainty, quiet aftermath | F-sharp minor, 78 BPM, tremolo electric piano and a quiet synthetic rain texture |
| `archive-unease.ogg` | Something is wrong; listening for a contradiction | D minor, 60 BPM, sparse felt piano, distant glass, ambient pad and tape-like texture |
| `archive-pursuit.ogg` | An active confrontation or urgent archive discovery | C minor, 104 BPM in 5/4 grouped 3+2, low piano pulse and short strings |
| `resolution-dawn.ogg` | A resolved ending, relief and a possible tomorrow | E major, 72 BPM, a longer piano theme, warm strings and a four-bar cadence |

Each piece lasts 48–90 seconds and has contrasting A/B sections. These are different compositions, not pitch-shifted copies. The number of bars, exact durations and musical structure are in `manifest.json`.

For the game, copy the eight `.ogg` files and the manifest into `public/assets/audio-v2/`. Keep the generator and score files in source provenance if desired. `masters/*.wav` are larger 16-bit stereo source exports and need not be distributed with the game. Do not replace or delete the previous audio assets automatically.

All pieces loop at the full-file boundary. Note tails and room reflections wrap around; a 15ms cosine ramp at each edge prevents codec clicks without an inserted silent gap. Suggested playback volume is 30–50%, with a 1.5–2.5 second crossfade and a minimum mood dwell time of 8 seconds. Avoid restarting an unchanged track on every character response.

The manifest reports actual PCM and decoded OGG measurements: duration, sample rate, peak, RMS, clipped samples, loop seam, section levels, file hashes and pass/fail flags. The generator limits overall RMS to -20 dBFS (-23 for the unease cue) and peak to -3 dBFS, choosing the quieter gain. No compressor or clipping is used.

These checks establish file integrity, loop-boundary behavior and documented composition differences. They are **not human listening approval, an acoustic recording, or a claim of commercial mastering**. Full playback and musical fit should still be assessed in the game alongside its dialogue timing.

Rebuild with Python, NumPy, SciPy and an ffmpeg build supporting libvorbis:

```powershell
python .ralph/v2-audio/compose.py
```

Created 2026-11-21 for this project.
