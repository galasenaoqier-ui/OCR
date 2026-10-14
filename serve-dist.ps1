# Zero-dependency offline static server (Windows PowerShell 5.1+, no Node/npm needed).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File serve-dist.ps1 [port]
param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist'))
$separator = [System.IO.Path]::DirectorySeparatorChar
$hostName = '127.0.0.1'

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif' = 'image/gif'
  '.webp' = 'image/webp'
  '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'
  '.wasm' = 'application/wasm'
  '.onnx' = 'application/octet-stream'
  '.bin' = 'application/octet-stream'
  '.txt' = 'text/plain; charset=utf-8'
  '.woff2' = 'font/woff2'
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [byte[]]$Body,
    [string]$ContentType,
    [int]$StatusCode = 200,
    [string]$StatusText = 'OK'
  )
  try {
    $head = "HTTP/1.1 $StatusCode $StatusText`r`n" +
      "Content-Type: $ContentType`r`n" +
      "Content-Length: $($Body.Length)`r`n" +
      "Cache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
    $Stream.Write($headBytes, 0, $headBytes.Length)
    $Stream.Write($Body, 0, $Body.Length)
    $Stream.Flush()
  } catch {
  # Ignore client disconnects.
  }
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "Port ${Port} failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Close the program using this port, or run: powershell -File serve-dist.ps1 4180" -ForegroundColor Yellow
  exit 1
}

Write-Host "Yinqi offline build is ready: http://localhost:${Port}/" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor DarkGray

while ($listener.Server.IsBound) {
  $client = $null
  try {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $buffer = New-Object byte[] 65536
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) {
      $client.Close()
      continue
    }
    $headText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
    $firstLine = ($headText -split "`r?`n")[0]
    $parts = $firstLine -split ' '
    if ($parts.Length -lt 2 -or $parts[0] -notin @('GET', 'HEAD')) {
      $client.Close()
      continue
    }
    $rawPath = $parts[1]
    $question = $rawPath.IndexOf('?')
    if ($question -ge 0) { $rawPath = $rawPath.Substring(0, $question) }
    try {
      $urlPath = [System.Uri]::UnescapeDataString($rawPath)
    } catch {
      $urlPath = '/index.html'
    }
    $rel = $urlPath.TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $root ($rel.Replace('/', $separator.ToString()))))
    $body = $null
    $contentType = 'text/html; charset=utf-8'
    $inside = $candidate.StartsWith($root + $separator.ToString(), [System.StringComparison]::OrdinalIgnoreCase) -or
      $candidate.Equals($root, [System.StringComparison]::OrdinalIgnoreCase)
    if ($inside -and [System.IO.File]::Exists($candidate)) {
      $body = [System.IO.File]::ReadAllBytes($candidate)
      $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
      if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
    } else {
      # SPA fallback: let React Router handle the route.
      $fallback = Join-Path $root 'index.html'
      if ([System.IO.File]::Exists($fallback)) {
        $body = [System.IO.File]::ReadAllBytes($fallback)
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        Send-Response -Stream $stream -Body $body -ContentType 'text/plain' -StatusCode 404 -StatusText 'Not Found'
        $client.Close()
        continue
      }
    }
    Send-Response -Stream $stream -Body $body -ContentType $contentType
    $client.Close()
  } catch {
    if ($client) { try { $client.Close() } catch {} }
  }
}
