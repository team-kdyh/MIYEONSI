$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $taskRoot
$taskRecord = Join-Path $taskRoot '.local-data/server-process.json'
if (Test-Path -LiteralPath $taskRecord) { throw 'An existing launcher record is present; do not disturb that session.' }
$taskPort = 3077
if (Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue) { throw 'Probe port is occupied.' }
$taskDir = 'docs/v2-ac7-current'
New-Item -ItemType Directory -Force $taskDir | Out-Null
$env:AFTERHOURS_DATA_DIR = Join-Path $taskRoot ('.ralph/ac7-launch-' + [guid]::NewGuid().ToString('N'))
$env:OPENAI_API_KEY = 'isolated-no-paid-calls'
$taskResults = @()
try {
    foreach ($taskCycle in 1,2) {
        $taskStarted = [DateTime]::UtcNow.ToString('o')
        $taskCmd = Start-Process -FilePath cmd.exe -ArgumentList "/c play.cmd -NoBrowser -Port $taskPort" -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$taskDir/launch-$taskCycle.txt" -RedirectStandardError "$taskDir/launch-$taskCycle.stderr.txt" -PassThru
        $null = $taskCmd.Handle
        if (-not $taskCmd.WaitForExit(60000)) { throw 'Launcher command exceeded 60 seconds.' }
        $taskLaunchExit = $taskCmd.ExitCode
        if ($taskLaunchExit -ne 0) { throw "Launcher failed: $taskLaunchExit" }
        $taskHttpStatus = & node.exe -e "fetch('http://127.0.0.1:$taskPort',{signal:AbortSignal.timeout(5000)}).then(r=>console.log(r.status)).catch(()=>process.exit(1))"
        if ($LASTEXITCODE -ne 0 -or $taskHttpStatus -ne '200') { throw 'HTTP readiness check failed.' }
        $taskPid = (Get-Content -Raw -LiteralPath $taskRecord | ConvertFrom-Json).pid
        & .\stop.cmd *> "$taskDir/stop-$taskCycle.txt"
        $taskStopExit = $LASTEXITCODE
        $taskStopped = -not (Get-Process -Id $taskPid -ErrorAction SilentlyContinue)
        $taskResults += @{cycle=$taskCycle;startedAt=$taskStarted;finishedAt=[DateTime]::UtcNow.ToString('o');launchCommand="play.cmd -NoBrowser -Port $taskPort";launchExit=$taskLaunchExit;httpStatus=[int]$taskHttpStatus;pid=$taskPid;stopCommand='stop.cmd';stopExit=$taskStopExit;processGone=$taskStopped}
        if ($taskStopExit -ne 0 -or -not $taskStopped) { throw 'Scoped shutdown failed.' }
    }
} finally {
    if (Test-Path -LiteralPath $taskRecord) { & .\stop.cmd *> "$taskDir/cleanup-stop.txt" }
    @{environment='Windows PowerShell; no browser launch; isolated save directory; no turn requests';results=$taskResults} | ConvertTo-Json -Depth 8 | Set-Content "$taskDir/launcher.json" -Encoding utf8
}
