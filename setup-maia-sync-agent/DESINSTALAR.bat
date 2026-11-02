@echo off
chcp 65001 >nul
title Desinstalar Maia Sync Agent
cls
echo ======================================================================
echo                  DESINSTALAR MAIA SYNC AGENT
echo ======================================================================
echo.
echo Encerrando processos do Maia Sync Agent...
taskkill /f /im pythonw.exe 2>nul
taskkill /f /im python.exe /fi "WINDOWTITLE eq Maia Sync Agent*" 2>nul

echo Removendo atalho de inicializacao automatica...
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
del "%STARTUP_DIR%\MaiaSyncAgent.lnk" 2>nul

echo Removendo atalho da Area de Trabalho...
set DESKTOP_DIR=%USERPROFILE%\Desktop
del "%DESKTOP_DIR%\Maia Sync Agent (Iniciar Manual).lnk" 2>nul

echo.
echo ======================================================================
echo    Maia Sync Agent foi desinstalado da inicializacao do Windows.
echo ======================================================================
echo Os relatorios já gravados em C:\MaiaRelatorios foram preservados.
echo.
pause
