const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const bcrypt = require('bcrypt');
const { verifyToken, isCompany, isSuperAdmin, belongsToCompany } = require('../middleware/authMiddleware');

// Get all workers (protected - company or super_admin only)
router.get('/', verifyToken, (req, res) => {
  try {
    const companyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    db.all('SELECT id, name, contact, email, role, companyId FROM Worker WHERE companyId = ?', [companyId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all workers for a company (protected)
router.get('/:id', (req, res) => {
  try {
    const companyId = req.params.id;
    
    db.all('SELECT id, name, contact, email, role, companyId FROM Worker WHERE companyId = ?', 
      [companyId], 
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new worker (protected - company or super_admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, username, contact, email, password, role, companyId: bodyCompanyId } = req.body;
    const companyId = bodyCompanyId || (req.user.role === 'company' ? req.user.id : req.user.companyId);
    // Check if user has permission to create workers
    if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin') {
      return res.status(403).json({ error: 'Only company owners or super admins can create workers' });
    }
    
    if (!name || !password) {
      return res.status(400).json({ error: 'Worker name and password are required' });
    }
    
    // Check if worker role is valid
    console.log(role)
    const validRoles = ['worker', 'admin', 'super_admin', 'sales_associate', "sales_associate_and_inventory_manager", "inventory_manager", "hr","it_support"];
    const workerRole = role || 'sales_associate';
    
    if (!validRoles.includes(workerRole)) {
      return res.status(400).json({ error: 'Invalid worker role' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    db.run(
      'INSERT INTO Worker (name, username, contact, email, password, role, companyId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username, contact, email, hashedPassword, workerRole, companyId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
          id: this.lastID,
          name,
          username,
          contact,
          email,
          role: workerRole,
          companyId: companyId
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a worker (protected - company, super_admin, or self)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const { name, contact, email, password, role } = req.body;
    const companyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    // Check if user has permission to update this worker
    const canUpdateRole = req.user.role === 'company' || req.user.worker_role === 'super_admin';
    const isSelf = req.user.role === 'worker' && req.user.id === workerId;
    
    if (!canUpdateRole && !isSelf) {
      return res.status(403).json({ error: 'You do not have permission to update this worker' });
    }
    
    // Get current worker data
    db.get('SELECT * FROM Worker WHERE id = ? AND companyId = ?', [workerId, companyId], async (err, worker) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
      }
      
      // If trying to update role but not authorized
      if (role && role !== worker.role && !canUpdateRole) {
        return res.status(403).json({ error: 'Only company owners or super admins can change worker roles' });
      }
      
      // Prepare update data
      const updateData = {
        name: name || worker.name,
        contact: contact || worker.contact,
        email: email || worker.email,
        role: role || worker.role,
        password: worker.password // Default to current password
      };
      
      // If password is being updated, hash it
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
      
      db.run(
        'UPDATE Worker SET name = ?, contact = ?, email = ?, password = ?, role = ? WHERE id = ? AND companyId = ?',
        [updateData.name, updateData.contact, updateData.email, updateData.password, updateData.role, workerId, companyId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Worker not found' });
          }
          res.json({ 
            id: workerId,
            name: updateData.name,
            contact: updateData.contact,
            email: updateData.email,
            role: updateData.role,
            companyId: companyId
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a worker (protected - company or super_admin only)
router.delete('/:id', verifyToken, (req, res) => {
  const workerId = req.params.id;
  const companyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Check if user has permission to delete workers
  if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin') {
    return res.status(403).json({ error: 'Only company owners or super admins can delete workers' });
  }
  
  // Prevent deleting yourself
  if (req.user.role === 'worker' && req.user.id === parseInt(workerId)) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  
  db.run('DELETE FROM Worker WHERE id = ? AND companyId = ?', [workerId, companyId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json({ deleted: true, id: workerId });
  });
});

module.exports = router;