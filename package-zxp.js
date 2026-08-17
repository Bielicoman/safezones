/**
 * Safe Zones — Automated ZXP & Release Packager
 * Packages the CEP extension into SafeZones.zxp and SafeZones.zip
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('📦 Empacotando Safe Zones para ZXP e ZIP...');

const psScript = `
Add-Type -Assembly 'System.IO.Compression.FileSystem';
$extDir = Join-Path (Get-Location) 'com.alexascencio.safezones';
$zxp = Join-Path (Get-Location) 'SafeZones.zxp';
$zip = Join-Path (Get-Location) 'SafeZones.zip';
$webZxp = Join-Path (Get-Location) 'website\\SafeZones.zxp';
$webZip = Join-Path (Get-Location) 'website\\SafeZones.zip';

if (Test-Path $zxp) { Remove-Item $zxp -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }

[IO.Compression.ZipFile]::CreateFromDirectory($extDir, $zxp);
Copy-Item $zxp $zip -Force;
Copy-Item $zxp $webZxp -Force;
Copy-Item $zip $webZip -Force;
`;

try {
  execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  const zxpSize = (fs.statSync(path.join(__dirname, 'SafeZones.zxp')).size / 1024).toFixed(1);
  console.log(`✅ SafeZones.zxp criado com sucesso! (${zxpSize} KB)`);
  console.log(`✅ SafeZones.zip criado com sucesso! (${zxpSize} KB)`);
  console.log('✅ Arquivos sincronizados em /website e na raiz para download direto.');
} catch (err) {
  console.error('Erro:', err.message);
}
