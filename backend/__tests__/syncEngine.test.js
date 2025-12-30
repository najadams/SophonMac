const SyncEngine = require('../services/syncEngine');
const EventEmitter = require('events');

// Mock dependencies
const mockWsServer = new EventEmitter();
mockWsServer.broadcastToCompany = jest.fn();
mockWsServer.broadcastToPeers = jest.fn();
mockWsServer.sendToClient = jest.fn();

const mockNetworkDiscovery = new EventEmitter();
mockNetworkDiscovery.getInstanceId = jest.fn().mockReturnValue('instance-1');
mockNetworkDiscovery.getMasterPeer = jest.fn();
mockNetworkDiscovery.getPeers = jest.fn().mockReturnValue([]);
mockNetworkDiscovery.updateServiceInfo = jest.fn();

// Mock DB
jest.mock('../data/db/db', () => require('./mocks/mockDb').mockDb);

// Mock Supabase config to avoid real connection attempts
jest.mock('../config/supabase.config', () => ({
  createSupabaseServiceClient: () => null, // Disable supabase for these tests
  supabaseConfig: { syncSettings: {} }
}));

describe('SyncEngine', () => {
  let syncEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    // We need to access the Class from the exported object if it was exported that way
    // But lines 7 in syncEngine.js: class SyncEngine ... module.exports = SyncEngine?
    // Let's check the file content again.
    // Line 7: class SyncEngine ...
    // Line 470 module.exports = { VATCryptoService... } -> Oh wait, I am reading SyncEngine.
    // SyncEngine.js ... module.exports = SyncEngine; (Line 405 on NetworkManager says require('./syncEngine'))
    // Wait, SyncEngine.js file view ended at line 800. I need to be sure how it exports.
    // Assuming standard node export.
    
    // Create new instance
    // Note: The file exports class directly if my assumption is correct, or an object. Consuming code NetworkManager uses `new SyncEngine`.
    // So it should be a class export.
    try {
      syncEngine = new SyncEngine(mockWsServer, mockNetworkDiscovery);
    } catch (e) {
      // If the require failed or it's not a constructor
      console.error(e);
    }
  });

  // Since I don't have the full file content of SyncEngine.js exports, I will assume it's `module.exports = SyncEngine`.
  // However, I see `const SyncEngine = require('./syncEngine');` in NetworkManager.
  
  test('should initialize correctly', () => {
    syncEngine.initialize('company-1', true);
    expect(syncEngine.companyId).toBe('company-1');
    expect(syncEngine.isMaster).toBe(true);
    expect(syncEngine.isRunning).toBe(true);
  });

  test('should queue local data changes', () => {
    syncEngine.initialize('company-1', true);
    
    const changeEvent = {
      socket: { id: 'socket-1' },
      clientInfo: { companyId: 'company-1' },
      data: {
        type: 'product',
        operation: 'create',
        data: { id: 'prod-1', name: 'Test Product' }
      }
    };

    mockWsServer.emit('dataChange', changeEvent);

    expect(syncEngine.syncQueue.length).toBe(1);
    expect(syncEngine.syncQueue[0].data).toEqual(changeEvent.data.data);
    
    // Should broadcast since we are master
    expect(mockWsServer.broadcastToPeers).toHaveBeenCalledWith('sync_data', expect.objectContaining({
      type: 'sync_record'
    }));
  });

  test('should detect conflicts (Last-Write-Wins behavior verification)', () => {
    syncEngine.initialize('company-1', true);
    
    // Old record
    const oldRecord = {
      id: 'sync-1',
      type: 'product',
      operation: 'update',
      data: { id: 'prod-1', name: 'Old Name' },
      timestamp: 1000
    };
    syncEngine.syncQueue.push(oldRecord);

    const newRecord = {
      id: 'sync-2',
      type: 'product',
      operation: 'update',
      data: { id: 'prod-1', name: 'New Name' },
      timestamp: 2000
    };

    // Detect conflict
    const conflict = syncEngine.detectConflict(newRecord);
    // Incoming is NEWER (2000) than existing (1000), so no conflict (it overwrites)
    expect(conflict).toBeUndefined();
    
    // Wait, detectConflict implementation:
    // r.timestamp > record.timestamp
    // 1000 > 2000 is false.
    // So distinct conflict logic:
    // If incoming is NEWER, detectConflict returns undefined?
    // Let's re-read detectConflict in previous file dump.
    
    /*
      detectConflict(record) {
        const existingRecord = this.syncQueue.find(r => 
          r.type === record.type && 
          r.data.id === record.data.id && 
          r.timestamp > record.timestamp
        );
        return existingRecord;
      }
    */
    
    // So if existing is NEWER (timestamp > incoming), it returns it.
    // Here existing (1000) is OLDER than incoming (2000). So it returns undefined.
    expect(conflict).toBeUndefined();

    // Now let's try incoming is older
    const olderRecord = {
      ...newRecord,
      timestamp: 500
    };
    const conflict2 = syncEngine.detectConflict(olderRecord);
    // existing (1000) > incoming (500)
    expect(conflict2).toBeDefined();
    expect(conflict2.timestamp).toBe(1000);
  });

  test('should Apply Delta changes correctly (No LWW overwrite)', () => {
    syncEngine.initialize('company-1', true);
    syncEngine.executeQuery = jest.fn(); // Spy on execution
    
    const deltaRecord = {
      type: 'inventory',
      operation: 'delta_stock',
      data: { id: 'prod-1', delta: -5, companyId: 'company-1' },
      timestamp: 3000
    };

    // 1. Detect Conflict should return undefined for delta
    const conflict = syncEngine.detectConflict(deltaRecord);
    expect(conflict).toBeUndefined();

    // 2. Apply Record should run UPDATE with + ?
    syncEngine.applySyncRecord(deltaRecord);
    
    expect(syncEngine.executeQuery).toHaveBeenCalledWith(
      expect.stringContaining('onhand = onhand + ?'),
      expect.arrayContaining([-5])
    );
  });

  test('should resolve conflict by keeping newer record', () => {
    syncEngine.initialize('company-1', true);
    // ... Implementation dependent on resolveConflict which calls applySyncRecord
    // We can just spy on applySyncRecord
    
    syncEngine.applySyncRecord = jest.fn();
    
    const existing = { type: 'product', data: { id: '1' }, timestamp: 2000 };
    const incoming = { type: 'product', data: { id: '1' }, timestamp: 1000 };
    
    syncEngine.resolveConflict(incoming, existing, {});
    
    // Helper logs: "Conflict resolved: Existing record kept (newer)"
    // Should NOT call applySyncRecord for incoming
    expect(syncEngine.applySyncRecord).not.toHaveBeenCalled();
  });
});
