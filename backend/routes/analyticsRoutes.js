const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

router.get('/liability', (req, res) => {
    try {
        const data = analyticsService.getCurrentLiability();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/forecast', (req, res) => {
    try {
        const months = req.query.months ? parseInt(req.query.months) : 3;
        const data = analyticsService.generateForecast(months);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
