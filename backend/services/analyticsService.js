const db = require('../data/db/db');

class AnalyticsService {
    constructor() {}

    /**
     * Get current VAT liability (Collected - Paid)
     * @returns {Object} { totalCollected, totalPaid, netLiability }
     */
    getCurrentLiability() {
        try {
            // Get Dates (Current Month)
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

            // enhanced logic using TaxIntelligence
            const taxIntelligence = require('./taxIntelligenceService');
            const position = taxIntelligence.calculateNetPosition(firstDay, lastDay);

            return {
                totalCollected: position.outputVat,
                totalPaid: position.inputVat,
                netLiability: position.netPayable,
                scheme: position.scheme
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
     * Generate Cash Flow Forecast (Real Profit = Revenue - Expense - VAT)
     * @param {number} monthsAhead 
     */
    generateCashFlowForecast(monthsAhead = 3) {
        // Logic: 
        // 1. Get historical Sales (Revenue)
        // 2. Get historical Purchases (Expenses) - NOT YET FULLY TRACKED SEPARATELY IN SIMPLE HISTORY, constructing from Purchasing table if possible or estimating.
        // For MVP Phase 5, we might estimate Expense ratio if full history isn't perfect, but we have `Purchases` table.
        
        // We will assume "Net Profit" history = Total Sales - Total Purchases - Net VAT.
        // This requires a more complex query than `getSalesHistory`.
        
        try {
            const history = db.prepare(`
                SELECT 
                    strftime('%Y-%m', T.createdAt) as month,
                    SUM(T.totalAmount) as revenue,
                    (SELECT SUM(P.totalAmount) FROM Purchases P WHERE strftime('%Y-%m', P.createdAt) = strftime('%Y-%m', T.createdAt)) as expenses,
                    SUM(T.vatAmount) as outputVat,
                     (SELECT SUM(P.vatAmount) FROM Purchases P WHERE strftime('%Y-%m', P.createdAt) = strftime('%Y-%m', T.createdAt)) as inputVat
                FROM 'Transaction' T
                WHERE T.status = 'completed' 
                  AND T.createdAt >= date('now', '-12 months')
                GROUP BY month
                ORDER BY month ASC
            `).all();

            // Calculate "Real Cash Flow" per month
            // Real Cash = Revenue - (Expenses (inc VAT) ? No, Purchases table usually tracks total. 
            // If registered for VAT: 
            // Cash In = Revenue (inc VAT)
            // Cash Out = Expenses (inc VAT) + Pay VAT Bill (Output - Input)
            // Actually, simplified: Real Profit = Revenue (ex VAT) - Expenses (ex VAT). 
            // The User wants "Cash Flow after VAT". 
            // Let's stick to the prompt: "Real Profit after VAT".
            // We'll calculate: (Revenue - OutputVAT) - (Expenses - InputVAT). 
            // Wait, if VAT is passthrough, then Real Profit IS just net income.
            // But the user perception is "What is mine?". 
            // "Mine" = (Total Sales - VAT Payable) - Total Expenses.
            
            const dataPoints = history.map(h => {
                const revenue = h.revenue || 0;
                const expenses = h.expenses || 0;
                const outputVat = h.outputVat || 0;
                const inputVat = h.inputVat || 0;
                
                // Net VAT Payable for that month (approximate for modeling)
                const netVat = Math.max(0, outputVat - inputVat);
                
                // Real Cash "Keepable"
                // If I collected 100 (incl 15 tax), I have 100 cash.
                // I pay 50 expenses (incl 5 tax). I have 50 cash.
                // I owe 10 tax (15-5). I pay 10.
                // Final Cash = 40.
                // Formula: Revenue - Expenses - NetVAT.
                const realCash = revenue - expenses - netVat;
                
                return {
                    month: h.month,
                    value: realCash
                };
            });

            // Project future
            const xValues = dataPoints.map((_, i) => i);
            const yValues = dataPoints.map(d => d.value);
            
            if (xValues.length < 2) return { available: false, reason: 'Insufficient data' };

            const { slope, intercept } = this._calculateLinearRegression(xValues, yValues);
            
            const forecast = [];
            const lastIndex = xValues.length - 1;
            for(let i=1; i<=monthsAhead; i++) {
                const predicted = (slope * (lastIndex + i)) + intercept;
                forecast.push({
                    monthOffset: i,
                    predictedCash: predicted
                });
            }

            return { available: true, history: dataPoints, forecast };

        } catch(e) {
            console.error('CashFlow Forecast Error:', e);
            return { available: false, error: e.message };
        }
    }

    /**
     * Get Daily VAT Reserve Recommendation
     * "How much should I set aside today?"
     */
    getReserveRecommendation() {
        const liability = this.getCurrentLiability();
        if (liability.netLiability <= 0) return { amount: 0, message: "No VAT liability currently." };

        // Days remaining in month
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(1, lastDay - now.getDate() + 15); // +15 for filing deadline buffer? User said "Safe".
        
        // Simple logic: Outstanding Liability / Days left until filing
        // Filing is 15th of next month?
        // Let's assume we want to cover the CURRENT liability by the end of the month to be safe.
        // Or strictly: (Projected Month End Liability) / Days Remaining.
        // For MVP, lets just use Current / Days Left in MOnth.
        
        const daysLeftInMonth = Math.max(1, lastDay - now.getDate());
        const dailySave = liability.netLiability / daysLeftInMonth;
        
        return {
            amount: Math.ceil(dailySave),
            currency: 'GHS',
            message: `Save ${Math.ceil(dailySave)} GHS/day to cover your current bill.`
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
        
        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return { slope: 0, intercept: sumY / n }; // Flat line if x is static (shouldn't happen with time)

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }
}

module.exports = new AnalyticsService();
