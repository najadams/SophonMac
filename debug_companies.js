const db = require('./backend/data/db/db');

async function checkCompanies() {
  const companies = db.prepare('SELECT id, companyName FROM Company').all();
  console.log('Companies:', companies);
}

checkCompanies();
