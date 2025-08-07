const EventEmitter = require('events');
const db = require('../data/db/db');

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
    return `${this.networkDiscovery.getInstanceId()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      isMaster: this.isMaster,
      queueSize: this.syncQueue.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      isRunning: this.isRunning
    };
  }

  shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
    console.log('Sync Engine shutdown');
    this.emit('syncEngineStopped');
  }
}

module.exports = SyncEngine;