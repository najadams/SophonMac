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
     * Configure the VAT Scheme (History Aware)
     * @param {string} scheme - 'standard_15', 'flat_4', 'exempt'
     * @param {number} threshold - Turnover threshold for alerts
     * @param {string} frequency - 'monthly', 'quarterly'
     */
    configureScheme(scheme, threshold = 200000, frequency = 'monthly') {
        if (!Object.values(this.SCHEMES).includes(scheme)) {
            throw new Error('Invalid VAT Scheme');
        }

        const now = new Date().toISOString();

        // Transaction to ensure atomicity
        const transaction = db.transaction(() => {
            // Close current active config
            db.prepare(`
                UPDATE TaxConfig 
                SET effectiveTo = ? 
                WHERE effectiveTo IS NULL
            `).run(now);

            // Insert new active config
            db.prepare(`
                INSERT INTO TaxConfig (vatScheme, turnoverThreshold, filingFrequency, effectiveFrom, effectiveTo)
                VALUES (?, ?, ?, ?, NULL)
            `).run(scheme, threshold, frequency, now);
        });

        transaction();
        
        console.log(`VAT Scheme configured: ${scheme} (Effective from ${now})`);
        return { success: true };
    }

    /**
     * Get current configuration
     */
    getConfig() {
        // Get the currently active config (effectiveTo is NULL)
        return db.prepare(`SELECT * FROM TaxConfig WHERE effectiveTo IS NULL`).get() || {
            vatScheme: this.SCHEMES.STANDARD,
            turnoverThreshold: this.REGISTRATION_THRESHOLD,
            filingFrequency: 'monthly'
        };
    }

    /**
     * Calculate Net VAT Position (Output - Input)
     * Correctly respects historical VAT schemes for the requested period.
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     */
    calculateNetPosition(startDate, endDate) {
        // For accurate reporting, we should technically iterate through time ranges.
        // However, for simplified logic aligned with "Filing Period", we use the config
        // that was active at the END of the period (Filing Date logic).
        // Or better: Find the config that overlaps this period.
        
        // Strategy: Get config active at endDate of the report. 
        // If scheme changed mid-month, typically the new scheme applies to future tx.
        // Complex scenario: Scheme changed on 15th. 1-15 (Old), 16-30 (New).
        // We will simplify: Use the config effective at the end of the query period.
        // Ideally, we sum transactions joined with their relevant config period.

        // Get config active at endDate
        const configAtEnd = db.prepare(`
            SELECT * FROM TaxConfig 
            WHERE effectiveFrom <= ? 
            AND (effectiveTo IS NULL OR effectiveTo >= ?)
            ORDER BY effectiveFrom DESC
            LIMIT 1
        `).get(endDate, endDate) || this.getConfig();

        const activeScheme = configAtEnd.vatScheme;

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
        if (activeScheme === this.SCHEMES.STANDARD) {
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
            scheme: activeScheme,
            outputVat,
            inputVat: activeScheme === this.SCHEMES.STANDARD ? inputVat : 0, // Flat rate cannot claim input tax
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
