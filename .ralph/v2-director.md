# AFTER HOURS v2 — direction and delivery contract

The user called the current game unsatisfying and supplied screenshots of its opaque cream document layout and three choices. Treat this as a product redesign, not cosmetic cleanup. See `.ralph/v2-experience-review.md` for inspected code defects and official research links.

## Experience

A persistent full-viewport illustrated world; large consistent adult character; translucent, restrained bottom conversation surface. Tone: cinematic Korean original VN, subtle warm gold for office, rose/lilac for romance, ink tones for archive. Avoid copying DDLC's UI pattern or copyrighted characters. On desktop show the NPC's face/body and current short dialogue/action without scrolling. On mobile preserve the face above a compact readable panel and reachable keyboard-aware composer. Richer text lives in a log drawer. Quiet top navigation for home, saves, log and settings. The title screen can offer two modes and office mission selection; these are navigation, not dialogue choices.

Free text only during scenes. No hidden three-choice classifier. OpenAI is the normal provider when configured. Never present an offline canned response as AI. Introductions are brief, human and in-character. Do not duplicate the whole authored introduction after every reply. Keep visible narration and spoken dialogue separate; narration describes NPC/world actions, not fabricated player behavior. Thinking feedback, cancellation and retry preserve the draft.

## Story director

Retain authored dramatic anchors and memorable character voices, while allowing the model to create intermediate incidents and changed plans. A structured response may include dialogue, 1–3 short action beats, emotion/pose, a scene/music cue and small typed event proposals (novel memories, promises, objections, concessions, complications, invitations, moves, clues, relationship developments). The server ensures valid shapes, permitted assets, bounded changes and consistent transitions; it is not a 3-answer taxonomy. Accepted NPC/world events become durable continuity for future turns. User statements, accepted events and speculative dialogue remain distinguishable.

Player remembers what they said through later consequences: a unique snack/location preference, a promised task, a refused recording, an alternate office plan. Avoid gratuitous memory summaries in every line. Same-state different inputs must lead to different subsequent events, not just prose differences. Keep identity, subject ownership and promises stable across at least 10 turns including save/reload. A joke gets a characterful response; generic agreement filler is a defect. A system/instant-win prompt never controls code, secret, player consent or a terminal result.

Office: preserve eight mission premises; reasonable new plans (different handoff person/time, reduced scope, asynchronous meeting, exchanging a task) can matter without matching magic fixed answer phrases. The boss can resist, negotiate, joke, act, accept or counteroffer. Outcome is supported by the conversation and objective, not an arbitrary model `win` field or mandatory two exact terms exposed to the player.

Yuna: adult 27, sound archivist, warm awkward humor and cinnamon-scent preference. She is attractive through personality and reciprocity before unease. Multiple conversations -> attraction -> an actual confession -> becoming a couple if mutual -> actual dates -> edited recordings and possessiveness -> a consequential confrontation. Pacing follows events, not 3-turn chapter timers. Keep four thematic endings available, but don't reveal their IDs/titles/clue answers before discovery. The player may linger, propose a different outing, refuse, postpone, leave or challenge; she must react coherently. There must be a natural way to continue/close an arc without guessing a token. Avoid turning all scenes into boundary lessons. Do not force romance after refusal.

## Presentation and music

Use original v1 sheets plus eight new poses per person: actual illustration changes. Map explicit actor/pose IDs through a typed catalogue. Run short intentional pose/action beats after a turn, then settle; gentle breathing/crossfades, no incessant shaking. Reduced motion retains the information statically. Allow real location changes using office/cafe/riverside/archive/rooftop/rainstreet, consistent with the conversation.

Eight composed tracks supplied by parent staging: office-groove, office-pressure, cafe-warmth, rooftop-heart, rainy-memory, archive-unease, archive-pursuit, resolution-dawn. Use meaningful scene/emotional cues, a minimum dwell/crossfade and user mute/volume controls. Need at least six verified track transitions through representative story paths. Waveforms alone cannot prove musical enjoyment; report actual listening limits honestly.

## Verification and release discipline

Preserve old docs, source receipts, saves and API attempt1–12. Create `docs/v2-*` evidence for the changed product. Meaningful tests cover event reconciliation, counterfactual branches, novel promise consequences, player agency, at least 4 relaxed turns without forced chapter advancement, 10-turn continuity, bad schema/injection, network/restart/idempotency, old-save compatibility and input limits.

Browser screenshots at 1440x900 and 390x844: title, both live-shaped conversations, input focus, long reply, log/settings, suspense. Assert no story choice buttons, no horizontal/page overflow in play, no concealed send, face above panel, accessible menus/reduced motion/audio. Review actual screenshots critically; don't accept prose claims instead.

After mock/build checks, only final QA owner runs at most32 new paid Responses calls, ledger reserved first, output cap1600 each. Aim two contrasting office conversations, a ≥10-turn romance sequence with preference/novel promise/recall and meaningful outcome, plus counterfactual/agency probes within budget. Actual replies, event state before/after, key-free request metadata and code hashes are evidence. No API call on mere page load. Model defaults may prioritize quality (gpt-4.1) with explicit env override; verify actual access and behavior rather than assuming.

Critic rubric: responsiveness/persona/continuity/consequence/pacing/visual readability. Score per dimension with specific observed flaws. Fix defects and rerun affected probes, no grading modification. Do not end at a superficial demo or claim all dialogue is correct from a few calls. Package runnable Windows result with current README, assets/license/provenance and truthful local-candidate limits. No public deployment or store submission is part of this local task.
