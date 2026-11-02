@echo off
chcp 65001 >nul
title Instalador Maia Sync Agent - Maia Distribuidora
cls
echo ======================================================================
echo           MAIA DISTRIBUIDORA - INSTALADOR MAIA SYNC AGENT
echo                (Agente Autonomo para Balanca / Expedicao)
echo ======================================================================
echo.
echo Verificando instalacao do Python...

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Python nao foi encontrado no sistema!
    echo.
    echo Por favor, instale o Python 3.9+ baixando de:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANTE: Na tela de instalacao do Python, marque a caixa:
    echo   "[X] Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo [OK] Python detectado com sucesso.
echo.

set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo Configurando diretorios locais...
if not exist "C:\MaiaRelatorios" (
    mkdir "C:\MaiaRelatorios" 2>nul
)
echo [OK] Pasta C:\MaiaRelatorios criada/verificada.

echo Criando inicializador silencioso em segundo plano...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "pythonw.exe """ ^& "%SCRIPT_DIR%\maia_sync_agent.py""" , 0, False
) > "%SCRIPT_DIR%\iniciar_silencioso.vbs"

echo Criando atalho na Inicializacao do Windows (Auto-Start)...
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%STARTUP_DIR%\MaiaSyncAgent.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_DIR%\iniciar_silencioso.vbs"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%"
echo oLink.Description = "Maia Sync Agent - Sincronizacao de Balanca e Relatorios"
echo oLink.Save
) > "%TEMP%\criar_atalho.vbs"
cscript //nologo "%TEMP%\criar_atalho.vbs"
del "%TEMP%\criar_atalho.vbs" 2>nul

echo Criando atalho na Area de Trabalho...
set DESKTOP_DIR=%USERPROFILE%\Desktop
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%DESKTOP_DIR%\Maia Sync Agent (Iniciar Manual).lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_DIR%\INICIAR_AGENTE.bat"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%"
echo oLink.Description = "Executar Maia Sync Agent em Janela de Console"
echo oLink.Save
) > "%TEMP%\criar_atalho_desk.vbs"
cscript //nologo "%TEMP%\criar_atalho_desk.vbs"
del "%TEMP%\criar_atalho_desk.vbs" 2>nul

echo.
echo Iniciando o agente agora...
wscript "%SCRIPT_DIR%\iniciar_silencioso.vbs"

echo.
echo ======================================================================
echo    SUCESSO! O Maia Sync Agent foi instalado neste computador.
echo ======================================================================
echo.
echo 1. O servico rodara em segundo plano e iniciara com o Windows.
echo 2. Relatorios recebidos serao salvos em: C:\MaiaRelatorios
echo 3. Para ver os logs ou alterar configuracoes, consulte:
echo    %SCRIPT_DIR%\config.json
echo    %SCRIPT_DIR%\maia_sync_agent.log
echo.
pause
