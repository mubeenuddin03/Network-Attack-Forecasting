@echo off
title Network Attack Forecaster
cd /d "%~dp0"
echo.
echo  ================================================
echo   Network Attack Forecaster - Starting...
echo  ================================================
echo.

set "PY_CMD=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0venv\Scripts\python.exe"
)

echo  [*] Using Python: %PY_CMD%
echo  [*] Starting server on http://localhost:8000 ...
echo.

start "Network Attack Forecaster [Port 8000]" cmd /k "cd /d "%~dp0" && "%PY_CMD%" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul
start "" "http://localhost:8000"

echo  [OK] Server started! Browser opened at http://localhost:8000
echo  [OK] API Docs available at http://localhost:8000/docs
echo.
echo  Keep the server window open while using the dashboard.
echo.
pause

