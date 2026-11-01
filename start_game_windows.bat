@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 goto usepy
where python >nul 2>nul
if %errorlevel% equ 0 goto usepython
echo Python 3 was not found. Install Python 3 or use VS Code Live Server.
pause
exit /b 1
:usepy
start "" "http://localhost:8765/"
py -m http.server 8765
exit /b
:usepython
start "" "http://localhost:8765/"
python -m http.server 8765
