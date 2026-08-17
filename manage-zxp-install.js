const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('=== Gerenciamento de Instalação Safe Zones ===\n');

// 1. Caminhos de desinstalação
const appDataExt = path.join(os.homedir(), 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions', 'com.alexascencio.safezones');
const programFilesExt86 = 'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\Safe Zones';
const programFilesExt86Bundle = 'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\com.alexascencio.safezones';
const programFilesExt = 'C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions\\com.alexascencio.safezones';

console.log('1. Desinstalando versões manuais do Premiere Pro...');

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('   ✓ Removido com sucesso:', dir);
    } catch (err) {
      console.log('   ! Falha ao remover via fs (tentando via rimraf/powershell):', dir);
      try {
        execSync(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${dir}' -Recurse -Force"`);
        console.log('   ✓ Removido via PowerShell:', dir);
      } catch (e2) {
        console.error('   Erro ao remover:', e2.message);
      }
    }
  } else {
    console.log('   - Não encontrado (já limpo):', dir);
  }
}

removeDir(appDataExt);
removeDir(programFilesExt86);
removeDir(programFilesExt86Bundle);
removeDir(programFilesExt);

// 2. Reconstruir SafeZones.zxp perfeitamente
console.log('\n2. Reconstruindo pacote SafeZones.zxp atualizado...');
const sourceDir = path.join(__dirname, 'com.alexascencio.safezones');
const zxpOutput = path.join(__dirname, 'SafeZones.zxp');
const zipOutput = path.join(__dirname, 'SafeZones.zip');
const webZxp = path.join(__dirname, 'website', 'SafeZones.zxp');
const webZip = path.join(__dirname, 'website', 'SafeZones.zip');

if (fs.existsSync(zxpOutput)) fs.unlinkSync(zxpOutput);
if (fs.existsSync(zipOutput)) fs.unlinkSync(zipOutput);

const psZipCmd = `powershell -NoProfile -Command "Add-Type -Assembly 'System.IO.Compression.FileSystem'; [IO.Compression.ZipFile]::CreateFromDirectory('${sourceDir}', '${zxpOutput}'); Copy-Item '${zxpOutput}' '${zipOutput}' -Force; Copy-Item '${zxpOutput}' '${webZxp}' -Force; Copy-Item '${zipOutput}' '${webZip}' -Force"`;
execSync(psZipCmd, { stdio: 'inherit' });

console.log('   ✓ SafeZones.zxp gerado (' + (fs.statSync(zxpOutput).size / 1024).toFixed(1) + ' KB)');

// 3. Procurar aplicativo ZXPInstaller / Anastasiy
console.log('\n3. Verificando executáveis de ZXP Installer...');
const searchPaths = [
  'C:\\Program Files\\ZXPInstaller\\ZXPInstaller.exe',
  'C:\\Program Files (x86)\\ZXPInstaller\\ZXPInstaller.exe',
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'ZXPInstaller', 'ZXPInstaller.exe'),
  'C:\\Program Files\\Anastasiy\\Extension Manager.exe',
  'C:\\Program Files (x86)\\Anastasiy\\Extension Manager.exe'
];

let foundInstaller = null;
for (const sp of searchPaths) {
  if (fs.existsSync(sp)) {
    foundInstaller = sp;
    console.log('   ✓ Encontrado ZXP Installer em:', sp);
    break;
  }
}

// 4. Copiar SafeZones.zxp também para a Área de Trabalho (Desktop) para fácil arrastar e soltar
const desktopPath = path.join(os.homedir(), 'Desktop', 'SafeZones.zxp');
try {
  fs.copyFileSync(zxpOutput, desktopPath);
  console.log('   ✓ Cópia de SafeZones.zxp colocada na sua Área de Trabalho (Desktop)!');
} catch (e) {
  console.log('   ! Desktop copy info:', e.message);
}

console.log('\n=== Status Final ===');
console.log('Safe Zones desinstalado do Premiere. Pronto para arrastar o SafeZones.zxp no ZXP Installer!');
