const express = require('express');
const router = express.Router();
const db = require('../utils/dbUtils');

/**
 * GET /api/currencies
 * Get all available currencies
 */
router.get('/', async (req, res) => {
  try {
    const currencies = await db.query('SELECT code, name FROM Currency ORDER BY name');
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

module.exports = router;