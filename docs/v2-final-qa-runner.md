# Parent-only final QA prototype — NOT APPROVED TO RUN

Preparation only. The additional 24 paid Responses attempts have **not** been approved. This prototype has made zero paid calls, read zero real credentials, and started no QA server. It is not integrated into the active worktree. Do not run the CLI against a live project while approval is pending.

Only the parent may review, integrate, populate approval records, and execute this tool **after actual user approval and after Generation 2 workers are quiescent**. An `approved` JSON field is an audit gate, not a substitute for the user's approval. There is no command-line approval override. Normal tests must never invoke this runner.

## Files and integration

Copy the three runtime `.mjs` files under `tests/v2-final-live/` only after review. The pure `guard.test.mjs` may be kept with them; it uses temporary synthetic ledgers and injected functions and never reads `.env`, spawns the QA child, or uses real fetch. Its synthetic approved fixtures cannot approve a real run.

The pending template is `docs/v2-final-api-smoke-ledger.template.json`. The runner requires a separate real `docs/v2-final-api-smoke-ledger.json`; it does not create that ledger. Missing, pending, denied, incomplete approval, non-quiescent workers, changed source or history, exhausted budget, and orphan reservations all fail closed. Preserve both old ledgers byte-for-byte. Their final authoritative counts must be 12 and 32; an original workspace copy with an empty/stale v2 ledger fails the history check and must not be silently treated as fresh capacity.

After approval, the parent records its actual message reference/time, marks `workersQuiescent`, records SHA256 of the two immutable historical ledgers, and freezes the model and the complete map returned by `sourceHashes(root)`. That map includes all runtime TS/JS/CSS files under `server/` and `src/`, both package manifests, and the three runner modules. Added/deleted source files also invalidate the freeze. All source hashes must match on every run and again immediately before upstream. If the user approves a smaller budget, revise the reviewed plan and guard contract before execution; never treat the fixed 24 as permission to exceed the user's scope. No script in this prototype automatically approves, resets, repairs, or enlarges a ledger.

## Execution model, only after approval

One JSON action per parent decision, one command per action:

```text
node tests/v2-final-live/runner.mjs path/to/one-action.json
```

Accepted shapes:

```json
{"action":"new","profile":"office-ab","mode":"office","mission":0}
{"action":"save","profile":"office-ab","slot":0}
{"action":"load","profile":"office-ab","slot":0}
{"action":"state","profile":"office-ab"}
{"action":"turn","profile":"office-ab","text":"<parent chooses one natural response after reading the prior turn>","purpose":"office branch A first turn"}
```

Use `load` for normal public slot restoration. No arbitrary state, events, outcome, provider choice, cookies, model fields, API paths, or arrays of scripted turns are accepted. Only `/api/state`, `/api/new`, `/api/save`, `/api/load`, and `/api/turn` are used. To compare branches, create/save the baseline through the public API, play one branch, save it, then load the baseline. For refusal comparisons, save a genuinely earned couple state in this phase. Do not import raw JSON as a replacement for a missing playable save.

The parent selects each next line after reading the response and before/after state. A failed attempt stops the CLI; there is no automatic retry or automatic next turn. A new command creates a fresh request ID from the current public state. **Do not repeat a transport-failed line blindly:** first inspect `after` and committed version to determine whether it already took effect. This prototype deliberately supplies no automatic ambiguous-turn replay facility. If exact same-ID recovery is needed, the parent must review an extension rather than editing saved state or assuming failure means uncommitted.

## Reservations, isolation and evidence

- Fixed additional cap 24, immutable history 12 + 32, cumulative cap 68, maximum output exactly 1600. Failed, cancelled, source-drift, and even reserved-but-not-sent attempts remain charged. This conservative accounting never frees a slot automatically.
- An exclusive `docs/v2-final-api-smoke-ledger.json.lock` spans the whole operation. A stale lock, unresolved `reserved` entry, or unconfirmed child shutdown requires parent investigation. The lock file remains after a stop failure; the child PID/start/stop record is in `.ralph/v2-final-qa/child.json`. No automatic deletion/recovery bypass exists.
- Each paid turn persists reservation and before/input first. A one-use, nonce-bound permit then allows exactly one OpenAI Responses fetch. The child rechecks approval, history, source hashes, model, output cap, input hash and lock, and writes an exclusive durable `upstream-started` marker before the transport. Passive public API operations have no permit, so unexpected generation is blocked.
- Parent-run child uses `windowsHide: true`, a loopback ephemeral port, and `.ralph/v2-final-qa/data` instead of user saves. Cookies are private in `.ralph/v2-final-qa/profiles/`, never included in receipts or stdout. The existing server loads its private environment only after the gate; the runner does not parse `.env` or read/print key values. Child output is discarded except a readiness match.
- Each attempt writes `docs/v2-final-live-NNN.json` using exclusive create, with source hashes, reservation, exact input, before, local response, after, raw Responses JSON, and source hashes after the call. Raw request **body only**, response body/status only; no authorization headers, other headers, or credential capture. Transport errors record an error name, not potentially sensitive diagnostics.
- HTTP 200 alone is not a live-QA success. `committed` additionally requires the one-use upstream marker, a completed successful raw response with response ID/text, OpenAI provider state, matching response/after games and collection, and exactly one persisted version/turn increment. Missing evidence is retained as a failed verification even if the game may have committed; inspect before deciding another turn.
- If interrupted, `.ralph/v2-final-qa/attempts/NNN/before.json`, raw data, the marker and reserved ledger entry remain. Count that reservation and inspect it before resuming. Do not reset old attempts.
- Successful stdout is one short JSON summary (action/profile/status/attempt/receipt), not dialogue dumps. Read the evidence file for the next parent-selected turn. Public save/load/new/state operations get separate operation receipts and do not consume paid capacity.

The runner has not been exercised against an approved real server or real API. Real child startup/stop and real-provider transport remain pending until the conditions above hold. Pure tests verify gate/cap/history/source/lock/one-use/body-only capture, false HTTP-200 success rejection and lock retention with temporary files and fake functions. An independent read-only audit found the latter two gaps in the initial draft; both were corrected and given negative/positive unit controls before delivery.

## Free validation performed during preparation

```text
node --test tests/v2-final-live/guard.test.mjs
```

Run this command from the isolated prototype directory. No real ledger or environment file is needed. The generated `verification.json` records the actual result and scope; preparation never changes the pending template to approved.
