const express = require('express');
const router = express.Router();
const { exportCompanyData } = require('../utils/backupUtils');
const { importCompanyData } = require('../utils/restoreUtils');
const path = require('path');
const fs = require('fs');
const db = require('../data/db/db');

// GET /api/backup/company/:companyId
// Returns a JSON backup for the specified company.
// Optional query: ?download=1 to prompt browser download.
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { download } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const backup = await exportCompanyData(parseInt(companyId, 10));

    if (download && download.toString() === '1') {
      const filename = `pos-backup-company-${companyId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(JSON.stringify(backup, null, 2));
    }

    return res.status(200).json(backup);
  } catch (error) {
    console.error('Error creating company backup:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/backup/restore
// Imports a previously exported backup JSON into the local database.
// Optional query: ?overwrite=1 to delete existing company-scoped rows before import
router.post('/restore', async (req, res) => {
  try {
    const backup = req.body;
    const { overwrite, targetCompanyId } = req.query;

    console.table(req.query)
    if (!backup || !backup.metadata || !backup.company) {
      return res.status(400).json({ error: 'Invalid backup payload' });
    }

    try {
      const dbPath = (db && db.connection && db.connection.name) || process.env.DB_PATH || path.join(__dirname, '../data/db/database.sqlite');
      const dbDir = path.dirname(dbPath);
      const importsDir = path.join(dbDir, 'imports');
      if (!fs.existsSync(importsDir)) {
        fs.mkdirSync(importsDir, { recursive: true });
      }
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `restore-${backup.metadata.companyId || 'unknown'}-${ts}.json`;
      const filePath = path.join(importsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
      console.log('Saved uploaded backup JSON to', filePath);
    } catch (fileErr) {
      console.warn('Could not persist uploaded backup JSON:', fileErr.message);
    }

    const result = await importCompanyData(backup, {
      overwrite: overwrite && overwrite.toString() === '1',
      targetCompanyId: targetCompanyId ? parseInt(targetCompanyId, 10) : null,
    });

    return res.status(200).json({ status: 'ok', companyId: result.companyId });
  } catch (error) {
    console.error('Error restoring company backup:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;