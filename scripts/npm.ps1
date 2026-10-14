# Use the project's portable LTS without changing the system installation.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodeVersion = (Get-Content (Join-Path $projectRoot '.node-version') -Raw).Trim()
$runtime = Join-Path $projectRoot ".tools/node-v$nodeVersion-win-x64"
$previousPath = $env:PATH
try {
    if (Test-Path (Join-Path $runtime 'node.exe')) {
        $env:PATH = "$runtime;$previousPath"
    }
    $installedVersion = & node -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0 -or [version]$installedVersion -lt [version]$nodeVersion -or ([version]$installedVersion).Major -ne 24) {
        throw "Node $nodeVersion or later in LTS 24 is required. See README.md."
    }
    Push-Location $projectRoot
    try {
        & npm.cmd @args
        if ($LASTEXITCODE -ne 0) { throw "npm failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
} finally { $env:PATH = $previousPath }
