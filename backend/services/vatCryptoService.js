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

const { KeyProviderFactory } = require('./keyProviders');
const crypto = require('crypto'); // Still needed for helpers like hash/canonicalize, but not for key ops directly

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

class VATCryptoService {
  constructor() {
    this.algorithm = 'Ed25519';
  }

  // ===========================================================================
  // KEY MANAGEMENT
  // ===========================================================================

  /**
   * Generate a new Ed25519 key pair for a company
   * @param {string} encryptionPassword - Password to encrypt the private key (for software keys)
   * @param {string} providerType - 'software' or 'hardware'
   * @returns {Promise<{publicKey: string, privateKeyEncrypted: string, fingerprint: string}>}
   */
  async generateKeyPair(encryptionPassword, providerType = 'software') {
    const provider = KeyProviderFactory.getProvider(providerType);
    return provider.generateKeyPair({ encryptionPassword });
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
   * Sign token payload using appropriate provider
   * @param {string} payloadString - Canonical JSON payload string
   * @param {string} privateKeyEncrypted - Encrypted private key (or handle)
   * @param {string} password - Decryption password (for software keys)
   * @param {string} providerType - 'software' or 'hardware'. Default software for backward compat.
   * @returns {Promise<string>} Base64-encoded signature
   */
  async signPayload(payloadString, privateKeyEncrypted, password, providerType = 'software') {
    const provider = KeyProviderFactory.getProvider(providerType);
    // Context shape depends on provider, but we pass superset
    const context = {
        privateKeyEncrypted,
        password
    };
    return provider.sign(payloadString, context);
  }

  /**
   * Mint a complete VAT token
   * @param {Object} tokenData - Token data fields
   * @param {string} privateKeyEncrypted - Encrypted private key
   * @param {string} password - Decryption password
   * @param {string} signerKeyFingerprint - Fingerprint of the signing key
   * @param {string} authority - Authority level (SKA, GRA, Company)
   * @param {string} providerType - Provider type (software/hardware)
   * @returns {Object} Complete token with payload and proof
   */
  async mintToken(tokenData, privateKeyEncrypted, password, signerKeyFingerprint, authority = 'SKA', providerType = 'software') {
    const { payload, payloadString, hash } = this.createTokenPayload(tokenData);
    const signature = await this.signPayload(payloadString, privateKeyEncrypted, password, providerType);

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
    // Compact version includes full payload + signature/key info
    // We remove the hash (h) to save space, as it can be recomputed
    return JSON.stringify({
      p: token.payload,  // payload
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
    
    // Recompute hash from payload to verify integrity/reconstruct proof
    const payloadString = this.canonicalize(compact.p);
    const recomputedHash = this.computeHash(payloadString);

    return {
      payload: compact.p,
      proof: {
        hash: recomputedHash, // Recomputed, not trusted from input
        signature: compact.s,
        signerKeyFingerprint: compact.k,
        authority: compact.a,
        signerKeyId: null
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
