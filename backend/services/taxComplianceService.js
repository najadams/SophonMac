const db = require('../data/db/db');
const taxIntelligence = require('./taxIntelligenceService');

class TaxComplianceService {
    
    /**
     * Generate Filing Return (GRA Format)
     * @param {string} startDate YYYY-MM-DD
     * @param {string} endDate YYYY-MM-DD
     */
    generateFilingReturn(startDate, endDate) {
        // 1. Get Net Position (Summary)
        const position = taxIntelligence.calculateNetPosition(startDate, endDate);
        
        // 2. Get Detailed Sales (Output Schedules)
        const sales = db.prepare(`
            SELECT 
                id, 
                createdAt as date, 
                totalAmount, 
                vatAmount, 
                'Standard' as type -- Simplification, ideally from line items
            FROM 'Transaction'
            WHERE status = 'completed' AND createdAt BETWEEN ? AND ?
        `).all(startDate, endDate);

        // 3. Get Detailed Purchases (Input Schedules)
        // Note: Only if standard scheme
        let purchases = [];
        if (position.scheme === 'standard_15') {
            try {
                purchases = db.prepare(`
                    SELECT 
                        id, 
                        createdAt as date, 
                        supplierName,
                        supplierTin,
                        totalAmount, 
                        vatAmount
                    FROM Purchases
                    WHERE createdAt BETWEEN ? AND ?
                `).all(startDate, endDate);
            } catch (e) {
                console.warn('Purchases table query failed', e);
            }
        }

        return {
            meta: {
                generatedAt: new Date().toISOString(),
                periodStart: startDate,
                periodEnd: endDate,
                scheme: position.scheme,
                currency: position.currency
            },
            summary: {
                totalRevenue: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
                totalOutputVat: position.outputVat,
                totalInputVat: position.inputVat,
                netPayable: position.netPayable
            },
            schedules: {
                sales: sales.map(s => ({
                    invoiceNo: s.id,
                    date: s.date,
                    value: s.totalAmount,
                    vat: s.vatAmount
                })),
                purchases: purchases.map(p => ({
                    supplier: p.supplierName || 'Unknown',
                    tin: p.supplierTin || 'N/A',
                    date: p.date,
                    value: p.totalAmount,
                    vat: p.vatAmount
                }))
            }
        };
    }

    /**
     * Validate a Supplier TIN (Ghana Format check)
     * Format: P0000000000 (P + 10 digits) or C...
     */
    validateSupplierTIN(tin) {
        if (!tin) return { valid: false, reason: 'Missing TIN' };
        // Basic Regex for Ghana TIN (P/C/G/V + 10 digits? roughly)
        // Usually P + 12 digits now with Ghana Card, typically 11-15 chars.
        // Let's implement a dummy check: Must be alphanumeric, length > 8.
        const tinRegex = /^[A-Z0-9-]{9,15}$/i;
        if (!tinRegex.test(tin)) {
            return { valid: false, reason: 'Invalid Format' };
        }
        return { valid: true };
    }
}

module.exports = new TaxComplianceService();
