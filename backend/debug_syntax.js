const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');

fs.readdir(routesDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(routesDir, file);
      try {
        require(filePath);
        console.log(`[PASS] ${file}`);
      } catch (error) {
        console.error(`[FAIL] ${file}: ${error.message}`);
      }
    }
  });
});
