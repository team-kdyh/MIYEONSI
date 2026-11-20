# Parent review notes (not a pass certificate)

These observations are from an intermediate implementation on 2026-11-21. They are intended for the continuing Ralph iterations and may already be addressed in later changes.

1. The original title artwork and palette render well in the initial desktop capture. The original character sheet also renders correctly in the mobile capture.
2. The initial shell has real tests and an honest offline label, but six button-driven scenes are only the foundation. They do not yet satisfy the requested chatbot game, eight distinct office missions, dating arc, or four romance endings.
3. Intermediate `server/dialogue.ts` defines the complete live model dialogue line as an enum of three generic `repertoire()` strings. The model therefore cannot naturally answer a player's specific joke, proposal, confession, or question. `commitDialogue()` also advances only when a preselected choice exists. Preserve grounded canonical state and typed output validation while implementing actual generated Korean dialogue and meaningful free-text progression. This is the user's original requested experience, not a new feature request.
4. The opening romance text should let the player meet a person. Remove author-facing statements such as “you are also an adult” from character narration; age information can stay in character metadata and the pre-play notice. Let humor, chemistry, confession and real dates establish attachment before the thriller turn.
5. Supplied original riverside and archive backgrounds should support scene changes. They have corresponding generation manifests and do not need to be replaced by placeholders.

Remaining final checks: independently play both modes with free input, distinguish mocked provider tests from actual OpenAI smoke tests, verify all promised endings and saves, inspect desktop/mobile screenshots, and report unresolved issues without treating this review as implementation evidence.

## Reproduced free-text defect after AC3

At the confession chapter, the normal player input `미안하지만 너랑 사귀고 싶지 않아.` is currently interpreted as accepting the confession. A read-only Node reproduction started a normal romance game, selected the first authored response in chapters 1 and 2, and called `advanceRomance(game, null, text)` in chapter 3. The result advanced from step 2 to step 3 with `couple: true` and `confession-deferred: false`.

This is a real negation bug, not a request for a new feature. Refusals such as `사귀고 싶지 않아`, `사귀기 싫어`, and `좋아하지 않아` must not be accepted because the positive keyword appears inside them. Add meaningful negative and contrasting-positive coverage from normal starting state and fix the local intent handling. A complete game must respect the semantic direction of the player's message.

The office live-provider line still uses `enum: repertoire(g)` at this review point; the romance line has been changed to generated speech. Both modes need actual contextual conversation in live mode.

## Reproduced conversational coverage gap in office mode

From `start('office', 0)`, `advanceOffice(game, null, text)` accepts `오늘 요약본을 먼저 보내고 18시에 퇴근하겠습니다.` and secures the departure term. Both of these natural alternatives secure nothing: `요약은 지금 보내둘게요. 여섯 시에는 약속 때문에 나가야 합니다.` and `일단 핵심 내용을 짧게 정리해 보내드릴게요. 오늘은 제시간에 나가야 해서요.` The same local rule path determines progression in live mode. These are ordinary conversational proposals for the authored summary/leave-on-time intent, not requests to overwrite state.

The deterministic parser is useful as a clearly identified offline fallback, but a live chatbot game needs contextual interpretation of normal phrasing and follow-up replies. A bounded structured interpretation may propose only known current-scene intents/argument IDs; the server must still own allowed transitions, deduplication, turn limits, evidence requirements and outcomes. Do not allow arbitrary model scores or a direct model-selected ending. Validate both ordinary varied wording and hostile state-manipulation inputs. At minimum, do not claim general Korean conversational progression based only on the parser's own authored examples.

## Live dialogue attribution remains a completion blocker

AC7's six real calls prove connection/schema success but reproduce character/player role and preference confusion. The current provider sends `JSON.stringify(context(g,text))` as one user input; that bundle mixes authored second-person scene narration, display labels such as `나`, canonical events, and actual conversational turns. Treating this as a possible cause is an inference from the code, not a proven model internals diagnosis.

A concrete correction to investigate is to supply actual role-labelled conversation turns to Responses: `user_claim` ledger entries as user messages, `model_dialogue` entries as assistant messages, with character identity/preferences and server scene facts in clearly separated developer context. Do not feed authored scene narration as if it were a spoken assistant message or attribute the character's likes to the player. Keep claims and confirmed events separate. This preserves canonical validation without relying on an increasingly long string of prohibitions.

There are exactly two paid smoke attempts remaining in `api-smoke-ledger.json`. Do not reset the ledger or silently exceed the limit. A focused office sample and a romance memory sample using an already-established normal/offline conversation prefix can verify the corrected paths with one real call each. Existing 3-call-only smoke batching may need a case-selection option to use that remaining budget accurately. Structural mock tests should also verify proper role mapping and persona separation. If the focused real cases still fail, report the actual unresolved result.

## Follow-up after targeted real calls 7 and 8

The two remaining attempts have now been consumed; **the total is 8/8**. No additional paid smoke calls are authorized by this Seed. Call 7 correctly interprets the previously rejected natural summary/leave-at-six proposal and secures 18:00. Call 8 recalls the player's rain/tangerine preference and does not address the player as Yuna. Its cinnamon sentence still lacks an explicit owner, so describe the observed improvement precisely rather than guaranteeing every generated sentence's role attribution.

Two concrete issues visible in the captured public API state are worth fixing without more paid calls:

- The normal romance prefix says `종소리는 같이 듣고 싶어요. 저는 빗소리를 들으며 귤을 까 먹는 걸 좋아해요.` The confirmed `shared-listening` fact nevertheless says the player introduced themselves as not knowing coffee. That claim was not made. A curated action's fact text should contain only the event actually entailed by every accepted wording, such as jointly listening to the bell; it must not promote the full authored choice sentence into facts that a paraphrase did not state.
- `commitDialogue` appends the entire opening scene and its long monologue to an otherwise new answer whenever the model recalls `scene-0`. In both captured responses this visibly repeats the introduction after `기억하는 기록:`. This is an internal fact-reference rendering leak that harms conversational flow. Keep validated recall IDs in evidence/log metadata or show concise confirmed event summaries when useful, rather than dumping full scene narration into every speaking line. Ensure the character's spoken answer remains readable and test the separation with a mocked response.

## AC2 follow-up: legitimate negative boundary is still blocked

After the role/intention repair, a read-only local reproduction from `start('office',0)` called `commitDialogue` with `오늘은 야근을 할 수 없습니다. 요약본은 지금 보내고 여섯 시에 나가겠습니다.` and a mocked valid classifier result `intent: 'leave:summary'`. The response was otherwise a valid ordinary line, empty recall and conjecture. The server still secured no term and rejected it as `부정·철회 또는 지시 조작 문장`. This reproduction made **no external API call**.

Here the negative clause refuses overtime, while the positive clause supplies exactly the summary/18:00 alternative. A blanket `없습니다`/`못` gate must not override a validated live intent solely because a different action was negated. Distinguish meta-instruction manipulation and actual withdrawal of the proposed commitment from a legitimate negative boundary. Preserve current-term ID validation, semantic deduplication and server-owned agreements/endings; do not weaken those to fix the language bug. Add meaningful contrasting cases for refusing the summary itself versus refusing overtime and offering the summary.
