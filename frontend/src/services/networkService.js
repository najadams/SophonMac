import { io } from 'socket.io-client';
import axios from '../config/index.js';

class NetworkService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
    this.token = null;
    this.networkStatus = {
      isOnline: false,
      isMaster: false,
      connectedPeers: [],
      lastSync: null
    };
    
    // Monitor network interface connectivity
    this.setupNetworkMonitoring();
  }

  // Initialize WebSocket connection
  async initialize(token, companyId) {
    try {
      this.token = token; // Store token for API requests
      
      const baseURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3003' 
        : `http://${window.location.hostname}:3003`;

      this.socket = io(baseURL, {
        auth: {
          token: token,
          companyId: companyId
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
      
      return new Promise((resolve) => {
        this.socket.on('connect', async () => {
          console.log('Connected to networking service');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          await this.updateNetworkStatus();
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.isConnected = false;
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to initialize network service:', error);
      return false;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from networking service:', reason);
      this.isConnected = false;
      // Check actual network connectivity instead of assuming offline
      this.checkNetworkConnectivity();
      this.handleReconnection();
    });

    // Network status updates
    this.socket.on('network_status', async (status) => {
      const isActuallyOnline = await this.checkNetworkConnectivity();
      this.networkStatus = { 
        ...this.networkStatus, 
        ...status,
        isOnline: isActuallyOnline // Ensure isOnline reflects actual network connectivity
      };
      this.emit('networkStatusChanged', this.networkStatus);
    });

    // Peer updates
    this.socket.on('peer_connected', (peer) => {
      console.log('Peer connected:', peer);
      this.emit('peerConnected', peer);
    });

    this.socket.on('peer_disconnected', (peerId) => {
      console.log('Peer disconnected:', peerId);
      this.emit('peerDisconnected', peerId);
    });

    // Data synchronization events
    this.socket.on('data_sync', (data) => {
      console.log('Received data sync:', data);
      this.emit('dataSync', data);
    });

    this.socket.on('sync_complete', (result) => {
      console.log('Sync completed:', result);
      this.networkStatus.lastSync = new Date().toISOString();
      this.emit('syncComplete', result);
    });

    // Conflict resolution
    this.socket.on('sync_conflict', (conflict) => {
      console.log('Sync conflict detected:', conflict);
      this.emit('syncConflict', conflict);
    });

    // Network messages
    this.socket.on('network_message', (message) => {
      console.log('Network message received:', message);
      this.emit('networkMessage', message);
    })
  }

  // Get axios config with authentication (now handled by centralized config)
  getAxiosConfig() {
    // The centralized axios instance already handles authentication
    // Return empty config since headers are handled by interceptors
    return {};
  }

  // Handle reconnection
  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connectionFailed');
    }
  }

  // Setup network interface monitoring
  setupNetworkMonitoring() {
    // Create bound handler functions for proper cleanup
    this.handleOnline = () => {
      console.log('Network interface came online');
      this.checkNetworkConnectivity();
    };
    
    this.handleOffline = () => {
      console.log('Network interface went offline');
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: false
      };
      this.emit('networkStatusChanged', this.networkStatus);
    };
    
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Periodic connectivity check every 30 seconds
    this.connectivityInterval = setInterval(() => {
      this.checkNetworkConnectivity();
    }, 30000);
    
    // Initial connectivity check
    this.checkNetworkConnectivity();
  }

  // Check actual network connectivity
  async checkNetworkConnectivity() {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: false
      };
      this.emit('networkStatusChanged', this.networkStatus);
      return false;
    }
    
    // Additional connectivity test - try to reach the backend
    try {
      const response = await fetch('/api/network/status', {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 5000
      });
      
      const actuallyOnline = response.ok;
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: actuallyOnline
      };
      this.emit('networkStatusChanged', this.networkStatus);
      return actuallyOnline;
    } catch (error) {
      console.log('Network connectivity test failed:', error);
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: false
      };
      this.emit('networkStatusChanged', this.networkStatus);
      return false;
    }
  }

  // Update network status from API
  async updateNetworkStatus() {
    try {
      const response = await axios.get('/api/network/status', this.getAxiosConfig());
      const isActuallyOnline = await this.checkNetworkConnectivity();
      
      this.networkStatus = { 
        ...this.networkStatus, 
        ...(response.data.data || response.data),
        isOnline: isActuallyOnline // Set based on actual network connectivity
      };
      this.emit('networkStatusChanged', this.networkStatus);
    } catch (error) {
      console.error('Failed to update network status:', error);
      // If API call fails, check network connectivity
      const isActuallyOnline = await this.checkNetworkConnectivity();
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: isActuallyOnline
      };
      this.emit('networkStatusChanged', this.networkStatus);
    }
  }

  // Get current network status
  getNetworkStatus() {
    return this.networkStatus;
  }

  // Get connected peers
  async getConnectedPeers() {
    try {
      const response = await axios.get('/api/network/peers', this.getAxiosConfig());
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get connected peers:', error);
      return [];
    }
  }

  // Force synchronization
  async forceSync() {
    try {
      const response = await axios.post('/api/network/sync/full', {}, this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }

  // Send network message
  sendMessage(type, data, targetPeer = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('network_message', {
        type,
        data,
        targetPeer,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Request data from peers
  requestData(dataType, filters = {}) {
    this.sendMessage('data_request', {
      dataType,
      filters
    });
  }

  // Broadcast data change
  broadcastDataChange(table, operation, data) {
    this.sendMessage('data_change', {
      table,
      operation,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Network configuration
  async getNetworkConfig() {
    try {
      const response = await axios.get('/api/network/config', this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to get network config:', error);
      throw error;
    }
  }

  async updateNetworkConfig(config) {
    try {
      const response = await axios.put('/api/network/config', config, this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to update network config:', error);
      throw error;
    }
  }

  // Force role change
  async forceMaster() {
    try {
      const response = await axios.post('/api/network/master/force', {}, this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to force master role:', error);
      throw error;
    }
  }

  async forceSlave() {
    try {
      const response = await axios.post('/api/network/slave/force', {}, this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to force slave role:', error);
      throw error;
    }
  }

  // Get sync conflicts
  async getSyncConflicts() {
    try {
      const response = await axios.get('/api/network/conflicts', this.getAxiosConfig());
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get sync conflicts:', error);
      return [];
    }
  }

  // Resolve sync conflict
  async resolveSyncConflict(conflictId, resolution) {
    try {
      const response = await axios.post(`/api/network/conflicts/${conflictId}/resolve`, {
        resolution
      }, this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to resolve sync conflict:', error);
      throw error;
    }
  }

  // Run network diagnostics
  async runDiagnostics() {
    try {
      const response = await axios.get('/api/network/diagnostics', this.getAxiosConfig());
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to run network diagnostics:', error);
      throw error;
    }
  }

  // Disconnect and cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    
    // Clear connectivity monitoring
    if (this.connectivityInterval) {
      clearInterval(this.connectivityInterval);
      this.connectivityInterval = null;
    }
    
    // Remove network event listeners
    if (this.handleOnline) {
      window.removeEventListener('online', this.handleOnline);
    }
    if (this.handleOffline) {
      window.removeEventListener('offline', this.handleOffline);
    }
    
    this.eventListeners.clear();
    
    this.networkStatus = {
      isOnline: false,
      isMaster: false,
      connectedPeers: [],
      lastSync: null
    };
  }

  // Check if connected
  isNetworkConnected() {
    return this.isConnected;
  }
}

// Create singleton instance
const networkService = new NetworkService();
export default networkService;