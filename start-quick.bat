@echo off
title Bingo Application - Quick Start
color 0B

echo ========================================
echo   Bingo Application - Quick Start
echo ========================================
echo.

REM Start the dev server in a new window
echo Starting development server...
start "Bingo Dev Server" cmd /k "title Bingo Dev Server && color 0E && npm run dev"

REM Wait for servers to start
echo Waiting for servers to start...
timeout /t 8 /nobreak >nul

REM Open browser
echo Opening browser...
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
echo Press any key to close this window...
pause >nul

