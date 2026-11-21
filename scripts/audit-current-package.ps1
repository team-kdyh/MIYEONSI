[CmdletBinding()]
param(
    [string]$Root = (Join-Path $PSScriptRoot '..'),
    [string]$Archive,
    [string]$ReportPath
)
# Read-only package audit. Does not extract, launch, install, build, call an API,
# read .env/private profiles, or overwrite an existing audit report.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
Add-Type -AssemblyName System.IO.Compression.FileSystem

$taskRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\','/')
if (-not $Archive) { $Archive = Join-Path $taskRoot 'artifacts\AFTER-HOURS-local.zip' }
$taskArchive = (Resolve-Path -LiteralPath $Archive).Path
$taskArtifacts = [IO.Path]::GetFullPath((Join-Path $taskRoot 'artifacts'))
if (-not $ReportPath) {
    $ReportPath = Join-Path $taskArtifacts ('v2-state-package-audit-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-ffff') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8) + '.json')
}
$taskReport = [IO.Path]::GetFullPath($ReportPath)
if (-not $taskReport.StartsWith($taskArtifacts + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Audit report must be under root artifacts/, outside all package input roots.' }
if ([IO.Path]::GetExtension($taskReport) -ne '.json' -or (Test-Path -LiteralPath $taskReport)) { throw 'Choose a new JSON report path; existing reports are never overwritten.' }
if ([IO.Path]::GetExtension($taskArchive) -ne '.zip') { throw 'Expected a ZIP file.' }

$taskNames = @('README.md','THIRD_PARTY_NOTICES.txt','.env.example','play.cmd','stop.cmd','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','src','server','public','dist','scripts','tests','docs')
$taskNames += @(Get-ChildItem -LiteralPath $taskRoot -Filter 'playwright.*.config.ts' -File | ForEach-Object { $_.Name })
if (Test-Path -LiteralPath (Join-Path $taskRoot 'verification')) { $taskNames += 'verification' }
$taskNames = @($taskNames | Sort-Object -Unique)
$taskIssues = [Collections.Generic.List[object]]::new()
$taskSecretFindings = [Collections.Generic.List[object]]::new()
$taskEntries = [Collections.Generic.List[object]]::new()
$taskPublicEvidenceRoots = @(
    'docs/v2-parent-compound/artifacts',
    'docs/v2-parent-final/artifacts',
    'docs/v2-state-parent-integrated/artifacts',
    'docs/v2-state-ralph/generation1-implementation/artifacts'
)
$taskAllowed = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($name in $taskNames) { [void]$taskAllowed.Add($name) }

function Add-Issue([string]$Code,[string]$Path) { $taskIssues.Add([pscustomobject]@{code=$Code;path=$Path}) }
function Get-FileSha256([string]$LiteralPath) {
    $sha=[Security.Cryptography.SHA256]::Create()
    $stream=$null
    try {
        $stream=[IO.File]::OpenRead($LiteralPath)
        return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()
    } finally { if($stream){$stream.Dispose()}; $sha.Dispose() }
}
function Test-Forbidden([string]$Relative) {
    $p = $Relative.Replace('\','/').TrimEnd('/')
    $parts=$p.Split('/')
    for ($partIndex=0;$partIndex -lt $parts.Length;$partIndex++) {
        $segment=$parts[$partIndex]
        if ($segment -match '^(?i:\.env)(?:$|\.)' -and $p -ine '.env.example') { return $true }
        if ($segment -ieq 'artifacts' -and $taskPublicEvidenceRoots -notcontains ($parts[0..$partIndex] -join '/')) { return $true }
        if ($segment -match '^(?i:\.local-data|node_modules|\.git|\.ouroboros|\.ralph|\.codex|private|playwright-report|test-results(?:-.*)?|private-saves|saved-games)$') { return $true }
    }
    if ($p -match '(?i)(?:\.log|\.sqlite(?:3)?|\.db|\.sav|\.save|\.bak|\.tmp|\.pfx|\.p12|\.pem|\.key)$|\.preserved-[^/]+$') { return $true }
    if ($p -match '(?i)(^|/)[a-f0-9]{48}\.json(?:\.|$)') { return $true }
    return $false
}
function Get-Inventory {
    $items = [Collections.Generic.List[object]]::new()
    function Visit-Input([string]$FullPath) {
        if (-not (Test-Path -LiteralPath $FullPath)) { Add-Issue 'missing-root-input' $FullPath; return }
        $item = Get-Item -LiteralPath $FullPath -Force
        $relative = $item.FullName.Substring($taskRoot.Length+1).Replace('\','/')
        if (-not $item.FullName.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { Add-Issue 'root-path-escape' $relative; return }
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Add-Issue 'root-reparse-point-not-read' $relative; return }
        if (Test-Forbidden $relative) { Add-Issue 'forbidden-root-input-not-read' $relative; return }
        if ($item.PSIsContainer) {
            foreach ($child in @(Get-ChildItem -LiteralPath $item.FullName -Force)) { Visit-Input $child.FullName }
        } else {
            $items.Add([pscustomobject]@{path=$relative;bytes=[long]$item.Length;sha256=(Get-FileSha256 $item.FullName)})
        }
    }
    foreach ($name in $taskNames) { Visit-Input (Join-Path $taskRoot $name) }
    return @($items.ToArray() | Sort-Object path)
}

# Deliberately report only file path, byte count and full-file digest on a match.
# These are heuristic secret-shape checks, not a claim to detect all secrets.
$taskSecretPattern = '(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])|(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}|Bearer\s+[A-Za-z0-9_.-]{28,}'
$taskSecretRegex = [Text.RegularExpressions.Regex]::new($taskSecretPattern,[Text.RegularExpressions.RegexOptions]::CultureInvariant)
function Read-EntryDigest($Entry) {
    $stream = $Entry.Open()
    $sha = [Security.Cryptography.SHA256]::Create()
    $buffer = New-Object byte[] 65536
    $tails = @('','','')
    $found = $false
    $count = [long]0
    try {
        while (($read = $stream.Read($buffer,0,$buffer.Length)) -gt 0) {
            $count += $read
            if ($count -gt 536870912) { throw 'Entry scan limit exceeded.' }
            [void]$sha.TransformBlock($buffer,0,$read,$buffer,0)
            if (-not $found) {
                $texts = @([Text.Encoding]::UTF8.GetString($buffer,0,$read),[Text.Encoding]::Unicode.GetString($buffer,0,$read),[Text.Encoding]::BigEndianUnicode.GetString($buffer,0,$read))
                for ($i=0;$i -lt 3;$i++) {
                    $chunk = $tails[$i] + $texts[$i]
                    if ($taskSecretRegex.IsMatch($chunk)) { $found = $true }
                    $tails[$i] = $chunk.Substring([Math]::Max(0,$chunk.Length-512))
                }
            }
        }
        [void]$sha.TransformFinalBlock((New-Object byte[] 0),0,0)
        return [pscustomobject]@{bytes=$count;sha256=([BitConverter]::ToString($sha.Hash)).Replace('-','').ToLowerInvariant();secretShape=$found}
    } finally { $sha.Dispose(); $stream.Dispose() }
}

$taskStarted = [DateTime]::UtcNow.ToString('o')
$taskArchiveHashBefore = Get-FileSha256 $taskArchive
$taskArchiveSize = (Get-Item -LiteralPath $taskArchive).Length
$taskRootBefore = @(Get-Inventory)
$taskRootMap = [Collections.Generic.Dictionary[string,object]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($item in $taskRootBefore) {
    if ($taskRootMap.ContainsKey($item.path)) { Add-Issue 'root-case-collision' $item.path } else { $taskRootMap.Add($item.path,$item) }
}
$taskRequired = @('server/index.ts','server/narrative.ts','server/commitments.ts','server/provider.ts','server/storage.ts','src/main.tsx','src/style.css','src/CharacterSprite.tsx','src/visualAssets.ts','dist/index.html','scripts/start-local.ps1','scripts/stop-local.ps1','scripts/package-local.ps1','README.md','THIRD_PARTY_NOTICES.txt','.env.example','play.cmd','stop.cmd','package.json','package-lock.json')
foreach ($name in $taskRequired) { if (-not $taskRootMap.ContainsKey($name)) { Add-Issue 'missing-required-candidate-file' $name } }
if (@($taskRootBefore | Where-Object { $_.path -match '^dist/.+\.js$' }).Count -eq 0) { Add-Issue 'missing-built-javascript' 'dist/' }

$taskSeen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$taskFileSeen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskArchive)
$taskTotal = [long]0
try {
    $index=0
    foreach ($entry in $taskZip.Entries) {
        $index++
        $name=$entry.FullName.Replace('\','/')
        $trimmed=$name.TrimEnd('/')
        $segments=$trimmed.Split('/')
        $badPath = (-not $trimmed) -or $name.StartsWith('/') -or ($name -match '[:\x00]') -or $name.Contains('//') -or @($segments | Where-Object { $_ -eq '.' -or $_ -eq '..' -or $_ -match '[. ]$' }).Count -gt 0
        if ($badPath) { Add-Issue 'unsafe-archive-path-not-read' $name; continue }
        if (-not $taskSeen.Add($name)) { Add-Issue 'duplicate-or-case-colliding-entry' $name }
        if (-not $taskAllowed.Contains($segments[0])) { Add-Issue 'non-allowlisted-archive-entry-not-read' $name; continue }
        if (Test-Forbidden $trimmed) { Add-Issue 'forbidden-archive-entry-not-read' $name; continue }
        $unixType=($entry.ExternalAttributes -shr 16) -band 61440
        if ($unixType -eq 40960) { Add-Issue 'archive-symlink-not-read' $name; continue }
        if ($name.EndsWith('/')) { continue }
        [void]$taskFileSeen.Add($name)
        if ($name -match '(?i)\.(zip|7z|rar|tar|gz|bz2|xz)$') { Add-Issue 'embedded-archive-needs-separate-review' $name }
        $taskTotal += $entry.Length
        if ($entry.Length -gt 536870912 -or $taskTotal -gt 2147483648) { Add-Issue 'archive-scan-limit-not-read' $name; continue }
        try { $digest=Read-EntryDigest $entry } catch { Add-Issue 'archive-entry-read-or-scan-failed' $name; continue }
        $expected=$null
        if ($taskRootMap.ContainsKey($name)) { $expected=$taskRootMap[$name] } else { Add-Issue 'extra-archive-file' $name }
        $matches=$null -ne $expected -and $expected.sha256 -ceq $digest.sha256 -and $expected.bytes -eq $digest.bytes
        if ($null -ne $expected -and -not $matches) { Add-Issue 'archive-root-byte-mismatch' $name }
        if ($entry.Length -ne $digest.bytes) { Add-Issue 'archive-entry-length-mismatch' $name }
        $taskEntries.Add([pscustomobject]@{index=$index;path=$name;bytes=$digest.bytes;sha256=$digest.sha256;rootSha256=$(if($expected){$expected.sha256}else{$null});matchesRoot=$matches})
        if ($digest.secretShape) { $taskSecretFindings.Add([pscustomobject]@{path=$name;bytes=$digest.bytes;sha256=$digest.sha256}) }
    }
} finally { $taskZip.Dispose() }
foreach ($item in $taskRootBefore) { if (-not $taskFileSeen.Contains($item.path)) { Add-Issue 'missing-archive-file' $item.path } }

$taskRootAfter = @(Get-Inventory)
$taskAfterMap = [Collections.Generic.Dictionary[string,object]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($item in $taskRootAfter) { if (-not $taskAfterMap.ContainsKey($item.path)) { $taskAfterMap.Add($item.path,$item) } }
foreach ($item in $taskRootBefore) {
    if (-not $taskAfterMap.ContainsKey($item.path) -or $taskAfterMap[$item.path].sha256 -cne $item.sha256) { Add-Issue 'workspace-changed-during-audit' $item.path }
}
foreach ($item in $taskRootAfter) { if (-not $taskRootMap.ContainsKey($item.path)) { Add-Issue 'workspace-file-added-during-audit' $item.path } }
$taskArchiveHashAfter = Get-FileSha256 $taskArchive
if ($taskArchiveHashBefore -cne $taskArchiveHashAfter) { Add-Issue 'archive-changed-during-audit' $taskArchive }

$taskSidecar = $taskArchive + '.sha256'
if (-not (Test-Path -LiteralPath $taskSidecar)) { Add-Issue 'missing-archive-sha256-sidecar' $taskSidecar }
else {
    $line=[IO.File]::ReadAllText($taskSidecar)
    $match=[Text.RegularExpressions.Regex]::Match($line,'\A([A-Fa-f0-9]{64})\s+\*?([^\r\n]+)\s*\z')
    if (-not $match.Success -or $match.Groups[1].Value.ToLowerInvariant() -cne $taskArchiveHashBefore -or $match.Groups[2].Value.Trim() -cne [IO.Path]::GetFileName($taskArchive)) { Add-Issue 'archive-sha256-sidecar-mismatch' $taskSidecar }
}
$taskPassed=$taskIssues.Count -eq 0 -and $taskSecretFindings.Count -eq 0
$taskReportObject=[ordered]@{
    startedAt=$taskStarted;finishedAt=[DateTime]::UtcNow.ToString('o')
    result=$(if($taskPassed){'pass'}else{'fail'})
    scope='Stable artifact audit only: exact allowlisted root/ZIP byte identity, required current runtime files, path/privacy exclusions and heuristic secret-shape scan. Not build freshness, fresh install, licensing completeness, generated conversation quality or release approval.'
    root=$taskRoot;allowlistedRoots=$taskNames;publicVersionedEvidenceRoots=$taskPublicEvidenceRoots
    archive=[ordered]@{path=$taskArchive;bytes=$taskArchiveSize;sha256=$taskArchiveHashBefore;unchangedDuringAudit=($taskArchiveHashBefore -ceq $taskArchiveHashAfter)}
    auditScript=[ordered]@{path=$PSCommandPath;sha256=(Get-FileSha256 $PSCommandPath)}
    counts=[ordered]@{rootFiles=$taskRootBefore.Count;hashedArchiveFiles=$taskEntries.Count;issues=$taskIssues.Count;secretShapeFiles=$taskSecretFindings.Count;uncompressedBytes=$taskTotal}
    requiredCurrentFiles=$taskRequired
    rootFiles=$taskRootBefore;archiveFiles=$taskEntries.ToArray()
    issues=$taskIssues.ToArray();secretShapeFiles=$taskSecretFindings.ToArray()
    exclusions='Forbidden private paths and reparse/symlink inputs are rejected without opening their contents. Only public root .env.example is permitted. No archive is extracted.'
    secretScan='OpenAI-style/GitHub-style/AWS-style/bearer/private-key markers in UTF-8 and UTF-16 streamed content. Findings contain only path, size and full-file SHA256, never key bytes, snippets or matched strings. No matches is not a universal secret-absence proof.'
}
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($taskReport)) | Out-Null
$json=$taskReportObject | ConvertTo-Json -Depth 10
$out=[IO.File]::Open($taskReport,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try { $bytes=[Text.UTF8Encoding]::new($false).GetBytes($json); $out.Write($bytes,0,$bytes.Length) } finally { $out.Dispose() }
Write-Host ('Package audit ' + $taskReportObject.result + '; files=' + $taskEntries.Count + '; issues=' + $taskIssues.Count + '; secret-shape files=' + $taskSecretFindings.Count)
Write-Host ('Report: ' + $taskReport)
if (-not $taskPassed) { exit 1 }

