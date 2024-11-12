const fs = require('fs');
const path = require('path');

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

// Copy electron.js to build directory
fs.copyFileSync(
  path.join('public', 'electron.js'),
  path.join('build', 'electron.js')
);

console.log('Electron files copied to build directory');
