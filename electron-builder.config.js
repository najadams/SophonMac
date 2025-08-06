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
  win: {
    target: {
      target: 'portable',
      arch: ['x64']
    }
  }
};