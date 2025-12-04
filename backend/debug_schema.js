const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'test_schema_debug.sqlite');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
const schemaPath = path.join(__dirname, 'data/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split by semicolon, but be careful about triggers or other blocks
// For simple schema, splitting by ";\n" or just ";" might work if we are careful
const statements = schema.split(';');

let successCount = 0;
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (!stmt) continue;

  try {
    db.exec(stmt);
    successCount++;
  } catch (error) {
    console.error(`Error executing statement #${i + 1}:`);
    console.error(stmt);
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log(`Successfully executed ${successCount} statements.`);
db.close();
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}
