<#
.SYNOPSIS
    One-Click Local Development Startup for Network Attack Forecasting.
    Starts FastAPI (8000), Streamlit (8501), and Vite Frontend (5173) concurrently.
    Automatically opens the browser after services start.
.EXAMPLE
    .\start_dev.ps1               # Start all services + open browser
    .\start_dev.ps1 -NoOpen       # Start all services, skip browser
#>
param(
    [switch]$NoOpen
)

$ErrorActionPreference = "Continue"
$RootPath = $PSScriptRoot
if (-not $RootPath) {
    $RootPath = (Get-Item .).FullName
}

# ── 1. Detect Python (virtualenv or system) ──────────────────────────────────
$PythonCmd = "python"
if (Test-Path "$RootPath\.venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\.venv\Scripts\python.exe"
} elseif (Test-Path "$RootPath\venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\venv\Scripts\python.exe"
}

# ── 2. TCP Port Check ─────────────────────────────────────────────────────────
function Test-PortListening([int]$port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(300, $false)
        if ($success -and $client.Connected) {
            $client.EndConnect($iar)
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

# ── 3. Check npm is installed ─────────────────────────────────────────────────
$npmAvailable = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Network Attack Forecasting  —  One-Click Dev Launcher        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Project : $RootPath" -ForegroundColor Gray
Write-Host "  Python  : $PythonCmd" -ForegroundColor Gray
Write-Host "  npm     : $(if ($npmAvailable) { 'found' } else { 'NOT FOUND — frontend will be skipped' })" -ForegroundColor Gray
Write-Host ""

# ── 4. FastAPI Backend (8000) ─────────────────────────────────────────────────
$FastApiPort = 8000
if (Test-PortListening $FastApiPort) {
    Write-Host "[ALREADY RUNNING]  FastAPI Backend     http://localhost:$FastApiPort" -ForegroundColor Yellow
} else {
    Write-Host "[STARTING]         FastAPI Backend     http://localhost:$FastApiPort ..." -ForegroundColor Green
    $BackendArgs = "/k title FastAPI [8000] && cd /d `"$RootPath`" && `"$PythonCmd`" -m uvicorn app:app --host 127.0.0.1 --port $FastApiPort --reload"
    Start-Process cmd.exe -ArgumentList $BackendArgs -WorkingDirectory $RootPath
}

# ── 5. Streamlit Dashboard (8501) ─────────────────────────────────────────────
$StreamlitPort = 8501
if (Test-PortListening $StreamlitPort) {
    Write-Host "[ALREADY RUNNING]  Streamlit Dashboard http://localhost:$StreamlitPort" -ForegroundColor Yellow
} else {
    Write-Host "[STARTING]         Streamlit Dashboard http://localhost:$StreamlitPort ..." -ForegroundColor Green
    $StreamlitArgs = "/k title Streamlit [8501] && cd /d `"$RootPath`" && `"$PythonCmd`" -m streamlit run app/app.py --server.port $StreamlitPort --server.headless true"
    Start-Process cmd.exe -ArgumentList $StreamlitArgs -WorkingDirectory $RootPath
}

# ── 6. Vite Frontend (5173) ───────────────────────────────────────────────────
$FrontendPort = 5173
$FrontendDir = Join-Path $RootPath "frontend"
if (-not $npmAvailable) {
    Write-Host "[SKIPPED]          Frontend — npm not found, install Node.js first" -ForegroundColor Red
} elseif (Test-PortListening $FrontendPort) {
    Write-Host "[ALREADY RUNNING]  Frontend (Vite)     http://localhost:$FrontendPort" -ForegroundColor Yellow
} else {
    Write-Host "[STARTING]         Frontend (Vite)     http://localhost:$FrontendPort ..." -ForegroundColor Green
    $FrontendArgs = "/k title Frontend Vite [5173] && cd /d `"$FrontendDir`" && npm run dev"
    Start-Process cmd.exe -ArgumentList $FrontendArgs -WorkingDirectory $FrontendDir
}

# ── 7. Summary ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Services launched — waiting ~5 s for startup ...             " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [1]  Frontend Dashboard  →  http://localhost:5173" -ForegroundColor White
Write-Host "  [2]  FastAPI Backend     →  http://localhost:8000" -ForegroundColor White
Write-Host "  [3]  Swagger / API Docs  →  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  [4]  Streamlit Analytics →  http://localhost:8501" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C in any terminal window to stop that service." -ForegroundColor Gray
Write-Host ""

# ── 8. Auto-open browser ──────────────────────────────────────────────────────
if (-not $NoOpen) {
    Write-Host "[BROWSER] Opening dashboard in 5 seconds ..." -ForegroundColor Magenta
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5173"
    Write-Host "[BROWSER] Opened http://localhost:5173" -ForegroundColor Magenta
    Write-Host ""
}
