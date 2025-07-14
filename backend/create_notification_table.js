const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Creating Notification table...');

// Create Notification table
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Notification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyId INTEGER NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
    )
`;

db.run(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating Notification table:', err);
        db.close();
        return;
    }
    
    console.log('✅ Notification table created successfully!');
    
    // Create index for better performance
    const createIndexQuery = `
        CREATE INDEX IF NOT EXISTS idx_notification_company 
        ON Notification(companyId, createdAt DESC)
    `;
    
    db.run(createIndexQuery, (err) => {
        if (err) {
            console.error('Error creating index:', err);
        } else {
            console.log('✅ Index created successfully!');
        }
        
        // Verify table creation
        db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Notification'",
            (err, table) => {
                if (err) {
                    console.error('Error verifying table:', err);
                } else if (table) {
                    console.log('✅ Notification table verified in database');
                } else {
                    console.log('❌ Notification table not found after creation');
                }
                
                db.close();
            }
        );
    });
});