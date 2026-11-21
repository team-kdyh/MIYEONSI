@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-local.ps1"
set "AFTERHOURS_EXIT=%errorlevel%"
if not "%AFTERHOURS_EXIT%"=="0" pause
exit /b %AFTERHOURS_EXIT%
