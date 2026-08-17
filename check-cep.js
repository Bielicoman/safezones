const fs = require('fs');
const path = require('path');
const os = require('os');

const paths = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions'),
  'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions',
  'C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions'
];

paths.forEach(p => {
  console.log('--- Checking:', p);
  if (fs.existsSync(p)) {
    try {
      const items = fs.readdirSync(p);
      items.forEach(item => console.log('  ->', item));
    } catch (e) {
      console.log('  Error reading:', e.message);
    }
  } else {
    console.log('  (Does not exist)');
  }
});
