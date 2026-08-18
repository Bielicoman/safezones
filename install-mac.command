#!/bin/bash
clear
echo "========================================================"
echo "  SAFE ZONES PRO — INSTALADOR PARA PREMIERE PRO (macOS)"
echo "  Compatível com Premiere Pro 2020, 2021, 2022, 2023, 2024, 2025 e 2026+"
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
    echo "      ✓ Copiado para Application Support/Adobe/CEP/extensions"
else
    echo "[ERRO] Pasta com.alexascencio.safezones não encontrada!"
    exit 1
fi

echo "[3/3] Habilitando PlayerDebugMode no Premiere Pro (CSXS 9 até 20)..."
for i in {9..20}; do
    defaults write com.adobe.CSXS.$i PlayerDebugMode 1 2>/dev/null
done

echo ""
echo "========================================================"
echo "  ✅ SAFE ZONES INSTALADO COM SUCESSO NO MAC!"
echo ""
echo "  Como abrir no Adobe Premiere Pro:"
echo "  1. Abra (ou reinicie) o Adobe Premiere Pro"
echo "  2. Acesse: Window > Extensions > Safe Zones"
echo "========================================================"
echo ""
read -p "Pressione Enter para fechar..."
