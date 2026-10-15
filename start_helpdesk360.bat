@echo off
title HelpDesk 360 Launcher
echo ======================================================================
echo           Starting HelpDesk 360 Enterprise Platform...
echo ======================================================================
echo.

cd /d "%~dp0"

:: Launch browser in 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

:: Start unified full-stack server
if exist "backend\venv\Scripts\python.exe" (
    backend\venv\Scripts\python.exe -m backend.app
) else (
    python -m backend.app
)

pause
