const jwt = require('jsonwebtoken');
const db = require('../data/db/db');

// Secret key for JWT - in production, store this in environment variables
const JWT_SECRET = 'your-secret-key-should-be-in-env-variables';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware to check if user is a company
const isCompany = (req, res, next) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Access denied. Company access required.' });
  }
  next();
};

// Middleware to check if user is a worker
const isWorker = (req, res, next) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({ error: 'Access denied. Worker access required.' });
  }
  next();
};

// Middleware to check if user is a super_admin
const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'worker' || req.user.worker_role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Super admin access required.' });
  }
  next();
};

// Middleware to check if user belongs to the specified company
const belongsToCompany = (req, res, next) => {
  const companyId = parseInt(req.params.companyId || req.body.company_id);
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  if (req.user.role === 'company' && req.user.id === companyId) {
    // Company accessing its own data
    next();
  } else if (req.user.role === 'worker' && req.user.companyId === companyId) {
    // Worker accessing data from their company
    next();
  } else {
    return res.status(403).json({ error: 'Access denied. You do not belong to this company.' });
  }
};

module.exports = {
  verifyToken,
  isCompany,
  isWorker,
  isSuperAdmin,
  belongsToCompany,
  JWT_SECRET
};