@echo off
title Bingo Application - Dev Server
color 0A

echo ========================================
echo   Starting Bingo Application
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo [2/3] Starting development server...
echo This will start both frontend (Vite) and backend (Express) servers
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo Waiting for servers to start (this may take 10-15 seconds)...
echo.

REM Start the dev server
start "Bingo Dev Server" cmd /k "npm run dev"

REM Wait for servers to start - check if port is listening
echo Checking if servers are ready...
set MAX_ATTEMPTS=30
set ATTEMPT=0
set SERVER_READY=0

:check_server
set /a ATTEMPT+=1
timeout /t 1 /nobreak >nul

REM Check if port 5173 is listening (Vite frontend)
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set SERVER_READY=1
    goto server_ready
)

if %ATTEMPT% LSS %MAX_ATTEMPTS% (
    echo Waiting for servers... (%ATTEMPT%/%MAX_ATTEMPTS%)
    goto check_server
) else (
    echo [WARNING] Servers are taking longer than expected to start.
    echo Opening browser anyway...
    set SERVER_READY=1
)

:server_ready
echo.
echo [3/3] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   Application Started!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo The server is running in a separate window.
echo Close that window to stop the servers.
echo.
echo You can also access:
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:3001
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul

