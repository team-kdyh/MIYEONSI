# State-candidate package preflight

Prepared 2026-11-21. This is a read-only packaging review and a prepared audit helper, **not a completed package audit**. The parent is still integrating and verifying the new state candidate. No archive was built, extracted, launched, installed, or overwritten here. No API, private environment file, or private save was read.

## Current artifact is historical

The existing `artifacts/AFTER-HOURS-local.zip` is the old V1 deliverable, not this state candidate.

- Observed size: 47,844,576 bytes.
- Observed SHA256: `5b7e4810f69d61a33d66943b74bbbd87f36052eaaf6b5744e9cefa40a3ee007e`.
- Only artifact metadata/hash was inspected; this review did not certify its contents.

`scripts/package-local.ps1` uses `Compress-Archive -Force` at that same destination. Preserve any required historical ZIP and its sidecar at a distinct history path before the parent deliberately regenerates the named deliverable. This helper does not perform that copy or regeneration.

## Actual packaging observations

1. The packager has an explicit top-level allowlist: README, notices, public `.env.example`, launchers, package/lock/config files, src/server/public/dist/scripts/tests/docs, matching Playwright configs, and verification when present. Top-level `.env`, `.local-data`, node_modules, .git and .ralph are not inputs.
2. Directory inputs are recursive. The script has no descendant exclusion filter, and `.gitignore` does not control `Compress-Archive`. A nested private file, runtime log, profile, or junction inside an allowed folder therefore needs independent detection. The new audit rejects those paths before reading their contents and rejects reparse/symlink inputs. Public versioned evidence folders named artifacts are legitimate package inputs; their exact known paths are preserved as described below.
3. The initial guard only checks that `dist/index.html` exists. It cannot establish that dist was built from the final source or that source/docs stopped changing during compression. The parent must run the final build first, finish documentation, and package a quiescent root. Audit compares every ZIP file to current root bytes and rechecks root and archive hashes at the end.
4. The old `scripts/audit-v2-package.ps1` compares only five files and writes to `docs/v2-ac7-current/package-audit.json`, a historical path. That does not establish full source/asset/dist freshness and risks replacing historical evidence. Do not use it for this handoff.
5. Windows `Compress-Archive` may omit hidden files. The new inventory uses `-Force`, so a required hidden allowlisted input cannot silently disappear. Public root `.env.example` is explicitly permitted; private `.env` variants are not.
6. Recursive docs include historical grades and traces by design. Exact byte equality does not make those observations current. README still described the prior 325-test/partial-state limitation when reviewed; it must be updated by the parent to the actual final result before packaging. Do not replace the older evidence itself.
7. node_modules is intentionally absent. The launcher runs dependency installation and a build; server execution uses tsx, currently a dev dependency. A matching ZIP is not proof of a fresh installation or a production-only dependency install. Notices/README are hashed exactly, but this audit does not certify license-inventory completeness.

The reviewed packager SHA256 was `28a2f1eba0d8b9bd998ce49768de33c3a27a573b2147ebf11127b552cff627bf`. If the packaging allowlist itself changes, review the helper's matching inventory rules before relying on it.

## Prepared audit

Script: `.ralph/v2-state-package-audit.ps1`.

Run only after final root integration, required checks/build, final documentation, and deliberate ZIP regeneration:

```powershell
& .\.ralph\v2-state-package-audit.ps1
```

Run that command in the parent's existing PowerShell/pwsh session. Optional parameters are `-Root`, `-Archive`, and `-ReportPath`. The report must be a new JSON path under root `artifacts/`; an existing report is never overwritten. The default filename contains a UTC timestamp and random suffix. All file hashing uses a local .NET SHA256 stream helper rather than depending on the availability of `Get-FileHash` in another shell.

The initial audit policy incorrectly rejected every directory segment named artifacts. Parent review identified this real false positive before ZIP execution. Metadata enumeration found these four public evidence roots, now explicitly permitted:

- `docs/v2-parent-compound/artifacts`
- `docs/v2-parent-final/artifacts`
- `docs/v2-state-parent-integrated/artifacts`
- `docs/v2-state-ralph/generation1-implementation/artifacts`

This exception applies only to the named artifacts segment at each exact path. Root `artifacts/` remains outside the input allowlist, and private/.ralph/.env/node_modules or other forbidden descendants remain rejected even inside these evidence roots. The original preflight receipt preserves the earlier script hash; `preflight-corrected-receipt.json` identifies this correction.

The helper:

- Inventories every file in the packaging allowlist, including runtime source, tests, public assets, dist, launch scripts, dependency lock, notices and README. It records each exact root and archived file SHA256 and byte size.
- Requires new-candidate runtime files including `server/commitments.ts`, the core server/UI sources, built index/JavaScript, launchers, notices and README.
- Rejects missing/extra/stale entries, duplicate/case-colliding paths, traversal/absolute/ADS paths, reparse points and archive symlinks. It reads ZIP streams directly and never extracts.
- Rejects private environment/profile paths, node_modules, .git, runtime metadata, saved-game forms, database/key files, runtime logs and backup/temp files. Private-path contents are not opened or hashed. Only the public root `.env.example` is permitted.
- Scans permitted ZIP contents in UTF-8 and UTF-16 for bounded secret-shaped markers. On a match, the report contains **only path, byte size and full-file SHA256**, never the key, matched substring, or snippet. Findings fail the audit; heuristic absence is not a guarantee that every possible secret format was detected.
- Fails on embedded archives needing separate inspection and on scan limits instead of silently approving unexamined contents. Limits are 512 MiB per entry and 2 GiB total expanded content.
- Checks the ZIP's .sha256 sidecar, the archive's before/after hash, and the entire allowlisted root inventory before/after. Any concurrent change prevents a pass.
- Writes only one new audit JSON outside the packaging inputs. Console output is a small result/count/path summary. Nonzero exit means failed audit.

The report must remain outside the ZIP inventory to avoid circular self-hashes. If docs or source change after auditing, regenerate the package and create a new report. Copying a new audit report into docs changes the packaged inputs and requires another package/audit cycle.

## Verification performed on the helper

PowerShell syntax parsing passed with zero parser errors. No test suite was added for this audit helper. **The helper has not been executed against any ZIP yet.** Its eventual report is evidence of stable artifact identity and scoped privacy checks, not fresh-install success, new model dialogue quality, or release approval.

This task created only this unique preflight folder and the isolated audit script. Prior audit outputs and the existing V1 archive were preserved.

