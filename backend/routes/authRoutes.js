const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Company Registration
router.post('/register', async (req, res) => {
  const { companyName, email, password } = req.body;
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Company name, email, and password are required' });
  }
  
  try {
    // Check if company with this email already exists
    const existingCompany = await db.query('SELECT * FROM Company WHERE email = $1 OR companyName = $2', [email, companyName]);
    
    if (existingCompany.rows.length > 0) {
      return res.status(400).json({ message: 'Company with this email already exists' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the company
    const companyResult = await db.query(
      'INSERT INTO Company (companyName, email, password) VALUES ($1, $2, $3) RETURNING id',
      [companyName, email, hashedPassword]
    );
    
    const companyId = companyResult.rows[0].id;
    
    // Create a default super_admin worker account
    await db.query(
      'INSERT INTO Worker (name, password, role, adminstatus, companyId) VALUES ($1, $2, $3, $4, $5)',
      [`admin`, hashedPassword, 'super_admin', 1, companyId]
    );
    
    // Generate JWT token for the company
    const token = jwt.sign(
      { id: companyId, role: 'company' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'Company registered successfully',
      token,
      company: {
        id: companyId,
        name: companyName,
        email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Company Login
router.post('/login', async (req, res) => {
  const { companyName, password } = req.body;
  if (!companyName || !password) {
    return res.status(400).json({ error: 'Company name and password are required' });
  }
  
  try {
    const companyResult = await db.query('SELECT * FROM Company WHERE companyName = $1', [companyName]);
    
    if (companyResult.rows.length === 0) {
      return res.status(401).json({message: "company not found"});
    }
    
    const company = companyResult.rows[0];
    
    // Compare passwords
    const validPassword = await bcrypt.compare(password, company.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid company name or password' });
    }
    
    // Fetch allowed categories for the company
    const categoriesResult = await db.query('SELECT category FROM CompanyAllowedCategories WHERE companyId = $1', [company.id]);
    
    // Extract category names from the result
    const allowedCategories = categoriesResult.rows.map(row => row.category);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: company.id, role: 'company' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        allowedCategories: allowedCategories,
        ...company
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Worker Login
router.post('/account', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: 'Worker name and password are required' });
  }
  
  db.get('SELECT w.* FROM Worker w JOIN Company c ON w.companyId = c.id WHERE w.name = ?', [name], async (err, worker) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!worker) {
      return res.status(401).json({ message: 'Invalid worker name or password' });
    }

    // Compare passwords
    const validPassword = await bcrypt.compare(password, worker.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid worker name or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: worker.id,
        role: 'worker',
        worker_role: worker.role,
        companyId: worker.companyId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      worker: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        companyId: worker.companyId,
        company_name: worker.company_name,
        password: worker.password // Include hashed password for frontend validation
      }
    });
  });
});

module.exports = router;