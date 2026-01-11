require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to get config from env, fallback to hardcoded (which might be stale)
const dbConfig = {
  host: process.env.SUPABASE_DB_HOST || 'db.yiifjyyzlowotznjfawm.supabase.co',
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'jobduh-3Nurve-qohsiw',
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected!');

    const migrationPath = path.join(__dirname, 'migrations', 'add_debt_payment_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

applyMigration();
