const crypto = require('crypto');
const { promisify } = require('util');

const generateKeyPairAsync = promisify(crypto.generateKeyPair);

/**
 * Encryption configuration for private key storage (Software Provider)
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  iterations: 100000,
  digest: 'sha512'
};

/**
 * Base KeyProvider Strategy
 */
class KeyProvider {
  /**
   * Generate a new key pair
   * @param {Object} options - Provider specific options
   * @returns {Promise<Object>} Key pair data
   */
  async generateKeyPair(options) {
    throw new Error('Method not implemented');
  }

  /**
   * Sign data
   * @param {string} data - Data to sign (string or buffer)
   * @param {Object} keyContext - Context required for signing (e.g. encrypted key, password, or keyHandle)
   * @returns {Promise<string>} Base64 signature
   */
  async sign(data, keyContext) {
    throw new Error('Method not implemented');
  }
}

/**
 * Software Key Provider - Uses Node.js crypto and local encryption
 */
class SoftwareKeyProvider extends KeyProvider {
  constructor() {
    super();
    this.type = 'software';
  }

  async generateKeyPair(options = {}) {
    const { encryptionPassword } = options;
    if (!encryptionPassword) throw new Error('Encryption password required for software keys');

    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    const publicKeyBase64 = publicKey.toString('base64');
    const fingerprint = this._getFingerprint(publicKeyBase64);
    const privateKeyEncrypted = this._encryptPrivateKey(privateKey, encryptionPassword);

    return {
      publicKey: publicKeyBase64,
      privateKeyEncrypted,
      fingerprint,
      algorithm: 'Ed25519',
      provider: 'software'
    };
  }

  async sign(data, keyContext) {
    const { privateKeyEncrypted, password } = keyContext;
    if (!privateKeyEncrypted || !password) throw new Error('Private key and password required for software signing');

    const privateKeyDer = this._decryptPrivateKey(privateKeyEncrypted, password);
    const privateKey = crypto.createPrivateKey({
      key: privateKeyDer,
      format: 'der',
      type: 'pkcs8'
    });

    const signature = crypto.sign(null, Buffer.from(data), privateKey);
    return signature.toString('base64');
  }

  _getFingerprint(publicKeyBase64) {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(publicKeyBase64, 'base64'));
    return hash.digest('hex').toLowerCase();
  }

  _encryptPrivateKey(privateKey, password) {
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
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

    const packed = Buffer.concat([salt, iv, authTag, encrypted]);
    return packed.toString('base64');
  }

  _decryptPrivateKey(encryptedBase64, password) {
    const packed = Buffer.from(encryptedBase64, 'base64');
    
    const salt = packed.subarray(0, ENCRYPTION_CONFIG.saltLength);
    const iv = packed.subarray(ENCRYPTION_CONFIG.saltLength, ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength);
    const authTag = packed.subarray(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + 16
    );
    const encrypted = packed.subarray(ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + 16);

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
}

/**
 * Mock Hardware Provider - Simulates HSM/Enclave
 */
class HardwareKeyProvider extends KeyProvider {
  // Simulating persistent secure enclave storage
  static _internalSecureStorage = new Map();

  constructor() {
    super();
    this.type = 'hardware';
  }

  async generateKeyPair(options = {}) {
    // In reality, this would talk to YubiKey/Secure Enclave
    // Here we simulate it by generating a key but NOT returning the private key
    
    // ... (same generation logic)
    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    const publicKeyBase64 = publicKey.toString('base64');
    const fingerprint = this._getFingerprint(publicKeyBase64);
    
    // Store private key "in hardware" (static map)
    const keyHandle = `hsm:${fingerprint}`;
    HardwareKeyProvider._internalSecureStorage.set(keyHandle, privateKey);

    return {
      publicKey: publicKeyBase64,
      privateKeyEncrypted: keyHandle, // We return a handle instead of encrypted blob
      fingerprint,
      algorithm: 'Ed25519',
      provider: 'hardware'
    };
  }

  async sign(data, keyContext) {
    const { privateKeyEncrypted: keyHandle } = keyContext;
    
    if (!HardwareKeyProvider._internalSecureStorage.has(keyHandle)) {
      throw new Error('Hardware key not found or device not connected');
    }

    const privateKeyDer = HardwareKeyProvider._internalSecureStorage.get(keyHandle);
    
    // We must wrap the DER buffer in a KeyObject for crypto.sign to accept it properly
    const privateKey = crypto.createPrivateKey({
      key: privateKeyDer,
      format: 'der',
      type: 'pkcs8'
    });

    const signature = crypto.sign(null, Buffer.from(data), privateKey);
    return signature.toString('base64');
  }

  _getFingerprint(publicKeyBase64) {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(publicKeyBase64, 'base64'));
    return hash.digest('hex').toLowerCase();
  }
}

class KeyProviderFactory {
  static getProvider(type = 'software') {
    switch (type) {
      case 'software': return new SoftwareKeyProvider();
      case 'hardware': return new HardwareKeyProvider();
      default: throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

module.exports = {
  SoftwareKeyProvider,
  HardwareKeyProvider,
  KeyProviderFactory
};
