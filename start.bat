@echo off
title Network Attack Forecaster
cd /d "%~dp0"
echo.
echo  ================================================
echo   Network Attack Forecaster - Starting...
echo  ================================================
echo.
echo  [*] Starting FastAPI server...
echo  [*] Your browser will open at http://localhost:8000
echo.

:: Start FastAPI in a new window
start "Network Attack Forecaster [Port 8000]" cmd /k "cd /d "%~dp0" && python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

:: Wait 4 seconds for server to start, then open browser
timeout /t 4 /nobreak >nul
start "" "http://localhost:8000"

echo  [OK] Server started! Browser opened at http://localhost:8000
echo  [OK] API Docs available at http://localhost:8000/docs
echo.
echo  Close the "Network Attack Forecaster" terminal window to stop the server.
echo.
pause
