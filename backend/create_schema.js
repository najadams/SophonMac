const dbUtils = require('./utils/dbUtils');

console.log('Creating database schema...');

dbUtils.createSchema()
  .then(() => {
    console.log('Schema created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error creating schema:', err);
    process.exit(1);
  });