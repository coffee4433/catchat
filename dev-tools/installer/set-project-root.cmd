@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
  echo Usage: %~0 "C:\path\to\chat-app-logic"
  echo.
  echo Sets the project root path so Dev Tools commands find your project.
  exit /b 1
)

set "PROJECT_ROOT=%~1"

if not exist "%PROJECT_ROOT%\package.json" (
  echo ERROR: No package.json found at "%PROJECT_ROOT%"
  exit /b 1
)

set "CONFIG_DIR=%APPDATA%\CatChat Dev Tools"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

echo {"projectRoot": "%PROJECT_ROOT:\=\\%"} > "%CONFIG_DIR%\config.json"

echo Config saved to %CONFIG_DIR%\config.json
echo Project root: %PROJECT_ROOT%
echo.
echo Start CatChat Dev Tools and the commands will now find your project.
