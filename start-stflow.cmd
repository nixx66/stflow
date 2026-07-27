@echo off
setlocal
title Start STFlow
cd /d "%~dp0"

set "NEXT_BIN=%~dp0node_modules\next\dist\bin\next"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo Please install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)
set "NODE_EXE=node"

if not exist "%NEXT_BIN%" (
  echo.
  echo Dependencies are missing.
  echo Please run pnpm install first, then run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting STFlow local server...
echo.
echo A server window will stay open.
echo Do not close that server window while using STFlow.
echo.
echo Browser will open automatically:
echo   http://127.0.0.1:3001
echo.

start "" cmd /c "timeout /t 8 /nobreak >nul && start "" http://127.0.0.1:3001"

echo.
"%NODE_EXE%" "%NEXT_BIN%" dev -p 3001 -H 127.0.0.1

echo.
echo STFlow server stopped. Press any key to close this window.
pause
