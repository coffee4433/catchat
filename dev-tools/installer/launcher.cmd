@echo off
title CatChat Dev Tools
cd /d "%~dp0"

:: Try PATH first
where node >nul 2>nul
if %errorlevel% equ 0 goto :run

:: Common install locations
for %%p in (
  "%ProgramFiles%\nodejs\node.exe"
  "%ProgramFiles(x86)%\nodejs\node.exe"
  "%LocalAppData%\fnm\nodejs\node.exe"
) do (
  if exist "%%~p" (
    set "PATH=%%~dpp;%PATH%"
    goto :run
  )
)

:: Check nvm-windows
if exist "%USERPROFILE%\AppData\Roaming\nvm" (
  for /d %%v in ("%USERPROFILE%\AppData\Roaming\nvm\v*") do (
    if exist "%%v\node.exe" (
      set "PATH=%%v;%PATH%"
      goto :run
    )
  )
)

echo Node.js is not installed or not found.
echo Please install Node.js from https://nodejs.org
pause
exit /b 1

:run
echo Starting CatChat Dev Tools...
echo Open http://localhost:4444 in your browser
echo Press Ctrl+C to stop
echo.
node "%~dp0server.mjs"
pause
