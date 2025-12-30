const db = require('../data/db/db');

class TaxIntelligenceService {
    constructor() {
        this.SCHEMES = {
            STANDARD: 'standard_15',
            FLAT: 'flat_4',
            EXEMPT: 'exempt'
        };
        // Default thresholds (e.g., 200,000 GHS turnover for VAT registration)
        this.REGISTRATION_THRESHOLD = 200000; 
    }

    /**
     * Configure the VAT Scheme
     * @param {string} scheme - 'standard_15', 'flat_4', 'exempt'
     * @param {number} threshold - Turnover threshold for alerts
     * @param {string} frequency - 'monthly', 'quarterly'
     */
    configureScheme(scheme, threshold = 200000, frequency = 'monthly') {
        if (!Object.values(this.SCHEMES).includes(scheme)) {
            throw new Error('Invalid VAT Scheme');
        }

        const id = 'global_config'; // Single config for now
        db.prepare(`
            INSERT INTO TaxConfig (id, vatScheme, turnoverThreshold, filingFrequency, updatedAt)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                vatScheme = excluded.vatScheme,
                turnoverThreshold = excluded.turnoverThreshold,
                filingFrequency = excluded.filingFrequency,
                updatedAt = CURRENT_TIMESTAMP
        `).run(id, scheme, threshold, frequency);

        console.log(`VAT Scheme configured: ${scheme}`);
        return { success: true };
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return db.prepare(`SELECT * FROM TaxConfig WHERE id = 'global_config'`).get() || {
            vatScheme: this.SCHEMES.STANDARD,
            turnoverThreshold: this.REGISTRATION_THRESHOLD,
            filingFrequency: 'monthly'
        };
    }

    /**
     * Calculate Net VAT Position (Output - Input)
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     */
    calculateNetPosition(startDate, endDate) {
        const config = this.getConfig();

        // 1. Output VAT (Sales)
        const salesResult = db.prepare(`
            SELECT SUM(vatAmount) as outputVat, SUM(totalAmount) as totalRevenue
            FROM 'Transaction'
            WHERE status = 'completed' AND createdAt BETWEEN ? AND ?
        `).get(startDate, endDate);

        let outputVat = salesResult.outputVat || 0;
        const totalRevenue = salesResult.totalRevenue || 0;

        // 2. Input VAT (Purchases/Expenses)
        // Only applicable for Standard Rate (15%)
        let inputVat = 0;
        if (config.vatScheme === this.SCHEMES.STANDARD) {
             // 2. Input VAT (Purchases)
             try {
                const purchaseResult = db.prepare(`
                    SELECT SUM(vatAmount) as inputVat
                    FROM Purchases
                    WHERE createdAt BETWEEN ? AND ?
                `).get(startDate, endDate);
                inputVat = purchaseResult.inputVat || 0;
             } catch (e) {
                 console.warn('Could not query Input VAT from Purchases table:', e.message);
             }
        }

        const netPayable = Math.max(0, outputVat - inputVat);
        const realProfit = totalRevenue - netPayable; // Simplified: Revenue - VAT Liability (ignoring cost of goods for this specific metric)

        return {
            scheme: config.vatScheme,
            outputVat,
            inputVat: config.vatScheme === this.SCHEMES.STANDARD ? inputVat : 0, // Flat rate cannot claim input tax
            netPayable,
            realProfit,
            currency: 'GHS'
        };
    }

    /**
     * Get Intelligent Advice/Alerts
     */
    getAdvice() {
        const config = this.getConfig();
        const alerts = [];

        // 1. Threshold Check
        // Get YTD Turnover
        const currentYear = new Date().getFullYear();
        const ytdSales = db.prepare(`
            SELECT SUM(totalAmount) as total
            FROM 'Transaction'
            WHERE status = 'completed' AND strftime('%Y', createdAt) = ?
        `).get(String(currentYear)).total || 0;

        if (ytdSales > config.turnoverThreshold) {
             alerts.push({
                 type: 'warning',
                 code: 'THRESHOLD_EXCEEDED',
                 message: `You have crossed the VAT registration threshold (${config.turnoverThreshold}). Ensure you are registered.`
             });
        } else if (ytdSales > config.turnoverThreshold * 0.9) {
            alerts.push({
                type: 'info',
                code: 'THRESHOLD_APPROACHING',
                message: `You are approaching the VAT registration threshold (${Math.round(ytdSales)} / ${config.turnoverThreshold}).`
            });
        }

        // 2. Filing Deadline (Simplified: 15th of next month)
        const today = new Date();
        const dayOfMonth = today.getDate();
        if (dayOfMonth > 10 && dayOfMonth < 15) {
             alerts.push({
                 type: 'urgent',
                 code: 'FILING_DUE',
                 message: `VAT Filing is due on the 15th (${15 - dayOfMonth} days left).`
             });
        }

        return alerts;
    }
}

module.exports = new TaxIntelligenceService();
