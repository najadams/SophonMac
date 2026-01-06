
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const fullPath = path.join(routesDir, file);
    try {
      require(fullPath);
      console.log(`✅ ${file} loaded successfully`);
    } catch (e) {
      console.error(`❌ ${file} FAILED to load:`);
      console.error(e.message);
      //console.error(e.stack);
    }
  }
});
