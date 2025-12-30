const db = require('../data/db/db');

class AnalyticsService {
    constructor() {}

    /**
     * Get current VAT liability (Collected - Paid)
     * @returns {Object} { totalCollected, totalPaid, netLiability }
     */
    getCurrentLiability() {
        // Mock query for now, assuming standard Transaction/Purchase tables
        // Real implementation requires robust schema knowledge of tax fields
        // defaulting to simple aggregation if fields exist, or 0
        try {
            const result = db.prepare(`
                SELECT 
                    SUM(vatAmount) as totalCollected
                FROM 'Transaction'
                WHERE status = 'completed'
            `).get();

            // We don't strictly track input VAT in a standardized way yet in this simplified schema
            // So we'll assume 0 input tax for this iteration unless we add it
            const totalCollected = result.totalCollected || 0;
            const totalPaid = 0; 
            
            return {
                totalCollected,
                totalPaid,
                netLiability: totalCollected - totalPaid
            };
        } catch (e) {
            console.error('Error fetching liability:', e);
            return { totalCollected: 0, totalPaid: 0, netLiability: 0 };
        }
    }

    /**
     * Get monthly sales history for the last N months
     * @param {number} months - Number of months to look back
     */
    getSalesHistory(months = 6) {
        try {
            // Group by YYYY-MM
            const history = db.prepare(`
                SELECT 
                    strftime('%Y-%m', createdAt) as month,
                    SUM(totalAmount) as totalSales,
                    SUM(vatAmount) as totalTax
                FROM 'Transaction'
                WHERE status = 'completed' 
                  AND createdAt >= date('now', '-' || ? || ' months')
                GROUP BY month
                ORDER BY month ASC
            `).all(months);

            return history;
        } catch (e) {
            console.error('Error fetching sales history:', e);
            return [];
        }
    }

    /**
     * Generate VAT liability forecast using Linear Regression
     * @param {number} monthsAhead - How many months to predict
     */
    generateForecast(monthsAhead = 3) {
        const history = this.getSalesHistory(12); // Use last 12 months for trend
        if (history.length < 2) {
            return { available: false, reason: 'Insufficient data' };
        }

        // Prepare data for regression (x = month index, y = tax amount)
        const xValues = history.map((_, i) => i);
        const yValues = history.map(h => h.totalTax || 0);

        const { slope, intercept } = this._calculateLinearRegression(xValues, yValues);

        const forecast = [];
        const lastIndex = xValues.length - 1;

        for (let i = 1; i <= monthsAhead; i++) {
            const nextIndex = lastIndex + i;
            const predictedTax = (slope * nextIndex) + intercept;
            forecast.push({
                monthOffset: i,
                predictedLiability: Math.max(0, predictedTax) // No negative tax
            });
        }

        return {
            available: true,
            model: { slope, intercept },
            forecast
        };
    }

    /**
     * Calculate Linear Regression (Least Squares)
     * y = mx + b
     */
    _calculateLinearRegression(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }
}

module.exports = new AnalyticsService();
