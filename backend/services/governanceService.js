const crypto = require('crypto');
const { vatCryptoService, VATCryptoService } = require('./vatCryptoService');
const { KeyProviderFactory } = require('./keyProviders');

// Lazy load DB
let db = null;
try {
  db = require('../data/db/db');
} catch (e) {
  console.warn('GovernanceService: DB unavailable');
}

class GovernanceService {
  constructor() {
    this.ROOT_AUTHORITY = 'SKA';
  }

  /**
   * Initialize the Genesis Root Key (if none exists)
   * @param {string} password - Password to encrypt the root key
   * @returns {Promise<Object>} The new root key record
   */
  async initializeRootKey(password) {
    // Check if root key exists
    const existing = db.prepare(`SELECT * FROM RootKeyHistory WHERE authority = ? AND status = 'active'`).get(this.ROOT_AUTHORITY);
    if (existing) {
      throw new Error('Active Root Key already exists');
    }

    // Generate Genesis Key
    const provider = KeyProviderFactory.getProvider('software'); // Force software for genesis for now, or hardware if configured
    const keyPair = await provider.generateKeyPair({ encryptionPassword: password });
    
    const fingerprint = vatCryptoService.getFingerprint(keyPair.publicKey);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO RootKeyHistory (
        id, fingerprint, publicKey, privateKeyEncrypted, authority, status, issuedAt
      ) VALUES (?, ?, ?, ?, ?, 'active', ?)
    `);

    stmt.run(
      id,
      fingerprint,
      keyPair.publicKey,
      keyPair.privateKeyEncrypted,
      this.ROOT_AUTHORITY,
      now
    );

    console.log(`Genesis SKA Root Key initialized: ${fingerprint}`);
    
    // Auto-trust this key in the local VAT system
    vatCryptoService.addTrustedKey(fingerprint, keyPair.publicKey, this.ROOT_AUTHORITY, 'active');
    
    // Return safe info
    return {
      id,
      fingerprint,
      publicKey: keyPair.publicKey,
      issuedAt: now
    };
  }

  /**
   * Rotate the Root Key
   * @param {string} currentPassword - To unlock current key for signing
   * @param {string} newPassword - To encrypt new key
   * @param {string} reason
   */
  async rotateRootKey(currentPassword, newPassword, reason = 'routine_rotation') {
    // 1. Get current active key
    const currentKey = db.prepare(`SELECT * FROM RootKeyHistory WHERE authority = ? AND status = 'active'`).get(this.ROOT_AUTHORITY);
    if (!currentKey) {
      throw new Error('No active Root Key found to rotate');
    }

    // 2. Generate New Key
    const provider = KeyProviderFactory.getProvider('software');
    const newKeyPair = await provider.generateKeyPair({ encryptionPassword: newPassword });
    const newFingerprint = vatCryptoService.getFingerprint(newKeyPair.publicKey);

    // 3. Sign New Key with Old Key (Trust Chain)
    // Payload: "ROTATE:NEW_FP:TIMESTAMP"
    const rotationPayload = `ROTATE:${newFingerprint}:${new Date().toISOString()}`;
    // We need to use the specific provider context logic. 
    // Re-using vatCryptoService.signPayload or provider directly? 
    // Provider directly is safer for raw signing.
    const signature = await provider.sign(rotationPayload, { 
        privateKeyEncrypted: currentKey.privateKeyEncrypted, 
        password: currentPassword 
    });

    // 4. Archive Old Key (Revoke)
    const now = new Date().toISOString();
    db.prepare(`UPDATE RootKeyHistory SET status = 'revoked', revokedAt = ? WHERE id = ?`).run(now, currentKey.id);

    // 5. Save New Key
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO RootKeyHistory (
        id, fingerprint, publicKey, privateKeyEncrypted, authority, status, issuedAt,
        signatureByParent, parentFingerprint, rotationReason
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(
      id,
      newFingerprint,
      newKeyPair.publicKey,
      newKeyPair.privateKeyEncrypted,
      this.ROOT_AUTHORITY,
      now,
      signature,
      currentKey.fingerprint,
      reason
    );

    // 6. Update Trust Cache
    vatCryptoService.revokeKey(currentKey.fingerprint);
    vatCryptoService.addTrustedKey(newFingerprint, newKeyPair.publicKey, this.ROOT_AUTHORITY, 'active');

    console.log(`Root Key Rotated: ${currentKey.fingerprint} -> ${newFingerprint}`);
    return {
      oldFingerprint: currentKey.fingerprint,
      newFingerprint,
      signature
    };
  }

  /**
   * Get the current Trust Chain
   */
  getTrustChain() {
    const chain = db.prepare(`SELECT fingerprint, publicKey, authority, status, issuedAt, revokedAt, parentFingerprint, rotationReason FROM RootKeyHistory ORDER BY issuedAt ASC`).all();
    return chain;
  }
}

const governanceService = new GovernanceService();
module.exports = { governanceService };
