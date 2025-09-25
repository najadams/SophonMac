const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');
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
router.get('/:id', verifyToken, (req, res) => {
  try {
    const requestedCompanyId = parseInt(req.params.id);
    const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    // Security check: Users can only access workers from their own company
    if (requestedCompanyId !== userCompanyId) {
      return res.status(403).json({ error: 'Access denied. You can only view workers from your own company.' });
    }
    
    db.all('SELECT id, name, contact, email, role, companyId FROM Worker WHERE companyId = ?', 
      [requestedCompanyId], 
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
    if (req.user.role !== 'company' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only company owners or super admins can create workers' });
    }
    
    // Validate required fields
    if (!name || !username || !password || !contact) {
      return res.status(400).json({ error: 'Name, username, password, and contact are required' });
    }
    
    // Check if username already exists
    const existingWorker = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM Worker WHERE username = ? AND companyId = ?', [username, companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingWorker) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if worker role is valid
    const validRoles = ['worker', 'admin', 'super_admin', 'sales_associate', "sales_associate_and_inventory_manager", "inventory_manager", "hr","it_support", "manager", "employee", "viewer"];
    const workerRole = role || 'sales_associate';
    
    // For now, just accept any role value without validation
    // This allows creating users with custom roles even if the CustomRoles table
    // is not accessible or in a different database file
    
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

// Custom Role Management Endpoints

// Get all custom roles for a company
router.get('/custom-roles/:companyId', verifyToken, (req, res) => {
  try {
    const requestedCompanyId = parseInt(req.params.companyId);
    const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    // Security check: Users can only access custom roles from their own company
    if (requestedCompanyId !== userCompanyId) {
      return res.status(403).json({ error: 'Access denied. You can only view custom roles from your own company.' });
    }
    
    // Check if user has permission to view custom roles
    if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin' && req.user.worker_role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    
    db.all('SELECT * FROM CustomRoles WHERE companyId = ?', [requestedCompanyId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Parse permissions JSON for each role
      const roles = rows.map(role => ({
        ...role,
        permissions: JSON.parse(role.permissions || '[]')
      }));
      
      res.json(roles);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new custom role
router.post('/custom-roles', verifyToken, async (req, res) => {
  try {
    const { name, displayName, permissions, companyId: bodyCompanyId } = req.body;
    const companyId = bodyCompanyId || (req.user.role === 'company' ? req.user.id : req.user.companyId);
    
    // Check if user has permission to create custom roles
    if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin' && req.user.worker_role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    
    // Validate required fields
    if (!name || !displayName || !permissions) {
      return res.status(400).json({ error: 'Name, display name, and permissions are required' });
    }
    
    // Check if role name already exists for this company
    const existingRole = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM CustomRoles WHERE name = ? AND companyId = ?', [name, companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingRole) {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    
    // Create the custom role
    db.run(
      'INSERT INTO CustomRoles (name, displayName, permissions, companyId, createdAt) VALUES (?, ?, ?, ?, datetime("now"))',
      [name, displayName, JSON.stringify(permissions), companyId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
          id: this.lastID,
          name,
          displayName,
          permissions,
          companyId,
          createdAt: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a custom role
router.put('/custom-roles/:id', verifyToken, async (req, res) => {
  try {
    const roleId = req.params.id;
    const { name, displayName, permissions } = req.body;
    const companyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    // Check if user has permission to update custom roles
    if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin' && req.user.worker_role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    
    // Validate required fields
    if (!name || !displayName || !permissions) {
      return res.status(400).json({ error: 'Name, display name, and permissions are required' });
    }
    
    // Check if role exists and belongs to the company
    const existingRole = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM CustomRoles WHERE id = ? AND companyId = ?', [roleId, companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!existingRole) {
      return res.status(404).json({ error: 'Custom role not found' });
    }
    
    // Check if new name conflicts with existing roles (excluding current role)
    const nameConflict = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM CustomRoles WHERE name = ? AND companyId = ? AND id != ?', [name, companyId, roleId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (nameConflict) {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    
    // Update the custom role
    db.run(
      'UPDATE CustomRoles SET name = ?, displayName = ?, permissions = ?, updatedAt = datetime("now") WHERE id = ? AND companyId = ?',
      [name, displayName, JSON.stringify(permissions), roleId, companyId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Custom role not found' });
        }
        
        res.json({ 
          id: roleId,
          name,
          displayName,
          permissions,
          companyId,
          updatedAt: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a custom role
router.delete('/custom-roles/:id', verifyToken, async (req, res) => {
  try {
    const roleId = req.params.id;
    const companyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
    
    // Check if user has permission to delete custom roles
    if (req.user.role !== 'company' && req.user.worker_role !== 'super_admin' && req.user.worker_role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    
    // Check if role exists and belongs to the company
    const existingRole = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM CustomRoles WHERE id = ? AND companyId = ?', [roleId, companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!existingRole) {
      return res.status(404).json({ error: 'Custom role not found' });
    }
    
    // Check if any workers are using this custom role
    const workersUsingRole = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM Worker WHERE role = ? AND companyId = ?', [existingRole.name, companyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (workersUsingRole.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete role. It is currently assigned to workers.',
        workersUsingRole: workersUsingRole.map(w => w.name)
      });
    }
    
    // Delete the custom role
    db.run('DELETE FROM CustomRoles WHERE id = ? AND companyId = ?', [roleId, companyId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Custom role not found' });
      }
      
      res.json({ message: 'Custom role deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;