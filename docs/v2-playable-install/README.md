# Playable package installation evidence — 2026-11-21

This is an installation and rendering check for the parent-integrated baseline at commit `14128a7`, **not** release approval or verification of the later content-revision worker. The packaged `server/commitments.ts` hash is `d29ef52d07bae1e71f2e05e24f394c201bd666be0cc91e9d489c54aef83e9b4a`.

The separate playable archive contains 115 payload files plus its manifest, 65,833,096 bytes. Its SHA-256 is `f3f6dd01c504ff3d4371584690b81e0cfbec412197ed1658b245258df5c2b0c9`. All payload bytes matched the source manifest before extraction; the audit found no forbidden private paths or credential-shaped text. See `package-audit-before.json`. The larger development archive and prior evidence remain intact.

## Actual checks

- Extracted to a new isolated folder with no `.env` or `node_modules`. Both API environment variables were empty. No paid dialogue calls were made.
- `play.cmd -NoBrowser -Port 3197` installed 173 packages, ran typecheck/build, and started the actual built game. npm reported zero vulnerabilities at this installation. This is a point-in-time dependency result, not a general security guarantee.
- The first launch harness supplied piped stdin and its command handle remained open until shutdown, despite successful server readiness. This harness observation is preserved in `start.txt` and is not classified as a product launch failure. A second launch in a separate hidden `cmd.exe`, without piped stdin, exited normally with code 0 (`restart-exit.json`).
- A real Chromium page loaded the extracted server, selected romance, and created a new game without route mocks or a dialogue turn. No page errors or external-origin requests were observed (`page.json`). The final screenshot was taken after image decoding, finite entry animations, and immediate dialogue reveal. The earlier premature capture remains as `romance-start-early.png` with `page-initial.json`.
- Direct image inspection of `romance-start.png` confirms the full-screen cafe background, visible character face/upper body, dark bottom dialogue/input panel, visible send button, and no story-answer choices. The panel covers the lower body; this does not establish visibility of every pose or mobile layout.
- Scoped shutdown returned code 0 and port 3197 stopped responding. The two newly created save files remained present with the same sizes; byte equality was not measured across this shutdown. The original project server on port 3001 still returned HTTP 200 (`final-stop.json`).

## Limits

The key-free preview is labelled offline. No generated conversational response, new content-revision schema, long AI playthrough, music listening judgment, or commercial readiness is established here. The archive must be rebuilt after runtime changes; these hashes refer only to this checkpoint. The player guide and packaging script are in the original workspace.
