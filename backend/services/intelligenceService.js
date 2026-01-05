const db = require('../data/db/db');
const { format, subDays, startOfDay, endOfDay, parseISO } = require('date-fns');

const IntelligenceService = {

  // ===========================================================================
  // 1. SALES TRENDS (Period-over-Period)
  // ===========================================================================
  
  async getSalesTrends(companyId) {
    try {
      const today = new Date();
      const yesterday = subDays(today, 1);
      
      // Daily Trend (Today vs Yesterday)
      const todaySales = await this._getSalesSum(companyId, startOfDay(today), endOfDay(today));
      const yesterdaySales = await this._getSalesSum(companyId, startOfDay(yesterday), endOfDay(yesterday));
      
      // Weekly Trend (Last 7 days vs Previous 7 days)
      const last7Start = subDays(today, 7);
      const prev7Start = subDays(today, 14);
      const last7Sales = await this._getSalesSum(companyId, last7Start, today);
      const prev7Sales = await this._getSalesSum(companyId, prev7Start, last7Start);

      // Chart Data (Last 7 Days)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
          const d = subDays(today, i);
          const dayStart = startOfDay(d);
          const dayEnd = endOfDay(d);
          const dailyTotal = await this._getSalesSum(companyId, dayStart, dayEnd);
          chartData.push({
              date: format(d, 'yyyy-MM-dd'),
              day: format(d, 'EEE'), // Mon, Tue...
              sales: dailyTotal
          });
      }

      return {
        daily: {
          period: 'Today vs Yesterday',
          current: todaySales,
          previous: yesterdaySales,
          ...this._calculatePoP(todaySales, yesterdaySales)
        },
        weekly: {
          period: 'Last 7 Days',
          current: last7Sales,
          previous: prev7Sales,
          ...this._calculatePoP(last7Sales, prev7Sales)
        },
        chartData
      };
    } catch (error) {
      console.error('Error calculating sales trends:', error);
      throw error;
    }
  },

  async _getSalesSum(companyId, startDate, endDate) {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    
    // Receipt table has 'createdAt'
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(total) as totalSales FROM Receipt 
             WHERE companyId = ? AND createdAt BETWEEN ? AND ?`,
            [companyId, startStr, endStr],
            (err, row) => {
                if (err) reject(err);
                else resolve(row?.totalSales || 0);
            }
        );
    });
  },

  _calculatePoP(current, previous) {
    let percentChange = 0;
    let status = 'stable'; // growth, decline, stable, new

    if (previous === 0) {
        if (current > 0) {
            percentChange = 100;
            status = 'new_activity';
        } else {
            percentChange = 0;
            status = 'no_activity';
        }
    } else {
        percentChange = ((current - previous) / previous) * 100;
        status = percentChange > 0 ? 'growth' : (percentChange < 0 ? 'decline' : 'stable');
    }

    return {
        percentChange: Number(percentChange.toFixed(1)),
        trend: status
    };
  },

  // ===========================================================================
  // 2. SMART REORDERS (Burn Rate)
  // ===========================================================================

  async getReorderSuggestions(companyId, safetyBufferDays = 7) {
    try {
        // Get all active inventory with >0 stock
        // We perform calc in JS for flexibility or use a complex query. 
        // A SQL approach is faster for "Burn Rate" over 30 days.
        
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
        
        return new Promise((resolve, reject) => {
            db.all(
                `WITH Sales30Days AS (
                    SELECT 
                        rd.inventoryId, 
                        SUM(rd.quantity) as totalSold30d
                    FROM ReceiptDetail rd
                    JOIN Receipt r ON rd.receiptId = r.id
                    WHERE r.companyId = ? 
                      AND r.createdAt >= ?
                    GROUP BY rd.inventoryId
                )
                SELECT 
                    i.id, 
                    i.name, 
                    i.onhand, 
                    i.costPrice,
                    COALESCE(s.totalSold30d, 0) as sold30d
                FROM Inventory i
                LEFT JOIN Sales30Days s ON i.id = s.inventoryId
                WHERE i.companyId = ? AND i.deleted = 0 AND i.onhand > 0`,
                [companyId, thirtyDaysAgo, companyId],
                (err, rows) => {
                    if (err) return reject(err);
                    
                    const suggestions = rows.map(item => {
                        const avgDailySales = item.sold30d / 30;
                        let daysUntilStockout = avgDailySales > 0 ? (item.onhand / avgDailySales) : Infinity;
                        
                        return {
                            id: item.id,
                            name: item.name,
                            onhand: item.onhand,
                            burnRate: Number(avgDailySales.toFixed(2)),
                            daysUntilStockout: daysUntilStockout === Infinity ? 999 : Number(daysUntilStockout.toFixed(1)),
                            riskLevel: this._getRiskLevel(daysUntilStockout, safetyBufferDays)
                        };
                    })
                    .filter(item => item.daysUntilStockout <= safetyBufferDays)
                    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout); // Urgent first

                    resolve(suggestions);
                }
            );
        });
    } catch (error) {
         console.error('Error generating reorder suggestions:', error);
         throw error;
    }
  },
  
  _getRiskLevel(days, buffer) {
      if (days <= 1) return 'critical';
      if (days <= buffer / 2) return 'high';
      if (days <= buffer) return 'medium';
      return 'low';
  },

  // ===========================================================================
  // 3. PRODUCT INTELLIGENCE (Dead Stock & Slow Movers)
  // ===========================================================================

  async getProductIntelligence(companyId) {
      try {
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

        // Dead Stock: No sales in 30 days but stock exists
        const deadStockPromise = new Promise((resolve, reject) => {
             db.all(
                `SELECT 
                    i.id, i.name, i.onhand, i.costPrice, i.updatedAt,
                    (SELECT MAX(r.createdAt) 
                     FROM ReceiptDetail rd 
                     JOIN Receipt r ON rd.receiptId = r.id 
                     WHERE rd.inventoryId = i.id) as lastSaleDate
                 FROM Inventory i
                 WHERE i.companyId = ? 
                   AND i.deleted = 0 
                   AND i.onhand > 0
                   AND i.id NOT IN (
                       SELECT DISTINCT rd.inventoryId 
                       FROM ReceiptDetail rd
                       JOIN Receipt r ON rd.receiptId = r.id
                       WHERE r.companyId = ? AND r.createdAt >= ?
                   )
                 ORDER BY (i.onhand * i.costPrice) DESC
                 LIMIT 20`,
                [companyId, companyId, thirtyDaysAgo],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => {
                        const daysInactive = r.lastSaleDate 
                            ? Math.floor((new Date() - new Date(r.lastSaleDate)) / (1000 * 60 * 60 * 24))
                            : '>30'; // Or Calculate from updatedAt if never sold
                        
                        return {
                            ...r,
                            valueLocked: r.onhand * r.costPrice,
                            daysInactive
                        };
                    }));
                }
             );
        });

        // Slow Movers: < 3 sales/week (approx < 13 sales in 30 days)
        // Can reuse logic similar to reorders but filtering differently
        
        return {
            deadStock: await deadStockPromise
            // Can add slowMovers here in future
        };

      } catch (error) {
          console.error('Error fetching product intelligence:', error);
          throw error;
      }
  },

  // ===========================================================================
  // 4. ANOMALIES (Stock Adjustments)
  // ===========================================================================
  
  async detectAnomalies(companyId) {
      try {
          // Detect unusual spikes in Stock Adjustments (proxies for shrinkage/voids)
          // Baseline: 30 days history
          const today = new Date();
          const thirtyDaysAgo = subDays(today, 30).toISOString();
          const startOfToday = startOfDay(today).toISOString();

          return new Promise((resolve, reject) => {
              db.all(
                `SELECT 
                    date(transactionDate) as day, 
                    COUNT(*) as count 
                 FROM StockTransaction 
                 WHERE inventoryId IN (SELECT id FROM Inventory WHERE companyId = ?)
                   AND type = 'adjustment'
                   AND transactionDate >= ?
                 GROUP BY date(transactionDate)`,
                 [companyId, thirtyDaysAgo],
                 (err, rows) => {
                     if (err) return reject(err);
                     
                     // Separate today from history
                     const todayStr = startOfToday.split('T')[0];
                     const todayCount = rows.find(r => r.day === todayStr)?.count || 0;
                     
                     const history = rows.filter(r => r.day !== todayStr);
                     
                     if (history.length < 5) return resolve([]); // Not enough data for baseline
                     
                     // Stats
                     const counts = history.map(r => r.count);
                     const sum = counts.reduce((a, b) => a + b, 0);
                     const mean = sum / counts.length;
                     const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
                     const stdDev = Math.sqrt(variance);
                     
                     const threshold = mean + (2 * stdDev); // 2-sigma rule
                     
                     const anomalies = [];
                     
                     if (todayCount > threshold && todayCount > 2) { // Minimum 3 to be distinct
                         anomalies.push({
                             type: 'spike_adjustments',
                             severity: 'medium',
                             message: `Unusual inventory adjustments today (${todayCount}). Avg: ${mean.toFixed(1)}`,
                             value: todayCount,
                             baseline: mean.toFixed(1)
                         });
                     }
                     
                     resolve(anomalies);
                 }
              );
          });
      } catch (error) {
          console.error('Error detecting anomalies:', error);
          throw error;
      }
  }
  // ===========================================================================
  // 5. SALES FORECASTING (Linear Regression)
  // ===========================================================================

  async getSalesForecast(companyId) {
      try {
          // Get monthly sales for the last 12 months
          const today = new Date();
          const twelveMonthsAgo = subDays(today, 365).toISOString();

          return new Promise((resolve, reject) => {
              db.all(
                  `SELECT 
                      strftime('%Y-%m', createdAt) as month,
                      SUM(total) as total
                   FROM Receipt
                   WHERE companyId = ? AND createdAt >= ?
                   GROUP BY strftime('%Y-%m', createdAt)
                   ORDER BY month ASC`,
                  [companyId, twelveMonthsAgo],
                  (err, rows) => {
                      if (err) return reject(err);

                      const actualData = rows.map(r => ({
                          name: format(parseISO(r.month + '-01'), 'MMM'),
                          fullDate: r.month,
                          actual: r.total,
                          projected: null
                      }));

                      // Linear Regression Calculation
                      // x = month index (0, 1, 2...), y = sales
                      const n = rows.length;
                      if (n < 2) {
                          // Not enough data for regression, return actuals only
                          return resolve(actualData);
                      }

                      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                      rows.forEach((row, i) => {
                          sumX += i;
                          sumY += row.total;
                          sumXY += i * row.total;
                          sumXX += i * i;
                      });

                      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                      const intercept = (sumY - slope * sumX) / n;

                      // Generate Forecast for next 6 months
                      const forecastData = [];
                      for (let i = 1; i <= 6; i++) {
                          const nextMonthDate = new Date();
                          nextMonthDate.setMonth(today.getMonth() + i);
                          
                          const x = n - 1 + i; // Continue x index
                          const y = slope * x + intercept;

                          forecastData.push({
                              name: format(nextMonthDate, 'MMM'),
                              actual: null,
                              projected: Math.max(0, parseFloat(y.toFixed(2))) // No negative sales
                          });
                      }

                      resolve([...actualData, ...forecastData]);
                  }
              );
          });
      } catch (error) {
          console.error('Error calculating sales forecast:', error);
          throw error;
      }
  },

  // ===========================================================================
  // 6. TAX INTELLIGENCE (Liability Estimation)
  // ===========================================================================

  async getTaxInsights(companyId) {
      try {
          const db = require('../data/db/db');
          
          // Get Tax Config to know frequency
          const config = await new Promise((resolve) => {
              db.get("SELECT * FROM TaxConfig LIMIT 1", (err, row) => resolve(row));
          });

          // Determine current tax period based on filing frequency
          // Default to monthly if not set
          const frequency = config?.filingFrequency || 'monthly';
          const today = new Date();
          let startDate, endDate;

          if (frequency === 'quarterly') {
               const quarter = Math.floor((today.getMonth() + 3) / 3);
               startDate = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
               endDate = new Date(today.getFullYear(), quarter * 3, 0); // Last day of quarter
          } else {
               // Monthly
               startDate = new Date(today.getFullYear(), today.getMonth(), 1);
               endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          }

          // Calculate Output VAT (from Sales)
          // Assuming tax is stored in Receipt or we calculate 15% flat for MVP if not explicit
          // Better: Use Receipt.taxAmount if it exists, or Receipt.total * 0.1304 (if 15% inclusive)
          // For this implementation, we sum 'tax' column if it exists in Receipt, otherwise 0
          
          const outputVat = await new Promise((resolve) => {
              db.get(
                  `SELECT SUM(tax) as totalTax FROM Receipt 
                   WHERE companyId = ? AND createdAt BETWEEN ? AND ?`,
                  [companyId, startDate.toISOString(), endDate.toISOString()],
                  (err, row) => resolve(row?.totalTax || 0)
              );
          });

          // Calculate Input VAT (from Purchases)
          const inputVat = await new Promise((resolve) => {
              // Purchases table needs vatAmount column (added in migration)
              db.get(
                  `SELECT SUM(vatAmount) as totalInputTax FROM Purchases 
                   WHERE companyId = ? AND purchaseDate BETWEEN ? AND ?`,
                  [companyId, startDate.toISOString(), endDate.toISOString()],
                  (err, row) => resolve(row?.totalInputTax || 0)
              );
          });

          const liability = outputVat - inputVat;
          
          // Next filing due date: 15th of next month (standard)
          const nextFilingDate = new Date(endDate);
          nextFilingDate.setDate(15);
          nextFilingDate.setMonth(nextFilingDate.getMonth() + 1);

          return {
              period: frequency === 'quarterly' ? 'Quarter To Date' : 'Month To Date',
              startDate: format(startDate, 'yyyy-MM-dd'),
              endDate: format(endDate, 'yyyy-MM-dd'),
              outputVat: Number(outputVat.toFixed(2)),
              inputVat: Number(inputVat.toFixed(2)),
              estimatedLiability: Number(liability.toFixed(2)),
              nextFilingDeadline: format(nextFilingDate, 'yyyy-MM-dd'),
              status: liability > 0 ? 'payable' : 'refundable'
          };

      } catch (error) {
          console.error('Error fetching tax insights:', error);
          throw error;
      }
  }
};

module.exports = IntelligenceService;
