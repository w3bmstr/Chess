param(
    [int]$Port = 8765,
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Web

$rootPath = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Chess2 test server listening at $prefix"
Write-Host "Serving root $rootPath"

function Get-ContentType {
    param([string]$Path)

    $mimeType = [System.Web.MimeMapping]::GetMimeMapping($Path)
    if ([string]::IsNullOrWhiteSpace($mimeType)) {
        return 'application/octet-stream'
    }
    return $mimeType
}

function Write-TextResponse {
    param(
        [System.Net.HttpListenerResponse]$Response,
        [int]$StatusCode,
        [string]$Body
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = 'text/plain; charset=utf-8'
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Close()
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
        } catch [System.Net.HttpListenerException] {
            break
        }

        $response = $context.Response

        try {
            $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
            if ([string]::IsNullOrWhiteSpace($requestPath) -or $requestPath -eq '/') {
                $requestPath = '/index.html'
            }

            $relativePath = $requestPath.TrimStart('/') -replace '/', '\\'
            $resolvedPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))

            if (-not $resolvedPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
                Write-TextResponse -Response $response -StatusCode 403 -Body 'Forbidden'
                continue
            }

            if ((Test-Path $resolvedPath) -and (Get-Item $resolvedPath).PSIsContainer) {
                $resolvedPath = Join-Path $resolvedPath 'index.html'
            }

            if (-not (Test-Path $resolvedPath) -or (Get-Item $resolvedPath).PSIsContainer) {
                Write-TextResponse -Response $response -StatusCode 404 -Body 'Not Found'
                continue
            }

            $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
            $response.StatusCode = 200
            $response.ContentType = Get-ContentType -Path $resolvedPath
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        } catch {
            if ($response.OutputStream.CanWrite) {
                Write-TextResponse -Response $response -StatusCode 500 -Body ('Server Error: ' + $_.Exception.Message)
            }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}