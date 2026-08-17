#!/bin/bash
clear
echo "========================================================"
echo "  SAFE ZONES — INSTALADOR AUTOMÁTICO PARA PREMIERE PRO"
echo "  Criado por: Alex Ascencio"
echo "========================================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_DIR="$SCRIPT_DIR/com.alexascencio.safezones"
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.alexascencio.safezones"

echo "[1/3] Verificando pasta de extensão CEP..."
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"

echo "[2/3] Instalando Safe Zones..."
if [ -d "$SOURCE_DIR" ]; then
    rm -rf "$TARGET_DIR"
    cp -R "$SOURCE_DIR" "$TARGET_DIR"
else
    echo "[ERRO] Pasta com.alexascencio.safezones não encontrada!"
    exit 1
fi

echo "[3/3] Habilitando extensões no Premiere Pro..."
defaults write com.adobe.CSXS.9 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.10 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.11 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.12 PlayerDebugMode 1 2>/dev/null

echo ""
echo "========================================================"
echo "  ✅ SAFE ZONES INSTALADO COM SUCESSO NO MAC!"
echo ""
echo "  Como abrir no Premiere Pro:"
echo "  1. Abra o Adobe Premiere Pro"
echo "  2. Acesse: Window > Extensions > Safe Zones"
echo "========================================================"
echo ""
read -p "Pressione Enter para fechar..."
