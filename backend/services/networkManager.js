const NetworkDiscoveryService = require('./networkDiscovery');
const WebSocketServer = require('./websocketServer');
const SyncEngine = require('./syncEngine');
const EventEmitter = require('events');
const db = require('../data/db/db');
const networkConfig = require('../config/network.config');

class NetworkManager extends EventEmitter {
  constructor() {
    super();
    this.networkDiscovery = new NetworkDiscoveryService();
    this.websocketServer = new WebSocketServer();
    this.syncEngine = new SyncEngine(this.websocketServer, this.networkDiscovery);
    
    this.isInitialized = false;
    // Use configuration from network.config.js with database overrides
    this.networkConfig = {
      autoDiscovery: networkConfig.discovery.serviceName ? true : false,
      autoSync: networkConfig.sync.interval > 0,
      masterElection: true,
      conflictResolution: networkConfig.sync.conflictResolution || 'last-write-wins',
      // Include all config sections for easy access
      server: networkConfig.server,
      discovery: networkConfig.discovery,
      sync: networkConfig.sync,
      websocket: networkConfig.websocket,
      security: networkConfig.security,
      monitoring: networkConfig.monitoring,
      debug: networkConfig.debug
    };
    
    this.setupEventListeners();
  }

  async initialize(httpServer, port, companyId, companyName) {
    try {
      console.log('Initializing Network Manager...');
      
      // Initialize network configuration
      await this.loadNetworkConfig(companyId);
      
      // Initialize WebSocket server
      this.websocketServer.initialize(httpServer);
      
      // Initialize network discovery
      const discoveryInitialized = await this.networkDiscovery.initialize(port, companyId, companyName);
      if (!discoveryInitialized) {
        throw new Error('Failed to initialize network discovery');
      }
      
      // Determine if this instance should be master
      const shouldBeMaster = await this.determineMasterRole();
      
      // Initialize sync engine
      this.syncEngine.initialize(companyId, shouldBeMaster);
      
      // Start network services
      if (this.networkConfig.autoDiscovery) {
        this.startNetworkDiscovery(shouldBeMaster);
      }
      
      this.isInitialized = true;
      
      console.log(`Network Manager initialized successfully - Master: ${shouldBeMaster}`);
      this.emit('networkManagerReady', {
        isMaster: shouldBeMaster,
        instanceId: this.networkDiscovery.getInstanceId(),
        companyId,
        companyName
      });
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize Network Manager:', error);
      this.emit('networkManagerError', error);
      return false;
    }
  }

  setupEventListeners() {
    // Network Discovery Events
    this.networkDiscovery.on('peerDiscovered', (peer) => {
      console.log(`Network Manager: Peer discovered - ${peer.name}`);
      this.emit('peerDiscovered', peer);
      
      // Check if we need to step down as master
      if (peer.isMaster && this.syncEngine.isMaster) {
        this.handleMasterConflict(peer);
      }
    });
    
    this.networkDiscovery.on('peerDisconnected', (peer) => {
      console.log(`Network Manager: Peer disconnected - ${peer.name}`);
      this.emit('peerDisconnected', peer);
    });
    
    // WebSocket Events
    this.websocketServer.on('clientConnected', (client) => {
      this.emit('clientConnected', client);
    });
    
    this.websocketServer.on('clientDisconnected', (client) => {
      this.emit('clientDisconnected', client);
    });
    
    // Sync Engine Events
    this.syncEngine.on('becameMaster', () => {
      console.log('Network Manager: This instance became master');
      this.emit('masterChanged', {
        isMaster: true,
        instanceId: this.networkDiscovery.getInstanceId()
      });
    });
    
    this.syncEngine.on('syncError', (error) => {
      console.error('Network Manager: Sync error:', error);
      this.emit('syncError', error);
    });
  }

  async loadNetworkConfig(companyId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM NetworkConfig WHERE companyId = ?',
        [companyId],
        (err, row) => {
          if (err) {
            console.error('Error loading network config:', err);
            // Use defaults if no config found
            resolve();
          } else if (row) {
            this.networkConfig = {
              ...this.networkConfig,
              ...JSON.parse(row.config)
            };
            console.log('Network config loaded:', this.networkConfig);
          }
          resolve();
        }
      );
    });
  }

  async saveNetworkConfig(companyId) {
    return new Promise((resolve, reject) => {
      const configJson = JSON.stringify(this.networkConfig);
      
      db.run(
        'INSERT OR REPLACE INTO NetworkConfig (companyId, config, updatedAt) VALUES (?, ?, ?)',
        [companyId, configJson, new Date().toISOString()],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async determineMasterRole() {
    // Check if there are any existing masters on the network
    // For now, simple logic: first instance becomes master
    const peers = this.networkDiscovery.getPeers();
    const existingMaster = peers.find(peer => peer.isMaster);
    
    if (existingMaster) {
      console.log(`Existing master found: ${existingMaster.name}`);
      return false;
    }
    
    // Check database for previous master preference
    return new Promise((resolve) => {
      db.get(
        'SELECT isMaster FROM NetworkConfig WHERE companyId = ?',
        [this.syncEngine.companyId],
        (err, row) => {
          if (err || !row) {
            // Default to master if no config or error
            resolve(true);
          } else {
            resolve(row.isMaster === 1);
          }
        }
      );
    });
  }

  startNetworkDiscovery(isMaster) {
    this.networkDiscovery.startAdvertising(isMaster);
    this.networkDiscovery.startDiscovery();
    this.networkDiscovery.startPeriodicCleanup();
    
    console.log('Network discovery started');
  }

  handleMasterConflict(peer) {
    console.log('Master conflict detected, resolving...');
    
    // Simple resolution: older instance wins
    if (peer.timestamp < Date.now()) {
      console.log('Stepping down as master due to older peer');
      this.syncEngine.isMaster = false;
      this.networkDiscovery.updateServiceInfo({ isMaster: false });
      
      this.emit('masterChanged', {
        isMaster: false,
        newMaster: peer.instanceId
      });
    }
  }

  // Public API Methods
  
  getNetworkStatus() {
    return {
      isInitialized: this.isInitialized,
      instanceId: this.networkDiscovery.getInstanceId(),
      isMaster: this.syncEngine.isMaster,
      peers: this.networkDiscovery.getPeers(),
      connectedClients: this.websocketServer.getStats().connectedClients,
      syncStats: this.syncEngine.getStats(),
      config: this.networkConfig
    };
  }

  getConnectedPeers() {
    return this.networkDiscovery.getPeers();
  }

  getConnectedClients() {
    return this.websocketServer.getCompanyClients(this.syncEngine.companyId);
  }

  async updateNetworkConfig(newConfig) {
    this.networkConfig = { ...this.networkConfig, ...newConfig };
    
    try {
      await this.saveNetworkConfig(this.syncEngine.companyId);
      
      // Apply configuration changes
      if (newConfig.hasOwnProperty('autoDiscovery')) {
        if (newConfig.autoDiscovery && !this.networkDiscovery.isAdvertising()) {
          this.startNetworkDiscovery(this.syncEngine.isMaster);
        } else if (!newConfig.autoDiscovery && this.networkDiscovery.isAdvertising()) {
          this.stopNetworkDiscovery();
        }
      }
      
      if (newConfig.hasOwnProperty('conflictResolution')) {
        this.syncEngine.conflictResolutionStrategy = newConfig.conflictResolution;
      }
      
      this.emit('configUpdated', this.networkConfig);
      return true;
      
    } catch (error) {
      console.error('Failed to update network config:', error);
      return false;
    }
  }

  forceMasterRole() {
    if (!this.syncEngine.isMaster) {
      this.syncEngine.becomeMaster();
      return true;
    }
    return false;
  }

  forceSlaveRole() {
    if (this.syncEngine.isMaster) {
      this.syncEngine.isMaster = false;
      this.networkDiscovery.updateServiceInfo({ isMaster: false });
      
      this.emit('masterChanged', {
        isMaster: false,
        instanceId: this.networkDiscovery.getInstanceId()
      });
      return true;
    }
    return false;
  }

  broadcastToNetwork(event, data) {
    // Broadcast to all connected clients
    this.websocketServer.broadcastToCompany(this.syncEngine.companyId, event, data);
    
    // Broadcast to all connected peers
    this.websocketServer.broadcastToPeers(event, data);
  }

  sendToClient(clientId, event, data) {
    this.websocketServer.sendToClient(clientId, event, data);
  }

  requestFullSync() {
    if (!this.syncEngine.isMaster) {
      const masterPeer = this.networkDiscovery.getMasterPeer();
      if (masterPeer) {
        console.log('Requesting full sync from master');
        // Implementation would send sync request to master
        return true;
      }
    }
    return false;
  }

  stopNetworkDiscovery() {
    this.networkDiscovery.stopAdvertising();
    this.networkDiscovery.stopDiscovery();
    console.log('Network discovery stopped');
  }

  async shutdown() {
    console.log('Shutting down Network Manager...');
    
    try {
      // Save current configuration
      if (this.syncEngine.companyId) {
        await this.saveNetworkConfig(this.syncEngine.companyId);
      }
      
      // Shutdown services
      this.syncEngine.shutdown();
      this.websocketServer.shutdown();
      this.stopNetworkDiscovery();
      
      this.isInitialized = false;
      
      console.log('Network Manager shutdown complete');
      this.emit('networkManagerShutdown');
      
    } catch (error) {
      console.error('Error during Network Manager shutdown:', error);
    }
  }

  // Diagnostic methods
  
  runNetworkDiagnostics() {
    const diagnostics = {
      timestamp: Date.now(),
      networkDiscovery: {
        isRunning: this.networkDiscovery.isAdvertising(),
        instanceId: this.networkDiscovery.getInstanceId(),
        peersFound: this.networkDiscovery.getPeers().length
      },
      websocket: {
        stats: this.websocketServer.getStats()
      },
      sync: {
        stats: this.syncEngine.getStats()
      },
      config: this.networkConfig
    };
    
    console.log('Network Diagnostics:', JSON.stringify(diagnostics, null, 2));
    return diagnostics;
  }

  testPeerConnectivity() {
    const peers = this.networkDiscovery.getPeers();
    const results = [];
    
    peers.forEach(peer => {
      // Simple connectivity test
      const result = {
        peer: peer.name,
        instanceId: peer.instanceId,
        host: peer.host,
        port: peer.port,
        lastSeen: peer.lastSeen,
        status: Date.now() - peer.lastSeen < 30000 ? 'connected' : 'stale'
      };
      
      results.push(result);
    });
    
    return results;
  }
}

module.exports = NetworkManager;