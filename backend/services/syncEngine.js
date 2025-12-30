const EventEmitter = require('events');
const { randomUUID } = require('crypto');
const db = require('../data/db/db');
const { createSupabaseServiceClient, supabaseConfig } = require('../config/supabase.config');
const bcrypt = require('bcrypt');

class SyncEngine extends EventEmitter {
  constructor(websocketServer, networkDiscovery, networkManager = null) {
    super();
    this.wsServer = websocketServer;
    this.networkDiscovery = networkDiscovery;
    this.networkManager = networkManager; // Optional for backward/test compat
    this.isMaster = false;
    this.syncQueue = [];
    this.lastSyncTimestamp = {};
    this.conflictResolutionStrategy = 'last-write-wins';
    this.syncInterval = null;
    this.isRunning = false;
    
    // Supabase sync properties
    this.supabase = createSupabaseServiceClient();
    this.isSupabaseEnabled = !!this.supabase;
    this.isOnline = false;
    this.supabaseSyncInProgress = false;
    this.lastSupabaseSyncTime = null;
    this.supabaseSyncInterval = null;
    this.supabaseSyncInterval = null;
    this.tableSchemas = new Map(); // Cache for table schemas
    
    if (!this.isSupabaseEnabled) {
      console.log('Supabase sync disabled - no configuration found');
    }
  }

  getLastSyncTime(type) {
    if (!type) return this.lastSyncTimestamp;
    return this.lastSyncTimestamp[type] || 0;
  }

  initialize(companyId, isMaster = false) {
    this.companyId = companyId;
    this.isMaster = isMaster;
    
    this.setupEventListeners();
    this.startPeriodicSync();
    this.isRunning = true;
    
    console.log(`Sync Engine initialized - Mode: ${isMaster ? 'Master' : 'Slave'}`);
    this.emit('syncEngineStarted', { isMaster, companyId });
  }

  setupEventListeners() {
    // Listen for WebSocket events
    this.wsServer.on('dataChange', (event) => {
      this.handleLocalDataChange(event);
    });

    this.wsServer.on('syncRequest', (event) => {
      this.handleSyncRequest(event);
    });

    this.wsServer.on('peerSyncData', (event) => {
      this.handlePeerSyncData(event);
    });

    // Listen for network discovery events
    this.networkDiscovery.on('peerDiscovered', (peer) => {
      this.handlePeerDiscovered(peer);
    });

    this.networkDiscovery.on('peerDisconnected', (peer) => {
      this.handlePeerDisconnected(peer);
    });
  }

  handleLocalDataChange(event) {
    const { socket, clientInfo, data } = event;
    
    // Create sync record
    const syncRecord = {
      id: this.generateSyncId(),
      companyId: clientInfo.companyId,
      type: data.type,
      operation: data.operation,
      data: data.data,
      timestamp: Date.now(),
      sourceInstance: this.networkDiscovery.getInstanceId(),
      sourceClient: socket.id,
      synced: false
    };

    // Add to sync queue
    this.syncQueue.push(syncRecord);
    
    // Mark as seen in Gossip cache to prevent processing our own echo
    if (this.networkManager) {
      this.networkManager.markMessageSeen(syncRecord.id);
    }

    // If we're the master, broadcast to all peers
    if (this.isMaster) {
      this.broadcastSyncRecord(syncRecord);
    } else {
      // If we're a slave, send to master
      this.sendToMaster(syncRecord);
    }

    console.log(`Local data change queued for sync: ${data.type} - ${data.operation}`);
  }

  handleSyncRequest(event) {
    const { socket, clientInfo, data } = event;
    
    if (this.isMaster) {
      // Send full sync data to requesting client
      this.sendFullSyncData(socket, data.lastSyncTimestamp);
    } else {
      // Forward request to master
      const masterPeer = this.networkDiscovery.getMasterPeer();
      if (masterPeer) {
        this.requestSyncFromMaster(data.lastSyncTimestamp);
      }
    }
  }

  handlePeerSyncData(event) {
    const { socket, peerInfo, data } = event;
    
    if (data.type === 'sync_record') {
      this.processSyncRecord(data.record, peerInfo);
    } else if (data.type === 'full_sync') {
      this.processFullSync(data.records, peerInfo);
    } else if (data.type === 'sync_request') {
      this.handlePeerSyncRequest(socket, data, peerInfo);
    }
  }

  handlePeerDiscovered(peer) {
    console.log(`Peer discovered for sync: ${peer.name}`);
    
    // If this peer is master and we're not, request sync
    if (peer.isMaster && !this.isMaster) {
      this.requestInitialSync(peer);
    }
    
    // If we're master and this peer is not, send them sync data
    if (this.isMaster && !peer.isMaster) {
      this.sendInitialSyncToPeer(peer);
    }
  }

  handlePeerDisconnected(peer) {
    console.log(`Peer disconnected from sync: ${peer.name}`);
    
    // If master disconnected and we're the oldest slave, become master
    if (peer.isMaster && !this.isMaster) {
      this.considerBecomingMaster();
    }
  }

  processSyncRecord(record, sourcePeer) {
    // Gossip Protocol: Check if we've seen this message
    if (this.networkManager && this.networkManager.isMessageSeen(record.id)) {
      console.log(`Gossip: Dropping known message ${record.id}`);
      return;
    }

    // Mark as seen so we don't re-process or re-broadcast blindly
    if (this.networkManager) {
      this.networkManager.markMessageSeen(record.id);
    }

    // Check for conflicts
    const conflict = this.detectConflict(record);
    
    if (conflict) {
      this.resolveConflict(record, conflict, sourcePeer);
    } else {
      this.applySyncRecord(record);
    }
  }

  detectConflict(record) {
    // Delta operations don't conflict, they stack.
    if (record.operation === 'delta_stock') {
        return undefined; 
    }

    // Check if we have a more recent change for the same data
    const existingRecord = this.syncQueue.find(r => 
      r.type === record.type && 
      r.data.id === record.data.id && 
      r.timestamp > record.timestamp
    );
    
    return existingRecord;
  }

  resolveConflict(incomingRecord, existingRecord, sourcePeer) {
    console.log(`Conflict detected for ${incomingRecord.type} ID: ${incomingRecord.data.id}`);
    
    switch (this.conflictResolutionStrategy) {
      case 'last-write-wins':
        if (incomingRecord.timestamp > existingRecord.timestamp) {
          this.applySyncRecord(incomingRecord);
          console.log('Conflict resolved: Incoming record applied (newer)');
        } else {
          console.log('Conflict resolved: Existing record kept (newer)');
        }
        break;
        
      case 'master-wins':
        if (sourcePeer.isMaster) {
          this.applySyncRecord(incomingRecord);
          console.log('Conflict resolved: Master record applied');
        } else {
          console.log('Conflict resolved: Local record kept (we are master)');
        }
        break;
        
      default:
        // Notify clients about conflict
        this.wsServer.broadcastToCompany(this.companyId, 'sync_conflict', {
          type: incomingRecord.type,
          id: incomingRecord.data.id,
          incomingRecord,
          existingRecord
        });
    }
  }

  applySyncRecord(record) {
    try {
      switch (record.type) {
        case 'product':
          this.syncProduct(record);
          break;
        case 'customer':
          this.syncCustomer(record);
          break;
        case 'receipt':
          this.syncReceipt(record);
          break;
        case 'inventory':
          this.syncInventory(record);
          break;
        default:
          console.warn(`Unknown sync record type: ${record.type}`);
      }
      
      // Mark as synced
      record.synced = true;
      this.lastSyncTimestamp[record.type] = record.timestamp;
      
      // Broadcast to local clients
      this.wsServer.broadcastToCompany(this.companyId, 'data_synced', {
        type: record.type,
        operation: record.operation,
        data: record.data,
        timestamp: record.timestamp
      });
      
      console.log(`Sync record applied: ${record.type} - ${record.operation}`);
      
    } catch (error) {
      console.error('Error applying sync record:', error);
      this.emit('syncError', { record, error });
    }
  }

  syncProduct(record) {
    const { operation, data } = record;
    
    switch (operation) {
      case 'create':
        this.executeQuery(
          'INSERT OR REPLACE INTO Inventory (id, companyId, name, category, baseUnit, costPrice, salesPrice, onhand, reorderPoint, minimumStock, description, sku, barcode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.companyId, data.name, data.category, data.baseUnit, data.costPrice, data.salesPrice, data.onhand, data.reorderPoint, data.minimumStock, data.description, data.sku, data.barcode, data.createdAt, data.updatedAt]
        );
        break;
        
      case 'update':
        this.executeQuery(
          'UPDATE Inventory SET name=?, category=?, baseUnit=?, costPrice=?, salesPrice=?, onhand=?, reorderPoint=?, minimumStock=?, description=?, sku=?, barcode=?, updatedAt=? WHERE id=? AND companyId=?',
          [data.name, data.category, data.baseUnit, data.costPrice, data.salesPrice, data.onhand, data.reorderPoint, data.minimumStock, data.description, data.sku, data.barcode, data.updatedAt, data.id, data.companyId]
        );
        break;
        
      case 'delete':
        this.executeQuery(
          'DELETE FROM Inventory WHERE id=? AND companyId=?',
          [data.id, data.companyId]
        );
        break;
    }
  }

  syncCustomer(record) {
    const { operation, data } = record;
    
    switch (operation) {
      case 'create':
        this.executeQuery(
          'INSERT OR REPLACE INTO Customer (id, companyId, name, phone, email, address, company, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.companyId, data.name, data.phone, data.email, data.address, data.company, data.createdAt, data.updatedAt]
        );
        break;
        
      case 'update':
        this.executeQuery(
          'UPDATE Customer SET name=?, phone=?, email=?, address=?, company=?, updatedAt=? WHERE id=? AND companyId=?',
          [data.name, data.phone, data.email, data.address, data.company, data.updatedAt, data.id, data.companyId]
        );
        break;
        
      case 'delete':
        this.executeQuery(
          'DELETE FROM Customer WHERE id=? AND companyId=?',
          [data.id, data.companyId]
        );
        break;
    }
  }

  syncReceipt(record) {
    const { operation, data } = record;
    
    switch (operation) {
      case 'create':
        // Insert receipt and details
        this.executeQuery(
          'INSERT OR REPLACE INTO Receipt (id, companyId, customerId, workerId, total, profit, paymentMethod, amountPaid, change, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.companyId, data.customerId, data.workerId, data.total, data.profit, data.paymentMethod, data.amountPaid, data.change, data.createdAt, data.updatedAt]
        );
        
        // Insert receipt details
        if (data.details) {
          data.details.forEach(detail => {
            this.executeQuery(
              'INSERT OR REPLACE INTO ReceiptDetail (id, receiptId, productId, quantity, unitPrice, total, unit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [detail.id, data.id, detail.productId, detail.quantity, detail.unitPrice, detail.total, detail.unit, detail.createdAt, detail.updatedAt]
            );
          });
        }
        break;
        
      case 'update':
        this.executeQuery(
          'UPDATE Receipt SET customerId=?, total=?, profit=?, paymentMethod=?, amountPaid=?, change=?, updatedAt=? WHERE id=? AND companyId=?',
          [data.customerId, data.total, data.profit, data.paymentMethod, data.amountPaid, data.change, data.updatedAt, data.id, data.companyId]
        );
        break;
        
      case 'delete':
        this.executeQuery(
          'DELETE FROM Receipt WHERE id=? AND companyId=?',
          [data.id, data.companyId]
        );
        break;
    }
  }

  syncInventory(record) {
    const { operation, data } = record;
    
    if (operation === 'update_stock') {
      this.executeQuery(
        'UPDATE Inventory SET onhand=?, updatedAt=? WHERE id=? AND companyId=?',
        [data.onhand, data.updatedAt, data.id, data.companyId]
      );
    } else if (operation === 'delta_stock') {
       // Delta Sync: Apply valid signed delta to current stock
       this.executeQuery(
        'UPDATE Inventory SET onhand = onhand + ?, updatedAt=? WHERE id=? AND companyId=?',
        [data.delta, data.updatedAt, data.id, data.companyId]
       );
    }
  }

  executeQuery(sql, params) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  broadcastSyncRecord(record) {
    this.wsServer.broadcastToPeers('sync_data', {
      type: 'sync_record',
      record: record
    });
  }

  sendToMaster(record) {
    const masterPeer = this.networkDiscovery.getMasterPeer();
    if (masterPeer) {
      // This would need to be implemented with actual peer connection
      console.log(`Sending sync record to master: ${masterPeer.name}`);
    }
  }

  sendFullSyncData(socket, lastSyncTimestamp) {
    // Get all changes since lastSyncTimestamp
    const changes = this.getChangesSince(lastSyncTimestamp);
    
    socket.emit('full_sync_data', {
      changes: changes,
      timestamp: Date.now()
    });
  }

  getChangesSince(timestamp) {
    // This would query the database for changes since the given timestamp
    // For now, return recent sync queue items
    return this.syncQueue.filter(record => 
      record.timestamp > (timestamp || 0) && record.synced
    );
  }

  startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, 30000); // Sync every 30 seconds
  }

  performPeriodicSync() {
    // Clean up old sync records
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.syncQueue = this.syncQueue.filter(record => record.timestamp > cutoff);
    
    // Send heartbeat to peers
    this.wsServer.broadcastToPeers('sync_heartbeat', {
      instanceId: this.networkDiscovery.getInstanceId(),
      timestamp: Date.now(),
      isMaster: this.isMaster,
      queueSize: this.syncQueue.length
    });
  }

  considerBecomingMaster() {
    const peers = this.networkDiscovery.getPeers();
    const activePeers = peers.filter(p => !p.isMaster);
    
    // Simple election: oldest instance becomes master
    const oldestPeer = activePeers.reduce((oldest, peer) => 
      peer.timestamp < oldest.timestamp ? peer : oldest
    , { timestamp: Date.now() });
    
    if (oldestPeer.instanceId === this.networkDiscovery.getInstanceId()) {
      this.becomeMaster();
    }
  }

  becomeMaster() {
    this.isMaster = true;
    this.networkDiscovery.updateServiceInfo({ isMaster: true });
    
    console.log('This instance is now the master');
    this.emit('becameMaster');
    
    // Notify all clients
    this.wsServer.broadcastToCompany(this.companyId, 'master_changed', {
      newMaster: this.networkDiscovery.getInstanceId(),
      timestamp: Date.now()
    });
  }

  generateSyncId() {
    return randomUUID();
  }

  // ===== SUPABASE SYNC METHODS =====

  /**
   * Convert PascalCase table name to snake_case for Supabase
   * Examples: Company -> company, ReceiptDetail -> receipt_detail, DebtPayment -> debt_payment
   */
  getSupabaseTableName(tableName) {
    // Convert PascalCase to snake_case
    return tableName
      .replace(/([A-Z])/g, '_$1')  // Add underscore before capital letters
      .toLowerCase()                // Convert to lowercase
      .replace(/^_/, '');           // Remove leading underscore
  }

  /**
   * Convert camelCase column name to snake_case for Supabase
   * Examples: updatedAt -> updated_at, companyId -> company_id
   */
  getSupabaseColumnName(columnName) {
    // Convert camelCase to snake_case
    return columnName
      .replace(/([A-Z])/g, '_$1')  // Add underscore before capital letters
      .toLowerCase();               // Convert to lowercase
  }

  /**
   * Convert object keys from camelCase to snake_case for Supabase upload
   */
  convertObjectToSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = this.getSupabaseColumnName(key);
      converted[snakeKey] = value;
    }
    return converted;
  }

  /**
   * Convert object keys from snake_case to camelCase for local database
   */
  convertObjectToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      converted[camelKey] = value;
    }
    return converted;
  }

  // Check internet connectivity
  async checkSupabaseConnectivity() {
    if (!this.isSupabaseEnabled) {
      this.isOnline = false;
      return false;
    }
    
    try {
      const { data, error } = await this.supabase.from(this.getSupabaseTableName('Company')).select('id').limit(1);
      this.isOnline = !error;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  // Add record to sync outbox for offline operations
  async addToSupabaseOutbox(tableName, recordId, operation, data = null) {
    return new Promise((resolve, reject) => {
      const syncId = this.generateSyncId();
      const stmt = db.prepare(`
        INSERT INTO SyncOutbox (table_name, record_id, operation, data, sync_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const dataStr = data === undefined ? null : JSON.stringify(data);
    stmt.run([tableName, recordId, operation, dataStr, syncId], function(err) {
        if (err) {
          console.error('Error adding to Supabase outbox:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Process outbox - sync pending operations to Supabase
  async processSupabaseOutbox() {
    if (!this.isOnline || this.supabaseSyncInProgress) return;

    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM SyncOutbox 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT ?
      `, [supabaseConfig.syncSettings.maxBatchSize], async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        for (const row of rows) {
          try {
            await this.processSupabaseOutboxItem(row);
          } catch (error) {
            console.error(`Failed to process Supabase outbox item ${row.id}:`, error);
            await this.markSupabaseOutboxItemFailed(row.id, error.message);
          }
        }
        resolve();
      });
    });
  }

  // Process individual outbox item for Supabase
  async processSupabaseOutboxItem(item) {
    const { table_name, operation, data, sync_id } = item;
    const parsedData = JSON.parse(data || '{}');
    
    // Convert table name to snake_case for Supabase
    const pgTableName = this.getSupabaseTableName(table_name);

    try {
      let result;
      switch (operation) {
        case 'INSERT':
          result = await this.supabase.from(pgTableName).insert(parsedData);
          break;
        case 'UPDATE':
          result = await this.supabase.from(pgTableName)
            .update(parsedData)
            .eq('sync_id', sync_id);
          break;
        case 'DELETE':
          result = await this.supabase.from(pgTableName)
            .delete()
            .eq('sync_id', sync_id);
          break;
      }

      if (result.error) {
        throw result.error;
      }

      // Mark as synced in outbox
      await this.markSupabaseOutboxItemSynced(item.id);
      
    } catch (error) {
      throw error;
    }
  }

  // Mark outbox item as synced
  async markSupabaseOutboxItemSynced(outboxId) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE SyncOutbox 
        SET status = 'synced', last_retry_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [outboxId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Mark outbox item as failed
  async markSupabaseOutboxItemFailed(outboxId, errorMessage) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE SyncOutbox 
        SET status = 'failed', error_message = ?, retry_count = retry_count + 1, last_retry_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [errorMessage, outboxId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Verify company credentials and merge if they match
  async verifyAndMergeCompany(localCompany) {
    try {
      // Query Supabase for existing company by email
      const { data: remoteCompany, error } = await this.supabase
        .from(this.getSupabaseTableName('Company'))
        .select('*')
        .eq('email', localCompany.email)
        .single();

      if (error || !remoteCompany) {
        return { matched: false, reason: 'Company not found in Supabase' };
      }

      // Verify password match using bcrypt
      const passwordMatch = await bcrypt.compare(localCompany.password, remoteCompany.password);

      if (!passwordMatch) {
        return { matched: false, reason: 'Password does not match' };
      }

      // Verify company name matches
      if (localCompany.companyName !== remoteCompany.companyName) {
        return { matched: false, reason: 'Company name does not match' };
      }

      // Credentials match! Adopt the remote company ID
      console.log(`Company credentials matched! Merging local company ${localCompany.id} with remote ${remoteCompany.id}`);
      
      await this.adoptRemoteCompanyId(localCompany.id, remoteCompany);

      return { matched: true, remoteCompany };
    } catch (error) {
      console.error('Error verifying company credentials:', error);
      return { matched: false, reason: error.message };
    }
  }

  // Adopt remote company ID and download all related data
  async adoptRemoteCompanyId(localCompanyId, remoteCompany) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
          // Update local Company record with remote ID and sync_id
          db.run(`
            UPDATE Company 
            SET id = ?, 
                sync_id = ?, 
                is_synced = 1, 
                last_synced_at = CURRENT_TIMESTAMP,
                updatedAt = ?
            WHERE id = ?
          `, [remoteCompany.id, remoteCompany.sync_id, remoteCompany.updatedAt, localCompanyId], (err) => {
            if (err) throw err;
          });

          // Update all related records with new companyId
          const tablesToUpdate = [
            'Settings', 'Worker', 'Inventory', 'Receipt', 'Debt', 
            'Supplies', 'PurchaseOrder', 'VendorPayment', 'Notification', 
            'Purchases', 'Vendor'
          ];

          tablesToUpdate.forEach(table => {
            db.run(`UPDATE ${table} SET companyId = ? WHERE companyId = ?`, 
              [remoteCompany.id, localCompanyId], (err) => {
                if (err) console.warn(`Warning: Failed to update ${table}:`, err.message);
              });
          });

          // Update Customer table (uses belongsTo instead of companyId)
          db.run(`UPDATE Customer SET belongsTo = ? WHERE belongsTo = ?`, 
            [remoteCompany.id, localCompanyId], (err) => {
              if (err) console.warn('Warning: Failed to update Customer:', err.message);
            });

          db.run('COMMIT', async (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              console.log(`Successfully adopted remote company ID: ${remoteCompany.id}`);
              
              // Broadcast success to clients
              this.wsServer.broadcastToCompany(remoteCompany.id, 'syncSuccess', {
                type: 'company_merged',
                message: `Company matched and synced successfully`,
                companyId: remoteCompany.id,
                timestamp: new Date().toISOString()
              });

              // Trigger download of all remote data for this company
              await this.downloadAllCompanyData(remoteCompany.id);
              
              resolve();
            }
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  // Download all data for a company from Supabase
  async downloadAllCompanyData(companyId) {
    try {
      console.log(`Downloading all data for company ${companyId}...`);
      
      for (const tableName of supabaseConfig.syncSettings.syncTables) {
        if (tableName === 'Company') continue; // Already synced
        
        try {
          const downloaded = await this.downloadChangesFromSupabase(tableName, companyId);
          console.log(`Downloaded ${downloaded} ${tableName} records`);
        } catch (error) {
          console.error(`Error downloading ${tableName}:`, error.message);
        }
      }
      
      console.log('Company data download complete');
    } catch (error) {
      console.error('Error downloading company data:', error);
    }
  }

  // Upload local changes to Supabase
  async uploadChangesToSupabase(tableName, companyId) {
    return new Promise((resolve, reject) => {
      // Convert table name to snake_case for Supabase
      const pgTableName = this.getSupabaseTableName(tableName);
      
      // Different filtering logic for Company table vs other tables
      let query, params;
      if (tableName === 'Company') {
        query = `
          SELECT * FROM ${tableName} 
          WHERE id = ? 
          AND (is_synced = 0 OR is_synced IS NULL)
          ORDER BY COALESCE(updatedAt, createdAt) ASC
          LIMIT ?
        `;
        params = [companyId, supabaseConfig.syncSettings.maxBatchSize];
      } else {
        // Check if table has companyId column
        // Define which tables have companyId column (using correct column names)
        const tablesWithCompanyId = ['Settings', 'Worker', 'Inventory', 'Receipt', 'Debt', 'Supplies', 'PurchaseOrder', 'VendorPayment', 'Notification', 'Purchases', 'Vendor'];
        // ReceiptDetail doesn't have companyId - it's linked through Receipt
        // DebtPayment doesn't have companyId - it's linked through Debt
        // SuppliesDetail doesn't have companyId - it's linked through Supplies
        // PurchaseOrderItem doesn't have companyId - it's linked through PurchaseOrder
        
        const tablesWithBelongsTo = ['Customer'];
        
        // Tables that don't have updatedAt column (use id for ordering instead)
        const tablesWithoutUpdatedAt = ['ReceiptDetail', 'DebtPayment', 'SuppliesDetail', 'PurchaseOrderItem'];
        const orderByClause = tablesWithoutUpdatedAt.includes(tableName) ? 'id ASC' : 'COALESCE(updatedAt, createdAt) ASC';
        
        if (tablesWithCompanyId.includes(tableName)) {
          query = `
            SELECT * FROM ${tableName} 
            WHERE companyId = ? 
            AND (is_synced = 0 OR is_synced IS NULL)
            ORDER BY ${orderByClause}
            LIMIT ?
          `;
          params = [companyId, supabaseConfig.syncSettings.maxBatchSize];
          console.log(`Querying ${tableName} with companyId filter`);
        } else if (tablesWithBelongsTo.includes(tableName)) {
          query = `
            SELECT * FROM ${tableName} 
            WHERE belongsTo = ? 
            AND (is_synced = 0 OR is_synced IS NULL)
            ORDER BY ${orderByClause}
            LIMIT ?
          `;
          params = [companyId, supabaseConfig.syncSettings.maxBatchSize];
          console.log(`Querying ${tableName} with belongsTo filter`);
        } else {
          // For tables without companyId, sync all records
          query = `
            SELECT * FROM ${tableName} 
            WHERE (is_synced = 0 OR is_synced IS NULL)
            ORDER BY ${orderByClause}
            LIMIT ?
          `;
          params = [supabaseConfig.syncSettings.maxBatchSize];
          console.log(`Querying ${tableName} without companyId filter`);
        }
      }

      db.all(query, params, async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        let uploadedCount = 0;
        for (const row of rows) {
          try {
            // Ensure sync_id exists
            if (!row.sync_id) {
              row.sync_id = this.generateSyncId();
              await this.updateSyncId(tableName, row.id, row.sync_id);
            }

            // Upload to Supabase
            // Transform data for Supabase if needed
            let recordToUpload = { ...row };
            if (tableName === 'Company' || tableName === 'Settings') {
              // Always map currency if it exists in the row (even if null)
              if ('currency' in row) {
                recordToUpload.currencyCode = row.currency;
                delete recordToUpload.currency;
              }
            }
            
            // Exclude displayUnit and onhandPrecision from Inventory (local only columns)
            if (tableName === 'Inventory') {
              if ('displayUnit' in recordToUpload) delete recordToUpload.displayUnit;
              if ('onhandPrecision' in recordToUpload) delete recordToUpload.onhandPrecision;
            }

            // Convert all camelCase keys to snake_case for Supabase
            recordToUpload = this.convertObjectToSnakeCase(recordToUpload);

            const { error } = await this.supabase.from(pgTableName).upsert(recordToUpload);
            
            if (error) {
              // Handle UNIQUE constraint violations
              if (error.code === '23505') { // PostgreSQL unique violation code
                // Special handling for Company table - try to verify and merge first
                if (tableName === 'Company' && (error.message.includes('companyName') || error.message.includes('email'))) {
                  console.log('Duplicate company detected, verifying credentials...');
                  
                  const verifyResult = await this.verifyAndMergeCompany(row);
                  
                  if (verifyResult.matched) {
                    // Credentials matched! Company was merged successfully
                    console.log('Company credentials matched and merged successfully');
                    uploadedCount++; // Count as uploaded since we merged
                    continue; // Skip to next record
                  }
                  
                  // Credentials didn't match, show conflict
                  console.log('Company credentials did not match:', verifyResult.reason);
                }
                
                // Create conflict for user resolution
                const conflict = {
                  table: tableName,
                  recordId: row.id,
                  type: 'duplicate',
                  timestamp: new Date().toISOString()
                };

                if (tableName === 'Company' && error.message.includes('companyName')) {
                  conflict.message = `Company name "${row.companyName}" already exists in Supabase`;
                  conflict.suggestions = [
                    { action: 'rename', label: 'Rename local company', description: 'Keep both companies with different names' },
                    { action: 'skip', label: 'Skip upload', description: 'Keep local company separate, don\'t sync to cloud' },
                    { action: 'merge', label: 'Use cloud version', description: 'Delete local and use the existing cloud company' }
                  ];
                  conflict.data = {
                    localName: row.companyName,
                    localId: row.id
                  };
                  
                  // Broadcast to connected clients
                  this.wsServer.broadcastToCompany(this.companyId, 'syncConflict', conflict);
                } else if (tableName === 'Company' && error.message.includes('email')) {
                  conflict.message = `Company email "${row.email}" already exists in Supabase`;
                  conflict.suggestions = [
                    { action: 'change_email', label: 'Change local email', description: 'Update the email address for this company' },
                    { action: 'skip', label: 'Skip upload', description: 'Keep local company separate, don\'t sync to cloud' },
                    { action: 'merge', label: 'Use cloud version', description: 'Delete local and use the existing cloud company' }
                  ];
                  conflict.data = {
                    localEmail: row.email,
                    localId: row.id
                  };
                  
                  // Broadcast to connected clients
                  this.wsServer.broadcastToCompany(this.companyId, 'syncConflict', conflict);
                } else {
                  conflict.message = `Duplicate ${tableName} record`;
                  conflict.suggestions = [
                    { action: 'skip', label: 'Skip upload', description: 'Keep local record separate' },
                    { action: 'overwrite', label: 'Force update', description: 'Update the cloud record with local data' }
                  ];
                  
                  // Broadcast to connected clients
                  this.wsServer.broadcastToCompany(this.companyId, 'syncConflict', conflict);
                }

                // Emit conflict event for frontend to handle
                this.emit('syncConflict', conflict);
                
                // Don't mark as synced yet - let user decide
                // Store conflict in a local table for user review
                await this.storeSyncConflict(conflict);
              } else {
                // Broadcast general upload error to clients
                this.wsServer.broadcastToCompany(this.companyId, 'syncError', {
                  type: 'upload_error',
                  table: tableName,
                  recordId: row.id,
                  message: `Failed to upload ${tableName} record: ${error.message}`,
                  error: error.message,
                  timestamp: new Date().toISOString()
                });
              }
              continue;
            }

            // Mark as synced locally
            await this.markRecordSynced(tableName, row.id);
            uploadedCount++;
            
          } catch (error) {
            console.error(`Failed to upload ${tableName} record ${row.id}:`, error);
          }
        }
        
        resolve(uploadedCount);
      });
    });
  }

  // Download changes from Supabase
  async downloadChangesFromSupabase(tableName, companyId) {
    try {
      // Convert table name to snake_case for Supabase
      const pgTableName = this.getSupabaseTableName(tableName);
      
      // Get last sync time for this table
      // Get last sync time for this table
      const lastSync = await this.getLastSupabaseSyncTime(tableName);
      
      // Define tables without updatedAt column
      const tablesWithoutUpdatedAt = ['ReceiptDetail', 'DebtPayment', 'SuppliesDetail', 'PurchaseOrderItem'];

      let query = this.supabase.from(pgTableName).select('*');
      
      // Filter by company if applicable - different logic for Company table
      if (companyId) {
        if (tableName === 'Company') {
          query = query.eq('id', companyId);
        } else {
          // Check if table has companyId column
          const tablesWithCompanyId = ['Settings', 'Worker', 'Inventory', 'Receipt', 'Debt', 'Supplies', 'PurchaseOrder', 'VendorPayment', 'Notification', 'Purchases', 'Vendor'];
          // ReceiptDetail doesn't have companyId - it's linked through Receipt
          // DebtPayment doesn't have companyId - it's linked through Debt
          // SuppliesDetail doesn't have companyId - it's linked through Supplies
          // PurchaseOrderItem doesn't have companyId - it's linked through PurchaseOrder
          
          const tablesWithBelongsTo = ['Customer'];
          
          // Tables that don't have updatedAt column (use id for ordering instead)
           // tablesWithoutUpdatedAt is defined above
           const orderByClause = tablesWithoutUpdatedAt.includes(tableName) ? 'id ASC' : 'COALESCE(updatedAt, createdAt) ASC';
          
          if (tablesWithCompanyId.includes(tableName)) {
            // Use camelCase for Supabase (matches schema)
            query = query.eq(this.getSupabaseColumnName('companyId'), companyId);
          } else if (tablesWithBelongsTo.includes(tableName)) {
            // Customer table uses 'belongsTo'
            query = query.eq(this.getSupabaseColumnName('belongsTo'), companyId);
          }
          // For tables without companyId, don't filter by company
        }
      }
      
      // Only get records updated since last sync
      if (lastSync) {
        // Tables without updatedAt cannot be filtered by timestamp efficiently in this scheme
        // We skip the filter for them to avoid errors, effectively doing a full sync for these tables
        // or we could use 'id' if we tracked last synced ID, but we track time.
        if (!tablesWithoutUpdatedAt.includes(tableName)) {
           // Use updatedAt for Supabase (matches schema)
           query = query.gt(this.getSupabaseColumnName('updatedAt'), lastSync);
        }
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      // Apply changes to local database
      for (const record of data || []) {
        // Transform data for local DB if needed
        if ((tableName === 'Company' || tableName === 'Settings') && record.currencyCode) {
          record.currency = record.currencyCode;
          delete record.currencyCode;
        }
        await this.applySupabaseChange(tableName, record);
      }

      // Update last sync time
      await this.updateLastSupabaseSyncTime(tableName);
      
      return data?.length || 0;
    } catch (error) {
      console.error(`Error downloading changes for ${tableName}:`, error);
      throw error;
    }
  }

  // Apply remote change from Supabase to local database
  async applySupabaseChange(tableName, record) {
    return new Promise((resolve, reject) => {
      // Convert snake_case keys from Supabase to camelCase for local database
      const localRecord = this.convertObjectToCamelCase(record);
      
      // Ensure sync_id is preserved as snake_case (as used in local DB)
      if (localRecord.syncId && !localRecord.sync_id) {
        localRecord.sync_id = localRecord.syncId;
        delete localRecord.syncId;
      }

      // Check if record exists locally
      // Determine which timestamp column to use
      const tablesWithoutUpdatedAt = ['ReceiptDetail', 'DebtPayment', 'SuppliesDetail', 'PurchaseOrderItem'];
      const timestampCol = tablesWithoutUpdatedAt.includes(tableName) ? 'id' : 'updatedAt'; // Fallback to id if no timestamp (not ideal but prevents error)
      
      let query = `SELECT id`;
      if (!tablesWithoutUpdatedAt.includes(tableName)) {
        query += `, updatedAt`;
      }
      query += ` FROM ${tableName} WHERE sync_id = ?`;

      db.get(query, [localRecord.sync_id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Check for conflict - Last Write Wins
          // Supabase record keys match local keys because we upserted them that way
          const remoteTime = new Date(localRecord.updatedAt || localRecord.createdAt || 0).getTime();
          
          let localTime = 0;
          if (row.updatedAt) {
            localTime = new Date(row.updatedAt).getTime();
          }


          if (remoteTime > localTime) {
            // Remote is newer, update local
            this.updateLocalRecord(tableName, localRecord, resolve, reject);
          } else {
            // Local is newer or equal, keep local
            console.log(`Conflict resolved: Keeping local version of ${tableName} ${row.id} (Local: ${row.updatedAt}, Remote: ${localRecord.updatedAt})`);
            resolve();
          }
        } else {
          // Insert new record
          this.insertLocalRecord(tableName, localRecord, resolve, reject);
        }
      });
    });
  }

  // Update local record from Supabase
  // Update local record from Supabase
  async updateLocalRecord(tableName, record, resolve, reject) {
    try {
      // Get valid columns for this table
      const validColumns = await this.getTableColumns(tableName);
      
      // Exclude id and createdAt from updates
      // createdAt should be immutable, and some local tables might not have it
      // Also exclude sync metadata fields that are camelCased but should be snake_case or handled explicitly
      const columns = Object.keys(record).filter(key => 
        key !== 'id' && 
        key !== 'createdAt' && 
        key !== 'isSynced' && 
        key !== 'lastSyncedAt' && 
        key !== 'syncId' && 
        key !== 'syncVersion' &&
        validColumns.includes(key) // Only include columns that exist in local DB
      );
      
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => {
        const val = record[col];
        if (val === undefined) return null;
        // Convert booleans to integers for SQLite
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        if (val !== null && typeof val === 'object' && !Buffer.isBuffer(val)) {
          return JSON.stringify(val);
        }
        return val;
      });
      values.push(record.sync_id);

      db.run(`
        UPDATE ${tableName} 
        SET ${setClause}, is_synced = 1, last_synced_at = CURRENT_TIMESTAMP 
        WHERE sync_id = ?
      `, values, function(err) {
        if (err) reject(err);
        else resolve();
      });
    } catch (error) {
      reject(error);
    }
  }

  // Insert local record from Supabase
  async insertLocalRecord(tableName, record, resolve, reject) {
    try {
      // Get valid columns for this table
      const validColumns = await this.getTableColumns(tableName);

      // Define tables that don't have createdAt/updatedAt
      const tablesWithoutTimestamp = ['ReceiptDetail', 'DebtPayment', 'SuppliesDetail', 'PurchaseOrderItem'];
      
      let columns = Object.keys(record);
    
      // Filter out timestamp columns for tables that don't have them
      if (tablesWithoutTimestamp.includes(tableName)) {
        columns = columns.filter(col => col !== 'createdAt' && col !== 'updatedAt');
      }

      // Filter out sync metadata fields that are camelCased
      columns = columns.filter(col => 
        col !== 'isSynced' && 
        col !== 'lastSyncedAt' && 
        col !== 'syncId' && 
        col !== 'syncVersion' &&
        validColumns.includes(col) // Only include columns that exist in local DB
      );

      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => {
        const val = record[col];
        if (val === undefined) return null;
        // Convert booleans to integers for SQLite
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        // Convert objects to JSON strings, but not Buffers or null
        if (val !== null && typeof val === 'object' && !Buffer.isBuffer(val)) {
          return JSON.stringify(val);
        }
        return val;
      });

      // Debug: Check for invalid types
      values.forEach((val, idx) => {
        const type = typeof val;
        if (val !== null && type !== 'string' && type !== 'number' && type !== 'bigint' && !Buffer.isBuffer(val)) {
          console.error(`Invalid type for column ${columns[idx]} in ${tableName}:`, type, val);
        }
      });

      db.run(`
        INSERT INTO ${tableName} (${columns.join(', ')}, is_synced, last_synced_at) 
        VALUES (${placeholders}, 1, CURRENT_TIMESTAMP)
      `, values, function(err) {
        if (err) {
          // Check if it's a foreign key constraint error
          if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            console.warn(`Skipping ${tableName} record due to missing foreign key reference:`, {
              table: tableName,
              columns: columns,
              values: values,
              record: record
            });
            // Resolve instead of reject to continue syncing other records
            resolve();
          } else {
            console.error(`Error inserting into ${tableName}:`, err.message);
            console.error('Columns:', columns);
            console.error('Values:', values);
            reject(err);
          }
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  }

  // Get table columns from SQLite
  async getTableColumns(tableName) {
    if (this.tableSchemas.has(tableName)) {
      return this.tableSchemas.get(tableName);
    }

    return new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
        if (err) {
          console.error(`Error getting schema for ${tableName}:`, err);
          // Fallback to empty array to avoid crash, but will likely cause other issues
          // Better to reject so we know something is wrong
          reject(err);
          return;
        }
        
        const columns = rows.map(row => row.name);
        this.tableSchemas.set(tableName, columns);
        resolve(columns);
      });
    });
  }

  // Update sync_id for a record
  async updateSyncId(tableName, recordId, syncId) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE ${tableName} SET sync_id = ? WHERE id = ?`, [syncId, recordId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Mark record as synced
  async markRecordSynced(tableName, recordId) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE ${tableName} 
        SET is_synced = 1, last_synced_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [recordId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Store sync conflict for user review
  async storeSyncConflict(conflict) {
    return new Promise((resolve, reject) => {
      // Create SyncConflicts table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS SyncConflicts (
          id TEXT PRIMARY KEY,
          tableName TEXT NOT NULL,
          recordId TEXT NOT NULL,
          conflictType TEXT NOT NULL,
          message TEXT NOT NULL,
          suggestions TEXT NOT NULL,
          data TEXT,
          status TEXT DEFAULT 'pending',
          resolvedAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Error creating SyncConflicts table:', err);
        }

        // Insert the conflict
        const conflictId = require('../utils/dbUtils').generateUUID();
        db.run(`
          INSERT INTO SyncConflicts (id, tableName, recordId, conflictType, message, suggestions, data, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
          conflictId,
          conflict.table,
          conflict.recordId,
          conflict.type,
          conflict.message,
          JSON.stringify(conflict.suggestions),
          JSON.stringify(conflict.data || {}),
        ], (err) => {
          if (err) {
            console.error('Error storing sync conflict:', err);
            reject(err);
          } else {
            resolve(conflictId);
          }
        });
      });
    });
  }

  // Get last sync time for a table from Supabase
  async getLastSupabaseSyncTime(tableName) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT completed_at FROM SyncLog 
        WHERE table_name = ? AND operation = 'supabase_sync' AND status = 'completed' 
        ORDER BY completed_at DESC LIMIT 1
      `, [tableName], (err, row) => {
        if (err) reject(err);
        else resolve(row?.completed_at || null);
      });
    });
  }

  // Update last sync time for Supabase
  async updateLastSupabaseSyncTime(tableName) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO SyncLog (table_name, operation, records_processed, status, completed_at)
        VALUES (?, 'supabase_sync', 0, 'completed', CURRENT_TIMESTAMP)
      `, [tableName], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Full Supabase sync for a company
  async syncWithSupabase(companyId) {
    if (!this.isSupabaseEnabled) {
      console.log('Supabase sync skipped - not configured');
      return { success: true, message: 'Supabase sync disabled', stats: {} };
    }
    
    if (this.supabaseSyncInProgress) {
      throw new Error('Supabase sync already in progress');
    }

    this.supabaseSyncInProgress = true;
    const startTime = Date.now();
    
    try {
      // Check connectivity
      await this.checkSupabaseConnectivity();
      
      if (!this.isOnline) {
        throw new Error('No internet connection available for Supabase sync');
      }

      console.log(`Starting Supabase sync for company ${companyId}...`);
      
      // Process outbox first
      await this.processSupabaseOutbox();
      
      // Sync each table in dependency order
      for (const tableName of supabaseConfig.syncSettings.syncTables) {
        console.log(`Syncing ${tableName} with Supabase...`);
        
        // Upload local changes
        const uploaded = await this.uploadChangesToSupabase(tableName, companyId);
        console.log(`Uploaded ${uploaded} ${tableName} records to Supabase`);
        
        // Download remote changes
        const downloaded = await this.downloadChangesFromSupabase(tableName, companyId);
        console.log(`Downloaded ${downloaded} ${tableName} records from Supabase`);
      }
      
      this.lastSupabaseSyncTime = new Date().toISOString();
      const duration = Date.now() - startTime;
      
      console.log(`Supabase sync completed in ${duration}ms`);
      this.emit('supabaseSyncCompleted', { success: true, duration, lastSyncTime: this.lastSupabaseSyncTime });
      
      return { success: true, duration, lastSyncTime: this.lastSupabaseSyncTime };
      
    } catch (error) {
      console.error('Supabase sync failed:', error);
      this.emit('supabaseSyncFailed', { error: error.message });
      throw error;
    } finally {
      this.supabaseSyncInProgress = false;
    }
  }

  // Start automatic Supabase sync
  startAutomaticSupabaseSync() {
    if (!this.isSupabaseEnabled) {
      console.log('Automatic Supabase sync skipped - not configured');
      return;
    }
    
    if (this.supabaseSyncInterval) {
      clearInterval(this.supabaseSyncInterval);
    }

    this.supabaseSyncInterval = setInterval(async () => {
      try {
        if (this.companyId && !this.supabaseSyncInProgress) {
          await this.syncWithSupabase(this.companyId);
        }
      } catch (error) {
        console.error('Automatic Supabase sync failed:', error);
      }
    }, supabaseConfig.syncSettings.batchSyncInterval);

    console.log(`Automatic Supabase sync started (interval: ${supabaseConfig.syncSettings.batchSyncInterval}ms)`);
  }

  // Stop automatic Supabase sync
  stopAutomaticSupabaseSync() {
    if (this.supabaseSyncInterval) {
      clearInterval(this.supabaseSyncInterval);
      this.supabaseSyncInterval = null;
      console.log('Automatic Supabase sync stopped');
    }
  }

  // Get sync logs
  async getSyncLogs(limit = 50) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM SyncLog 
        ORDER BY completed_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Get outbox statistics
  async getOutboxStats() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT operation, COUNT(*) as count 
        FROM SyncOutbox 
        GROUP BY operation
      `, [], (err, rows) => {
        if (err) reject(err);
        else {
          const stats = {
            totalPending: 0,
            byOperation: {}
          };
          
          rows.forEach(row => {
            stats.totalPending += row.count;
            stats.byOperation[row.operation] = row.count;
          });
          
          resolve(stats);
        }
      });
    });
  }

  // Get comprehensive sync status
  getComprehensiveSyncStatus() {
    return {
      // Peer-to-peer sync status
      isMaster: this.isMaster,
      queueSize: this.syncQueue.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      isRunning: this.isRunning,
      
      // Supabase sync status
      isOnline: this.isOnline,
      supabaseSyncInProgress: this.supabaseSyncInProgress,
      lastSupabaseSyncTime: this.lastSupabaseSyncTime,
      supabaseSyncEnabled: !!this.supabaseSyncInterval
    };
  }

  getStats() {
    return this.getComprehensiveSyncStatus();
  }

  shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Stop Supabase sync
    this.stopAutomaticSupabaseSync();
    
    this.isRunning = false;
    console.log('Sync Engine shutdown complete');
    this.emit('syncEngineStopped');
  }
}

module.exports = SyncEngine;