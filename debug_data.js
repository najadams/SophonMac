const db = require('./backend/data/db/db');

async function checkData() {
  const companies = db.prepare('SELECT id, companyName FROM Company').all();
  console.log('Companies:', companies);
  
  const workers = db.prepare('SELECT id, name, companyId FROM Worker').all();
  console.log('Workers:', workers);
}

checkData();
