# Serve this folder on 127.0.0.1:5975 so it can be opened in a browser.
#
# A service worker and "add to home screen" both need http rather than file://,
# so looking at index.html directly on disk does not exercise the real thing.
#
# Idempotent: if the port is already listening, it does nothing.

$ErrorActionPreference = 'Stop'

$dir = Split-Path -Parent $PSScriptRoot
$port = 5975

$python = 'python'
if (-not (Get-Command $python -ErrorAction SilentlyContinue)) {
    Write-Host "[ouchitore] no python on PATH"
    exit 1
}

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "[ouchitore] already listening on $port"
    exit 0
}

Start-Process -FilePath $python `
    -ArgumentList @('-X', 'utf8', '-m', 'http.server', "$port", '--bind', '127.0.0.1', '--directory', $dir) `
    -WindowStyle Hidden

Start-Sleep -Seconds 2
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "[ouchitore] serving $dir on http://127.0.0.1:$port"
    exit 0
}

Write-Host "[ouchitore] failed to start on $port"
exit 1
