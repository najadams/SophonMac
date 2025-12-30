const express = require('express');
const router = express.Router();
const { governanceService } = require('../services/governanceService');

// Middleware to ensure DB is available? 
// The app globally checks DB, but specific routes might need it.
// Governance strictly requires DB.

/**
 * POST /api/governance/root/init
 * Initialize the Genesis Root Key (Admin only)
 */
router.post('/root/init', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const keyInfo = await governanceService.initializeRootKey(password);
    res.json({ success: true, key: keyInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/governance/root/rotate
 * Rotate the current Root Key
 */
router.post('/root/rotate', async (req, res) => {
  try {
    const { currentPassword, newPassword, reason } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Passwords required' });

    const result = await governanceService.rotateRootKey(currentPassword, newPassword, reason);
    res.json({ success: true, rotation: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/governance/chain
 * Get the current Trust Chain
 */
router.get('/chain', (req, res) => {
  try {
    const chain = governanceService.getTrustChain();
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
