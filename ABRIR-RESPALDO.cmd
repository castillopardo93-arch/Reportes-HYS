@echo off
setlocal
title Respaldo privado de Reportes HYS
echo Abriendo el formulario privado de Reportes HYS...
echo Escribe la contrasena SOLO en el formulario que aparecera.
set "HYS_SHELL=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe"
if not exist "%HYS_SHELL%" set "HYS_SHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
"%HYS_SHELL%" -NoProfile -STA -File "%~dp0v241\respaldo-privado.ps1"
if errorlevel 1 (
  echo No se pudo completar el proceso. Vuelve al chat sin compartir contrasenas.
  pause
)
endlocal
