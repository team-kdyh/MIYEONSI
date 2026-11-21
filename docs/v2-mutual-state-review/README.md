# Bounded implementation handoff for the next Ralph

Implement against the exact validated Seed at `verification/v2-sequential-generation2.seed.json` (ID `seed_84d0c8a7a66d`). This handoff elaborates its existing AC2/AC6 requirements; it does not replace the Seed, lower criteria, or authorize live API calls. **All live generation for the proposed new state model is unverified until the separate paid-QA approval and actual observations exist.**

The reviewed newest root narrative hash is `5aa03219df2bcf3bb2794f604f66d3ebfde55bee13b8cee671face35de42b0f1`. `review.md` explains the exact findings and source versions. `integrated-results.json` is the newest root's two synthetic scenarios plus matched controls; `results.json` preserves the earlier root/G2 comparison. The JSON contains controlled fixtures and generated test state only, not private profiles, credentials, API headers, or live response data. Frozen source copies and scratch profiles were deliberately not copied here.

## Exactly two regression scenarios

1. **Joint obligation:** normal start → mutual offered promise that each person brings one yellow ribbon → referenced acceptance. Player says `제 노란 리본 가져왔어요.`; the NPC explicitly says `저는 아직 리본을 준비하지 못했어요.` with no action. A proposed whole-promise fulfillment currently commits and survives save/load. It must remain incomplete with only the player's condition evidenced. A matched NPC delivery action should allow both conditions to complete.
2. **Partial progress across restore:** normal start → player offer to bring a ribbon and fold a letter → referenced acceptance. Record the player's actual ribbon delivery as a grounded fact, save/load, then the player says `편지를 접었어요.`. Completion currently rejects unless the player repeats both acts in the current input. The first condition's linked evidence must persist so the second turn can complete the original promise without restating history.

Build fresh regression states through normal start/offer/accept/turn operations. Captured JSON is exact diagnostic evidence, not an instruction to inject narrative state into a fake success test. The current G2 compound string guard usefully blocks some same-turn incomplete performance; it does not implement either missing state capability.

## Smallest implementation responsibilities

| Area | Required work |
| --- | --- |
| Schema/state | Bind an original promise ID to immutable performer/target/required-condition IDs and acceptance grounds. Represent mutual obligations as distinct required performer conditions. Preserve free descriptions and novel activities. |
| Provider | Propose bounded condition progress with existing IDs and precise player/NPC evidence sources while continuing to author free Korean speech and actions. Do not let later fulfillment text replace the original contract. |
| Reducer | Accumulate accepted evidence per condition; derive pending/partial/completed on the server. Keep amendments/delegation separate and require explicit authorized grounds. Never use another participant's action to discharge the original owner's condition. |
| Persistence/retry | Preserve progress, evidence, acceptance, amendments, and assessments through normal automatic/manual saves, restore/restart, duplicate/cancel/retry. Preserve legacy saves; missing evidence stays missing rather than being invented. |
| Tests | Add the two regressions and their valid counterparts, grounded delegation, invalid IDs/performer, duplicate completion, and save/restore semantic comparisons. Retain valid creative-action/short-reply/route and historical-receipt controls. Keep mocked state tests distinct from actual model quality. |

`minimal-design.md` gives a small sidecar design using existing promise IDs. No new task editor, persistent checklist, plot-choice classifier, general NLP engine, second model service, or UI rewrite is requested. A typed schema and valid references alone do not prove natural-language entailment; retain concrete negative controls and honest uncertainty. The next Ralph owns implementation and verification; this review agent made no production code changes.
