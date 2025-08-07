import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import networkService from '../services/networkService';
import { toast } from 'react-toastify';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: false,
    isMaster: false,
    connectedPeers: [],
    lastSync: null,
    isInitialized: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Get authentication state from Redux
  const isLoggedIn = useSelector((state) => state.companyState.isLoggedIn);
  const token = useSelector((state) => state.companyState.token);
  const companyId = useSelector((state) => state.companyState.companyId);
  const currentUser = useSelector((state) => state.userState?.currentUser);

  useEffect(() => {
    if (isLoggedIn && token && companyId && currentUser) {
      initializeNetworking();
    } else {
      disconnectNetworking();
    }

    return () => {
      disconnectNetworking();
    };
  }, [isLoggedIn, token, companyId, currentUser]);

  const initializeNetworking = async () => {
    if (networkStatus.isInitialized || isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      console.log('Initializing networking service...');
      const success = await networkService.initialize(token, companyId);

      if (success) {
        console.log('Networking service initialized successfully');
        setupEventListeners();
        
        // Get initial status
        const status = networkService.getNetworkStatus();
        setNetworkStatus({
          ...status,
          isInitialized: true
        });

        toast.success('Connected to network', {
          position: 'bottom-right',
          autoClose: 3000
        });
      } else {
        throw new Error('Failed to initialize networking service');
      }
    } catch (error) {
      console.error('Failed to initialize networking:', error);
      setConnectionError(error.message);
      
      toast.warn('Network connection failed - running in offline mode', {
        position: 'bottom-right',
        autoClose: 5000
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectNetworking = () => {
    if (networkStatus.isInitialized) {
      console.log('Disconnecting from networking service...');
      networkService.disconnect();
      cleanupEventListeners();
      setNetworkStatus({
        isOnline: false,
        isMaster: false,
        connectedPeers: [],
        lastSync: null,
        isInitialized: false
      });
      setConnectionError(null);
    }
  };

  const setupEventListeners = () => {
    networkService.on('networkStatusChanged', handleNetworkStatusChange);
    networkService.on('peerConnected', handlePeerConnected);
    networkService.on('peerDisconnected', handlePeerDisconnected);
    networkService.on('dataSync', handleDataSync);
    networkService.on('syncComplete', handleSyncComplete);
    networkService.on('syncConflict', handleSyncConflict);
    networkService.on('networkMessage', handleNetworkMessage);
    networkService.on('connectionFailed', handleConnectionFailed);
  };

  const cleanupEventListeners = () => {
    networkService.off('networkStatusChanged', handleNetworkStatusChange);
    networkService.off('peerConnected', handlePeerConnected);
    networkService.off('peerDisconnected', handlePeerDisconnected);
    networkService.off('dataSync', handleDataSync);
    networkService.off('syncComplete', handleSyncComplete);
    networkService.off('syncConflict', handleSyncConflict);
    networkService.off('networkMessage', handleNetworkMessage);
    networkService.off('connectionFailed', handleConnectionFailed);
  };

  const handleNetworkStatusChange = (status) => {
    setNetworkStatus(prev => ({
      ...prev,
      ...status
    }));
  };

  const handlePeerConnected = (peer) => {
    console.log('Peer connected:', peer);
    toast.info(`${peer.name || peer.id} joined the network`, {
      position: 'bottom-right',
      autoClose: 3000
    });
  };

  const handlePeerDisconnected = (peerId) => {
    console.log('Peer disconnected:', peerId);
    toast.info(`Peer ${peerId} left the network`, {
      position: 'bottom-right',
      autoClose: 3000
    });
  };

  const handleDataSync = (data) => {
    console.log('Data sync received:', data);
    // Trigger a refresh of relevant data in the application
    // This could dispatch Redux actions to update the store
  };

  const handleSyncComplete = (result) => {
    console.log('Sync completed:', result);
    setNetworkStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));
    
    if (result.changes > 0) {
      toast.success(`Sync completed - ${result.changes} changes applied`, {
        position: 'bottom-right',
        autoClose: 3000
      });
    }
  };

  const handleSyncConflict = (conflict) => {
    console.log('Sync conflict detected:', conflict);
    toast.warning('Data conflict detected - please check network manager', {
      position: 'bottom-right',
      autoClose: 5000
    });
  };

  const handleNetworkMessage = (message) => {
    console.log('Network message received:', message);
    // Handle different types of network messages
    switch (message.type) {
      case 'notification':
        toast.info(message.data.text, {
          position: 'bottom-right',
          autoClose: 4000
        });
        break;
      case 'alert':
        toast.warning(message.data.text, {
          position: 'bottom-right',
          autoClose: 6000
        });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const handleConnectionFailed = () => {
    console.log('Network connection failed');
    setConnectionError('Connection failed after multiple attempts');
    toast.error('Network connection lost - running in offline mode', {
      position: 'bottom-right',
      autoClose: 5000
    });
  };

  // Public API methods
  const forceSync = async () => {
    if (!networkStatus.isInitialized) {
      throw new Error('Network not initialized');
    }
    return await networkService.forceSync();
  };

  const sendMessage = (type, data, targetPeer = null) => {
    if (!networkStatus.isInitialized) {
      console.warn('Cannot send message - network not initialized');
      return;
    }
    networkService.sendMessage(type, data, targetPeer);
  };

  const broadcastDataChange = (table, operation, data) => {
    if (!networkStatus.isInitialized) {
      return;
    }
    networkService.broadcastDataChange(table, operation, data);
  };

  const getConnectedPeers = async () => {
    if (!networkStatus.isInitialized) {
      return [];
    }
    return await networkService.getConnectedPeers();
  };

  const reconnect = async () => {
    if (isConnecting) {
      return;
    }
    
    disconnectNetworking();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await initializeNetworking();
  };

  const contextValue = {
    networkStatus,
    isConnecting,
    connectionError,
    isNetworkAvailable: networkStatus.isInitialized && networkStatus.isOnline,
    
    // Methods
    forceSync,
    sendMessage,
    broadcastDataChange,
    getConnectedPeers,
    reconnect,
    
    // Network service instance (for advanced usage)
    networkService: networkStatus.isInitialized ? networkService : null
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkProvider;