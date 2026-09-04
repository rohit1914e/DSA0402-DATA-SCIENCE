@echo off
set PYTHONIOENCODING=utf-8
chcp 65001
setlocal enabledelayedexpansion

echo ========================================
echo AQI PREDICTION - LOCAL DEVELOPMENT
echo ========================================
echo.

set "PROJECT_ROOT=%~dp0"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"
set "BACKEND_DIR=%PROJECT_ROOT%backend"

:: 1. Check Python
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [FAIL] Python was not found in PATH.
    echo Please install Python 3.9+ and restart the terminal.
    pause
    exit /b 1
) else (
    echo [OK] Python detected
)

:: 2. Check Node.js
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [FAIL] Node.js was not found in PATH.
    echo Please install Node.js LTS and restart the terminal.
    pause
    exit /b 1
) else (
    echo [OK] Node.js detected
)

:: 3. Check npm
set "npm_ver="
for /f "delims=" %%v in ('npm.cmd --version 2^>nul') do (
    set "npm_ver=%%v"
)

if "!npm_ver!"=="" (
    echo [FAIL] npm was not found or failed to return version.
    pause
    exit /b 1
) else (
    echo [OK] npm detected: !npm_ver!
)

:: 4. Start Backend
echo [OK] Backend starting...
cd /d "%BACKEND_DIR%"
if not exist ".venv" (
    python -m venv .venv
)

start "AQI Backend (8000)" cmd /k "call .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"

set backend_retry=0
:wait_backend
ping 127.0.0.1 -n 3 >nul
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    set /a backend_retry+=1
    if !backend_retry! gtr 15 (
        echo [FAIL] Backend failed to start.
        pause
        exit /b 1
    )
    goto wait_backend
)
echo [OK] Backend running: http://localhost:8000

:: 5. Start Frontend
echo [OK] Frontend starting...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    call npm.cmd install
)

start "AQI Frontend (5173)" cmd /k "npm.cmd run dev -- --host 127.0.0.1"

set frontend_retry=0
:wait_frontend
ping 127.0.0.1 -n 3 >nul
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    set /a frontend_retry+=1
    if !frontend_retry! gtr 15 (
        echo [FAIL] Frontend failed to start.
        pause
        exit /b 1
    )
    goto wait_frontend
)
echo [OK] Frontend running: http://localhost:5173

:: 6. Open Application
echo.
echo ========================================
echo APPLICATION READY
echo =================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Opening browser...
start http://localhost:5173
