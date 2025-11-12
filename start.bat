@echo off
setlocal enabledelayedexpansion
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

echo [1/4] Checking port availability...
REM Check if port 5173 is in use (Vite frontend)
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5173 is already in use (Vite frontend)
    echo This might be from a previous instance.
    echo.
    echo Do you want to kill the process using port 5173? (Y/N)
    set /p KILL_5173=
    if /i "!KILL_5173!"=="Y" (
        echo Attempting to kill process on port 5173...
        powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host 'Killed process PID:' $_ }"
        REM Wait a moment for port to be released
        timeout /t 2 /nobreak >nul
        REM Check again if port is still in use
        netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo [ERROR] Port 5173 is still in use after kill attempt
            echo Please manually close the application using port 5173 and try again.
            pause
            exit /b 1
        ) else (
            echo Port 5173 is now available.
        )
    ) else (
        echo [ERROR] Cannot start - port 5173 is in use
        echo Please close the application using port 5173 and try again.
        pause
        exit /b 1
    )
)

REM Check if port 3001 is in use (Backend server)
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3001 is already in use (Backend server)
    echo This might be from a previous instance.
    echo.
    echo Do you want to kill the process using port 3001? (Y/N)
    set /p KILL_3001=
    if /i "!KILL_3001!"=="Y" (
        echo Attempting to kill process on port 3001...
        powershell -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host 'Killed process PID:' $_ }"
        REM Wait a moment for port to be released
        timeout /t 2 /nobreak >nul
        REM Check again if port is still in use
        netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo [ERROR] Port 3001 is still in use after kill attempt
            echo Please manually close the application using port 3001 and try again.
            pause
            exit /b 1
        ) else (
            echo Port 3001 is now available.
        )
    ) else (
        echo [ERROR] Cannot start - port 3001 is in use
        echo Please close the application using port 3001 and try again.
        pause
        exit /b 1
    )
)

echo Ports are available.
echo.

echo [2/4] Checking dependencies...
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
echo [3/4] Starting development server...
echo This will start both frontend (Vite) and backend (Express) servers
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo Waiting for servers to start (this may take 10-15 seconds)...
echo.

REM Start the dev server in a new window with custom styling
start "Bingo Dev Server" cmd /k "title Bingo Dev Server && color 0E && npm run dev"

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
    REM Also check if port 3001 is listening (Backend)
    netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set SERVER_READY=1
        goto server_ready
    )
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
echo [4/4] Opening browser...
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
echo NOTE: If you see database connection errors, that's OK for local
echo development if you only need Web3 rooms (in-memory storage).
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
