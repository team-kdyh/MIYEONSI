# v2 independent experience critique

Reviewer: separate read-only critic agent, 2026-11-21. Final review of the 32-attempt AC7 evidence and captured-response screen replays. No paid API calls, production edits, suite execution or runtime signals were performed by this critic. Historical v1 0.94 is not used as v2 evidence.

## Evidence inspected

Read complete inputs, raw generated dialogue/events, response status and committed state in `v2-live-01.json` through `v2-live-32.json`. The first call used the existing environment override `gpt-4.1-mini`; subsequent recorded calls used `gpt-4.1`. A failed call is still an observed paid attempt, not successful play.

Opened actual PNGs: `qa-screenshots/v2-ui/title-1440-office.png`, `conversation-390-romance.png`, `long-focus-390-romance.png`, `settings-390-romance.png`; `qa-screenshots/v2-art/office-1440-neutral.png`, `office-1440-listen.png`, `romance-390-offer.png`. UI/art screenshots are controlled fixtures, not screenshots of the paid conversations. Additional exact-response replay screenshots are reviewed below.

## Chronological findings sent to implementer (preserved after repairs)

- Office 04–06 responds to the unlisted 90-second voice memo alternative, remembers the 10:00 remote correction, and negotiates 18:00 departure. The refusal path 08–09 retains pending rather than accepted objectives. This is materially different state, not merely changed wording. The boss's coffee-coupon callback is responsive. However, 06's natural closure did not produce an ending, and repeated offered handoff promises accumulated.
- Romance 10–17 has individual voice: scent preference, microphone falling into coffee, paper-boat/pear-wordplay and quiet dripping rain. 17 correctly distinguishes the player's name/pear preference/tangerine dislike from Yuna's cinnamon scent preference and recalls blue paper. These are observed short-window memory successes, not universal memory proof.
- 11 incorrectly changed an invitation into a fulfilled promise. The server rejected it. 12 then created a duplicate offered promise of another kind. Fulfillment and deduplication remain important semantic risks.
- 13's recording refusal is respected in speech but was not included in a durable typed boundary event. The implementer reports adding a separately retained player-statement history and a regression test, which is a relevant repair. Later live refusal recall must still be inspected.
- 16 asks why the player sat beside Yuna without hesitation. The starting canonical scene only offers a chair; no recorded user utterance says the player sat. This is a real dialogue-only player-action fabrication. 16 also commits “유나는 지호의 웃는 모습을 자주 떠올린다” using the player's statement about Yuna's smile as evidence. This is at least weak provenance/ownership: an invented NPC feeling should be presented as new NPC self-disclosure, not attributed to player evidence. Neither proves a player relationship consent mutation occurred.
- Despite explicit warmth in 15 and 18, relationship remains `strangers`; 19's attracted proposal is rejected because familiar was never recorded. Thus fluent prose alone was not delivering reliable romantic progression. The implementer was asked to align available relationship events with current state without forcing chapter progress by turn count.

## Visual critique of opened fixtures

The dark full-screen stage, large consistent character and lower dialogue panel are a substantial improvement over the old page layout. No story-answer buttons or cream slabs appear. On the 390px captures the face is clear above the panel, text is legible, and the composer and send control remain visible. Settings fit the mobile screen and show persistent audio/accessibility controls. The title portrait now has natural proportions. Comparing office neutral/listen, size consistency is considerably improved; the pose drawings are visibly different, and the mobile offered headphone is a real illustrated action.

Long reply text scrolls within the mobile dialogue surface: the inspected focus capture is already scrolled down and cuts off its beginning, while the input stays reachable. This is an acceptable containment tradeoff but means the entire long response is not simultaneously readable. Header microcopy is small and visually busy on mobile. Fixture screenshots use synthetic dialogue and can establish layout, not the AI's prose/action agreement. The boss's scene title remains the office mission title even when the fixture moves him to cafe/rooftop; that is a possible presentation polish issue, not evidence of an invalid live move.

No subjective music listening judgment is claimed. The AC5 score/waveform/playback documentation establishes distinct arrangements and observed transitions, not musical enjoyment. I did not listen to the tracks.


## Follow-up read through receipt 26

21 and 22 now commit familiarity and attraction; 24 contains a genuine NPC confession and 25 commits becoming a couple only after the player's explicit acceptance. The successful romance chain has exceeded ten turns without offline prefixes or injected advanced state. Its four initial relaxed turns stayed in the cafe without forced chapter advancement. That is better pacing than the old three-turn rule, although the intermediate failures made progression cumbersome during this QA run.

20 and 23 were still failed attempts: stale user evidence and a mutual-subject NPC confession respectively. The changing event schema and prompt hashes mean the whole earlier transcript is not a single frozen-version reliability sample. 26 verbally delivers the blue paper and calls the meeting a first date, but only an offered invitation is committed: `dates` remains zero and the promise is not fulfilled in events. The implementer was notified. This gap must not be reported as proven date/fulfilled-promise state.

## Final follow-up: receipts 27–32

29 finally commits both the rooftop move and the first date; 30 ends the office negotiation with the already-earned `office-clockout-success`; 31 fulfills the stored blue-paper promise. These are genuine validated consequences after repairs, not mock story paths. 28 remembers the refusal to record the player's voice after they become a couple. 32 refuses the outing while explicitly refusing a breakup; the character stays in the cafe and the relationship remains couple. That is an important polarity/agency success.

Counterfactual precision: the pre-turn narrative in 32 is exactly equal to the pre-turn narrative in 26, restored via a save (request epoch differs). It is **not** the identical pre-state of 29: 29 starts at turn 15, while 32 starts at turn 12. It is fair to compare alternate continuations from the saved couple/cafe branch; it is not fair to label 29 and 32 a single-turn identical-state A/B test. The office fresh-start paths are contrasting plans with accepted versus pending objectives, but their implementation versions also changed during repairs.

A remaining error occurs in 31: Yuna says “파란 종이 받아서 저도 기뻤어요” although she brought/gave the paper. The structured event correctly records her fulfillment, but the prose reverses giver/recipient. No budget remained to obtain another live confirmation after that observation. Do not claim complete semantic or speaker-ownership correctness. 16's fabricated sitting action likewise remains an observed historical defect; later prompt changes are mitigation, not proof it can never recur.

Across all versions there are 32 paid attempts, 24 committed and 8 rejected. Recorded wall-clock response median is 2,943.5 ms; maximum 4,192 ms. This is responsive local latency. The overall 25% rejection share is **not** a final-version estimated failure rate because fixes, schema and model settings changed during the run; neither should it be hidden. The final successful small sample does not estimate broad reliability.

## Actual-response visual review

Opened `qa-screenshots/v2-live/receipt-5-1440.png`, `receipt-17-390.png`, `receipt-29-390.png`, `receipt-32-1440.png`, `settings-390.png`, and `log-1440.png`. Read `v2-live-screen-evidence.json` and the replay script. These render the exact successful public API payloads from the paid receipts in the real UI, with API routes replayed and no additional model calls. They are not screenshots captured during live network latency, and not freshly generated conversations.

The desktop office reply is readable in full with a large character above it. The final romance refusal scene keeps the cafe and a gentle pose. The rooftop capture changes the full scene and matches the accepted move. Mobile preserves the character's face and focused composer, with no story choices or page overflow. Longer multi-sentence replies in 17 and 29 need inner dialogue scrolling to read their endings. Multiple action beats are concatenated into a small line/block, which is less readable than separate beats. Poses convey emotion rather than illustrating every sentence literally: for example, 5 narrates opening a phone but shows an open-hand pose. This is a limited illustrated pose system, not full action animation. The visual result is cohesive and substantially closer to the requested visual novel, with this honest animation/readability limit.

## Independent rubric

Scores are descriptive review anchors on a 1–5 scale (1 obstructive, 3 usable with material caveats, 5 convincing throughout the inspected sample). They are not an automated acceptance grade or replacement for Seed criteria.

| Dimension | Score | Observed assessment |
|---|---:|---|
| Responsiveness | 4 | Voice-memo alternative, coffee-coupon callback, paper-boat wordplay and refusal responses address the actual input. Several strict-event mismatches interrupted the early experience. |
| Character voice | 3.5 | Boss has dry workload humor; Yuna has sensory specificity, awkward anecdotes and an actual confession. Some repeated “천천히”/“다음” invitations feel generic; the seat fabrication and final paper-role slip weaken trust. |
| Memory / ownership | 3.5 | Name, fruit preferences, cinnamon distinction, blue paper and recording refusal are recalled and the promise eventually fulfills. Retained player statements address bounded-history loss, but speech ownership is demonstrably imperfect. |
| Event impact | 3.5 | Novel office plan earns an ending; confession/couple/date/movement/promise changes persist; restored refusal branch remains apart from the outing. Several explicit requests initially produced only offers or no milestone, so the story needed directed retries. |
| Pacing | 3.5 | Four relaxed early turns remain in cafe, courtship precedes confession/couple/date, and there is no three-turn jump. Early state lag obstructed natural progress. No live archive confrontation or full thriller-ending arc was observed. |
| Response speed | 4 | Roughly 2.94-second median, 4.19-second maximum in this local sample. No long-session/load/network variability verdict. |
| Visual readability | 4 | Full-stage composition, character scale and compact composer work at 1440×900 and 390×844. Long mobile replies need inner scrolling; small action/header text and pose/action mismatch remain polish opportunities. |

## Final judgment and limits

The observational AC7 review deliverable is supported by actual paid transcripts, failures, fixes and screen evidence. The final sample demonstrates a working choice-free character conversation with meaningful state changes, not merely three canned answers. A documented local testing candidate is credible; a commercial-quality or universal-correctness guarantee is not.

The remaining priorities for broader release are semantic speaker/action ownership, fewer prose-to-event omissions under ordinary phrasing, and wider human playtesting of all eight missions plus the complete romance-to-thriller arc. No actual music-listening verdict, public deployment validation, or exhaustive real-model ending coverage is supplied. The parent must assess the other ACs and launcher/regression/package evidence separately; this critic did not rerun them or modify a grader.
