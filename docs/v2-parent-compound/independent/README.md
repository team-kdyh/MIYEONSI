# G2 independent review and minimal root-based merge proposal

All work in this directory is isolated. Neither production checkout was edited, no runtime was polled/signalled, no API was called, and no private save was read. `snapshot-manifest.json` records stable before/copy/after hashes for the copied source modules. The active worker may subsequently advance; this report concerns these exact snapshots:

| Source | Narrative SHA256 |
|---|---|
| Immutable sequential G1 | `1053990da5c64c51e902cd81321714ea0e90a73c6584ceeddce23e6464896971` |
| Captured sequential G2 | `f4580644c8f46fbeef99b356a46757dd0d2b089a1a0da76da6755c468766c49a` |
| Original integrated root | `fcb42511a5ad93a7be77dc4e436a1bb3a12d770ee9b958c9c9bece3441d9e673` |
| Raw G2 delta rebased on root | `127fc04de883af8d01f02cbf986f66e7b4a30e9cbdf8e6aa3433cc64341835b1` |
| Reviewed minimal proposal | `5aa03219df2bcf3bb2794f604f66d3ebfde55bee13b8cee671face35de42b0f1` |

## What G2 actually adds

The normalized G1→G2 diff is only a `쓰/써` predicate normalization and recursion over explicit coordinated object/action components, with five new tests in `narrative-compound-promise.test.ts`. The worker remains based on G1 and does **not** contain the parent's integrated delivery/route patches. Copying the whole worker file would remove those parent fixes. The authoritative concise diff is `worker-g2-from-g1-normalized.diff`; the earlier unnormalized diff also reflects CRLF differences and is not a useful semantic diff.

The extra fix is useful: the promise `노란 리본을 가져오고 편지를 접는 약속` no longer completes from only `노란 리본 가져왔어요.`, or from `노란 리본 가져왔어요. 친구가 편지를 접었어요.`. NPC equivalents also reject. Two actual performances in two sentences still commit. Standalone writing completion `편지를 썼어요.` and an explicit NPC action `유나가 편지를 써요.` now work with `편지를 쓰는 약속`.

## Concrete compatibility findings

All custom probes use normal start→offer→fulfillment calls with exact offer IDs and grounded player evidence. Before/after states and raw synthetic proposals are in `compound-probe-results.json`. No state/profile injection is used for these probes.

| Exact fulfillment case | Root | G2 / raw merge | Reviewed proposal |
|---|---|---|---|
| Ribbon only for ribbon+fold-letter promise | Wrongly commits | Rejects | Rejects |
| Ribbon delivered, friend folds letter | Wrongly commits | Rejects | Rejects |
| `노란 리본 가져왔어요. 편지를 접었어요.` | Commits | Commits | Commits |
| `노란 리본을 가져왔고 편지를 접었어요.` | Commits | **Wrongly rejects** | Commits |
| NPC beat `유나가 노란 리본을 건네고 편지를 접는다.` | Commits | **Wrongly rejects** | Commits |
| Bring ribbon+blue paper, but input only `노란 리본을 가져왔어요.` | Wrongly commits | Wrongly commits | Rejects |
| `편지를 쓰는 약속`, NPC beat `유나가 편지를 쓴다.` | Rejects | Rejects | Commits |

The one-sentence completion rejection is an actual newly introduced G2 regression. The `쓴다` rejection is **pre-existing** on the exact frozen root, not a new G2 regression: NFD first-three characters for `쓰는` end in initial ㄴ U+1102, whereas `쓴다` ends in final ㄴ U+11AB. Their visual similarity does not make those keys equal. The proposal normalizes `쓴` alongside `쓰/써`, retaining the G2 contracted-past improvement.

## Minimal proposal and actor boundaries

`merge-proposal-source.diff` changes only the narrow promise validator on root fcb42511:

1. Retains G2's explicit coordinated-component requirement.
2. Scans each original source clause's object/predicate pairs rather than only its first predicate. It **does not split the source into ownerless fragments**. Thus `제가 … 가져왔고 친구가 … 접었어요.` and `친구가 … 가져왔고 제가 … 접었어요.` both reject. The inherited-subject case `제가 노란 리본을 가져왔어요. 친구가 노란 리본을 가져왔고 편지를 접었어요.` also rejects.
3. Delivery promises require their named object or an eligible single-pending demonstrative; a matching delivery verb alone no longer proves a different object's delivery. Creative generic drawing→cat matching remains allowed.
4. Normalizes the tested present and contracted writing forms.

The three root regression files (`narrative-natural-delivery`, `narrative-route-agency`, `narrative-promise-edge`) remain byte-identical. Parent delivery morphology, temporal-topic handling, zero-width actor boundary, route/date/refusal guards and the existing short-reply behavior are retained. This is a small root-based change, not replacement with the older worker source.

## Ready-to-review artifacts

- **`merge-proposal.patch`**: source change plus the unmodified five worker compound tests and eighteen new natural-compound controls.
- Patch SHA256: **`12b474d2dbeb26e297fb414d7fa1b751fe690fd2b295769c43d167bdb6019a52`**.
- `merge-proposal/server/narrative.ts`: exact proposed source.
- `merge-proposal/server/narrative-compound-promise.test.ts`: worker's five tests.
- `merge-proposal/server/narrative-compound-natural.test.ts`: portable node:test regression file, local imports, no evidence-file or private-save dependency.
- `proposal-manifest.json`: source/patch hashes, preserved-test hashes, test counts and isolated Git application check.

The final LF patch passes `git apply --check` and applies in an owned disposable checkout based on the exact root source. Applied narrative bytes equal the proposed source. Windows autocrlf changes new test-file byte hashes; their normalized text is identical, and both hashes are recorded. The original root source remained fcb42511 after this work. Parent should recheck the target hash before applying; this directory does not authorize overwriting later edits.

## Verification

The same compatibility inputs were run on each frozen source. These counts include copied test inputs supplied for comparison, not a claim about each checkout's pre-existing suite.

| Source | Existing comparison set | With eighteen new natural-compound controls |
|---|---:|---:|
| Root fcb42511 | 146/149 | 155/167 |
| Worker G2 | 133/149 | 145/167 |
| Raw G2 delta on root | 149/149 | 161/167 |
| Reviewed proposal | 149/149 | **167/167** |

The worker's sixteen failures in the existing comparison set are the parent's absent delivery/route additions, not sixteen new regressions relative to G1. Raw rebasing preserves those additions but exposes six failures in the eighteen new controls. The revised proposal satisfies those controls without weakening their assertions. `*-compatibility.tap` and `compatibility-results.json` preserve results. The TAP failed-name extraction also includes failing suite headings; the `# tests/pass/fail` counts are the actual test counts.

Strict TypeScript checking of the proposed source plus both added test files passed. Historical actual receipt31 replays on root, G2 and the proposal with **exactly the same normalized consequences** as the immutable route-prototype baseline, omitting only generated event id/turn. Receipt bytes were unchanged. This is a saved-response replay with zero new API calls, not fresh model verification.

An initial test-launch attempt failed before executing tests because a Windows absolute preload path needed a file URL. Those harness errors are preserved as `initial-harness-error-*`; they are not product failures. The runner was corrected and the actual suites above executed. The earlier CRLF patch/application artifacts are likewise preserved; only the final named LF patch is recommended for review.

## Limits

This improves the demonstrated coordinated-object/action format, not arbitrary Korean entailment. Component recognition still expects explicit repeated object/action pairs joined by `고`; implicit objects and other conjunctions are not claimed solved. Whole-clause actor checks intentionally remain conservative. Object mentions and lexical predicates are bounded evidence, not a general dependency parser; complex relative clauses, ambiguous references and rarer conjugations remain limitations. The inherited predicate comparator remains coarse outside the explicitly handled writing forms.

The earlier weaker line-only present-tense delivery cases remain outside this fix. Synthetic unit results and one historical replay cannot establish new OpenAI behavior, long-form narrative quality or release readiness. Preserve the existing immutable evidence and consumed paid-call ledgers. No new API allocation or general quality approval is implied.
