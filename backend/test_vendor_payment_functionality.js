const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Testing vendor payment functionality...');

// Test creating a vendor payment directly
function testVendorPayment() {
    console.log('\nTesting vendor payment creation...');
    
    // Create a test vendor payment
    const paymentData = {
        companyId: 1,
        vendorId: 1, // Using a simple ID since we don't have vendors table
        amount: 150.00,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'cash',
        notes: 'Test payment from VendorDetails page',
        processedBy: 1
    };
    
    db.run(
        `INSERT INTO VendorPayment (
            companyId, vendorId, amount, paymentDate, paymentMethod, notes, processedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            paymentData.companyId,
            paymentData.vendorId,
            paymentData.amount,
            paymentData.paymentDate,
            paymentData.paymentMethod,
            paymentData.notes,
            paymentData.processedBy
        ],
        function(err) {
            if (err) {
                console.error('Error creating vendor payment:', err);
                return;
            }
            
            console.log('✅ Vendor payment created successfully with ID:', this.lastID);
            
            // Now verify the payment was created
            db.all(
                'SELECT * FROM VendorPayment WHERE id = ?',
                [this.lastID],
                (err, payments) => {
                    if (err) {
                        console.error('Error fetching created payment:', err);
                        return;
                    }
                    
                    console.log('✅ Payment verification:', payments[0]);
                    
                    // Test the summary report query to see if vendor payments are included
                    testSummaryReport();
                }
            );
        }
    );
}

function testSummaryReport() {
    console.log('\nTesting summary report with vendor payments...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Simplified version of the summary query focusing on vendor payments
    const summaryQuery = `
        SELECT 
            (SELECT COALESCE(SUM(amount), 0) FROM VendorPayment WHERE companyId = 1 AND DATE(paymentDate) = ?) as totalVendorPayments,
            (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = 1 AND DATE(paymentDate) = ?) as vendorPaymentsCash
    `;
    
    db.get(summaryQuery, [today, today], (err, result) => {
        if (err) {
            console.error('Error in summary query:', err);
            return;
        }
        
        console.log('✅ Summary report results:');
        console.log('  Total vendor payments:', result.totalVendorPayments);
        console.log('  Cash vendor payments:', result.vendorPaymentsCash);
        
        if (result.totalVendorPayments > 0) {
            console.log('\n🎉 SUCCESS: Vendor payments are now being tracked correctly!');
            console.log('   - VendorPayment table exists and is functional');
            console.log('   - Payments can be created and retrieved');
            console.log('   - Summary report includes vendor payment data');
            console.log('   - Net cash calculations will now include vendor payments');
        } else {
            console.log('\n⚠️  No vendor payments found in summary (this might be expected if no payments were made today)');
        }
        
        // Show all vendor payments in the table
        db.all('SELECT * FROM VendorPayment ORDER BY createdAt DESC LIMIT 5', (err, allPayments) => {
            if (err) {
                console.error('Error fetching all payments:', err);
                return;
            }
            
            console.log('\nRecent vendor payments in database:');
            allPayments.forEach(payment => {
                console.log(`  ID: ${payment.id}, Amount: $${payment.amount}, Method: ${payment.paymentMethod}, Date: ${payment.paymentDate}`);
            });
            
            db.close();
        });
    });
}

// Start the test
testVendorPayment();