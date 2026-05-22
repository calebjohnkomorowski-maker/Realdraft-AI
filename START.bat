@echo off
title RealDraft AI — Launcher
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       RealDraft AI — Starting...     ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── Load credentials from .env ──────────────────────────────────────────────
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0backend\.env") do (
  if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
)

:: ── Backend ──────────────────────────────────────────────────────────────────
echo  [1/2] Starting backend on port 3001...
start "RealDraft Backend" /min cmd /k "cd /d "%~dp0backend" && "C:\Program Files\nodejs\node.exe" server.js"

:: ── Frontend ─────────────────────────────────────────────────────────────────
echo  [2/2] Starting frontend on port 5173...
start "RealDraft Frontend" /min cmd /k "cd /d "%~dp0frontend" && "C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js --port 5173"

:: ── Open browser ─────────────────────────────────────────────────────────────
echo.
echo  Waiting for servers to start...
timeout /t 4 /nobreak >nul
echo  Opening http://localhost:5173
start "" "http://localhost:5173"

echo.
echo  ✅ RealDraft AI is running!
echo     Backend:  http://localhost:3001
echo     Frontend: http://localhost:5173
echo.
echo  Close this window anytime — servers keep running in their own windows.
pause
