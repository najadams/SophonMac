const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Checking database schema...');

// Check what tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
  } else {
    console.log('Available tables:');
    tables.forEach(table => console.log('- ' + table.name));
    
    // Check if VendorPayment table exists
    const vendorPaymentExists = tables.some(table => table.name === 'VendorPayment');
    
    if (vendorPaymentExists) {
      console.log('\nVendorPayment table exists. Checking recent records...');
      db.all('SELECT * FROM VendorPayment ORDER BY id DESC LIMIT 5', (err, rows) => {
        if (err) {
          console.error('Error querying VendorPayment:', err);
        } else {
          console.log('Recent VendorPayment records:');
          console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
      });
    } else {
      console.log('\nVendorPayment table does NOT exist!');
      console.log('This explains why vendor payments are not showing in the summary report.');
      
      // Check if there's a similar table
      const similarTables = tables.filter(table => 
        table.name.toLowerCase().includes('vendor') || 
        table.name.toLowerCase().includes('payment')
      );
      
      if (similarTables.length > 0) {
        console.log('\nSimilar tables found:');
        similarTables.forEach(table => console.log('- ' + table.name));
      }
      
      db.close();
    }
  }
});