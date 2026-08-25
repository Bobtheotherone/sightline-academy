@echo off
REM Sightline Safety Academy - stop the site on this computer.
REM Double-click this file. It runs STOP_SIGHTLINE.ps1 next to it.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP_SIGHTLINE.ps1"
echo.
pause
