$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskZipPath=(Resolve-Path 'artifacts/AFTER-HOURS-local.zip').Path
$taskZip=[IO.Compression.ZipFile]::OpenRead($taskZipPath)
try {
    $taskEntries=@($taskZip.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
    $taskForbidden=@($taskEntries | Where-Object { $_ -match '(^|/)(\.env|\.local-data|node_modules|\.git|\.ouroboros)(/|$)' })
    if ($taskForbidden.Count) { throw 'Private or runtime-only entries found in archive.' }
    $taskChecks=@()
    foreach ($taskName in @('play.cmd','stop.cmd','README.md','docs/v2-QA.md','docs/v2-ac7-current/candidate.json')) {
        $taskEntry=$taskZip.Entries | Where-Object { $_.FullName.Replace('\','/') -eq $taskName }
        if (-not $taskEntry) { throw "Missing package entry: $taskName" }
        $taskStream=$taskEntry.Open()
        try { $taskHash=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($taskStream)).Replace('-','').ToLowerInvariant() } finally { $taskStream.Dispose() }
        $taskExpected=(Get-FileHash -LiteralPath $taskName -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($taskHash -ne $taskExpected) { throw "Stale package entry: $taskName" }
        $taskChecks+=@{path=$taskName;sha256=$taskHash;matchesWorkspace=$true}
    }
    @{executedAt=[DateTime]::UtcNow.ToString('o');command='powershell -File scripts/audit-v2-package.ps1';archive='artifacts/AFTER-HOURS-local.zip';sha256=(Get-FileHash $taskZipPath -Algorithm SHA256).Hash;entries=$taskEntries;privatePathMatches=$taskForbidden.Count;required=$taskChecks;scope='Archive paths and exact required file contents; not a fresh install or model quality test';result='pass'} | ConvertTo-Json -Depth 8 | Set-Content 'docs/v2-ac7-current/package-audit.json' -Encoding utf8
} finally { $taskZip.Dispose() }
Write-Host 'Package paths and required file hashes passed.'
