const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/taxRates.json');

// Helper to read data
const readTaxData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading tax data:", error);
        return {};
    }
};

// GET /api/tax-settings/countries
router.get('/countries', (req, res) => {
    try {
        const data = readTaxData();
        const countries = Object.keys(data).map(code => ({
            code,
            name: data[code].name,
            currency: data[code].currency
        }));
        res.json({ success: true, countries });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch countries" });
    }
});

// GET /api/tax-settings/rates/:countryCode
router.get('/rates/:countryCode', (req, res) => {
    try {
        const { countryCode } = req.params;
        const data = readTaxData();
        const countryData = data[countryCode.toUpperCase()];
        
        if (!countryData) {
            return res.status(404).json({ success: false, message: "Country not found" });
        }

        res.json({ success: true, data: countryData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch tax rates" });
    }
});

// POST /api/tax-settings/sync
router.post('/sync', async (req, res) => {
    try {
        // In a real app, this would fetch from an external API (e.g., GRA API or Global Tax Service)
        // Here we just simulate a "refresh" or check for updates
        
        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const data = readTaxData();
        // Maybe update timestamp or check version
        
        res.json({ 
            success: true, 
            message: "Tax rates synced successfully",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Sync failed" });
    }
});

module.exports = router;
