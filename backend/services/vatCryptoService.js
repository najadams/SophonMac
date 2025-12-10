/**
 * VAT Crypto Service
 * 
 * Provides cryptographic operations for the Sophon VAT Token system:
 * - Ed25519 key pair generation
 * - RFC8785-compliant JSON canonicalization
 * - Token signing and verification
 * - Key fingerprint derivation
 * - Portable token export (QR-ready)
 * 
 * Trust model: SKA (Sophon Key Authority) > Company keys
 * Future: GRA (Ghana Revenue Authority) as root trust anchor
 */

const crypto = require('crypto');
const { promisify } = require('util');

// Use Node.js native Ed25519 support (Node 15.0.0+)
const generateKeyPairAsync = promisify(crypto.generateKeyPair);

/**
 * Authority precedence for conflict resolution
 * Higher number = higher authority
 */
const AUTHORITY_PRECEDENCE = {
  'Company': 1,
  'SKA': 2,
  'GRA': 3
};

/**
 * Token version for payload format
 */
const TOKEN_VERSION = '1';

/**
 * Encryption configuration for private key storage
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  iterations: 100000,
  digest: 'sha512'
};

class VATCryptoService {
  constructor() {
    this.algorithm = 'Ed25519';
  }

  // ===========================================================================
  // KEY MANAGEMENT
  // ===========================================================================

  /**
   * Generate a new Ed25519 key pair for a company
   * @param {string} encryptionPassword - Password to encrypt the private key
   * @returns {Promise<{publicKey: string, privateKeyEncrypted: string, fingerprint: string}>}
   */
  async generateKeyPair(encryptionPassword) {
    try {
      // Generate Ed25519 key pair
      const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
      });

      // Encode public key as base64
      const publicKeyBase64 = publicKey.toString('base64');

      // Encrypt private key with password
      const privateKeyEncrypted = this.encryptPrivateKey(privateKey, encryptionPassword);

      // Generate fingerprint from public key
      const fingerprint = this.getFingerprint(publicKeyBase64);

      return {
        publicKey: publicKeyBase64,
        privateKeyEncrypted,
        fingerprint,
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Failed to generate key pair: ${error.message}`);
    }
  }

  /**
   * Encrypt private key using AES-256-GCM with password-derived key
   * @param {Buffer} privateKey - Raw private key bytes
   * @param {string} password - Encryption password
   * @returns {string} Encrypted private key as base64 (includes salt, iv, authTag)
   */
  encryptPrivateKey(privateKey, password) {
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // Derive key from password using PBKDF2
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );

    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: salt (32) + iv (16) + authTag (16) + encrypted
    const packed = Buffer.concat([salt, iv, authTag, encrypted]);
    return packed.toString('base64');
  }

  /**
   * Decrypt private key using AES-256-GCM
   * @param {string} encryptedBase64 - Encrypted private key
   * @param {string} password - Decryption password
   * @returns {Buffer} Decrypted private key bytes
   */
  decryptPrivateKey(encryptedBase64, password) {
    const packed = Buffer.from(encryptedBase64, 'base64');
    
    // Unpack: salt (32) + iv (16) + authTag (16) + encrypted
    const salt = packed.subarray(0, ENCRYPTION_CONFIG.saltLength);
    const iv = packed.subarray(ENCRYPTION_CONFIG.saltLength, ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength);
    const authTag = packed.subarray(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + 16
    );
    const encrypted = packed.subarray(ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + 16);

    // Derive key from password
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );

    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Derive key fingerprint (SHA-256 hash of public key)
   * @param {string} publicKeyBase64 - Base64-encoded public key
   * @returns {string} Fingerprint as lowercase hex
   */
  getFingerprint(publicKeyBase64) {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(publicKeyBase64, 'base64'));
    return hash.digest('hex').toLowerCase();
  }

  // ===========================================================================
  // CANONICALIZATION (RFC8785-like deterministic JSON)
  // ===========================================================================

  /**
   * Create canonical JSON representation of an object
   * Rules:
   * - Keys sorted lexicographically at all levels
   * - No whitespace
   * - UTF-8 encoding
   * - Numbers as-is (no exponential notation for integers)
   * 
   * @param {Object} obj - Object to canonicalize
   * @returns {string} Canonical JSON string
   */
  canonicalize(obj) {
    return JSON.stringify(this.sortObjectKeys(obj));
  }

  /**
   * Recursively sort object keys lexicographically
   * @param {any} value - Value to process
   * @returns {any} Value with sorted keys
   */
  sortObjectKeys(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sortObjectKeys(item));
    }

    const sortedKeys = Object.keys(value).sort();
    const result = {};
    for (const key of sortedKeys) {
      result[key] = this.sortObjectKeys(value[key]);
    }
    return result;
  }

  // ===========================================================================
  // TOKEN CREATION
  // ===========================================================================

  /**
   * Create a canonical token payload for signing
   * @param {Object} tokenData - Token data fields
   * @returns {{payload: Object, payloadString: string, hash: string}}
   */
  createTokenPayload(tokenData) {
    const {
      tokenId,
      batchId,
      productGlobalSku,
      companyId,
      tinNumber,
      quantity,
      grossAmount,
      vatRate,
      vatAmount,
      currencyCode,
      issuedAt,
      previousTokenId = null
    } = tokenData;

    // Compact payload format for QR efficiency
    const payload = {
      v: TOKEN_VERSION,           // version
      vid: tokenId,               // token id
      bid: batchId,               // batch id
      pg: productGlobalSku,       // product global sku
      cid: companyId,             // company id
      tin: tinNumber,             // TIN
      q: quantity,                // quantity
      g: grossAmount,             // gross amount
      r: vatRate,                 // vat rate
      t: vatAmount,               // vat amount
      c: currencyCode,            // currency
      iat: issuedAt,              // issued at
      prev: previousTokenId       // previous token reference
    };

    const payloadString = this.canonicalize(payload);
    const hash = this.computeHash(payloadString);

    return { payload, payloadString, hash };
  }

  /**
   * Compute SHA-256 hash of a string
   * @param {string} data - Data to hash
   * @returns {string} Hash as lowercase hex
   */
  computeHash(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex').toLowerCase();
  }

  /**
   * Sign token payload with private key
   * @param {string} payloadString - Canonical JSON payload string
   * @param {string} privateKeyEncrypted - Encrypted private key
   * @param {string} password - Decryption password
   * @returns {string} Base64-encoded signature
   */
  signPayload(payloadString, privateKeyEncrypted, password) {
    const privateKeyDer = this.decryptPrivateKey(privateKeyEncrypted, password);
    
    // Create private key object from DER
    const privateKey = crypto.createPrivateKey({
      key: privateKeyDer,
      format: 'der',
      type: 'pkcs8'
    });

    const signature = crypto.sign(null, Buffer.from(payloadString, 'utf8'), privateKey);
    return signature.toString('base64');
  }

  /**
   * Mint a complete VAT token
   * @param {Object} tokenData - Token data fields
   * @param {string} privateKeyEncrypted - Encrypted private key
   * @param {string} password - Decryption password
   * @param {string} signerKeyFingerprint - Fingerprint of the signing key
   * @param {string} authority - Authority level (SKA, GRA, Company)
   * @returns {Object} Complete token with payload and proof
   */
  mintToken(tokenData, privateKeyEncrypted, password, signerKeyFingerprint, authority = 'SKA') {
    const { payload, payloadString, hash } = this.createTokenPayload(tokenData);
    const signature = this.signPayload(payloadString, privateKeyEncrypted, password);

    return {
      payload,
      proof: {
        hash,
        signature,
        signerKeyId: `company::${tokenData.companyId}#key-v1`,
        signerKeyFingerprint,
        authority
      }
    };
  }

  // ===========================================================================
  // TOKEN VERIFICATION
  // ===========================================================================

  /**
   * Verify a token's signature
   * @param {Object} token - Token object with payload and proof
   * @param {string} publicKeyBase64 - Base64-encoded public key
   * @returns {{valid: boolean, reason?: string}}
   */
  verifyToken(token, publicKeyBase64) {
    try {
      const { payload, proof } = token;

      if (!payload || !proof) {
        return { valid: false, reason: 'Missing payload or proof' };
      }

      // Reconstruct canonical payload
      const payloadString = this.canonicalize(payload);
      
      // Verify hash matches
      const computedHash = this.computeHash(payloadString);
      if (computedHash !== proof.hash) {
        return { valid: false, reason: 'Hash mismatch - payload may have been tampered' };
      }

      // Create public key object from base64 DER
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(publicKeyBase64, 'base64'),
        format: 'der',
        type: 'spki'
      });

      // Verify signature
      const signatureBuffer = Buffer.from(proof.signature, 'base64');
      const isValid = crypto.verify(null, Buffer.from(payloadString, 'utf8'), publicKey, signatureBuffer);

      if (!isValid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Verify key fingerprint matches (optional but recommended)
      const expectedFingerprint = this.getFingerprint(publicKeyBase64);
      if (proof.signerKeyFingerprint && proof.signerKeyFingerprint !== expectedFingerprint) {
        return { valid: false, reason: 'Key fingerprint mismatch' };
      }

      return { valid: true, authority: proof.authority };
    } catch (error) {
      return { valid: false, reason: `Verification error: ${error.message}` };
    }
  }

  /**
   * Compare authority levels for conflict resolution
   * @param {string} authority1 - First authority
   * @param {string} authority2 - Second authority
   * @returns {number} Positive if authority1 > authority2, negative if less, 0 if equal
   */
  compareAuthority(authority1, authority2) {
    const level1 = AUTHORITY_PRECEDENCE[authority1] || 0;
    const level2 = AUTHORITY_PRECEDENCE[authority2] || 0;
    return level1 - level2;
  }

  // ===========================================================================
  // EXPORT UTILITIES
  // ===========================================================================

  /**
   * Export token in compact format for QR code
   * @param {Object} token - Full token object
   * @returns {string} Compact JSON string for QR
   */
  exportForQR(token) {
    // Compact version includes full payload + proof for offline verification
    return JSON.stringify({
      p: token.payload,  // payload
      h: token.proof.hash,
      s: token.proof.signature,
      k: token.proof.signerKeyFingerprint,
      a: token.proof.authority
    });
  }

  /**
   * Import token from QR compact format
   * @param {string} qrData - Compact JSON from QR
   * @returns {Object} Full token object
   */
  importFromQR(qrData) {
    const compact = JSON.parse(qrData);
    return {
      payload: compact.p,
      proof: {
        hash: compact.h,
        signature: compact.s,
        signerKeyFingerprint: compact.k,
        authority: compact.a,
        signerKeyId: null  // Can be derived from fingerprint if needed
      }
    };
  }

  /**
   * Generate a global SKU for a product (deterministic hash)
   * @param {string} companyId - Origin company ID
   * @param {string} productName - Product name
   * @param {string} batchId - Optional batch ID for uniqueness
   * @returns {string} Global SKU hash
   */
  generateProductGlobalSku(companyId, productName, batchId = '') {
    const input = `${companyId}:${productName.toLowerCase().trim()}:${batchId}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  // ===========================================================================
  // DATABASE HELPERS
  // ===========================================================================

  /**
   * Generate a UUID for token IDs
   * @returns {string} UUID v4
   */
  generateTokenId() {
    return crypto.randomUUID();
  }

  /**
   * Check if a token has expired
   * @param {Object} token - Token with payload
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    if (!token.payload.exp) {
      return false; // No expiry set
    }
    return new Date(token.payload.exp) < new Date();
  }

  /**
   * Validate token quantity against references
   * @param {number} tokenQuantity - Original token quantity
   * @param {number} totalReferenced - Sum of all reference quantities
   * @param {number} requestedQuantity - New quantity to claim
   * @returns {{valid: boolean, remaining: number, reason?: string}}
   */
  validateQuantityClaim(tokenQuantity, totalReferenced, requestedQuantity) {
    const remaining = tokenQuantity - totalReferenced;
    
    if (requestedQuantity > remaining) {
      return {
        valid: false,
        remaining,
        reason: `Insufficient quantity: requested ${requestedQuantity}, but only ${remaining} remaining`
      };
    }

    return { valid: true, remaining: remaining - requestedQuantity };
  }
}

// Export singleton instance and class
const vatCryptoService = new VATCryptoService();

module.exports = {
  VATCryptoService,
  vatCryptoService,
  AUTHORITY_PRECEDENCE,
  TOKEN_VERSION
};
