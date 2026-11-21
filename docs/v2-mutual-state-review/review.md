# Mutual and partial promise review

2026-11-21. This is a read-only architecture review plus **two** controlled proposal-validation scenarios, each with a positive counterpart. No production code, active worktree, private save, credential, API, or runtime state was changed. Only frozen source copies, synthetic profiles, probes, and reports inside this review folder were written. No model generated the tested replies.

**Conclusion:** the G2 compound patch is a useful local safeguard, but it does not close the evaluated AC2/AC6 gap. The newest parent integration still completes a joint obligation from one participant's performance and cannot accumulate separately recorded player performances across restored turns. Another set of action-word regexes does not supply the missing state model.

## Exact contract and sources

The preserved formal verdict is `docs/v2-sequential-ralph/generation2-verdict.json`, event `040f8c4a-86ee-40d2-ba09-a6af0ae93529`. Its `payload.evaluation_summary.feedback_metadata` explicitly identifies participant-specific joint fulfillment, condition-specific partial fulfillment/delegation records, and their persistence as implementation gaps. `evaluated-feedback-excerpt.json` retains the exact metadata and source hash; no evaluator was queried or changed.

The latest validated Seed is `verification/v2-sequential-generation2.seed.json`, Seed ID `seed_84d0c8a7a66d`, SHA-256 `e08445986d8c0e44730ea197a6d113f36a0a146d18df6ee9d9369fe8b590299e`. `validated-seed-excerpt.json` preserves AC2, AC6, and the required proposal/fact/assessment definitions. AC2 expressly distinguishes required participants and legitimate delegation, and AC6 expressly requires preservation of partial performance and completion evidence. These are **current accepted criteria**, not optional features inferred by this reviewer.

Three immutable narrative versions were checked:

| Frozen implementation | `server/narrative.ts` SHA-256 |
| --- | --- |
| Original root before compound integration | `fcb42511a5ad93a7be77dc4e436a1bb3a12d770ee9b958c9c9bece3441d9e673` |
| Formally evaluated G2 compound candidate | `f4580644c8f46fbeef99b356a46757dd0d2b089a1a0da76da6755c468766c49a` |
| Parent's newest integrated compound candidate | `5aa03219df2bcf3bb2794f604f66d3ebfde55bee13b8cee671face35de42b0f1` |

`snapshot-manifest.json` and `integrated-manifest.json` verify before/copy/after identity. The original `results.json` and later `integrated-results.json` remain separate.

## Probe M1: one participant discharges a joint promise

Ordinary `start('romance')` → offered mutual promise → accepted referenced promise → attempted fulfillment. The offer is `각자 노란 리본을 하나씩 가져오는 공동 약속`; the player and NPC both agreed to bring their own ribbon.

The player then says `제 노란 리본 가져왔어요.`. The model proposal claims the mutual promise is fulfilled, while its actual NPC line says `저는 아직 리본을 준비하지 못했어요.` and supplies no action. **All three implementations commit one whole-promise fulfillment.** The wrong fulfillment survives ProfileStore save/load and a synthetic manual slot.

The matched positive case keeps the same player statement and proposal but changes the NPC line to having brought its own ribbon, with a visible NPC ribbon delivery. It also commits. Thus these tested mutual outcomes do not distinguish the missing NPC performance from the performed one.

The source explains the result: a `mutual` fulfilled event uses only the grounded player clause as its performance source; only subject `npc` collects NPC speech/actions. A single aggregate `subject` and single completed status cannot express the two required performers.

## Probe M2: completed conditions across turns require restating the past

Ordinary start → offer `노란 리본을 가져오고 편지를 접는 약속` → referenced acceptance. The player brings the ribbon on one turn. A grounded player-owned `detail` records that actual fact, the NPC acknowledges receipt, and the profile is saved and restored. There is no fulfilled promise yet.

On the next turn the player says `편지를 접었어요.` and the model proposes completion of the referenced original promise. **All three implementations reject it**, despite the restored first-performance fact and current second performance. The matched input `노란 리본 가져왔어요. 편지를 접었어요.` commits on all three: the player has to repeat the already recorded earlier performance in the current input.

This is not a lost JSON byte or missing save: the exact first-performance detail survives restoration. The missing link is durable condition-level progress tied to the promise ID. The G2 recursive compound check inspects the current player's clauses for each component; it does not consume prior player-owned partial-performance evidence.

## What the compound patch does and does not establish

The patch splits explicitly coordinated object/action clauses and requires all of those clauses to pass existing performer checks in the available source text. That is a real improvement for its tested same-turn conjunction family, rather than just a special case for the words “ribbon” and “letter.” The writing-inflection adjustment is separately narrow. Its five tests are legitimate local regressions.

There is still no typed participant list, condition IDs, persistent partial-completion map, amendment/delegation history, or durable assessment outcome in EventProposal/StoryEvent/NarrativeState. The provider still proposes a whole-promise `fulfilled` event. Rejecting that event also rejects the turn, which does not by itself record partial progress. The G2 worker's own `docs/v2-seed-audit/review.md` accurately states these limitations.

Neither this probe nor the field inspection proves every ordinary conversation fails. These are schema-valid possible model mistakes/limitations that the server accepts or cannot represent. No live OpenAI behavior or final release quality is inferred. Delegation was inspected structurally but not subjected to a third executable scenario, respecting the two-probe limit.

The smallest defensible structural direction is in `minimal-design.md`. This review supplies **no implementation patch** and does not claim the current candidate meets the gap merely because additional narrow tests pass.
