# Isolated route-guard patch — ready for parent review

This is a narrow correction for the three concrete cases in `../report.md`. All work stayed inside `.ralph/v2-independent-route-audit/`. Production, private saves, credentials, ledgers, and the active Ralph worktree were untouched. There were no provider/API/network calls or runtime polling.

The original finding used root narrative SHA `5597bad...`. Implementation deliberately uses a newer **frozen sequential candidate** snapshot, recorded byte-for-byte in `base-manifest.json`; its narrative SHA is `1053990da5c64c51e902cd81321714ea0e90a73c6584ceeddce23e6464896971`. The active worker may have advanced since that capture. Do not copy an active workspace or overwrite later changes with this snapshot.

## Deliverables and integration

- `source.patch`: changes only `server/narrative.ts` and adds `server/narrative-route-agency.test.ts`.
- `candidate/server/narrative.ts`: exact candidate source for inspection, not permission to overwrite a different base.
- `candidate/server/narrative-route-agency.test.ts`: portable regression file with ordinary local module imports. No private fixture or live API dependency.
- `integration-manifest.json`: exact base/candidate/patch/test hashes and apply-check result.

Patch SHA: `947fbf725214c24ff51aab7163a5f536172f40372453bd3044370914e234fa72`.

Candidate narrative SHA: `2c25c40382051b18f9389bff3001e7739f82db9c31dd3750a8a784d3d1b99d4b`.

Regression SHA (LF): `573cfec1a4e70074a532d62e0080dc65a3e55e57aea7b7b4888d715c451b6beb`.

The patch was checked and applied in an owned disposable Git repository. With Windows `core.autocrlf=true`, the source matches the candidate byte-for-byte; Git converts the new test from LF to CRLF, yielding SHA `f3c970fbfe7a701318ae68a57b927409004a2dab0ad69a8f603141d5c731279b`. Its normalized text matches exactly. Parent owns integration and subsequent root verification. If the target base hash differs, review/rebase these hunks; do not blindly copy the whole file.

## Bounded implementation

1. Ordinary explicit refusal forms `안 돼요`, `안돼요`, and `안 됩니다` no longer satisfy the generic non-refusal guard.
2. Actual movement rejects destination-scoped future-only evidence and short assent to a referenced future invitation. An unrelated tomorrow sentence does not block explicit present movement.
3. An entered date cannot be marked fulfilled from explicit postponement/cancellation or solely future activity. Actual current activity remains open vocabulary; no story intent or answer-choice classifier was introduced.

The parent-supplied same-clause contrast initially exposed a false rejection; exact inputs and the previous candidate hash are preserved in `same-clause-before.json`. The final narrow exception requires an explicit current-time marker before the destination, no intervening future marker, and immediate movement wording after that destination. Therefore `지금 옥상으로 가서 내일 공연 계획을 세워봐요.` now moves, while `오늘은 회사에 있고 내일 옥상에서 만나요.` still does not. It does not treat any occurrence of `오늘` as permission to move.

Only the ambiguity check for already-proposed movement uses those local travel forms; other novel activities are not restricted to an enum. This is not universal Korean tense/intent understanding. Arbitrary paraphrases, mixed referents, and semantic completion remain bounded limitations rather than claimed solved cases. The existing promise-performance logic in the sequential base is unchanged by this patch.

## Verification

Final source was exercised by `run-checks.mjs regression ready`:

| Run | Result |
| --- | --- |
| Unmodified sequential base plus the same seven new tests | 128/132; four new failures |
| Candidate plus the same tests | 132/132 |
| Focused TypeScript check | exit 0 |
| Historical response31 replay on final source | base and candidate committed; normalized consequences unchanged |

The seven new tests cover the three reproduced failures, the adjacent future-invitation short-assent case, legitimate positive counterparts, current date plus tomorrow work, current/future offered-date short yes, current activity plus unrelated delayed work, next sound recording, cancellation of a different future date, and declining to cancel the current date. Assertions and tests from the copied existing suites were not weakened.

`candidate-ready.tap`, `base-ready.tap`, `ready-runs.json`, and `historical31-ready.json` are final evidence. Replay31 reads the immutable captured response and starting state; it is not a new model call, a newly generated conversation, or proof of all live-chat behavior. Initial controlled audit states were constructed through normal commitDialogue turns; the historical replay necessarily starts from its captured receipt state, clearly separated here.

Rejected turns assert that the input game is unchanged. A synthetic ProfileStore save/restore control verifies the refusal leaves the stored pre-ending state intact and that a legitimate departure can still be stored. The first audit separately showed all three bad consequences persisted before the fix; none of this is an HTTP/end-to-end paid-model claim.

Initial harness problems are retained: `*-regression.tap` lacked the provider's visualAssets dependency; `*-complete.tap` lacked three immutable historical fixtures used by existing tests. After copying only those public source/evidence dependencies into the owned snapshot, complete final checks passed. Earlier patch-application experiments also exposed Git CRLF normalization; the final manifest records this rather than claiming every file's bytes were identical under all Git settings.

This patch is a concrete repair candidate, not a release-quality approval. Parent must retain the original failure evidence and evaluate the integrated final code on its own source hash.
