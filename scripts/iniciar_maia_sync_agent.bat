@echo off
title Maia Sync Agent
echo Iniciando Maia Sync Agent em segundo plano...
cd /d "%~dp0"
python maia_sync_agent.py
pause
