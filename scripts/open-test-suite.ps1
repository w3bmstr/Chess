param(
    [ValidateSet('hub', 'smoke', 'deep', 'full', 'harness')]
    [string]$Suite = 'smoke',
    [int]$Port = 8765,
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$rootPath = [System.IO.Path]::GetFullPath($Root)
$pidFile = Join-Path $rootPath '.test-server.pid'
$serverScript = Join-Path $rootPath 'scripts\serve-tests.ps1'

$relativeUrl = switch ($Suite) {
    'hub' { '/tests/index.html' }
    'smoke' { '/tests/engine-smoke.html' }
    'deep' { '/tests/engine-deep.html' }
    'full' { '/tests/engine-tests.html' }
    'harness' { '/engine-harness.html' }
}

function Get-RunningServerId {
    if (-not (Test-Path $pidFile)) {
        return $null
    }

    $rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if (-not $rawPid) {
        Remove-Item $pidFile -ErrorAction SilentlyContinue
        return $null
    }

    $process = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item $pidFile -ErrorAction SilentlyContinue
        return $null
    }

    return $process.Id
}

$runningId = Get-RunningServerId
if (-not $runningId) {
    $process = Start-Process powershell -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $serverScript,
        '-Port', $Port,
        '-Root', $rootPath
    ) -WorkingDirectory $rootPath -WindowStyle Hidden -PassThru

    Set-Content -Path $pidFile -Value $process.Id -NoNewline
    Start-Sleep -Milliseconds 900
    $runningId = $process.Id
}

$url = "http://127.0.0.1:$Port$relativeUrl"
Write-Host "Chess2 local test server PID: $runningId"
Write-Host "Opening $url"
Start-Process $url