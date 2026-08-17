const fs = require('fs');
const path = require('path');
const os = require('os');

// 1. Verificar manifest de My Packs Pro para referência
const myPacksDir = 'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\My Packs Pro';
if (fs.existsSync(myPacksDir)) {
  console.log('My Packs Pro structure:');
  console.log(fs.readdirSync(myPacksDir));
  const manifestPath = path.join(myPacksDir, 'CSXS', 'manifest.xml');
  if (fs.existsSync(manifestPath)) {
    console.log('\n--- My Packs Pro manifest.xml ---');
    console.log(fs.readFileSync(manifestPath, 'utf8'));
  }
}

// 2. Verificar pasta com.alexascencio.safezones atual
const safeDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions', 'com.alexascencio.safezones');
if (fs.existsSync(safeDir)) {
  console.log('\ncom.alexascencio.safezones exists in AppData.');
}
