const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');
const { requireFeature } = require('../middleware/planMiddleware');
const { FEATURES } = require('../config/plans');

// Gate all expense routes behind EXPENSE_TRACKING feature
router.use(requireFeature(FEATURES.EXPENSE_TRACKING));

// Get all expenses for a company
router.get('/:companyId', (req, res) => {
  const { companyId } = req.params;
  const { startDate, endDate, category } = req.query;

  let query = 'SELECT * FROM Expenses WHERE companyId = ?';
  let params = [companyId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create a new expense
router.post('/', (req, res) => {
  const { companyId, title, amount, category, date, description, paymentMethod } = req.body;

  if (!companyId || !title || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = dbUtils.generateUUID();
  const createdAt = new Date().toISOString();
  
  const sql = `
    INSERT INTO Expenses (id, companyId, title, amount, category, date, description, paymentMethod, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    companyId,
    title,
    amount,
    category || 'General',
    date || createdAt,
    description || '',
    paymentMethod || 'Cash',
    createdAt,
    createdAt
  ];

  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id, ...req.body, createdAt });
  });
});

// Update an expense
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, amount, category, date, description, paymentMethod } = req.body;
  const updatedAt = new Date().toISOString();

  const sql = `
    UPDATE Expenses 
    SET title = ?, amount = ?, category = ?, date = ?, description = ?, paymentMethod = ?, updatedAt = ?
    WHERE id = ?
  `;

  // We need to fetch the existing record to ensure it exists and maybe handle partial updates better, 
  // but for now assuming full update or frontend sends all fields.
  // Actually, let's just update provided fields. 
  // But standard PUT replaces. Let's stick to simple update.
  
  const values = [title, amount, category, date, description, paymentMethod, updatedAt, id];

  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense updated successfully' });
  });
});

// Delete an expense
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM Expenses WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  });
});

// Get expense summary
router.get('/:companyId/summary', (req, res) => {
  const { companyId } = req.params;
  const { period = 'month' } = req.query; // 'month', 'year', 'all'

  let dateFilter = '';
  if (period === 'month') {
      dateFilter = "AND date >= date('now', 'start of month')";
  } else if (period === 'year') {
      dateFilter = "AND date >= date('now', 'start of year')";
  }

  const query = `
      SELECT 
          category, 
          SUM(amount) as total 
      FROM Expenses 
      WHERE companyId = ? ${dateFilter}
      GROUP BY category
  `;

  db.all(query, [companyId], (err, rows) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json(rows);
  });
});

module.exports = router;
