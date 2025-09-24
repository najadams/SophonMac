const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db/db');
const { createSupabaseServiceClient, supabaseConfig } = require('../config/supabase.config');

class SyncEngine extends EventEmitter {
  constructor(websocketServer, networkDiscovery) {
    super();
    this.wsServer = websocketServer;
    this.networkDiscovery = networkDiscovery;
    this.isMaster = false;
    this.syncQueue = [];
    this.lastSyncTimestamp = {};
    this.conflictResolutionStrategy = 'last-write-wins';
    this.syncInterval = null;
    this.isRunning = false;
    
    // Supabase sync properties
    this.supabase = createSupabaseServiceClient();
    this.isOnline = false;
    this.supabaseSyncInProgress = false;
    this.lastSupabaseSyncTime = null;
    this.supabaseSyncInterval = null;
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
    // Check for conflicts
    const conflict = this.detectConflict(record);
    
    if (conflict) {
      this.resolveConflict(record, conflict, sourcePeer);
    } else {
      this.applySyncRecord(record);
    }
  }

  detectConflict(record) {
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
          'INSERT OR REPLACE INTO Product (id, companyId, name, category, baseUnit, costPrice, salesPrice, onhand, reorderPoint, minimumStock, description, sku, barcode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.companyId, data.name, data.category, data.baseUnit, data.costPrice, data.salesPrice, data.onhand, data.reorderPoint, data.minimumStock, data.description, data.sku, data.barcode, data.createdAt, data.updatedAt]
        );
        break;
        
      case 'update':
        this.executeQuery(
          'UPDATE Product SET name=?, category=?, baseUnit=?, costPrice=?, salesPrice=?, onhand=?, reorderPoint=?, minimumStock=?, description=?, sku=?, barcode=?, updatedAt=? WHERE id=? AND companyId=?',
          [data.name, data.category, data.baseUnit, data.costPrice, data.salesPrice, data.onhand, data.reorderPoint, data.minimumStock, data.description, data.sku, data.barcode, data.updatedAt, data.id, data.companyId]
        );
        break;
        
      case 'delete':
        this.executeQuery(
          'DELETE FROM Product WHERE id=? AND companyId=?',
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
        'UPDATE Product SET onhand=?, updatedAt=? WHERE id=? AND companyId=?',
        [data.onhand, data.updatedAt, data.id, data.companyId]
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
    return uuidv4();
  }

  // ===== SUPABASE SYNC METHODS =====

  // Check internet connectivity
  async checkSupabaseConnectivity() {
    try {
      const { data, error } = await this.supabase.from('company').select('id').limit(1);
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
      
      stmt.run([tableName, recordId, operation, JSON.stringify(data), syncId], function(err) {
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
    
    // Convert table name to lowercase for PostgreSQL
    const pgTableName = table_name.toLowerCase();

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

  // Upload local changes to Supabase
  async uploadChangesToSupabase(tableName, companyId) {
    return new Promise((resolve, reject) => {
      // Convert table name to lowercase for PostgreSQL
      const pgTableName = tableName.toLowerCase();
      
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
        const tablesWithCompanyId = ['Settings', 'Worker', 'Inventory', 'Receipt', 'Debt', 'Supplies', 'PurchaseOrder', 'VendorPayment', 'Notification', 'Purchases'];
        // ReceiptDetail doesn't have companyId - it's linked through Receipt
        // DebtPayment doesn't have companyId - it's linked through Debt
        // SuppliesDetail doesn't have companyId - it's linked through Supplies
        // PurchaseOrderItem doesn't have companyId - it's linked through PurchaseOrder
        // Customer and Vendor tables will sync all records for now (no company filtering)
        const tablesWithBelongsTo = [];
        
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
            const { error } = await this.supabase.from(pgTableName).upsert(row);
            
            if (error) {
              console.error(`Error uploading ${tableName} record ${row.id}:`, error);
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
      // Convert table name to lowercase for PostgreSQL
      const pgTableName = tableName.toLowerCase();
      
      // Get last sync time for this table
      const lastSync = await this.getLastSupabaseSyncTime(tableName);
      
      let query = this.supabase.from(pgTableName).select('*');
      
      // Filter by company if applicable - different logic for Company table
      if (companyId) {
        if (tableName === 'Company') {
          query = query.eq('id', companyId);
        } else {
          // Check if table has companyId column
          const tablesWithCompanyId = ['Settings', 'Worker', 'Inventory', 'Receipt', 'Debt', 'Supplies', 'PurchaseOrder', 'VendorPayment', 'Notification', 'Purchases'];
          // ReceiptDetail doesn't have companyId - it's linked through Receipt
          // DebtPayment doesn't have companyId - it's linked through Debt
          // SuppliesDetail doesn't have companyId - it's linked through Supplies
          // PurchaseOrderItem doesn't have companyId - it's linked through PurchaseOrder
          // Customer and Vendor tables will sync all records for now (no company filtering)
          const tablesWithBelongsTo = [];
          
          // Tables that don't have updatedAt column (use id for ordering instead)
           const tablesWithoutUpdatedAt = ['ReceiptDetail', 'DebtPayment', 'SuppliesDetail', 'PurchaseOrderItem'];
           const orderByClause = tablesWithoutUpdatedAt.includes(tableName) ? 'id ASC' : 'COALESCE(updatedAt, createdAt) ASC';
          
          if (tablesWithCompanyId.includes(tableName)) {
            // Use snake_case for PostgreSQL/Supabase
            query = query.eq('company_id', companyId);
          } else if (tablesWithBelongsTo.includes(tableName)) {
            // For Customer and Vendor tables, try different column name variations
            // First try company_id (standard), then belongs_to, then belongsTo
            try {
              query = query.eq('company_id', companyId);
            } catch (e) {
              try {
                query = query.eq('belongs_to', companyId);
              } catch (e2) {
                query = query.eq('belongsTo', companyId);
              }
            }
          }
          // For tables without companyId, don't filter by company
        }
      }
      
      // Only get records updated since last sync
      if (lastSync) {
        // Use updated_at for Supabase (PostgreSQL naming convention)
        query = query.gt('updated_at', lastSync);
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }

      // Apply changes to local database
      for (const record of data || []) {
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
      // Check if record exists locally
      db.get(`SELECT id FROM ${tableName} WHERE sync_id = ?`, [record.sync_id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing record
          this.updateLocalRecord(tableName, record, resolve, reject);
        } else {
          // Insert new record
          this.insertLocalRecord(tableName, record, resolve, reject);
        }
      });
    });
  }

  // Update local record from Supabase
  updateLocalRecord(tableName, record, resolve, reject) {
    const columns = Object.keys(record).filter(key => key !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => record[col]);
    values.push(record.sync_id);

    db.run(`
      UPDATE ${tableName} 
      SET ${setClause}, is_synced = 1, last_synced_at = CURRENT_TIMESTAMP 
      WHERE sync_id = ?
    `, values, function(err) {
      if (err) reject(err);
      else resolve();
    });
  }

  // Insert local record from Supabase
  insertLocalRecord(tableName, record, resolve, reject) {
    const columns = Object.keys(record).filter(key => key !== 'id');
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);

    db.run(`
      INSERT INTO ${tableName} (${columns.join(', ')}, is_synced, last_synced_at) 
      VALUES (${placeholders}, 1, CURRENT_TIMESTAMP)
    `, values, function(err) {
      if (err) reject(err);
      else resolve();
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