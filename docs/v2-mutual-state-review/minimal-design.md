# Minimal bounded promise state proposal

This is a design recommendation, not implemented code or a new acceptance criterion. The current validated Seed already requires participant-specific performance, partial progress, and delegation provenance. The objective is to represent those facts directly while preserving AI-written dialogue and novel actions.

## Add a small sidecar to existing promise IDs

Keep the current story/event IDs, free dialogue, poses, scenes, and menus. Add one bounded commitment record keyed by the original offered event ID. It should represent these concepts, with names chosen consistently during implementation:

| Record | Minimal content | Responsibility |
| --- | --- | --- |
| Original contract | proposer, participants, target, original content, source turn, acceptance evidence | Freeze when the proposal is established; never replace it with the fulfillment proposal's new text |
| Required condition | server-assigned condition ID, responsible actor ID, target, open-text required action/outcome | One participant's condition cannot stand in for another's; use a small bounded list per proposal |
| Condition progress | pending/satisfied/insufficient, evidence event IDs, original source turn and actor | Append evidence across turns; derive overall pending/partial/completed from all required conditions |
| Amendment/delegation | condition ID, previous/new responsible actor, proposal and acceptance evidence, effective turn | Append an explicit change record; do not silently transfer ownership or retroactively move performance |
| Assessment | promise ID, evaluated turn/request, per-condition evidence/reason, overall result | Preserve insufficient and partial results separately from a claimed completed fact |

Action descriptions and targets remain open text. This is not an enum of acceptable player answers or a new plot classifier. For the two playable characters, stable player/NPC IDs suffice to distinguish the reproduced joint case. Named third parties need an established actor reference before their actions can satisfy another actor's obligation; an unknown person cannot silently count as the owner. A general social-network or task-planning engine is unnecessary.

## Change what the model proposes, not who writes the dialogue

At offer time, the existing single structured response proposes the bounded participants and conditions alongside its free Korean dialogue. Bind player obligations to the actual user evidence. The server assigns stable IDs and preserves the original contract.

On later turns, the model proposes **condition progress**, referencing existing condition IDs and precise evidence sources. Player performance must cite actual player input or an already confirmed player-performance event. NPC performance must cite that NPC's authored action/speech or a previously confirmed NPC event. Resolve current-turn action indices into server-owned event IDs during the transaction. A player's ribbon claim cannot be used for the NPC's ribbon condition.

The server computes the overall completion state from accepted condition evidence; the model does not supply a replacement whole-promise definition or simply set the whole promise to fulfilled. A first completed condition can therefore commit useful dialogue and partial progress. A later condition can complete the same contract after a save/restore without requiring the player to restate earlier acts.

This removes the need to rediscover compound clauses from prose every turn. It does **not** prove that any model-supplied semantic match is correct: a schema cannot by itself distinguish looking at a ribbon from delivering it. Preserve explicit negation/actor/provenance checks and retain the existing negative controls. Record uncertain matches as insufficient rather than inventing a completion. Current-model quality still needs separate observed QA.

If the model nevertheless claims an invalid complete outcome in its narrative line, do not silently show that claim as a confirmed result. Preserve the existing failure/retry behavior for an inconsistent whole reply, while recording the rejected assessment separately from committed story state. Well-formed partial-progress proposals should succeed as partial turns. This distinction avoids turning every ordinary partial act into an API error without weakening the story's truth guarantees.

## Four bounded integration areas

1. Extend the narrative types/schema and provider's existing structured contract with original conditions and progress evidence. Expose established IDs in context; keep free line/action text and the existing output cap. No second paid model or new autonomous agent is required by this design.
2. Add one reducer that merges condition evidence, applies explicit ownership amendments, and derives partial/completed states. It must be idempotent by event/request ID and must not reuse one actor's evidence for another participant.
3. Extend existing profile validation and optional legacy migration/read handling. Preserve old records and saves. Missing legacy completion evidence becomes an explicit evidence-insufficient assessment; do not fabricate evidence or delete historic unlocks to make new checks pass.
4. Add focused semantic persistence tests around the two reproduced cases: different actor, missing condition, two actors completed, separate turns plus save/load, unknown condition reference, duplicate retry, and an explicitly accepted delegation. Retain the current valid creative-action and historical-receipt controls. These are state tests, not live dialogue-quality evidence.

No new persistent checklist, player-facing rule panel, task editor, expression language, workflow UI, or generalized action vocabulary is needed. Those would be optional expansion and would distract from the actual accepted-criteria gap. The game's stage and free-chat presentation can remain intact while provider/reducer/storage gain the missing records.

A narrow compound-string guard can remain as a temporary defense for legacy records. It should not be presented as the final source of participant- and condition-level truth, nor should another list of Korean verbs substitute for the persistent structure above.
