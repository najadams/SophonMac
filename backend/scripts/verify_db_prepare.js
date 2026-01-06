const db = require('../data/db/db');
console.log('DB object:', db);
console.log('DB type:', typeof db);

try {
    console.log('Checking db.prepare...');
    if (typeof db.prepare === 'function') {
        console.log('SUCCESS: db.prepare is a function');
        // Try to prepare dummy statement
        try {
            const stmt = db.prepare('SELECT 1');
            console.log('SUCCESS: db.prepare("SELECT 1") returned stmt');
        } catch (e) {
            console.log('WARNING: db.prepare threw (expected if DB file locked or invalid):', e.message);
        }
    } else {
        console.error('FAILED: db.prepare is NOT a function. type:', typeof db.prepare);
        // Dump keys
        console.log('Keys:', Object.keys(db)); // Proxy keys might not show
        
        // Force init
        console.log('Forcing access to get keys...');
        db.get; // Access random prop to trigger init
        // But keys on Proxy targeting {} are empty unless trap ownsKeys defined?
        // db.js shim is returned by get trap. 
        // We can't easily inspect the shim through the proxy unless we modify db.js or just use it.
    }
} catch (e) {
    console.error('ERROR during verification:', e);
}
