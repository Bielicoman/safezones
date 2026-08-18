@echo off
chcp 65001 >nul
title Safe Zones — Instalador Automático para Adobe Premiere Pro

echo.
echo ========================================================
echo   SAFE ZONES PRO — INSTALADOR PARA PREMIERE PRO
echo   Compatível com Premiere Pro 2020, 2021, 2022, 2023, 2024, 2025 e 2026+
echo   Criado por: Alex Ascencio
echo ========================================================
echo.

set "TARGET_USER_DIR=%APPDATA%\Adobe\CEP\extensions\com.alexascencio.safezones"
set "TARGET_SYS_DIR=%CommonProgramFiles(x86)%\Adobe\CEP\extensions\com.alexascencio.safezones"
if not defined TARGET_SYS_DIR set "TARGET_SYS_DIR=%CommonProgramFiles%\Adobe\CEP\extensions\com.alexascencio.safezones"

set "SOURCE_DIR=%~dp0com.alexascencio.safezones"

echo [1/3] Verificando diretórios de extensões Adobe CEP...
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    mkdir "%APPDATA%\Adobe\CEP\extensions" 2>nul
)

echo [2/3] Instalando Safe Zones...
if exist "%SOURCE_DIR%" (
    if exist "%TARGET_USER_DIR%" rmdir /s /q "%TARGET_USER_DIR%" 2>nul
    xcopy "%SOURCE_DIR%" "%TARGET_USER_DIR%\" /E /I /H /Y /Q >nul
    echo       ✓ Instalado em: %%APPDATA%%\Adobe\CEP\extensions
) else (
    echo [ERRO] Pasta com.alexascencio.safezones não encontrada neste diretório!
    pause
    exit /b 1
)

echo [3/3] Habilitando PlayerDebugMode no Premiere Pro (CSXS 9 até 20)...
for /L %%i in (9,1,20) do (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
)

echo.
echo ========================================================
echo   ✅ SAFE ZONES INSTALADO COM SUCESSO!
echo.
echo   Como abrir no Adobe Premiere Pro:
echo   1. Abra (ou reinicie) o Adobe Premiere Pro
echo   2. Acesse o menu superior: Janela (Window) ^> Extensões (Extensions) ^> Safe Zones
echo.
echo   Dica: Se o Premiere já estiver aberto, feche e abra novamente.
echo ========================================================
echo.
pause
