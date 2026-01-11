const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { createSupabaseServiceClient, supabaseConfig } = require('../config/supabase.config');
const { createLogger } = require('vite');

// Company Registration
router.post('/register', async (req, res) => {
  const { companyName, email, password } = req.body;
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Company name, email, and password are required' });
  }
  
  try {
    // Check if company with this email already exists
    db.get('SELECT * FROM Company WHERE email = ? OR companyName = ?', [email, companyName], async (err, company) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (company) {
        return res.status(400).json({ message: 'Company with this email or name already exists' });
      }

      // Check if company exists in Supabase (Cloud Restore)
      const supabase = createSupabaseServiceClient();
      let restoredCompany = null;

      if (supabase) {
        try {
          // Convert camelCase to snake_case for Supabase query
          // We assume the Supabase table matches the standard schema
          const { data: remoteCompany, error } = await supabase
            .from('company') // standard supabase table name is lowercase/snake_case usually, syncEngine uses 'company'
            .select('*')
            .eq('email', email)
            .single();

          if (!error && remoteCompany) {
            // Company exists in cloud, verify password
            const passwordMatch = await bcrypt.compare(password, remoteCompany.password);

            if (passwordMatch) {
              console.log('Restoring company from cloud:', remoteCompany.id);
              restoredCompany = remoteCompany;
            } else {
               // Company exists but password wrong - prevent registration to avoid conflict
               // OR maybe we should allow it but warn? No, if email exists unique constraint will fail on sync
               return res.status(400).json({ message: 'Account exists in cloud but password does not match. Please use the correct password to restore your account.' });
            }
          }
        } catch (supaError) {
          console.error('Supabase check failed, proceeding with local creation:', supaError);
          // If offline or error, just proceed with local creation (sync will handle conflict later)
        }
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Determine ID to use (Remote ID if restoring, else new UUID)
      const companyId = restoredCompany ? restoredCompany.id : dbUtils.generateUUID();
      
      // Insert logic
      const insertQuery = restoredCompany 
        ? 'INSERT INTO Company (id, companyName, email, password, is_synced, last_synced_at, sync_id) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)'
        : 'INSERT INTO Company (id, companyName, email, password) VALUES (?, ?, ?, ?)';
        
      const insertParams = restoredCompany
        ? [companyId, restoredCompany.company_name || companyName, restoredCompany.email, hashedPassword, restoredCompany.sync_id]
        : [companyId, companyName, email, hashedPassword];

      // If restoring, ensure we use the remote names/details if they differ? 
      // For now, we trust the input OR the remote. Let's trust the Remote for checks, but maybe local input for 'companyName' if we want to update it?
      // Actually, if we are restoring, we should probably stick to what IS in the cloud to avoid immediate drift, 
      // BUT `restoredCompany` has snake_case keys usually? check syncEngine implementation.
      // syncEngine says: "Convert PascalCase to snake_case" for table, keys are "camelCase" in local, "snake_case" in remote.
      
      // Warning: `remoteCompany` from supabase will have snake_case keys (company_name, etc).
      // We used `restoredCompany.company_name` above, which is likely correct.

      db.run(
        insertQuery,
        insertParams,
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Create a default super_admin worker account
          // If we are restoring, maybe we should TRY to fetch the admin worker from cloud?
          // But that adds complexity (another round trip). 
          // We can just create a new local admin. It might conflict if ID generation is not careful, 
          // but we generate a NEW UUID for the worker here.
          // The old admin worker from cloud will eventually download.
          // Having two admins is fine.
          const workerId = dbUtils.generateUUID();

          db.run(
            'INSERT INTO Worker (id, name, password, role, adminstatus, companyId) VALUES (?, ?, ?, ?, ?, ?)',
            [workerId, `admin`, hashedPassword, 'admin', 1, companyId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              // Generate JWT token for the company
              const token = jwt.sign(
                { id: companyId, role: 'company' },
                JWT_SECRET,
                { expiresIn: '24h' }
              );

              // Trigger a background "Download All Data" if restored
              if (restoredCompany) {
                 // We need access to syncEngine. usage: req.app.get('networkManager').syncEngine
                 const networkManager = req.app.get('networkManager');
                 if (networkManager && networkManager.syncEngine) {
                    console.log('Triggering initial download for restored company...');
                    networkManager.syncEngine.downloadAllCompanyData(companyId).catch(console.error);
                 }
              }
              
              res.status(201).json({
                message: restoredCompany ? 'Company restored successfully' : 'Company registered successfully',
                token,
                company: {
                  id: companyId,
                  name: restoredCompany ? restoredCompany.company_name : companyName, 
                  email
                }
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Company Login
router.post('/login', (req, res) => {
  const { companyName, password } = req.body;
  if (!companyName || !password) {
    return res.status(400).json({ error: 'Company name and password are required' });
  }
  
  db.get('SELECT * FROM Company WHERE companyName = ?', [companyName], async (err, company) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!company) {
      return res.status(401).json({message: "company not found"});
    }
    
    // Compare passwords
    const validPassword = await bcrypt.compare(password, company.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid company name or password' });
    }
    
    // Fetch allowed categories for the company
    db.all('SELECT category FROM CompanyAllowedCategories WHERE companyId = ?', [company.id], (err, categories) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Extract category names from the result
      const allowedCategories = categories.map(row => row.category);

      // Fetch allowed units for the company
      db.all('SELECT unit FROM CompanyAllowedUnits WHERE companyId = ?', [company.id], (err, units) => {
        if (err) {
           // Log error but proceed? Or fail? Better to fail safely or log. 
           // Let's just return empty if error for now to allow login, or simpler: handle error.
           console.error("Error fetching units during login:", err);
           // proceed with empty units
        }
        
        const allowedUnits = units ? units.map(row => row.unit) : [];
        
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
            allowedUnits: allowedUnits,
            ...company
          }
        });
      });
    });
  });
});

// Worker Login
router.post('/account', (req, res) => {
  console.log("Worker Login",);
  const { name, password, companyId } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: 'Worker name and password are required' });
  }
  
  db.get('SELECT w.* FROM Worker w JOIN Company c ON w.companyId = c.id WHERE (w.name = ? OR w.username = ?) AND w.companyId = ?', [name, name, companyId], async (err, worker) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!worker) {
      console.log("Worker not found");
      return res.status(401).json({ message: 'Invalid worker name or password' });
    }
    console.log(" worker", worker)

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