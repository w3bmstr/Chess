param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$rootPath = [System.IO.Path]::GetFullPath($Root)
$pidFile = Join-Path $rootPath '.test-server.pid'

if (-not (Test-Path $pidFile)) {
    Write-Host 'Chess2 local test server is not running.'
    exit 0
}

$rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
if (-not $rawPid) {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Host 'Removed stale server pid file.'
    exit 0
}

$process = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.Id -Force
    Write-Host "Stopped Chess2 local test server PID $($process.Id)."
} else {
    Write-Host 'Chess2 local test server was not running. Removed stale pid file.'
}

Remove-Item $pidFile -ErrorAction SilentlyContinue