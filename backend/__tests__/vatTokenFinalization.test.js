const { vatCryptoService } = require('../services/vatCryptoService');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Mock crypto for deterministic testing if needed, but real crypto is fine here

describe('VAT Token V1 Finalization', () => {
  
  describe('QR Optimization', () => {
    const mockToken = {
      payload: { vid: '123', t: 50 },
      proof: {
        hash: 'aabbcc',
        signature: 'sig123',
        signerKeyFingerprint: 'key123',
        authority: 'SKA'
      }
    };

    test('exportForQR should NOT include hash (h) field', () => {
      const qrJson = vatCryptoService.exportForQR(mockToken);
      const qrData = JSON.parse(qrJson);
      
      expect(qrData.p).toBeDefined();
      expect(qrData.s).toBeDefined();
      expect(qrData.h).toBeUndefined(); // Verify hash is removed
    });

    test('importFromQR should recompute hash', () => {
      const qrJson = JSON.stringify({
        p: { vid: '123', t: 50 },
        s: 'sig123',
        k: 'key123',
        a: 'SKA'
      });

      const imported = vatCryptoService.importFromQR(qrJson);
      
      expect(imported.proof.hash).toBeDefined();
      // Hash should be valid SHA256 hex
      expect(imported.proof.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Double-Spend Protection (SQLite Trigger)', () => {
    let db;

    beforeAll(() => {
      db = new Database(':memory:');
      
      // Load schema
      // We need Company and VATToken tables first for FK constraints
      db.exec(`
        CREATE TABLE Company (id TEXT PRIMARY KEY, companyName TEXT, tinNumber TEXT, taxRate REAL);
        CREATE TABLE Inventory (id TEXT PRIMARY KEY, name TEXT);
        CREATE TABLE Supplies (id TEXT PRIMARY KEY, totalCost REAL);
      `);

      // Load the VAT Token tables migration
      const migrationPath = path.join(__dirname, '../migrations/add_vat_token_tables.sql');
      const migration = fs.readFileSync(migrationPath, 'utf8');
      db.exec(migration);

      // Seed SyncEngine required columns for trigger logic if any (none in this specific trigger)
      
      // Insert test data
      db.exec(`
        INSERT INTO Company (id) VALUES ('c1');
        INSERT INTO VATToken (id, tokenHash, productGlobalSku, originCompanyId, quantity, grossAmount, vatAmount, vatRate, currencyCode, tokenPayload, signature, signerKeyFingerprint)
        VALUES ('t1', 'hash1', 'sku1', 'c1', 100, 1000, 125, 12.5, 'GHS', '{}', 'sig', 'key');
      `);
    });

    afterAll(() => {
      db.close();
    });

    test('should allow Reference insert if quantity is available', () => {
      const stmt = db.prepare(`
        INSERT INTO VATTokenReference (id, tokenId, companyId, quantity)
        VALUES ('r1', 't1', 'c1', 50)
      `);
      expect(() => stmt.run()).not.toThrow();
    });

    test('should allow second Reference insert if cumulative quantity is within limit', () => {
      const stmt = db.prepare(`
        INSERT INTO VATTokenReference (id, tokenId, companyId, quantity)
        VALUES ('r2', 't1', 'c1', 40)
      `);
      expect(() => stmt.run()).not.toThrow();
      
      // Total used: 50 + 40 = 90. Limit: 100.
    });

    test('should BLOCK Reference insert if it exceeds total token quantity', () => {
      // Try to take 11 more (Total would be 101)
      const stmt = db.prepare(`
        INSERT INTO VATTokenReference (id, tokenId, companyId, quantity)
        VALUES ('r3', 't1', 'c1', 11)
      `);
      
      expect(() => stmt.run()).toThrow(/Double-Spend Detected/);
    });
  });
});
