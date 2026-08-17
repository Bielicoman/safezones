/**
 * Safe Zones — Automated ZXP & Release Packager
 * Packages the CEP extension into SafeZones.zxp and SafeZones.zip
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('📦 Empacotando Safe Zones para ZXP e ZIP...');

const extDir = path.join(__dirname, 'com.alexascencio.safezones');
const zxp = path.join(__dirname, 'SafeZones.zxp');
const zip = path.join(__dirname, 'SafeZones.zip');
const webZxp = path.join(__dirname, 'website', 'SafeZones.zxp');
const webZip = path.join(__dirname, 'website', 'SafeZones.zip');

try {
  [zxp, zip, webZxp, webZip].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  execSync(`tar.exe -a -c -f "${zip}" -C "${extDir}" *`, { stdio: 'inherit' });

  fs.copyFileSync(zip, zxp);
  fs.mkdirSync(path.join(__dirname, 'website'), { recursive: true });
  fs.copyFileSync(zip, webZip);
  fs.copyFileSync(zxp, webZxp);

  const zxpSize = (fs.statSync(zxp).size / 1024).toFixed(1);
  console.log(`✅ SafeZones.zxp criado com sucesso! (${zxpSize} KB)`);
  console.log(`✅ SafeZones.zip criado com sucesso! (${zxpSize} KB)`);
  console.log('✅ Arquivos sincronizados em /website e na raiz para download direto.');
} catch (err) {
  console.error('Erro:', err.message);
}
