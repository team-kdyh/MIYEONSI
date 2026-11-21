# Current normal-turn condition change failure

2026-11-21. The preceding goal turn made concrete progress: root candidate0711d40/d29ef52d integrated persisted joint/partial obligations and independent fixes, passed358 unit/25 browser checks and produced a verified local package. This continuation is not a wait on the old Ralph job: `job_64b2ad77c2fc` is terminal (`grade_regressing`,2 generations, official0/7, QA0.52/REVISE).

Current source was rechecked before this probe. New paid approval is still absent. No API call or private save was used.

## Reproduction on the current candidate

`npx tsx .ralph/v2-condition-change-probe.ts` records exact source hashes, authored replies and normal `start`/`commitDialogue` before/after states in [before.json](before.json). This is controlled reducer evidence, not generated model speech.

1. Normally propose and accept a player promise to bring a yellow ribbon and fold a letter.
2. Bring the ribbon. Its condition becomes partial with actual evidence.
3. Player says “편지를 접는 대신 그림을 그리는 것으로 바꾸는 데 동의해요.” The authored NPC agrees to replace the letter with a drawing and proposes an accepted promise event referencing the original ID.
4. The turn commits, including the changed acceptance text, but the active stored condition still requires folding a letter. The current amendment schema only supports changing `performer`.
5. “그림을 그렸어요.” cannot fulfill that condition. The turn rejects. The earlier ribbon evidence is otherwise retained.

This is a concrete implementation gap in existing Seed `seed_d03e4cfd826c` AC2/6: accepted content changes lack a bounded revision representation and evidence applicability rules. It does not mean old original evidence should be overwritten or a whole promise blindly marked complete.

## Required next verification

Use normal turns to accept a condition change under the original promise identity, preserve unaffected performed conditions and their evidence IDs, and require new performance for changed actions/targets/actors as appropriate. Record old/new obligations, effective point, agreement grounds and explicit retain/invalidate/reperform reasons. A change acceptance is not performance. Refusal, ambiguity, unilateral NPC proposals and stale or absent revision references must not silently change the agreement. Exercise both a declined-change control and later valid completion, along with store restart/three slots and duplicate/cancel/retry boundaries. Preserve current positive and negative controls, including same-turn acceptance with actual performance and independent recipient/coverage fixes.

The implementation design may remain bounded; do not substitute hard-coded story answers, an expanding verb enum, a task-editor UI or another model service. Preserve old saved bytes and original reports. API allocation remains12+32 consumed with proposed24 unanswered; no paid verification is authorized by this continuation.
