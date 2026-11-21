$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskArtifacts = Join-Path $taskRoot 'artifacts'
$taskArchive = Join-Path $taskArtifacts 'AFTER-HOURS-playable.zip'
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html'))) { throw 'Build the current game before packaging.' }
$taskFiles = [Collections.Generic.List[object]]::new()
function Add-Payload([string]$Source,[string]$Entry) {
    $p = Get-Item -LiteralPath (Join-Path $taskRoot $Source) -Force
    if ($p.PSIsContainer -or -not $p.FullName.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Payload must be a file within the project.' }
    if (($p.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked payloads are not supported.' }
    if ($Entry -match '(^|/)(\.local-data|node_modules|\.git|\.ralph)(/|$)' -or $Entry -match '(^|/)\.env($|\.)' -and $Entry -ne '.env.example') { throw 'Private payload is forbidden.' }
    $hasher = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($p.FullName)
    try { $hash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
    finally { $stream.Dispose(); $hasher.Dispose() }
    $taskFiles.Add([pscustomobject]@{source=$Source;entry=$Entry;bytes=[long]$p.Length;sha256=$hash})
}
function Add-Tree([string]$Relative) {
    foreach ($p in Get-ChildItem -LiteralPath (Join-Path $taskRoot $Relative) -Force) {
        if (($p.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked payload directories are not supported.' }
        $next = $Relative + '/' + $p.Name
        if ($p.PSIsContainer) { Add-Tree $next }
        elseif ($next -notmatch '^server/.*\.test\.(ts|tsx)$') { Add-Payload $next $next }
    }
}
foreach ($f in @('THIRD_PARTY_NOTICES.txt','.env.example','play.cmd','stop.cmd','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','scripts/start-local.ps1','scripts/stop-local.ps1')) { Add-Payload $f $f }
Add-Payload 'docs/player-guide.md' 'README.md'
foreach ($folder in @('src','server','public','dist')) { Add-Tree $folder }
if (@($taskFiles | Group-Object entry | Where-Object Count -gt 1).Count) { throw 'Duplicate package entry.' }
New-Item -ItemType Directory -Path $taskArtifacts -Force | Out-Null
$taskManifest = @{format=1;createdAt=[DateTime]::UtcNow.ToString('o');scope='Playable source and assets; no private configuration or saves; full verification history stays in the development package';files=@($taskFiles | Sort-Object entry)} | ConvertTo-Json -Depth 6
$taskTemporary = Join-Path $taskArtifacts ('playable-' + [Guid]::NewGuid().ToString('N') + '.tmp')
$taskZip = [IO.Compression.ZipFile]::Open($taskTemporary,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($f in $taskFiles) { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip,(Join-Path $taskRoot $f.source),$f.entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null }
    $entry = $taskZip.CreateEntry('PACKAGE-MANIFEST.json')
    $writer = [IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
    try { $writer.Write($taskManifest) } finally { $writer.Dispose() }
} finally { $taskZip.Dispose() }
# Both literal paths are fixed inside the verified artifacts directory; no recursive move.
Move-Item -LiteralPath $taskTemporary -Destination $taskArchive -Force
$taskHasher = [Security.Cryptography.SHA256]::Create()
$taskStream = [IO.File]::OpenRead($taskArchive)
try { $taskHash = [BitConverter]::ToString($taskHasher.ComputeHash($taskStream)).Replace('-','').ToLowerInvariant() }
finally { $taskStream.Dispose(); $taskHasher.Dispose() }
[IO.File]::WriteAllText((Join-Path $taskArtifacts 'AFTER-HOURS-playable.manifest.json'),$taskManifest,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText(($taskArchive + '.sha256'),$taskHash + '  AFTER-HOURS-playable.zip' + [Environment]::NewLine,[Text.Encoding]::ASCII)
Write-Host ('Created playable package: ' + $taskArchive)
Write-Host ('Payload files: ' + $taskFiles.Count)
