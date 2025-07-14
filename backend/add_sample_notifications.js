const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding sample notifications...');

// Sample notifications data
const sampleNotifications = [
    {
        companyId: 1,
        message: 'Low stock alert: Product inventory is running low for several items.',
        status: 'unread'
    },
    {
        companyId: 1,
        message: 'New vendor payment of $150.00 has been processed successfully.',
        status: 'unread'
    },
    {
        companyId: 1,
        message: 'Monthly sales report is now available for review.',
        status: 'read'
    },
    {
        companyId: 1,
        message: 'System maintenance scheduled for this weekend.',
        status: 'unread'
    },
    {
        companyId: 1,
        message: 'New customer registration: John Smith has been added to the system.',
        status: 'read'
    },
    {
        companyId: 1,
        message: 'Debt payment reminder: Outstanding balance of $500.00 from Customer ABC.',
        status: 'unread'
    },
    {
        companyId: 1,
        message: 'Inventory restock completed: 50 units added to warehouse.',
        status: 'read'
    },
    {
        companyId: 1,
        message: 'Price update: Several product prices have been adjusted.',
        status: 'unread'
    }
];

// Function to insert notifications
function insertNotifications() {
    const insertQuery = `
        INSERT INTO Notification (companyId, message, status, createdAt, updatedAt)
        VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'), datetime('now', '-' || ? || ' hours'))
    `;
    
    let completed = 0;
    
    sampleNotifications.forEach((notification, index) => {
        // Add some time variation to make notifications appear at different times
        const hoursAgo = index * 2; // Each notification 2 hours apart
        
        db.run(insertQuery, [
            notification.companyId,
            notification.message,
            notification.status,
            hoursAgo,
            hoursAgo
        ], function(err) {
            if (err) {
                console.error('Error inserting notification:', err);
                return;
            }
            
            console.log(`✅ Notification ${index + 1} created with ID: ${this.lastID}`);
            completed++;
            
            if (completed === sampleNotifications.length) {
                console.log('\n🎉 All sample notifications have been added successfully!');
                
                // Verify the notifications were created
                db.all(
                    'SELECT COUNT(*) as count FROM Notification WHERE companyId = 1',
                    (err, result) => {
                        if (err) {
                            console.error('Error counting notifications:', err);
                        } else {
                            console.log(`Total notifications in database: ${result[0].count}`);
                        }
                        
                        db.close();
                    }
                );
            }
        });
    });
}

// Check if Notification table exists first
db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Notification'",
    (err, table) => {
        if (err) {
            console.error('Error checking for Notification table:', err);
            db.close();
            return;
        }
        
        if (!table) {
            console.log('❌ Notification table does not exist. Please run the schema creation first.');
            db.close();
            return;
        }
        
        console.log('✅ Notification table found. Adding sample data...');
        insertNotifications();
    }
);