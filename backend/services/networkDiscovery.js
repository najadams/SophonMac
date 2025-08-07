const bonjour = require('bonjour')();
const { machineId } = require('node-machine-id');
const EventEmitter = require('events');

// Handle bonjour errors gracefully
process.on('uncaughtException', (error) => {
  if ((error.code === 'EHOSTUNREACH' || error.code === 'EADDRNOTAVAIL') && error.address === '224.0.0.251') {
    console.warn('mDNS multicast not available - network discovery disabled');
    return;
  }
  throw error;
});

class NetworkDiscoveryService extends EventEmitter {
  constructor() {
    super();
    this.instanceId = null;
    this.service = null;
    this.discoveredPeers = new Map();
    this.isRunning = false;
    this.serviceType = 'sophon-pos';
    this.port = null;
    this.companyId = null;
  }

  async initialize(port, companyId, companyName) {
    try {
      this.instanceId = await machineId();
      this.port = port;
      this.companyId = companyId;
      this.companyName = companyName;
      
      console.log(`Network Discovery initialized for instance: ${this.instanceId}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize network discovery:', error);
      return false;
    }
  }

  startAdvertising(isMaster = false) {
    if (this.service) {
      this.stopAdvertising();
    }

    const serviceData = {
      name: `Sophon-${this.companyName}-${this.instanceId.substring(0, 8)}`,
      type: this.serviceType,
      port: this.port,
      txt: {
        instanceId: this.instanceId,
        companyId: this.companyId.toString(),
        companyName: this.companyName,
        isMaster: isMaster.toString(),
        version: '1.0.0',
        capabilities: 'sync,realtime,inventory,sales',
        timestamp: Date.now().toString()
      }
    };

    try {
      this.service = bonjour.publish(serviceData);
      this.isRunning = true;
      
      console.log(`Started advertising Sophon service: ${serviceData.name}`);
      this.emit('serviceStarted', serviceData);
    } catch (error) {
      console.warn('Failed to start mDNS advertising:', error.message);
      console.log('Network discovery disabled - continuing without auto-discovery');
      this.emit('serviceStarted', { ...serviceData, discoveryDisabled: true });
    }
  }

  startDiscovery() {
    try {
      // Browse for other Sophon instances
      const browser = bonjour.find({ type: this.serviceType }, (service) => {
        this.handleServiceDiscovered(service);
      });

      // Listen for service updates
      browser.on('up', (service) => {
        this.handleServiceDiscovered(service);
      });

      browser.on('down', (service) => {
        this.handleServiceRemoved(service);
      });

      console.log('Started discovering Sophon services on network');
      this.emit('discoveryStarted');
    } catch (error) {
      console.warn('Failed to start mDNS discovery:', error.message);
      console.log('Network discovery disabled - manual peer configuration required');
      this.emit('discoveryStarted', { discoveryDisabled: true });
    }
  }

  handleServiceDiscovered(service) {
    // Don't discover ourselves
    if (service.txt && service.txt.instanceId === this.instanceId) {
      return;
    }

    // Only discover services from the same company
    if (service.txt && service.txt.companyId !== this.companyId.toString()) {
      return;
    }

    const peerInfo = {
      instanceId: service.txt?.instanceId,
      companyId: service.txt?.companyId,
      companyName: service.txt?.companyName,
      isMaster: service.txt?.isMaster === 'true',
      host: service.host,
      port: service.port,
      name: service.name,
      capabilities: service.txt?.capabilities?.split(',') || [],
      version: service.txt?.version,
      timestamp: parseInt(service.txt?.timestamp) || Date.now(),
      lastSeen: Date.now()
    };

    this.discoveredPeers.set(peerInfo.instanceId, peerInfo);
    
    console.log(`Discovered peer: ${peerInfo.name} (${peerInfo.host}:${peerInfo.port})`);
    this.emit('peerDiscovered', peerInfo);
  }

  handleServiceRemoved(service) {
    if (service.txt && service.txt.instanceId) {
      const peerInfo = this.discoveredPeers.get(service.txt.instanceId);
      if (peerInfo) {
        this.discoveredPeers.delete(service.txt.instanceId);
        console.log(`Peer disconnected: ${peerInfo.name}`);
        this.emit('peerDisconnected', peerInfo);
      }
    }
  }

  stopAdvertising() {
    if (this.service) {
      this.service.stop();
      this.service = null;
      this.isRunning = false;
      console.log('Stopped advertising Sophon service');
      this.emit('serviceStopped');
    }
  }

  stopDiscovery() {
    bonjour.destroy();
    this.discoveredPeers.clear();
    console.log('Stopped network discovery');
    this.emit('discoveryStopped');
  }

  getPeers() {
    return Array.from(this.discoveredPeers.values());
  }

  getMasterPeer() {
    return this.getPeers().find(peer => peer.isMaster);
  }

  getInstanceId() {
    return this.instanceId;
  }

  isAdvertising() {
    return this.isRunning;
  }

  updateServiceInfo(updates) {
    if (this.service && this.isRunning) {
      // Stop and restart with updated info
      const wasMaster = this.service.txt?.isMaster === 'true';
      this.stopAdvertising();
      this.startAdvertising(updates.isMaster !== undefined ? updates.isMaster : wasMaster);
    }
  }

  // Clean up stale peers (haven't been seen for more than 30 seconds)
  cleanupStalePeers() {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds
    
    for (const [instanceId, peer] of this.discoveredPeers.entries()) {
      if (now - peer.lastSeen > staleThreshold) {
        this.discoveredPeers.delete(instanceId);
        console.log(`Removed stale peer: ${peer.name}`);
        this.emit('peerDisconnected', peer);
      }
    }
  }

  // Start periodic cleanup
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupStalePeers();
    }, 10000); // Check every 10 seconds
  }
}

module.exports = NetworkDiscoveryService;