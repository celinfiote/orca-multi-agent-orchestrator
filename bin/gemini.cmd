@echo off
if "%~1"=="2" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gemini2.ps1" %*
) else if "%~1"=="3" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gemini3.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gemini1.ps1" %*
)
