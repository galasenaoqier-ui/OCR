@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist dist goto offline
if exist node_modules goto dev
goto setup

:dev
echo Starting Yinqi Web platform (preview mode)...
start "" cmd /k "npm run preview -- --port 4173 --strictPort"
goto open

:offline
echo Starting Yinqi offline build (PowerShell, no Node needed)...
start "Yinqi Offline Server" /min cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File serve-dist.ps1 4173"
goto open

:setup
echo First run: installing dependencies and building the site, please wait...
call npm install
if errorlevel 1 (
  echo Dependency installation failed. Please check network and retry.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo Build failed. Please check the error messages above.
  pause
  exit /b 1
)
echo Build finished. Starting Yinqi Web platform...
start "" cmd /k "npm run preview -- --port 4173 --strictPort"

:open
ping -n 6 127.0.0.1 >nul
start "" http://localhost:4173/
exit /b
