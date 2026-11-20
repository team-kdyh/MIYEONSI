param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskData = Join-Path $taskRoot '.local-data'
$taskEntry = Join-Path $taskRoot 'server\index.ts'
$taskUrl = 'http://127.0.0.1:3001'
$taskNode = (Get-Command node.exe -ErrorAction Stop).Source
$taskNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
if ([int]((& $taskNode --version).TrimStart('v').Split('.')[0]) -lt 22) {
    throw 'Node.js 22 or newer is required. Install Node.js and run play.cmd again.'
}
$taskListener = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskListener) {
    $taskExisting = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskListener.OwningProcess)"
    if ($taskExisting.CommandLine -and $taskExisting.CommandLine.Contains($taskEntry)) {
        Write-Host "AFTER HOURS is already running: $taskUrl"
        if (-not $NoBrowser) { Start-Process $taskUrl }
        exit 0
    }
    throw 'Port 3001 is in use by another process. Close that service before starting this game.'
}
New-Item -ItemType Directory -Path $taskData -Force | Out-Null
Push-Location $taskRoot
try {
    $taskLockHash = (Get-FileHash -LiteralPath (Join-Path $taskRoot 'package-lock.json') -Algorithm SHA256).Hash
    $taskStampPath = Join-Path $taskData 'installed-lock.sha256'
    $taskInstalledHash = if (Test-Path -LiteralPath $taskStampPath) { (Get-Content -Raw -LiteralPath $taskStampPath).Trim() } else { '' }
    if ($taskInstalledHash -ne $taskLockHash -or -not (Test-Path -LiteralPath 'node_modules\tsx\package.json')) {
        Write-Host 'Preparing game dependencies...'
        & $taskNpm ci --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
        Set-Content -LiteralPath $taskStampPath -Value $taskLockHash -Encoding ascii
    }
    Write-Host 'Building AFTER HOURS...'
    & $taskNpm run build
    if ($LASTEXITCODE -ne 0) { throw 'Game build failed. The server was not started.' }
    $taskOut = Join-Path $taskData 'server.stdout.log'
    $taskErr = Join-Path $taskData 'server.stderr.log'
    $env:PORT = '3001'
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList @('--import', 'tsx', ('"' + $taskEntry + '"')) -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput $taskOut -RedirectStandardError $taskErr -PassThru
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 50; $taskAttempt++) {
        if ($taskProcess.HasExited) { throw "Server exited. See $taskErr" }
        try {
            $taskResponse = Invoke-WebRequest -Uri $taskUrl -UseBasicParsing -TimeoutSec 1
            if ($taskResponse.StatusCode -eq 200 -and $taskResponse.Content -match 'AFTER HOURS') { $taskReady = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 300
    }
    if (-not $taskReady) {
        if (-not $taskProcess.HasExited) { Stop-Process -Id $taskProcess.Id }
        throw "Server did not become ready. See $taskErr"
    }
    @{ pid = $taskProcess.Id; entry = $taskEntry; root = $taskRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskData 'server-process.json') -Encoding utf8
    Write-Host "AFTER HOURS is ready: $taskUrl"
    Write-Host 'Use stop.cmd to stop the background server. Saves remain on disk.'
    if (-not $NoBrowser) { Start-Process $taskUrl }
} finally { Pop-Location }
