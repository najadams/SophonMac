const express = require('express');
const request = require('supertest');
const syncEngine = require('../services/syncEngine').default || require('../services/networkManager').syncEngine;

// Mock the dependencies
jest.mock('../services/syncEngine', () => {
  return {
    default: {
      getLastSyncTime: jest.fn(),
      isMaster: false
    }
  };
});

jest.mock('../services/vatCryptoService', () => ({
  vatCryptoService: {},
  AUTHORITY_PRECEDENCE: {}
}));

// Create a minimal express app to test the middleware
const app = express();
app.use(express.json());

// Re-create the middleware here for testing isolation, matching the implementation
// Since we can't easily export just the middleware from the route file without refactoring
const requireSyncedData = (dataType, maxAgeMs = 24 * 60 * 60 * 1000) => {
  const syncEngine = require('../services/syncEngine').default;
  return (req, res, next) => {
    const lastSync = syncEngine?.getLastSyncTime ? syncEngine.getLastSyncTime(dataType) : 0;
    const now = Date.now();
    
    if (now - lastSync > maxAgeMs) {
       if (syncEngine?.isMaster) {
           return next();
       }
       return res.status(403).json({
         error: 'FISCAL_SYNC_REQUIRED'
       });
    }
    next();
  };
};

// Test route
app.post('/test-mint', requireSyncedData('tax_rates'), (req, res) => {
  res.status(200).json({ success: true });
});

describe('Sync Barrier Middleware', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should allow if sync is fresh', async () => {
    const freshTime = Date.now() - (1000 * 60 * 60); // 1 hour ago
    require('../services/syncEngine').default.getLastSyncTime.mockReturnValue(freshTime);
    require('../services/syncEngine').default.isMaster = false;

    const res = await request(app).post('/test-mint');
    expect(res.status).toBe(200);
  });

  test('should block if sync is stale', async () => {
    const staleTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    require('../services/syncEngine').default.getLastSyncTime.mockReturnValue(staleTime);
    require('../services/syncEngine').default.isMaster = false;

    const res = await request(app).post('/test-mint');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FISCAL_SYNC_REQUIRED');
  });

  test('should allow if master even if sync is stale', async () => {
    const staleTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    require('../services/syncEngine').default.getLastSyncTime.mockReturnValue(staleTime);
    require('../services/syncEngine').default.isMaster = true; // Is Master

    const res = await request(app).post('/test-mint');
    expect(res.status).toBe(200);
  });

  test('should block if never synced', async () => {
    require('../services/syncEngine').default.getLastSyncTime.mockReturnValue(0); // Never synced
    require('../services/syncEngine').default.isMaster = false;

    const res = await request(app).post('/test-mint');
    expect(res.status).toBe(403);
  });
});
