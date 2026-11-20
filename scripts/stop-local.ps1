$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskRecordPath = Join-Path $taskRoot '.local-data\server-process.json'
if (-not (Test-Path -LiteralPath $taskRecordPath)) { Write-Host 'No launcher-managed server is recorded.'; exit 0 }
$taskRecord = Get-Content -Raw -LiteralPath $taskRecordPath | ConvertFrom-Json
$taskEntry = Join-Path $taskRoot 'server\index.ts'
if ($taskRecord.root -ne $taskRoot -or $taskRecord.entry -ne $taskEntry) { throw 'Server record belongs to a different project.' }
$taskServer = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$taskRecord.pid)"
if ($taskServer) {
    if (-not $taskServer.CommandLine -or -not $taskServer.CommandLine.Contains($taskEntry)) {
        throw 'Process identity changed. No process was stopped.'
    }
    Stop-Process -Id ([int]$taskRecord.pid) -ErrorAction Stop
}
Remove-Item -LiteralPath $taskRecordPath
Write-Host 'AFTER HOURS stopped. Your saved games are preserved.'
