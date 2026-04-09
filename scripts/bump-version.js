const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const versionPath = path.join(__dirname, '..', 'public', 'version.json');

// 1. Read package.json and increment patch version
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version || '1.1.0';
const versionParts = oldVersion.split('.');
const newVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumpped package.json from ${oldVersion} to ${newVersion}`);

// 2. Update public/version.json
if (fs.existsSync(versionPath)) {
  const vJson = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  vJson.version = newVersion;
  vJson.buildTimestamp = new Date().toISOString();
  fs.writeFileSync(versionPath, JSON.stringify(vJson, null, 2) + '\n');
  console.log(`Updated public/version.json to ${newVersion}`);
}

// 3. Update Service Worker (public/sw.js)
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  // Replace the APP_VERSION variable accurately
  swContent = swContent.replace(/const APP_VERSION = 'v[0-9\.]+';/, `const APP_VERSION = 'v${newVersion}';`);
  swContent = swContent.replace(/const APP_VERSION = "[0-9\.]+";/, `const APP_VERSION = "${newVersion}";`);
  fs.writeFileSync(swPath, swContent);
  console.log(`Updated public/sw.js to APP_VERSION v${newVersion}`);
}
