/**
 * Network Configuration for Sophon POS System
 * Centralized configuration for LAN deployment
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3003,
    host: '0.0.0.0', // Listen on all interfaces for LAN access
    maxConnections: 100,
    timeout: 30000, // 30 seconds
  },

  // mDNS Discovery Configuration
  discovery: {
    serviceName: 'sophon-pos',
    serviceType: 'http',
    port: process.env.PORT || 3003,
    // Announce interval in milliseconds
    announceInterval: 5000,
    // Discovery timeout
    discoveryTimeout: 10000,
    // Maximum peers to discover
    maxPeers: 10,
  },

  // Synchronization Configuration
  sync: {
    // Sync interval in milliseconds
    interval: 30000, // 30 seconds
    // Batch size for sync operations
    batchSize: 100,
    // Retry attempts for failed syncs
    retryAttempts: 3,
    // Retry delay in milliseconds
    retryDelay: 5000,
    // Conflict resolution strategy
    conflictResolution: 'last-write-wins', // 'master-wins', 'manual'
  },

  // WebSocket Configuration
  websocket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    cors: {
      origin: true,
      credentials: true,
    },
  },

  // Security Configuration
  security: {
    // JWT secret (should be same across all instances)
    jwtSecret: process.env.JWT_SECRET || 'sophon-pos-secret-key',
    // Token expiration
    tokenExpiration: '24h',
    // Enable peer authentication
    enablePeerAuth: true,
  },

  // Network Health Monitoring
  monitoring: {
    // Health check interval
    healthCheckInterval: 10000, // 10 seconds
    // Connection timeout
    connectionTimeout: 5000,
    // Maximum failed health checks before marking as offline
    maxFailedChecks: 3,
  },

  // Development/Debug Settings
  debug: {
    enableNetworkLogs: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: true,
  },
};