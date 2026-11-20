$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskDestination = Join-Path $taskRoot 'artifacts'
$taskArchive = Join-Path $taskDestination 'AFTER-HOURS-local.zip'
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist\index.html'))) {
    throw 'Run npm run build before packaging.'
}
$taskNames = @('README.md','THIRD_PARTY_NOTICES.txt','.env.example','play.cmd','stop.cmd','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','src','server','public','dist','scripts','tests','docs')
$taskPaths = @($taskNames | ForEach-Object {
    $taskPath = (Resolve-Path -LiteralPath (Join-Path $taskRoot $_)).Path
    if (-not $taskPath.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Package input resolved outside the project.'
    }
    $taskPath
})
New-Item -ItemType Directory -Path $taskDestination -Force | Out-Null
Compress-Archive -LiteralPath $taskPaths -DestinationPath $taskArchive -CompressionLevel Optimal -Force
$taskHash = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash
Set-Content -LiteralPath ($taskArchive + '.sha256') -Value ($taskHash + '  AFTER-HOURS-local.zip') -Encoding ascii
Write-Host "Created $taskArchive"
Write-Host 'The private .env, saved games, runtime logs and node_modules are excluded.'
