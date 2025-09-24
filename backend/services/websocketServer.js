const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const EventEmitter = require('events');
const networkConfig = require('../config/network.config');

class WebSocketServer extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.server = null;
    this.connectedClients = new Map();
    this.connectedPeers = new Map();
    this.isRunning = false;
  }

  initialize(httpServer) {
    this.server = httpServer;
    this.io = new Server(httpServer, {
      cors: networkConfig.websocket.cors || {
        origin: ['http://localhost:5173', 'http://localhost:3002', 'http://localhost:3003'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: networkConfig.websocket.pingTimeout || 60000,
      pingInterval: networkConfig.websocket.pingInterval || 25000,
      maxHttpBufferSize: networkConfig.websocket.maxHttpBufferSize || 1e6
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.isRunning = true;
    
    console.log('WebSocket server initialized');
    this.emit('serverStarted');
  }

  setupMiddleware() {
    // Authentication middleware for client connections
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        socket.companyId = decoded.companyId;
        socket.role = decoded.role;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleClientConnection(socket);
    });

    // Create a separate namespace for peer-to-peer communication
    const peerNamespace = this.io.of('/peers');
    peerNamespace.on('connection', (socket) => {
      this.handlePeerConnection(socket);
    });
  }

  handleClientConnection(socket) {
    const clientInfo = {
      id: socket.id,
      userId: socket.userId,
      companyId: socket.companyId,
      role: socket.role,
      connectedAt: Date.now()
    };

    this.connectedClients.set(socket.id, clientInfo);
    
    console.log(`Company: ${socket.companyId})`);
    this.emit('clientConnected', clientInfo);

    // Join company-specific room
    socket.join(`company_${socket.companyId}`);

    // Handle client events
    socket.on('disconnect', () => {
      this.handleClientDisconnection(socket);
    });

    socket.on('sync_request', (data) => {
      this.handleSyncRequest(socket, data);
    });

    socket.on('data_change', (data) => {
      this.handleDataChange(socket, data);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Send initial sync data
    this.sendInitialSyncData(socket);
  }

  handlePeerConnection(socket) {
    console.log(`Peer connected: ${socket.id}`);
    
    socket.on('peer_auth', (data) => {
      // Authenticate peer connection
      if (this.validatePeerAuth(data)) {
        const peerInfo = {
          id: socket.id,
          instanceId: data.instanceId,
          companyId: data.companyId,
          isMaster: data.isMaster,
          connectedAt: Date.now()
        };
        
        this.connectedPeers.set(socket.id, peerInfo);
        socket.emit('peer_auth_success', { accepted: true });
        
        console.log(`Peer authenticated: ${data.instanceId}`);
        this.emit('peerConnected', peerInfo);
      } else {
        socket.emit('peer_auth_failed', { reason: 'Invalid credentials' });
        socket.disconnect();
      }
    });

    socket.on('sync_data', (data) => {
      this.handlePeerSyncData(socket, data);
    });

    socket.on('disconnect', () => {
      this.handlePeerDisconnection(socket);
    });
  }

  handleClientDisconnection(socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      this.connectedClients.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
      this.emit('clientDisconnected', clientInfo);
    }
  }

  handlePeerDisconnection(socket) {
    const peerInfo = this.connectedPeers.get(socket.id);
    if (peerInfo) {
      this.connectedPeers.delete(socket.id);
      console.log(`Peer disconnected: ${socket.id}`);
      this.emit('peerDisconnected', peerInfo);
    }
  }

  handleSyncRequest(socket, data) {
    console.log(`Sync request from ${socket.id}:`, data);
    this.emit('syncRequest', {
      socket,
      clientInfo: this.connectedClients.get(socket.id),
      data
    });
  }

  handleDataChange(socket, data) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    // Broadcast change to other clients in the same company
    socket.to(`company_${clientInfo.companyId}`).emit('data_updated', {
      type: data.type,
      operation: data.operation,
      data: data.data,
      timestamp: Date.now(),
      sourceClient: socket.id
    });

    // Broadcast to connected peers
    this.broadcastToPeers('data_change', {
      companyId: clientInfo.companyId,
      type: data.type,
      operation: data.operation,
      data: data.data,
      timestamp: Date.now()
    });

    console.log(`Data change broadcasted: ${data.type} - ${data.operation}`);
    this.emit('dataChange', { socket, clientInfo, data });
  }

  handlePeerSyncData(socket, data) {
    console.log(`Peer sync data received from ${socket.id}`);
    this.emit('peerSyncData', {
      socket,
      peerInfo: this.connectedPeers.get(socket.id),
      data
    });
  }

  sendInitialSyncData(socket) {
    // This will be implemented to send initial data to newly connected clients
    socket.emit('sync_status', {
      status: 'ready',
      timestamp: Date.now(),
      message: 'Connected to Sophon network'
    });
  }

  validatePeerAuth(data) {
    // Implement peer authentication logic
    // For now, basic validation
    return data.instanceId && data.companyId;
  }

  // Broadcast to all clients in a company
  broadcastToCompany(companyId, event, data) {
    this.io.to(`company_${companyId}`).emit(event, data);
  }

  // Broadcast to all connected peers
  broadcastToPeers(event, data) {
    this.io.of('/peers').emit(event, data);
  }

  // Send data to specific client
  sendToClient(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  // Send data to specific peer
  sendToPeer(socketId, event, data) {
    this.io.of('/peers').to(socketId).emit(event, data);
  }

  // Get connected clients for a company
  getCompanyClients(companyId) {
    return Array.from(this.connectedClients.values())
      .filter(client => client.companyId === companyId);
  }

  // Get all connected peers
  getConnectedPeers() {
    return Array.from(this.connectedPeers.values());
  }

  // Get connection statistics
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      connectedPeers: this.connectedPeers.size,
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  shutdown() {
    if (this.io) {
      this.io.close();
      this.connectedClients.clear();
      this.connectedPeers.clear();
      this.isRunning = false;
      console.log('WebSocket server shutdown');
      this.emit('serverStopped');
    }
  }
}

module.exports = WebSocketServer;