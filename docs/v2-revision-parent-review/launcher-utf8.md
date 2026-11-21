# Reproduced Windows launcher issue

The original project had been started through PowerShell 7, which wrote a UTF-8 process record without a BOM. `stop.cmd` runs Windows PowerShell 5.1; its `Get-Content` without an encoding read that record using the legacy default. The Korean workspace name was corrupted and `ConvertFrom-Json` failed with “Unrecognized escape sequence.” No process was stopped in that attempt.

The parent changed only the process-record read to `Get-Content -Raw -Encoding utf8`. Project-root, entry-path and live process command-line identity checks remain unchanged. Running the actual `stop.cmd` against the same existing record then exited 0 and stopped the recorded project server. No private save was removed or inspected.

An additional hidden `cmd.exe` wrapper for restarting was automatically rejected by policy without a more specific reason. The parent used the existing direct `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -NoBrowser -Port 3001` launcher successfully instead. It ran typecheck/build, started the background server, and exited 0. Passive HTTP subsequently returned 200 (`preview-start.json`). No paid dialogue request was made. The independently installed baseline had already demonstrated BOM-record shutdown; the explicit UTF-8 read supports both encodings.
