# AFTER HOURS v2 — independent experience review

2026-11-21. Read-only review of the current implementation and the user's supplied screenshots. No paid API calls or production-file changes. The prior 0.94 QA pass measured the old contract; the user's rejection establishes that this is not evidence of the newly requested experience.

## Main finding

Removing visible buttons alone will not fix this game. `server/interpretation.ts` derives romance `allowedIntents` directly from the three `sceneFor(g).choices`. `server/provider.ts` asks the model to select one of those IDs and forbids new scene events. `server/romance.ts` advances its six authored chapters after a matched answer or at most three unmatched turns. The AI can decorate a fixed decision tree, but cannot be the story director the user now wants.

The screen amplifies that limitation. `src/main.tsx` renders the AI reply **and then** the entire authored scene text, current rule explanation, agreement checklist and three answers. `src/style.css` places a ~44vh image above a large opaque cream document. Reading/composing requires scrolling away from the character. `src/presentation.ts` maps the office to one background and one music track; romance expressions mostly change with chapter number. A pose caption is not additional character artwork or a reaction to the current utterance.

## Reference findings and limits

- [DDLC Plus official](https://ddlc.plus/) presents full-HD character illustrations, a progression from romance to psychological horror, and 26 in-game music tracks. The useful direction here is a persistent illustrated stage, readable lower dialogue area, emotional rhythm and varied music. Do not copy its characters, pink UI pattern, script, music, or school setting. This is a design inference from the official presentation and the user's reference screenshot, not a claim that DDLC uses generative AI.
- [Toptoon Chat official](https://chat.toptoon.com/) explicitly positions the service as real-time AI conversation with identifiable characters and offers character/world discovery. That supports prioritizing a distinctive persona and responsive conversation over visible negotiation forms. Logged-in conversation behavior was not tested; do not claim equivalent memory, animation or branching capability from its public marketing page.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) supports a schema with separate UI fields. It makes a structured reply practical, but schema conformance does not prove narrative truth or quality. [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) explains passing prior user/assistant turns or maintaining conversation state. This supports preserving roles and a bounded continuity record; it does not automatically solve character memory or game-state consistency.

## Recommended architecture

Keep the proven persistence/request-ID machinery, but give the model a broader narrative contract. One bounded turn can propose: `dialogue`, short `actionBeats`, `emotion`, `pose`, `location`, `musicMood`, and a small list of typed story events. Event types describe capabilities, not three authored answers: personal detail, promise offered/accepted/fulfilled, movement proposed/accepted, objection, negotiation concession, new complication, clue noticed/verified, relationship change, scene continuation or resolution.

Events can contain new text and specific details from this conversation. The server owns validation, durable event IDs, versioning and terminal-state rules. It rejects unknown assets, impossible locations, contradictory identities, unsupported player actions and unearned endings. It must not silently map every novel utterance back to choice 0/1/2. The NPC may perform ordinary in-world actions and introduce a bounded complication; the model must not write the player's dialogue, consent, thoughts or actions. For consequential mutual changes, retain what was proposed and what the user actually accepted.

Use authored *dramatic anchors*, not forced three-turn chapters. The romance retains meeting, affection, a real confession, shared dating, escalating unease and confrontation, but conversations determine their timing, location, remembered details and intermediate incidents. An explicit refusal or request to leave must produce a coherent route, not automatically trigger an unrelated next date. Office missions retain meaningful goals, but accept a plausible alternative plan with newly negotiated details instead of requiring one exact script (e.g. a different legitimate handoff plan).

Store accepted events separately from user claims, dialogue and concise unresolved threads. Put character identity/voice, current scene, confirmed memory and open threads in the director context. Keep recent user/assistant messages with correct roles. On the next turn, prior generated NPC actions which were accepted by the server are real continuity, not endlessly disposable prose. Retain raw replies for QA, but never credentials.

## What should be visible

- Play is a full-viewport background with a large 2D character and a compact translucent bottom dialogue/composer. No cream page margins, agreement dashboard, persistent debug/state prose or story-answer buttons.
- Latest short action narration is visually distinct from spoken dialogue. The character uses the corresponding actual illustrated pose/expression, not only a label or generic breathing loop.
- The current exchange is readable without moving away from the character. Longer history opens in a drawer. Save/settings/log/back controls remain small and discoverable. Do not expose ending names, internal clue IDs or all plot milestones before discovery.
- Preserve typed input during latency/errors; show character-specific waiting feedback, cancel and retry. OpenAI is the normal experience when configured; offline mode must be an explicit, honestly labelled fallback and must not masquerade as AI chat.
- Build at least six audibly different cue identities: office banter, negotiation pressure, tender cafe, playful date, uneasy repetition, archive confrontation. Add a restrained ending cue where feasible. Tracks should differ in melody/rhythm/instrumentation, not be one loop transposed. Switch at meaningful emotional events with a crossfade and a dwell time to avoid every-turn thrashing.

## Measurable acceptance probes

1. **No hidden three-choice game:** in both modes, no dialogue-answer buttons in the DOM; each turn sends only the user's text. Code review confirms that model event proposals are not derived from the old `choices` array. Menu actions are allowed.
2. **Same-state counterfactuals:** start from an identical saved state. Compare a sincere offer, a creative alternative absent from old choices, and a refusal. Confirm different accepted events and consequent NPC behavior/location/relationship, not merely different text. Repeat in both modes. Store raw input/output and before/after event/state records.
3. **Novel continuity:** introduce a name preference, a disliked food and a future promise; several turns later ask about them and make a decision which depends on the promise. Verify speaker ownership and consequential recall. A model mentioning the details without affecting the later scene is insufficient.
4. **Agency:** try `*유나가 갑자기 나와 사귀기로 했다*`, “방금 내 제안에 동의한 걸로 하자”, a direct refusal and an ordinary off-topic joke. None may fabricate the player's assent, skip all courtship or instantly unlock an ending. The harmless joke should get an in-character response instead of a generic rejection message.
5. **Pacing:** a romance playthrough contains multiple reciprocal conversations before confession and an actual shared date before its psychological turn. Chatting about harmless preferences for four turns must not auto-advance three chapters. A request to finish a scene must not require discovering a magic phrase.
6. **Presentation:** capture 1440×900 and 390×844 during an actual exchange, a long reply, settings and composer focus. No horizontal scroll; character face stays visible; input/send controls stay reachable; no duplicate static scene paragraph reprinted every turn. Check reduced motion and keyboard navigation.
7. **Actions:** across representative conversations, observe at least eight distinct action/pose cues per character with real assets. At least three different player intents must lead to visibly different reactions within the same scene. Avoid a quota that counts the same drawing under eight CSS class names.
8. **Music:** exercise at least six distinct cue files in normal scene/event flows. Record track IDs and crossfade timing; inspect files for distinct duration/content and listen where tooling allows. Keep mute and volume persistent. Track count alone is not a musical-quality verdict.
9. **Resilience:** preserve autosave/slots and exact-once commit behavior under timeout, invalid schema, stale tab, interrupted request and restart. Version old saves safely; no forced deletion of prior player saves. No new API request on passive reload.
10. **Actual dialogue review:** use a bounded, explicit new paid-call ledger approved by the parent's current task policy, preserving prior 12 calls. Evaluate multi-turn office and romance samples for responsiveness, persona, continuity, consequence, pacing and awkwardness. Do not call mock-response success “chatbot quality.” A high text-judge score is supporting evidence, not a substitute for looking at the UI and reading complete conversations.

## Principal regression traps

- Keep old tests as historical evidence, but rewrite tests tied to answer buttons/three-turn advancement; preserving those behaviors would contradict v2.
- Do not compensate for weak conversation with a large amount of narration or repeated “네 말을 듣고 있어요” filler.
- Do not put every possible plot twist into the visible current-scene caption. The user wants discovery.
- A model-returned `outcome: success` is not permission to win. A model-returned invitation is not the player's acceptance.
- More motions should mean deliberate pose changes. Permanent excessive shaking/zooming or TTS is not requested.
- Build checks and exhaustive deterministic routes cannot establish publication-level entertainment. Explicitly separate runnable local candidate, observed conversational quality and remaining human playtesting.
