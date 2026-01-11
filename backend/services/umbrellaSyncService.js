const db = require('../data/db/db');

class UmbrellaSyncService {
  constructor() {
    this.coreUrl = process.env.UMBRELLA_CORE_URL || 'http://localhost:80/api';
    this.companyId = null; // Will be set on init
    this.isPolling = false;
    this.pollInterval = 10000; // 10 seconds
    this.wsServer = null;
  }

  setWebSocketServer(wsServer) {
    this.wsServer = wsServer;
  }

  async initialize(companyId) {
    this.companyId = companyId;
    console.log(`UmbrellaSyncService initialized for Company ${companyId}`);
    this.startPolling();
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log('Started polling Umbrella Core for events...');
    
    // Initial poll
    this.pollEvents();

    setInterval(() => {
      this.pollEvents();
    }, this.pollInterval);
  }

  async pollEvents() {
    try {
      const lastSyncedId = await this.getLastSyncedId();
      
      // Use fetch (Node 18+)
      const response = await fetch(`${this.coreUrl}/sync/events?companyId=${this.companyId}&sinceId=${lastSyncedId}`);
      
      if (!response.ok) {
        // If 404 or connection refused, just ignore (maybe offline)
        return;
      }

      const result = await response.json();
      if (result.success && result.data.length > 0) {
        console.log(`Received ${result.data.length} events from Core.`);
        
        for (const event of result.data) {
          await this.applyEvent(event);
          await this.updateLastSyncedId(event.id);
        }
      }

    } catch (error) {
      // Silent fail on connection error
      // console.error('Error polling events:', error.message);
    }
  }

  async getLastSyncedId() {
    return new Promise((resolve) => {
      db.get("SELECT lastSyncedId FROM SyncState WHERE key = 'umbrella_events'", (err, row) => {
        resolve(row ? row.lastSyncedId : 0);
      });
    });
  }

  async updateLastSyncedId(id) {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO SyncState (key, lastSyncedId) VALUES ('umbrella_events', ?) ON CONFLICT(key) DO UPDATE SET lastSyncedId = ?, updatedAt = CURRENT_TIMESTAMP",
        [id, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async applyEvent(event) {
    console.log(`Applying event ${event.eventType} (ID: ${event.id})`);
    const { eventType, payload } = event;

    try {
      switch (eventType) {
        case 'COMPANY_CREATED':
        case 'COMPANY_UPDATED':
          await this.applyCompanyUpdate(payload);
          break;
        case 'INVENTORY_CHANGE':
          await this.applyInventoryChange(payload);
          break;
        case 'PRICING_UPDATE':
          await this.applyPricingUpdate(payload);
          break;
        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    } catch (err) {
      console.error(`Failed to apply event ${event.id}:`, err);
    }
  }

  async applyCompanyUpdate(data) {
    // data = { id, name, address, phone, email, ... }
    // We might receive updates for OTHER companies in the umbrella (e.g. siblings)
    // We should store them in the Company table so we can reference them for Transfers.
    
    // Map fields if necessary (payload might have 'name' but DB uses 'companyName')
    const companyName = data.companyName || data.name;
    
    return new Promise(async (resolve, reject) => {
      try {
        // Check if company exists
        const existingCompany = await new Promise((res, rej) => {
          db.get("SELECT * FROM Company WHERE id = ?", [data.id], (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        });

        if (existingCompany) {
          console.log(`Company ${data.id} exists. Performing partial update.`);
          // Partial Update
          const updates = [];
          const values = [];

          if (data.companyName || data.name) {
            updates.push("companyName = ?");
            values.push(data.companyName || data.name);
          }
          if (data.storeAddress || data.address) {
            updates.push("storeAddress = ?");
            values.push(data.storeAddress || data.address);
          }
           if (data.contact || data.phone) {
            updates.push("contact = ?");
            values.push(data.contact || data.phone);
          }
          if (data.email) {
            updates.push("email = ?");
            values.push(data.email);
          }
          if (data.parentCompanyId !== undefined) {
             updates.push("parentCompanyId = ?");
             values.push(data.parentCompanyId);
          }
          if (data.taxMode) {
             updates.push("taxMode = ?");
             values.push(data.taxMode);
          }
          if (data.tinNumber) {
             updates.push("tinNumber = ?");
             values.push(data.tinNumber);
          }
          if (data.currencyCode) {
            updates.push("currencyCode = ?");
            values.push(data.currencyCode);
          }
          if (data.currentPlan) {
            updates.push("currentPlan = ?");
            values.push(data.currentPlan);
          }
          if (data.planLimits) {
             updates.push("planLimits = ?");
             values.push(typeof data.planLimits === 'object' ? JSON.stringify(data.planLimits) : data.planLimits);
          }
          if (data.planFeatures) {
             updates.push("planFeatures = ?");
             values.push(typeof data.planFeatures === 'object' ? JSON.stringify(data.planFeatures) : data.planFeatures);
          }
          if (data.planExpiry) {
             updates.push("planExpiry = ?");
             values.push(data.planExpiry);
          }
          
          updates.push("updatedAt = CURRENT_TIMESTAMP");

          if (updates.length > 0) {
             const sql = `UPDATE Company SET ${updates.join(", ")} WHERE id = ?`;
             values.push(data.id);
             
             await new Promise((res, rej) => {
                db.run(sql, values, (err) => {
                    if (err) rej(err);
                    else res();
                });
             });
          }

          // Handle Allowed Units
          if (data.allowedUnits && Array.isArray(data.allowedUnits)) {
            // Replace all allowed units
            await new Promise((res, rej) => {
                db.run("DELETE FROM CompanyAllowedUnits WHERE companyId = ?", [data.id], (err) => {
                    if (err) rej(err);
                    else res();
                });
            });
            
            for (const unit of data.allowedUnits) {
                await new Promise((res, rej) => {
                    db.run("INSERT INTO CompanyAllowedUnits (id, companyId, unit) VALUES (?, ?, ?)", 
                    [this.generateUUID(), data.id, unit], (err) => {
                        if (err) rej(err);
                        else res();
                    });
                });
            }
          }

          // Handle Allowed Categories
          if (data.allowedCategories && Array.isArray(data.allowedCategories)) {
             // Replace all allowed categories
             await new Promise((res, rej) => {
                 db.run("DELETE FROM CompanyAllowedCategories WHERE companyId = ?", [data.id], (err) => {
                     if (err) rej(err);
                     else res();
                 });
             });
             
             for (const cat of data.allowedCategories) {
                 await new Promise((res, rej) => {
                     db.run("INSERT INTO CompanyAllowedCategories (id, companyId, category) VALUES (?, ?, ?)", 
                     [this.generateUUID(), data.id, cat], (err) => {
                         if (err) rej(err);
                         else res();
                     });
                 });
             }
          }

          // Broadcast settings update
          if (this.wsServer) {
            console.log(`Broadcasting settings update for company ${data.id}`);
            this.wsServer.broadcastToCompany(data.id, 'settings_updated', {
                companyId: data.id,
                timestamp: Date.now(),
                settings: {
                    ...existingCompany,
                    ...data,
                    allowedUnits: data.allowedUnits,
                    allowedCategories: data.allowedCategories
                }
            });
          }

          resolve();

        } else {
          console.log(`Company ${data.id} does not exist. Creating new.`);
           // Insert new (requires core fields)
           if (!companyName) {
              // Can't insert without a name. Log warning and skip.
              console.warn(`Skipping creation of company ${data.id}: Missing companyName`);
              return resolve();
           }

          const query = `
            INSERT INTO Company (id, companyName, storeAddress, contact, email, parentCompanyId, taxMode, tinNumber, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          // Use a dummy hash for synced companies (they shouldn't login this way usually)
          const dummyHash = '$2b$10$DummyHashForSyncedCompany......................';

          db.run(query, [
            data.id, 
            companyName, 
            data.storeAddress || data.address, 
            data.contact || data.phone, 
            data.email,
            data.parentCompanyId,
            data.taxMode,
            data.tinNumber,
            dummyHash
          ], (err) => {
            if (err) {
              console.error('Error applying company update:', err.message);
              reject(err);
            } else {
              resolve();
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  generateUUID() {
    return require('crypto').randomUUID();
  }

  async applyInventoryChange(data) {
    // data = { id, name, onhand, ... }
    // Update local inventory if it matches a known item (by name or ID if synced)
    // For now, we match by name within the company
    
    console.log(`Syncing Inventory: ${data.name} -> ${data.onhand}`);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE Inventory SET onhand = ?, updatedAt = CURRENT_TIMESTAMP WHERE name = ? AND companyId = ?`,
        [data.onhand, data.name, this.companyId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async applyPricingUpdate(data) {
    // data = { id, name, salesPrice, ... }
    console.log(`Syncing Price: ${data.name} -> ${data.salesPrice}`);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE Inventory SET salesPrice = ?, updatedAt = CURRENT_TIMESTAMP WHERE name = ? AND companyId = ?`,
        [data.salesPrice, data.name, this.companyId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

module.exports = new UmbrellaSyncService();
