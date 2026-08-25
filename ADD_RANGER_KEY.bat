@echo off
REM Sightline Safety Academy - give Ranger, the course tutor, its API key.
REM Double-click this file. It runs ADD_RANGER_KEY.ps1 next to it.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ADD_RANGER_KEY.ps1"
echo.
pause
