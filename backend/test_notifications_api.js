const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, 'database.db');

console.log('Testing notifications API...');

// First, let's check if notifications exist in the database
function checkDatabase() {
    const db = new sqlite3.Database(dbPath);
    
    db.all('SELECT * FROM Notification WHERE companyId = 1 ORDER BY createdAt DESC', (err, notifications) => {
        if (err) {
            console.error('Error fetching notifications from database:', err);
            return;
        }
        
        console.log(`Found ${notifications.length} notifications in database:`);
        notifications.forEach((notif, index) => {
            console.log(`  ${index + 1}. [${notif.status}] ${notif.message}`);
            console.log(`     Created: ${notif.createdAt}`);
        });
        
        db.close();
        
        // Now test the API endpoint
        testAPI();
    });
}

// Test the API endpoint
function testAPI() {
    console.log('\nTesting API endpoint...');
    
    // Test if we can reach the API
    axios.get('http://localhost:3003/api/notifications/1')
        .then(response => {
            console.log('✅ API endpoint is working!');
            console.log('Response data:', response.data);
            
            if (Array.isArray(response.data)) {
                console.log(`✅ Received ${response.data.length} notifications from API`);
                response.data.forEach((notif, index) => {
                    console.log(`  ${index + 1}. [${notif.status}] ${notif.message}`);
                });
            } else {
                console.log('⚠️  Response is not an array:', response.data);
            }
        })
        .catch(error => {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ Cannot connect to server. Make sure the backend is running on port 3003.');
            } else {
                console.error('❌ API Error:', error.message);
            }
        });
}

// Start the test
checkDatabase();