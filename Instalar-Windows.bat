@echo off
chcp 65001 >nul
title Safe Zones — Instalador Automático para Adobe Premiere Pro

echo.
echo ========================================================
echo   SAFE ZONES — INSTALADOR AUTOMÁTICO PARA PREMIERE PRO
echo   Criado por: Alex Ascencio
echo ========================================================
echo.

set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\com.alexascencio.safezones"
set "SOURCE_DIR=%~dp0com.alexascencio.safezones"

echo [1/3] Verificando pasta de extensão CEP...
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    mkdir "%APPDATA%\Adobe\CEP\extensions" 2>nul
)

echo [2/3] Instalando Safe Zones...
if exist "%SOURCE_DIR%" (
    if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"
    xcopy "%SOURCE_DIR%" "%TARGET_DIR%\" /E /I /H /Y /Q >nul
) else (
    echo [ERRO] Pasta com.alexascencio.safezones não encontrada neste diretório!
    pause
    exit /b 1
)

echo [3/3] Habilitando extensões no Premiere Pro...
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d "1" /f >nul 2>&1

echo.
echo ========================================================
echo   ✅ SAFE ZONES INSTALADO COM SUCESSO!
echo.
echo   Como abrir no Premiere Pro:
echo   1. Abra o Adobe Premiere Pro
echo   2. Acesse: Janela ^> Extensões ^> Safe Zones
echo ========================================================
echo.
pause
