const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Helper to get company tax settings
const getCompanyTaxSettings = (companyId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT taxRate, taxMode, taxId, tinNumber, taxIdType, parentCompanyId FROM Company WHERE id = ?',
      [companyId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      }
    );
  });
};

// Get Tax Summary (VAT Liability)
router.get('/summary', async (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  try {
    const settings = await getCompanyTaxSettings(companyId);
    const taxRate = settings.taxRate || 0; 
    
    // In Network Model, 'taxMode' is less relevant for aggregation, 
    // but we still use it to identify if we should look for partners.
    // For now, we aggregate sales from ALL 'subsidiary' linked companies where we are the target (Parent).
    
    let companyIdsToAggregate = [companyId];

    // Find all subsidiaries (where we are target and type is subsidiary)
    const childrenQuery = `
      SELECT sourceCompanyId as id 
      FROM CompanyNetwork 
      WHERE targetCompanyId = ? AND relationshipType = 'subsidiary' AND status = 'active'
    `;
    
    const children = await new Promise((resolve, reject) => {
      db.all(childrenQuery, [companyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const childIds = children.map(c => c.id);
    companyIdsToAggregate = [...companyIdsToAggregate, ...childIds];

    // Helper to get sales for a list of companies
    const getSalesForCompanies = async (ids) => {
      if (ids.length === 0) return { totalSales: 0, totalDiscounts: 0 };
      
      const placeholders = ids.map(() => '?').join(',');
      const salesQuery = `
        SELECT 
          SUM(total) as totalSales,
          SUM(discount) as totalDiscounts
        FROM Receipt 
        WHERE companyId IN (${placeholders})
          AND DATE(createdAt) BETWEEN ? AND ?
          AND (flagged = 0 OR flagged IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM Customer c 
            JOIN Company linkedComp ON LOWER(linkedComp.companyName) = LOWER(c.company)
            WHERE c.id = Receipt.customerId
            AND EXISTS (
              SELECT 1 FROM CompanyNetwork cn
              WHERE (cn.sourceCompanyId = Receipt.companyId AND cn.targetCompanyId = linkedComp.id AND cn.status = 'active')
                 OR (cn.sourceCompanyId = linkedComp.id AND cn.targetCompanyId = Receipt.companyId AND cn.status = 'active')
            )
          )
      `;
      
      return new Promise((resolve, reject) => {
        db.get(salesQuery, [...ids, start, end], (err, row) => {
          if (err) reject(err);
          else resolve(row || { totalSales: 0, totalDiscounts: 0 });
        });
      });
    };

    const salesData = await getSalesForCompanies(companyIdsToAggregate);
    const totalSales = salesData.totalSales || 0;
    
    // Calculate VAT using Tax Intelligence Service
    const taxIntelligence = require('../services/taxIntelligenceService');
    // Ensure we use the full dates for the period
    const position = taxIntelligence.calculateNetPosition(start, end);

    const outputVat = position.outputVat;
    const inputVat = position.inputVat;
    const netVatLiability = position.netPayable;

    res.json({
      period: { startDate: start, endDate: end },
      settings: {
        taxRate: taxRate,
        taxMode: settings.taxMode,
        taxId: settings.taxId,
        childCount: childIds.length,
        vatScheme: position.scheme // Return scheme for UI context
      },
      summary: {
        totalSales: totalSales,
        outputVat: parseFloat(outputVat.toFixed(2)),
        inputVat: parseFloat(inputVat.toFixed(2)),
        netLiability: parseFloat(netVatLiability.toFixed(2)),
        reportedByParent: false, 
        parentCompanyId: null 
      }
    });

  } catch (error) {
    console.error('Error calculating tax summary:', error);
    res.status(500).json({ error: 'Failed to calculate tax summary' });
  }
});

// Generate GRA Report Data
router.get('/report/gra', async (req, res) => {
  const { companyId, month, year } = req.query;

  if (!companyId || !month || !year) {
    return res.status(400).json({ error: 'Company ID, month, and year are required' });
  }

  try {
    const settings = await getCompanyTaxSettings(companyId);
    
    // Construct date range for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    // Get last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    // Get Sales Data
    const salesQuery = `
      SELECT 
        SUM(total) as totalSales
      FROM Receipt 
      WHERE companyId = ? 
        AND DATE(createdAt) BETWEEN ? AND ?
        AND (flagged = 0 OR flagged IS NULL)
        AND NOT EXISTS (
            SELECT 1 FROM Customer c 
            JOIN Company linkedComp ON LOWER(linkedComp.companyName) = LOWER(c.company)
            WHERE c.id = Receipt.customerId
            AND EXISTS (
              SELECT 1 FROM CompanyNetwork cn
              WHERE (cn.sourceCompanyId = Receipt.companyId AND cn.targetCompanyId = linkedComp.id AND cn.status = 'active')
                 OR (cn.sourceCompanyId = linkedComp.id AND cn.targetCompanyId = Receipt.companyId AND cn.status = 'active')
            )
          )
    `;

    const salesData = await new Promise((resolve, reject) => {
      db.get(salesQuery, [companyId, startDate, endDate], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const totalSales = salesData.totalSales || 0;
    const taxRate = settings.taxRate || 0;
    const taxableValue = totalSales / (1 + (taxRate / 100));
    const vatAmount = totalSales - taxableValue;

    // GRA Return Structure (Simplified)
    const graReturn = {
      taxpayerName: 'Company Name Placeholder', // Need to fetch name
      tin: settings.tinNumber || settings.taxId,
      period: `${year}-${month}`,
      transactionDetails: {
        totalSalesInclusive: totalSales,
        taxableSales: parseFloat(taxableValue.toFixed(2)),
        vatStandardRate: parseFloat(vatAmount.toFixed(2)),
        vatFlatRate: 0, // If applicable
        covidLevy: 0, // If applicable
        nhil: 0, // If applicable
        getFund: 0 // If applicable
      },
      declaration: {
        date: new Date().toISOString().split('T')[0],
        authorizedBy: 'System Generated'
      }
    };

    res.json(graReturn);

  } catch (error) {
    console.error('Error generating GRA report:', error);
    res.status(500).json({ error: 'Failed to generate GRA report' });
  }
});

// Group Filing for Umbrella Companies
router.post('/filing/group', async (req, res) => {
  const { parentCompanyId, month, year } = req.body;

  if (!parentCompanyId || !month || !year) {
    return res.status(400).json({ error: 'Parent Company ID, month, and year are required' });
  }

  try {
    // 1. Verify Parent Company and get its details
    const parentSettings = await getCompanyTaxSettings(parentCompanyId);
    
    // 2. Find all Agent Companies linked to this Parent (Subsidiaries)
    const agentsQuery = `
      SELECT c.id, c.companyName, c.taxId, c.tinNumber 
      FROM Company c
      JOIN CompanyNetwork cn ON c.id = cn.sourceCompanyId
      WHERE cn.targetCompanyId = ? AND cn.relationshipType = 'subsidiary' AND cn.status = 'active'
    `;
    
    const agents = await new Promise((resolve, reject) => {
      db.all(agentsQuery, [parentCompanyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (agents.length === 0) {
      return res.json({ message: 'No umbrella agents found for this parent company', data: [] });
    }

    // 3. Aggregate Data for each Agent
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    const agentReports = await Promise.all(agents.map(async (agent) => {
      const salesQuery = `
        SELECT SUM(total) as totalSales
        FROM Receipt 
        WHERE companyId = ? 
          AND DATE(createdAt) BETWEEN ? AND ?
          AND (flagged = 0 OR flagged IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM Customer c 
            JOIN Company linkedComp ON LOWER(linkedComp.companyName) = LOWER(c.company)
            WHERE c.id = Receipt.customerId
            AND EXISTS (
              SELECT 1 FROM CompanyNetwork cn
              WHERE (cn.sourceCompanyId = Receipt.companyId AND cn.targetCompanyId = linkedComp.id AND cn.status = 'active')
                 OR (cn.sourceCompanyId = linkedComp.id AND cn.targetCompanyId = Receipt.companyId AND cn.status = 'active')
            )
          )
      `;

      const salesData = await new Promise((resolve, reject) => {
        db.get(salesQuery, [agent.id, startDate, endDate], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const totalSales = salesData.totalSales || 0;
      // Use Parent's tax rate or Agent's? Usually Umbrella implies Parent's rate/filing.
      // Let's assume standard rate applies.
      const taxRate = parentSettings.taxRate || 0; 
      const taxableValue = totalSales / (1 + (taxRate / 100));
      const vatAmount = totalSales - taxableValue;

      return {
        agentId: agent.id,
        agentName: agent.companyName,
        tin: agent.tinNumber || agent.taxId,
        totalSales: totalSales,
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2))
      };
    }));

    // 4. Calculate Group Totals
    const groupTotalSales = agentReports.reduce((sum, r) => sum + r.totalSales, 0);
    const groupTotalVat = agentReports.reduce((sum, r) => sum + r.vatAmount, 0);

    res.json({
      parentCompany: {
        id: parentCompanyId,
        tin: parentSettings.tinNumber || parentSettings.taxId
      },
      period: `${year}-${month}`,
      groupSummary: {
        totalAgents: agents.length,
        totalSales: groupTotalSales,
        totalVatLiability: parseFloat(groupTotalVat.toFixed(2))
      },
      agentDetails: agentReports
    });

  } catch (error) {
    console.error('Error generating group filing report:', error);
    res.status(500).json({ error: 'Failed to generate group filing report' });
  }
});

const taxIntelligence = require('../services/taxIntelligenceService');

// -- Intelligent Tax Assistant Routes --

// Update Tax Configuration
router.post('/config', (req, res) => {
    try {
        const { scheme, threshold, frequency } = req.body;
        const result = taxIntelligence.configureScheme(scheme, threshold, frequency);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get Tax Configuration
router.get('/config', (req, res) => {
    try {
        const config = taxIntelligence.getConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Tax Advice/Alerts
router.get('/advice', (req, res) => {
    try {
        const alerts = taxIntelligence.getAdvice();
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Phase 6: Filing Return
router.get('/filing-return', (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and End dates required' });
    
    try {
        const complianceService = require('../services/taxComplianceService');
        const filingPack = complianceService.generateFilingReturn(start, end);
        res.json(filingPack);
    } catch (error) {
        console.error('Filing Gen Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
