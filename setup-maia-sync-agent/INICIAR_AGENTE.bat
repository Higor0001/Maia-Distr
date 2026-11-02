@echo off
chcp 65001 >nul
title Maia Sync Agent - Console Ativo
cls
echo ======================================================================
echo           MAIA DISTRIBUIDORA - MAIA SYNC AGENT EM EXECUCAO
echo ======================================================================
echo.
cd /d "%~dp0"
python maia_sync_agent.py
pause
