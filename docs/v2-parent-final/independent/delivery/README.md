# Isolated bounded fix proposal — not integrated

This proposal was rebased onto the **latest read-only worker snapshot** after the worker fixed the earlier `놓고 왔어요`, `놓쳤어요`, looking-not-drawing and touching-not-folding defects. Those four failures are no longer attributed to the latest worker.

- Latest worker narrative SHA256: `1053990da5c64c51e902cd81321714ea0e90a73c6584ceeddce23e6464896971`.
- Proposed narrative SHA256: `29764a0ec7673c8a704f76ead908381dd035808d5dc421df9b19b6692479cf05`.
- Exact patch: `proposal.diff`; proposed file: `snapshot/server/narrative.ts`.
- Stable before/copy/after hashes and capture time: `worker-current-manifest.json`.
- No active worker or original production source was modified. No API, `.env`, private storage, runtime polling or signals were used.

## What changed and why

1. The existing delivery gate is replaced with a bounded whole-stem normalization. Common endings, ㄴ/ㅆ inflection, optional deleted ㄹ, auxiliary 주 and common vowel contractions map `건넨다/건넸다/건네준다`, `내민다/내밀어요`, `드려요`, `전해요` and `전달했어요` to delivery stems. This avoids adding every surface conjugation to an ever-growing regex.
2. Delivery still uses a small semantic family of bringing/transferring/presenting/placing consequences. Morphology alone cannot establish that different verbs mean a completed delivery. This family applies **only to existing delivery promises**; creative folding/drawing and the worker's new non-delivery predicate gate remain unchanged. The explicit `놓고/두고 왔` contradiction remains blocked, and `놓치다` does not normalize to `놓다`.
3. Common temporal-topic forms such as `오늘은` and `이번에는` are excluded from performer identities. Actor tokenization uses a zero-width left boundary so a consumed space after the topic cannot hide the following real actor. A held-out test caught this: `오늘은 친구가 노란 리본을 가져왔어요.` must still reject. Its failed intermediate observation is preserved in `holdout-before-boundary-fix.json`.

No schema/provider or lifecycle ownership changes are included. Only the source proposed above differs from the latest worker snapshot.

## Verification

| Check | Latest worker | Isolated proposal |
|---|---:|---:|
| Original 33-case audit matrix | 21 matched | 31 matched |
| Strong action/adverb cases from that matrix | Remaining 10 rejects | All 10 fixed |
| Original four negative controls | Pass | Pass |
| Particleless delivery, creative origami/new drawing, demonstratives | Pass | Pass |
| Historical recorded response31 replay | Commit | Commit |
| Eight held-out inflection/ownership/negative probes | Not a worker claim | 8/8 pass |
| Copied lifecycle, short-reply and agency regressions | Not rerun here on worker | 86/86 pass |
| Strict typecheck of copied server modules | Not a worker claim | Pass |

The two remaining audit mismatches are **line-only** present-tense `자, 노란 리본 드려요.` and `약속한 노란 리본 전해요.` without any visible action beat or past completion. The proposal keeps the current conservative speech-completion rule, while corresponding explicit NPC action beats now pass. These weaker cases remain listed as mismatches rather than silently changing expectations. A future design decision could recognize present-tense performative speech, but blanket acceptance would also admit imperatives or requests in Korean and is outside this small fix.

All 33 input games remain unchanged on both success and rejection. The historical replay uses recorded real input/response/state and makes **zero new model calls**. Test counts are not a release grade.

Commands, run from this folder:

```text
npx tsx worker-probe.ts
npx tsx probe.ts
npx tsx holdout-cases.ts
npx tsx --test snapshot/server/narrative-lifecycle-regression.test.ts snapshot/server/narrative-short-reply.test.ts snapshot/server/narrative-agency-regression.test.ts
npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --strict --skipLibCheck snapshot/server/narrative.ts snapshot/server/game.ts snapshot/server/office.ts snapshot/server/romance.ts snapshot/server/interpretation.ts snapshot/server/dialogue.ts
```

`worker-probe-results.json`, `probe-results.json`, `holdout-results.json`, `docs/lifecycle-observations.json` and `verification-summary.json` retain the exact observed scope and source hashes. `prototype-v0-*` is an abandoned earlier, broader draft based on the old worker snapshot; do not integrate it. Only `proposal.diff` is the final proposal.

## Limits

This is a bounded morphological compatibility fix, not general Korean entailment or a parser. A small delivery consequence vocabulary is still required; rarer synonyms/irregulars and complex subordinate clauses may be rejected or misread. Existing non-delivery first-predicate comparison remains the worker's behavior and is not claimed to solve every task. Testing does not establish fresh OpenAI responsiveness or commercial readiness. Parent should review/apply the exact diff only after the active worker is quiescent, then verify the integrated source separately.
