const express = require('express');
const router = express.Router();
const IntelligenceService = require('../services/intelligenceService');

// GET /api/intelligence/trends/:companyId
router.get('/trends/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const trends = await IntelligenceService.getSalesTrends(companyId);
    res.json(trends);
  } catch (error) {
    console.error('API Error: trends', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/intelligence/reorders/:companyId
router.get('/reorders/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { buffer } = req.query; // Optional override
    const suggestions = await IntelligenceService.getReorderSuggestions(companyId, buffer ? parseInt(buffer) : 7);
    res.json(suggestions);
  } catch (error) {
    console.error('API Error: reorders', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/intelligence/product-performance/:companyId
router.get('/product-performance/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const intel = await IntelligenceService.getProductIntelligence(companyId);
    res.json(intel);
  } catch (error) {
    console.error('API Error: product-performance', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/intelligence/anomalies/:companyId
router.get('/anomalies/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const anomalies = await IntelligenceService.detectAnomalies(companyId);
    res.json(anomalies);
  } catch (error) {
    console.error('API Error: anomalies', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/intelligence/forecast/:companyId
router.get('/forecast/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const forecast = await IntelligenceService.getSalesForecast(companyId);
        res.json(forecast);
    } catch (error) {
        console.error('API Error: forecast', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/intelligence/tax/:companyId
router.get('/tax/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const tax = await IntelligenceService.getTaxInsights(companyId);
        res.json(tax);
    } catch (error) {
        console.error('API Error: tax', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/intelligence/pulse/:companyId (Aggregated View)
router.get('/pulse/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        // Execute in parallel for performance
        const [reorders, anomalies, trends, productIntel, tax] = await Promise.all([
            IntelligenceService.getReorderSuggestions(companyId, 3), // Critical only (3 days)
            IntelligenceService.detectAnomalies(companyId),
            IntelligenceService.getSalesTrends(companyId),
            IntelligenceService.getProductIntelligence(companyId),
            IntelligenceService.getTaxInsights(companyId)
        ]);
        
        res.json({
            reordersCount: reorders.length,
            criticalReorders: reorders.filter(r => r.riskLevel === 'critical'),
            anomalies,
            dailyTrend: trends.daily,
            deadStockCount: productIntel.deadStock.length,
            tax
        });
    } catch (error) {
        console.error('API Error: pulse', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
