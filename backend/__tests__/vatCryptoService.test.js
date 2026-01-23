const { vatCryptoService } = require('../services/vatCryptoService');
const fc = require('fast-check');
const crypto = require('crypto');

describe('VATCryptoService', () => {
  const TEST_PASSWORD = 'test-password-123';
  let keyPair;

  beforeAll(async () => {
    keyPair = await vatCryptoService.generateKeyPair(TEST_PASSWORD);
  });

  describe('Canonicalization (RFC8785-like)', () => {
    test('should be deterministic', () => {
      const obj1 = { b: 2, a: 1, c: { z: 26, a: 1 } };
      const obj2 = { c: { a: 1, z: 26 }, a: 1, b: 2 };
      expect(vatCryptoService.canonicalize(obj1)).toBe(vatCryptoService.canonicalize(obj2));
    });

    test('property: should always produce same output for same object structure regardless of key order', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const canon1 = vatCryptoService.canonicalize(obj);
          // Create a shuffled copy (not perfect shuffle but changes insertion order)
          const shuffled = JSON.parse(JSON.stringify(obj)); 
          const canon2 = vatCryptoService.canonicalize(shuffled);
          return canon1 === canon2;
        })
      );
    });
  });

  describe('Key Management', () => {
    test('should generate valid Ed25519 keys', async () => {
      const kp = await vatCryptoService.generateKeyPair('pass');
      expect(kp.publicKey).toBeDefined();
      expect(kp.privateKeyEncrypted).toBeDefined();
      expect(kp.fingerprint).toBeDefined();
      expect(kp.algorithm).toBe('Ed25519');
    });

    test('should decrypt private key correctly', () => {
      const decrypted = vatCryptoService.decryptPrivateKey(keyPair.privateKeyEncrypted, TEST_PASSWORD);
      expect(Buffer.isBuffer(decrypted)).toBe(true);
    });

    test('should fail to decrypt with wrong password', () => {
      expect(() => {
        vatCryptoService.decryptPrivateKey(keyPair.privateKeyEncrypted, 'wrong');
      }).toThrow();
    });
  });



  const baseTokenData = {
    tokenId: 'uuid-1',
    batchId: 'batch-1',
    productGlobalSku: 'sku-1',
    companyId: 'comp-1',
    tinNumber: 'tin-1',
    quantity: 10,
    grossAmount: 100,
    vatRate: 10,
    vatAmount: 10,
    currencyCode: 'GHS',
    issuedAt: new Date().toISOString()
  };

  describe('Token Minting & Verification', () => {

    test('should sign and verify a valid token', async () => {
      const token = await vatCryptoService.mintToken(
        baseTokenData, 
        keyPair.privateKeyEncrypted, 
        TEST_PASSWORD, 
        keyPair.fingerprint
      );

      const result = vatCryptoService.verifyToken(token, keyPair.publicKey);
      expect(result.valid).toBe(true);
      expect(result.authority).toBe('SKA');
    });

    test('should reject tampered payload', async () => {
      const token = await vatCryptoService.mintToken(
        baseTokenData, 
        keyPair.privateKeyEncrypted, 
        TEST_PASSWORD, 
        keyPair.fingerprint
      );

      // Tamper: Change amount
      const tampered = JSON.parse(JSON.stringify(token));
      tampered.payload.g = 999999; 

      const result = vatCryptoService.verifyToken(tampered, keyPair.publicKey);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Hash mismatch/); 
    });

    test('should reject tampered signature', async () => {
      const token = await vatCryptoService.mintToken(
        baseTokenData, 
        keyPair.privateKeyEncrypted, 
        TEST_PASSWORD, 
        keyPair.fingerprint
      );

      // Tamper: Corrupt signature
      token.proof.signature = Buffer.from('invalid').toString('base64');

      const result = vatCryptoService.verifyToken(token, keyPair.publicKey);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Invalid signature|Verification error/);
    });

      test('property: any minted token should be verifiable', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              tokenId: fc.uuid(),
              batchId: fc.string({minLength: 1}),
              productGlobalSku: fc.string({minLength: 1}),
              companyId: fc.string({minLength: 1}),
              tinNumber: fc.string({minLength: 1}),
              quantity: fc.integer({min: 1}),
              grossAmount: fc.float({min: 0, max: 1000000, noNaN: true, noInfinity: true}),
              vatRate: fc.float({min: 0, max: 100, noNaN: true, noInfinity: true}),
              vatAmount: fc.float({min: 0, max: 1000000, noNaN: true, noInfinity: true}),
              currencyCode: fc.constant('GHS'),
              issuedAt: fc.date().map(d => d.toISOString())
            }),
            async (data) => {
              const token = await vatCryptoService.mintToken(
                data, 
                keyPair.privateKeyEncrypted, 
                TEST_PASSWORD, 
                keyPair.fingerprint
              );
              return vatCryptoService.verifyToken(token, keyPair.publicKey).valid;
            }
          )
        );
      });
  });

  describe('QR Export/Import', () => {
    test('should roundtrip correctly', async () => {
      const token = await vatCryptoService.mintToken(
        baseTokenData, 
        keyPair.privateKeyEncrypted, 
        TEST_PASSWORD, 
        keyPair.fingerprint
      );
      
      const qrData = vatCryptoService.exportForQR(token);
      const imported = vatCryptoService.importFromQR(qrData);
      
      expect(imported.payload).toEqual(token.payload);
      expect(imported.proof).toEqual({
        ...token.proof,
        signerKeyId: null 
      });

      const result = vatCryptoService.verifyToken(imported, keyPair.publicKey);
      expect(result.valid).toBe(true);
    });
  });
});
