const { vatCryptoService } = require('../services/vatCryptoService');
const { SoftwareKeyProvider, HardwareKeyProvider } = require('../services/keyProviders');
const crypto = require('crypto');

describe('Zero-Trust Key Management', () => {
  
  describe('Software Provider (Legacy Compatibility)', () => {
    let keyPair;
    const password = 'secure-password';

    test('should generate a valid Ed25519 key pair', async () => {
      keyPair = await vatCryptoService.generateKeyPair(password, 'software');
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKeyEncrypted).toBeDefined();
      expect(keyPair.algorithm).toBe('Ed25519');
      // Validate pubkey format (base64)
      expect(Buffer.from(keyPair.publicKey, 'base64').length).toBeGreaterThan(0);
    });

    test('should sign data correctly via vatCryptoService', async () => {
      const payloadString = '{"test":"value"}';
      const signature = await vatCryptoService.signPayload(
        payloadString, 
        keyPair.privateKeyEncrypted, 
        password, 
        'software'
      );
      
      expect(signature).toBeDefined();

      // Verify signature using standard crypto
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(keyPair.publicKey, 'base64'),
        format: 'der',
        type: 'spki'
      });
      
      const isValid = crypto.verify(
        null, 
        Buffer.from(payloadString), 
        publicKey, 
        Buffer.from(signature, 'base64')
      );
      
      expect(isValid).toBe(true);
    });
  });

  describe('Hardware Provider (Mock)', () => {
    test('should generate a key pair but return handle instead of private key', async () => {
      const keyPair = await vatCryptoService.generateKeyPair(undefined, 'hardware');
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKeyEncrypted).toMatch(/^hsm:/); // Should be a handle
    });

    test('should sign data using internal storage', async () => {
      const keyPair = await vatCryptoService.generateKeyPair(undefined, 'hardware');
      const payloadString = '{"test":"hardware"}';
      
      // Hardware signs by handle, no password needed in this mock (or ignored)
      const signature = await vatCryptoService.signPayload(
        payloadString,
        keyPair.privateKeyEncrypted, 
        undefined, 
        'hardware'
      );
      
      expect(signature).toBeDefined();
    });
  });
});
