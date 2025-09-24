module.exports = {
  appId: 'com.sophon.pos',
  productName: 'Sophon',
  directories: {
    output: 'dist/win'
  },
  files: [
    'main.js',
    'package.json',
    'backend/**/*',
    'frontend-dist/**/*'
  ],
  // Ensure backend node_modules are included and accessible
  asarUnpack: [
    'backend/node_modules/**/*'
  ],
  win: {
    target: {
      target: 'portable',
      arch: ['x64']
    }
  }
};