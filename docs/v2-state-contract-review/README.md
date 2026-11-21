# Independent contract-coverage review — bounded findings, not release approval

Read-only snapshot of `ralph-afterhours-v2-state-49c8729`, captured with stable before/copy/after hashes in `manifest.json`. No active/root source was edited, no credential/private save was read, and no API, HTTP server, runner or runtime polling was used. These are independent controlled source findings, not explanations attributed to the formal evaluator's result.

| Frozen file | SHA256 |
|---|---|
| Worker `server/commitments.ts` | `0e3b7da41c214ef3cb241e5df58c2ff9628231a021be0d1708292d373743ae48` |
| Worker `server/narrative.ts` | `9f9c696431d134a0a9db50f6c6c2c7872f0f1970fd87ce6f2da575ec74a13ca3` |
| Isolated proposed `commitments.ts` | **`92528c37e8bdc5b627efd5c1ff57bf8031c666ef40cac833ba1cb95f6a560811`** |

## Reproduced false completion

Every scenario starts from a fresh `start('romance')`, then normal `commitDialogue` offer, referenced acceptance (`좋아요.`), and condition progress. Synthetic model replies use actual generated promise/condition IDs. No advanced state is injected. This exercises the normal gameplay reducer path, **not** the HTTP endpoint or a fresh model response. `observations.json` preserves exact inputs, replies, before/after states and errors.

1. **Missing compound condition.** Original: `제가 노란 리본을 가져오고 편지를 접는 약속을 할게요.` The model supplies only player condition `action: 노란 리본을 가져오고`. Registration and acceptance succeed. Input `노란 리본 가져왔어요.` plus that condition's progress and an original-promise fulfilled event commits **completed**, despite no letter condition or folding performance.
2. **Noun fragment becomes an action.** Original: `제가 노란 리본을 가져오는 약속을 할게요.` A condition with `action: 노란 리본` is accepted. Input `노란 리본을 바라봤어요.` then completes the whole delivery promise. The equivalent `action: 노란 리본을` plus `노란 리본을 찾아봤어요.` also wrongly completes. With full `action: 노란 리본을 가져오는`, looking correctly rejects and actual particleless delivery correctly succeeds.
3. **Missing joint obligations.** Original: `우리 각자 노란 리본을 가져오고 편지를 접는 약속을 해요.` Supplying only player/NPC ribbon conditions lets the two ribbons complete the entire promise. Supplying both ribbon conditions plus only the player's letter condition also completes without the NPC letter. Both are wrong under the explicit `각자` contract.
4. **A prefix is not the full predicate.** Original: `제가 그림을 아주 천천히 그려주는 약속을 할게요.` Condition `action: 그림을 아주` plus `그림을 아주 오래 봤어요.` wrongly completes. Checking merely that some Korean word follows 을/를 would not fix this case.

Matched controls establish that the new state architecture itself can retain correct progress: full two-condition contracts remain partial after ribbon delivery, reject an early whole completion, and complete on the later folding turn without repeating the ribbon claim. Full four-condition joint contracts remain partial and later complete with each actor's actual action.

## Cause and narrow proposal

`registerCommitments` only checks that each proposed action is a literal substring and that the participant set is plausible. It does not establish coverage of the original obligations. `applyProgress` then validates evidence against that shortened action. Finally the typed path in `reconcile` accepts a whole-promise fulfillment from `contract.status === completed`, bypassing the original whole-text performance check. A server-derived count is trustworthy only if the original required conditions were preserved.

The isolated proposal adds one shared `coversOriginal` check at registration and persisted-record validation. It pairs non-overlapping **object/predicate clause spans** with required performers, rejects omissions/duplicates/fragments, and requires the full predicate portion rather than the first word following the object. Explicit repeated tasks joined by `고`, `우리 각자`, and clear player/NPC subject changes are supported. Stored validation uses `originalPerformer`, so an explicit later amendment does not rewrite the original responsibility map.

This does **not** re-run the whole original promise against only the current input. Accepted condition evidence, partial progress, amendments and cross-turn completion remain unchanged. The proposal changes neither `applyProgress` nor narrative/acceptance logic, so the parent's separate atomic-acceptance patch and the storage reviewer's recipient/amendment patch must be composed by hunks. Do not replace either colleague's edited whole file with this snapshot.

## Verification and clear tradeoff

- Existing copied commitment, lifecycle, agency, route, natural-delivery and compound tests: **174/174** on both baseline and proposal.
- New portable coverage regressions: **14/14** on the proposal; strict TypeScript check passes.
- Extended independent matrix: baseline **14/20** expected outcomes, proposal **19/20**. All six demonstrated malformed-contract completions now reject at offer registration. These are scope counts, not quality grades.
- Origami, generic drawing→cat, preparing thread and embroidering a constellation remain valid novel actions. Separate-turn progress and explicit mixed/shared performers retain their matched positive outcomes. No allowed-verb enum was added.

**Known false-negative source shape:** `제가 노란 리본 가져오기 약속을 할게요.` with condition `노란 리본 가져오기` currently completes on the baseline but is conservatively rejected by the prototype at registration. The canonical offered text lacks the object-particle clause shape the guard supports. This remains an explicit unmatched positive in `proposal-observations.json`; it was not relabelled as a desired rejection. Natural **player performance** `노란 리본 가져왔어요.` remains supported when the original contract is well formed. The input constraint concerns the model-authored original contract, not a required phrase for the player.

The check begins at the object head such as `리본을`. It does **not independently prove coverage of preceding colour/time/quantity modifiers**, general reference resolution, all coordination forms, or all natural-language entailment. The performance validator still uses approximate lexical evidence. Other sentence shapes or aliases may fail insufficiently; passing typed IDs is not proof of semantic truth. Do not expand these findings into a claim of complete Korean promise understanding. Fresh model behavior under the tighter canonical contract remains unverified.

## Stable integration handoff

All proposed code remains under `.ralph/v2-state-independent-contract-review/`:

- `proposal/server/commitments.ts` — frozen hash above; only registration/read coverage changes.
- `proposal/server/commitments-coverage.test.ts` — portable 14-test file with local imports, normal starts and no evidence-file/output dependency.
- `coverage-source.diff` — source-only hunks against commitments `0e3b7da4…`.
- `coverage-proposal.patch` — source plus new test; exact hash is in `manifest.json`.
- `probe.ts`, `proposal-probe.ts`, snapshot/proposal TAP logs and `handoff-manifest.json` — reproducibility and scope.

The final guard includes a nonempty-action/type check before substring-position search; malformed empty persisted actions therefore cannot loop. Narrative/provider/storage bytes in the isolated proposal are unchanged. No parent or colleague fix has been silently included.

## Concise provider wording for parent review only

Replace only the matching existing provider instruction sentence after source integration; this text has **not** been applied to the isolated or active provider. It governs model-authored canonical event/condition text, not UI or player choices:

> 새 promise text는 원래 합의를 보존하면서 ‘플레이어는/유나는/우리 각자 + 목적어를 행동’으로 책임을 명확히 쓰고 여러 일은 ‘고’로 나눠라. commitmentOffers에는 각 절의 모든 수행자 조건을 빠짐없이 하나씩 넣고, action은 명사·부사 조각이 아니라 목적어부터 마지막 행동까지 포함한 원문의 연속 부분 문자열로 써라.

Keep free dialogue/action generation, the existing bounded schema and output cap. No new schema verbosity, task editor, checklist, hidden choices or player-facing authoring rules are proposed. Parent must review the acknowledged source-shape tradeoff and integrated candidate separately. Paid verification remains unavailable until actual approval; this review made **zero** calls.
