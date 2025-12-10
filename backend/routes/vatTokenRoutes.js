/**
 * VAT Token Routes
 * 
 * REST API endpoints for the Sophon VAT Token system:
 * - Key pair management (generate, get public key)
 * - Token minting (create signed VAT tokens)
 * - Token verification (online + offline-capable)
 * - Token revocation (admin)
 * - Trusted key management (for offline verification)
 * - Token export (QR-ready format)
 */

const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');
const { vatCryptoService, AUTHORITY_PRECEDENCE } = require('../services/vatCryptoService');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get company details including TIN
 */
const getCompanyDetails = (companyId) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`SELECT id, companyName, tinNumber, taxRate FROM Company WHERE id = ?`);
    try {
      const row = stmt.get(companyId);
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get or create keypair for a company
 */
const getOrCreateKeyPair = async (companyId, encryptionPassword) => {
  // Check if keypair exists
  const existingStmt = db.prepare(`SELECT * FROM VATKeyPair WHERE companyId = ? AND status = 'active'`);
  const existing = existingStmt.get(companyId);
  
  if (existing) {
    return existing;
  }
  
  // Generate new keypair
  const keyPair = await vatCryptoService.generateKeyPair(encryptionPassword);
  const id = dbUtils.generateUUID();
  
  const insertStmt = db.prepare(`
    INSERT INTO VATKeyPair (id, companyId, publicKey, privateKeyEncrypted, keyFingerprint, algorithm, authority, status)
    VALUES (?, ?, ?, ?, ?, ?, 'SKA', 'active')
  `);
  
  insertStmt.run(id, companyId, keyPair.publicKey, keyPair.privateKeyEncrypted, keyPair.fingerprint, keyPair.algorithm);
  
  return {
    id,
    companyId,
    publicKey: keyPair.publicKey,
    privateKeyEncrypted: keyPair.privateKeyEncrypted,
    keyFingerprint: keyPair.fingerprint,
    algorithm: keyPair.algorithm,
    authority: 'SKA',
    status: 'active'
  };
};

/**
 * Get sum of referenced quantities for a token
 */
const getTokenReferencedQuantity = (tokenId) => {
  const stmt = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as total FROM VATTokenReference WHERE tokenId = ?`);
  const result = stmt.get(tokenId);
  return result ? result.total : 0;
};

// =============================================================================
// KEY PAIR MANAGEMENT
// =============================================================================

/**
 * POST /api/vat-tokens/keypair/generate
 * Generate a new keypair for a company (or return existing)
 */
router.post('/keypair/generate', async (req, res) => {
  try {
    const { companyId, encryptionPassword } = req.body;
    
    if (!companyId || !encryptionPassword) {
      return res.status(400).json({ error: 'companyId and encryptionPassword are required' });
    }
    
    const keyPair = await getOrCreateKeyPair(companyId, encryptionPassword);
    
    // Return public info only (never expose encrypted private key via API)
    res.json({
      id: keyPair.id,
      companyId: keyPair.companyId,
      publicKey: keyPair.publicKey,
      keyFingerprint: keyPair.keyFingerprint,
      algorithm: keyPair.algorithm,
      authority: keyPair.authority,
      status: keyPair.status
    });
  } catch (error) {
    console.error('Error generating keypair:', error);
    res.status(500).json({ error: 'Failed to generate keypair: ' + error.message });
  }
});

/**
 * GET /api/vat-tokens/keypair/:companyId
 * Get public key info for a company
 */
router.get('/keypair/:companyId', (req, res) => {
  try {
    const { companyId } = req.params;
    
    const stmt = db.prepare(`
      SELECT id, companyId, publicKey, keyFingerprint, algorithm, authority, status, createdAt, expiresAt
      FROM VATKeyPair 
      WHERE companyId = ? AND status = 'active'
    `);
    const keyPair = stmt.get(companyId);
    
    if (!keyPair) {
      return res.status(404).json({ error: 'No active keypair found for this company' });
    }
    
    res.json(keyPair);
  } catch (error) {
    console.error('Error fetching keypair:', error);
    res.status(500).json({ error: 'Failed to fetch keypair: ' + error.message });
  }
});

// =============================================================================
// TOKEN MINTING
// =============================================================================

/**
 * POST /api/vat-tokens/mint
 * Mint a new VAT token for a supply batch
 */
router.post('/mint', async (req, res) => {
  try {
    const {
      companyId,
      batchId,
      productName,
      quantity,
      grossAmount,
      vatRate,
      currencyCode = 'GHS',
      encryptionPassword,
      previousTokenId = null
    } = req.body;
    
    // Validate required fields
    if (!companyId || !quantity || !grossAmount || !vatRate || !encryptionPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields: companyId, quantity, grossAmount, vatRate, encryptionPassword' 
      });
    }
    
    // Get company details
    const company = await getCompanyDetails(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Get or create keypair
    const keyPair = await getOrCreateKeyPair(companyId, encryptionPassword);
    
    // Calculate VAT amount
    const vatAmount = grossAmount - (grossAmount / (1 + (vatRate / 100)));
    
    // Generate token data
    const tokenId = vatCryptoService.generateTokenId();
    const productGlobalSku = vatCryptoService.generateProductGlobalSku(companyId, productName || 'batch', batchId || '');
    const issuedAt = new Date().toISOString();
    
    const tokenData = {
      tokenId,
      batchId: batchId || null,
      productGlobalSku,
      companyId,
      tinNumber: company.tinNumber || '',
      quantity,
      grossAmount,
      vatRate,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      currencyCode,
      issuedAt,
      previousTokenId
    };
    
    // Mint the token (sign with company key)
    const token = vatCryptoService.mintToken(
      tokenData,
      keyPair.privateKeyEncrypted,
      encryptionPassword,
      keyPair.keyFingerprint,
      keyPair.authority
    );
    
    // Store token in database
    const insertStmt = db.prepare(`
      INSERT INTO VATToken (
        id, tokenHash, batchId, productGlobalSku, originCompanyId, originTransactionId,
        quantity, grossAmount, vatAmount, vatRate, currencyCode,
        tokenPayload, signature, signerKeyFingerprint, authority,
        previousTokenId, status, issuedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
    `);
    
    insertStmt.run(
      tokenId,
      token.proof.hash,
      batchId || null,
      productGlobalSku,
      companyId,
      null, // originTransactionId - can be set later
      quantity,
      grossAmount,
      parseFloat(vatAmount.toFixed(2)),
      vatRate,
      currencyCode,
      JSON.stringify(token.payload),
      token.proof.signature,
      keyPair.keyFingerprint,
      keyPair.authority,
      previousTokenId,
      issuedAt
    );
    
    // Return the minted token
    res.status(201).json({
      tokenId,
      tokenHash: token.proof.hash,
      payload: token.payload,
      proof: token.proof,
      qrData: vatCryptoService.exportForQR(token)
    });
    
  } catch (error) {
    console.error('Error minting token:', error);
    res.status(500).json({ error: 'Failed to mint token: ' + error.message });
  }
});

/**
 * POST /api/vat-tokens/mint-for-supply
 * Convenience endpoint to mint token when creating a supply record
 * Called internally after supply creation
 */
router.post('/mint-for-supply', async (req, res) => {
  try {
    const {
      companyId,
      supplyId,
      products,
      totalCost,
      vatRate,
      currencyCode = 'GHS',
      encryptionPassword
    } = req.body;
    
    if (!companyId || !supplyId || !totalCost || !vatRate || !encryptionPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate total quantity
    const totalQuantity = products ? products.reduce((sum, p) => sum + (p.quantity || 0), 0) : 1;
    
    // Build product name from first product or use generic
    const productName = products && products.length > 0 
      ? products.map(p => p.name).join(', ').substring(0, 100)
      : 'Supply Batch';
    
    // Forward to main mint endpoint
    req.body = {
      companyId,
      batchId: supplyId,
      productName,
      quantity: totalQuantity,
      grossAmount: totalCost,
      vatRate,
      currencyCode,
      encryptionPassword
    };
    
    // Call mint logic directly
    const company = await getCompanyDetails(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const keyPair = await getOrCreateKeyPair(companyId, encryptionPassword);
    const vatAmount = totalCost - (totalCost / (1 + (vatRate / 100)));
    const tokenId = vatCryptoService.generateTokenId();
    const productGlobalSku = vatCryptoService.generateProductGlobalSku(companyId, productName, supplyId);
    const issuedAt = new Date().toISOString();
    
    const tokenData = {
      tokenId,
      batchId: supplyId,
      productGlobalSku,
      companyId,
      tinNumber: company.tinNumber || '',
      quantity: totalQuantity,
      grossAmount: totalCost,
      vatRate,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      currencyCode,
      issuedAt,
      previousTokenId: null
    };
    
    const token = vatCryptoService.mintToken(
      tokenData,
      keyPair.privateKeyEncrypted,
      encryptionPassword,
      keyPair.keyFingerprint,
      keyPair.authority
    );
    
    const insertStmt = db.prepare(`
      INSERT INTO VATToken (
        id, tokenHash, batchId, productGlobalSku, originCompanyId, originTransactionId,
        quantity, grossAmount, vatAmount, vatRate, currencyCode,
        tokenPayload, signature, signerKeyFingerprint, authority,
        previousTokenId, status, issuedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
    `);
    
    insertStmt.run(
      tokenId,
      token.proof.hash,
      supplyId,
      productGlobalSku,
      companyId,
      null,
      totalQuantity,
      totalCost,
      parseFloat(vatAmount.toFixed(2)),
      vatRate,
      currencyCode,
      JSON.stringify(token.payload),
      token.proof.signature,
      keyPair.keyFingerprint,
      keyPair.authority,
      null,
      issuedAt
    );
    
    res.status(201).json({
      tokenId,
      tokenHash: token.proof.hash,
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      qrData: vatCryptoService.exportForQR(token)
    });
    
  } catch (error) {
    console.error('Error minting token for supply:', error);
    res.status(500).json({ error: 'Failed to mint token: ' + error.message });
  }
});

// =============================================================================
// TOKEN RETRIEVAL
// =============================================================================

/**
 * GET /api/vat-tokens/:tokenId
 * Get a token by ID
 */
router.get('/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const stmt = db.prepare(`
      SELECT t.*, c.companyName as issuerName
      FROM VATToken t
      LEFT JOIN Company c ON t.originCompanyId = c.id
      WHERE t.id = ?
    `);
    const token = stmt.get(tokenId);
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Parse stored payload
    token.payload = JSON.parse(token.tokenPayload);
    
    // Calculate remaining quantity
    token.referencedQuantity = getTokenReferencedQuantity(tokenId);
    token.remainingQuantity = token.quantity - token.referencedQuantity;
    
    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token: ' + error.message });
  }
});

/**
 * GET /api/vat-tokens/batch/:batchId
 * Get token(s) for a supply batch
 */
router.get('/batch/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    
    const stmt = db.prepare(`
      SELECT t.*, c.companyName as issuerName
      FROM VATToken t
      LEFT JOIN Company c ON t.originCompanyId = c.id
      WHERE t.batchId = ?
      ORDER BY t.issuedAt DESC
    `);
    const tokens = stmt.all(batchId);
    
    // Parse payloads and add quantities
    tokens.forEach(token => {
      token.payload = JSON.parse(token.tokenPayload);
      token.referencedQuantity = getTokenReferencedQuantity(token.id);
      token.remainingQuantity = token.quantity - token.referencedQuantity;
    });
    
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens for batch:', error);
    res.status(500).json({ error: 'Failed to fetch tokens: ' + error.message });
  }
});

/**
 * GET /api/vat-tokens/company/:companyId
 * Get all tokens issued by a company
 */
router.get('/company/:companyId', (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const stmt = db.prepare(`
      SELECT t.id, t.tokenHash, t.batchId, t.quantity, t.grossAmount, t.vatAmount, 
             t.vatRate, t.currencyCode, t.status, t.issuedAt, t.authority
      FROM VATToken t
      WHERE t.originCompanyId = ?
      ORDER BY t.issuedAt DESC
      LIMIT ? OFFSET ?
    `);
    const tokens = stmt.all(companyId, parseInt(limit), parseInt(offset));
    
    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM VATToken WHERE originCompanyId = ?`);
    const countResult = countStmt.get(companyId);
    
    res.json({
      tokens,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching company tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens: ' + error.message });
  }
});

// =============================================================================
// TOKEN VERIFICATION
// =============================================================================

/**
 * POST /api/vat-tokens/verify
 * Verify a token (works for both online and offline-scanned tokens)
 */
router.post('/verify', (req, res) => {
  try {
    const { token, tokenHash, qrData, verifierId } = req.body;
    
    let tokenToVerify = token;
    
    // If QR data provided, import it
    if (qrData && !tokenToVerify) {
      try {
        tokenToVerify = vatCryptoService.importFromQR(qrData);
      } catch (e) {
        return res.status(400).json({ valid: false, reason: 'Invalid QR data format' });
      }
    }
    
    // If tokenHash provided, look up in database
    if (tokenHash && !tokenToVerify) {
      const stmt = db.prepare(`SELECT tokenPayload, signature, signerKeyFingerprint, authority, status FROM VATToken WHERE tokenHash = ?`);
      const dbToken = stmt.get(tokenHash);
      
      if (!dbToken) {
        return res.status(404).json({ valid: false, reason: 'Token not found in database' });
      }
      
      if (dbToken.status === 'revoked') {
        return res.json({ valid: false, reason: 'Token has been revoked', status: 'revoked' });
      }
      
      if (dbToken.status === 'expired') {
        return res.json({ valid: false, reason: 'Token has expired', status: 'expired' });
      }
      
      tokenToVerify = {
        payload: JSON.parse(dbToken.tokenPayload),
        proof: {
          hash: tokenHash,
          signature: dbToken.signature,
          signerKeyFingerprint: dbToken.signerKeyFingerprint,
          authority: dbToken.authority
        }
      };
    }
    
    if (!tokenToVerify || !tokenToVerify.proof) {
      return res.status(400).json({ valid: false, reason: 'No token data provided' });
    }
    
    // Get public key for verification
    const keyFingerprint = tokenToVerify.proof.signerKeyFingerprint || tokenToVerify.proof.k;
    
    // First try VATKeyPair table
    let publicKey = null;
    const keyPairStmt = db.prepare(`SELECT publicKey, status FROM VATKeyPair WHERE keyFingerprint = ?`);
    const keyPairRow = keyPairStmt.get(keyFingerprint);
    
    if (keyPairRow) {
      if (keyPairRow.status === 'revoked') {
        return res.json({ valid: false, reason: 'Signing key has been revoked' });
      }
      publicKey = keyPairRow.publicKey;
    } else {
      // Try TrustedPublicKey cache
      const trustedStmt = db.prepare(`SELECT publicKey, status FROM TrustedPublicKey WHERE keyFingerprint = ?`);
      const trustedRow = trustedStmt.get(keyFingerprint);
      
      if (trustedRow) {
        if (trustedRow.status === 'revoked') {
          return res.json({ valid: false, reason: 'Signing key has been revoked' });
        }
        publicKey = trustedRow.publicKey;
      }
    }
    
    if (!publicKey) {
      return res.json({ 
        valid: false, 
        reason: 'Unknown issuer - public key not found',
        keyFingerprint,
        canImport: true
      });
    }
    
    // Verify the token
    const result = vatCryptoService.verifyToken(tokenToVerify, publicKey);
    
    // Log verification
    if (verifierId) {
      const logStmt = db.prepare(`
        INSERT INTO VATTokenVerification (id, tokenId, verifierId, result, verificationMethod)
        VALUES (?, ?, ?, ?, 'online')
      `);
      
      // Try to get tokenId from database
      const findTokenStmt = db.prepare(`SELECT id FROM VATToken WHERE tokenHash = ?`);
      const foundToken = findTokenStmt.get(tokenToVerify.proof.hash);
      
      if (foundToken) {
        logStmt.run(dbUtils.generateUUID(), foundToken.id, verifierId, result.valid ? 'valid' : 'invalid');
      }
    }
    
    res.json({
      valid: result.valid,
      reason: result.reason,
      authority: result.authority || tokenToVerify.proof.authority,
      tokenId: tokenToVerify.payload.vid,
      issuer: tokenToVerify.payload.cid,
      vatAmount: tokenToVerify.payload.t,
      quantity: tokenToVerify.payload.q
    });
    
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ valid: false, reason: 'Verification error: ' + error.message });
  }
});

// =============================================================================
// TOKEN REVOCATION
// =============================================================================

/**
 * POST /api/vat-tokens/revoke/:tokenId
 * Revoke a token (admin only)
 */
router.post('/revoke/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason, revokedBy } = req.body;
    
    // Check token exists
    const checkStmt = db.prepare(`SELECT id, status FROM VATToken WHERE id = ?`);
    const token = checkStmt.get(tokenId);
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    if (token.status === 'revoked') {
      return res.status(400).json({ error: 'Token is already revoked' });
    }
    
    // Update status
    const updateStmt = db.prepare(`UPDATE VATToken SET status = 'revoked', updatedAt = ? WHERE id = ?`);
    updateStmt.run(new Date().toISOString(), tokenId);
    
    // Log revocation
    if (revokedBy) {
      const logStmt = db.prepare(`
        INSERT INTO VATTokenVerification (id, tokenId, verifierId, result, verificationMethod, notes)
        VALUES (?, ?, ?, 'revoked', 'online', ?)
      `);
      logStmt.run(dbUtils.generateUUID(), tokenId, revokedBy, reason || 'Token revoked');
    }
    
    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ error: 'Failed to revoke token: ' + error.message });
  }
});

// =============================================================================
// TOKEN REFERENCES (QUANTITY TRACKING)
// =============================================================================

/**
 * POST /api/vat-tokens/reference
 * Create a reference to a token (for claiming quantity during resale)
 */
router.post('/reference', (req, res) => {
  try {
    const { tokenId, companyId, productId, quantity, transactionId } = req.body;
    
    if (!tokenId || !companyId || !quantity) {
      return res.status(400).json({ error: 'tokenId, companyId, and quantity are required' });
    }
    
    // Get token and check availability
    const tokenStmt = db.prepare(`SELECT id, quantity, status FROM VATToken WHERE id = ?`);
    const token = tokenStmt.get(tokenId);
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    if (token.status !== 'valid') {
      return res.status(400).json({ error: `Cannot reference token with status: ${token.status}` });
    }
    
    // Check quantity availability
    const referencedQuantity = getTokenReferencedQuantity(tokenId);
    const validation = vatCryptoService.validateQuantityClaim(token.quantity, referencedQuantity, quantity);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }
    
    // Create reference
    const refId = dbUtils.generateUUID();
    const insertStmt = db.prepare(`
      INSERT INTO VATTokenReference (id, tokenId, companyId, productId, quantity, transactionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(refId, tokenId, companyId, productId || null, quantity, transactionId || null);
    
    res.status(201).json({
      referenceId: refId,
      tokenId,
      quantityClaimed: quantity,
      remainingQuantity: validation.remaining
    });
    
  } catch (error) {
    console.error('Error creating token reference:', error);
    res.status(500).json({ error: 'Failed to create reference: ' + error.message });
  }
});

// =============================================================================
// TRUSTED PUBLIC KEYS
// =============================================================================

/**
 * GET /api/vat-tokens/trusted-keys
 * Get all trusted public keys (for offline verification cache)
 */
router.get('/trusted-keys', (req, res) => {
  try {
    const { companyId } = req.query;
    
    let stmt;
    if (companyId) {
      // Get keys relevant to a specific company (their own + partners)
      stmt = db.prepare(`
        SELECT keyFingerprint, publicKey, companyId, companyName, tinNumber, authority, expiresAt
        FROM TrustedPublicKey
        WHERE status = 'active'
        UNION
        SELECT keyFingerprint, publicKey, companyId, 
               (SELECT companyName FROM Company WHERE id = VATKeyPair.companyId) as companyName,
               (SELECT tinNumber FROM Company WHERE id = VATKeyPair.companyId) as tinNumber,
               authority, expiresAt
        FROM VATKeyPair
        WHERE status = 'active'
      `);
    } else {
      stmt = db.prepare(`
        SELECT keyFingerprint, publicKey, companyId, companyName, tinNumber, authority, expiresAt
        FROM TrustedPublicKey
        WHERE status = 'active'
      `);
    }
    
    const keys = stmt.all();
    res.json(keys);
  } catch (error) {
    console.error('Error fetching trusted keys:', error);
    res.status(500).json({ error: 'Failed to fetch trusted keys: ' + error.message });
  }
});

/**
 * POST /api/vat-tokens/trust-key
 * Add an external public key to the trust store
 */
router.post('/trust-key', (req, res) => {
  try {
    const { publicKey, companyName, tinNumber, authority = 'Company' } = req.body;
    
    if (!publicKey) {
      return res.status(400).json({ error: 'publicKey is required' });
    }
    
    // Generate fingerprint
    const keyFingerprint = vatCryptoService.getFingerprint(publicKey);
    
    // Check if already exists
    const checkStmt = db.prepare(`SELECT id FROM TrustedPublicKey WHERE keyFingerprint = ?`);
    const existing = checkStmt.get(keyFingerprint);
    
    if (existing) {
      return res.status(409).json({ error: 'Key already trusted', keyFingerprint });
    }
    
    // Insert
    const id = dbUtils.generateUUID();
    const insertStmt = db.prepare(`
      INSERT INTO TrustedPublicKey (id, keyFingerprint, publicKey, companyName, tinNumber, authority)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, keyFingerprint, publicKey, companyName || null, tinNumber || null, authority);
    
    res.status(201).json({
      id,
      keyFingerprint,
      authority,
      message: 'Key added to trust store'
    });
    
  } catch (error) {
    console.error('Error adding trusted key:', error);
    res.status(500).json({ error: 'Failed to add trusted key: ' + error.message });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * GET /api/vat-tokens/export/:tokenId
 * Export token in QR-ready format
 */
router.get('/export/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const stmt = db.prepare(`
      SELECT tokenPayload, signature, signerKeyFingerprint, authority, tokenHash
      FROM VATToken
      WHERE id = ?
    `);
    const dbToken = stmt.get(tokenId);
    
    if (!dbToken) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const token = {
      payload: JSON.parse(dbToken.tokenPayload),
      proof: {
        hash: dbToken.tokenHash,
        signature: dbToken.signature,
        signerKeyFingerprint: dbToken.signerKeyFingerprint,
        authority: dbToken.authority
      }
    };
    
    const qrData = vatCryptoService.exportForQR(token);
    
    res.json({
      tokenId,
      qrData,
      qrDataLength: qrData.length,
      fullToken: token
    });
    
  } catch (error) {
    console.error('Error exporting token:', error);
    res.status(500).json({ error: 'Failed to export token: ' + error.message });
  }
});

// =============================================================================
// SYNC BATCH - Token Deduplication
// =============================================================================

/**
 * POST /api/vat-tokens/sync/batch
 * Process a batch of tokens from sync (handles deduplication and conflict resolution)
 * 
 * This endpoint accepts batches of tokens from offline nodes or other Sophon instances.
 * It deduplicates by tokenHash and resolves conflicts using:
 * 1. Authority precedence (GRA > SKA > Company)
 * 2. Earliest issuedAt timestamp (if same authority)
 */
router.post('/sync/batch', (req, res) => {
  try {
    const { tokens, publicKeys, syncerId } = req.body;
    
    if (!Array.isArray(tokens) && !Array.isArray(publicKeys)) {
      return res.status(400).json({ error: 'tokens or publicKeys array required' });
    }
    
    const results = {
      tokens: {
        received: 0,
        inserted: 0,
        duplicates: 0,
        conflicts: [],
        errors: []
      },
      publicKeys: {
        received: 0,
        inserted: 0,
        duplicates: 0,
        errors: []
      }
    };
    
    // Process public keys first (needed for token verification)
    if (Array.isArray(publicKeys) && publicKeys.length > 0) {
      results.publicKeys.received = publicKeys.length;
      
      for (const keyData of publicKeys) {
        try {
          if (!keyData.publicKey || !keyData.keyFingerprint) {
            results.publicKeys.errors.push({ 
              fingerprint: keyData.keyFingerprint, 
              error: 'Missing required fields' 
            });
            continue;
          }
          
          // Check if key exists
          const checkStmt = db.prepare(`SELECT id, authority FROM TrustedPublicKey WHERE keyFingerprint = ?`);
          const existing = checkStmt.get(keyData.keyFingerprint);
          
          if (existing) {
            // Check if incoming has higher authority
            const existingLevel = AUTHORITY_PRECEDENCE[existing.authority] || 0;
            const incomingLevel = AUTHORITY_PRECEDENCE[keyData.authority] || 0;
            
            if (incomingLevel > existingLevel) {
              // Update with higher authority key
              const updateStmt = db.prepare(`
                UPDATE TrustedPublicKey 
                SET publicKey = ?, authority = ?, companyName = ?, tinNumber = ?, loadedAt = ?
                WHERE keyFingerprint = ?
              `);
              updateStmt.run(
                keyData.publicKey, keyData.authority || 'Company',
                keyData.companyName || null, keyData.tinNumber || null,
                new Date().toISOString(), keyData.keyFingerprint
              );
              results.publicKeys.inserted++;
            } else {
              results.publicKeys.duplicates++;
            }
          } else {
            // Insert new key
            const insertStmt = db.prepare(`
              INSERT INTO TrustedPublicKey (id, keyFingerprint, publicKey, companyName, tinNumber, authority, loadedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertStmt.run(
              dbUtils.generateUUID(),
              keyData.keyFingerprint,
              keyData.publicKey,
              keyData.companyName || null,
              keyData.tinNumber || null,
              keyData.authority || 'Company',
              new Date().toISOString()
            );
            results.publicKeys.inserted++;
          }
        } catch (keyErr) {
          results.publicKeys.errors.push({ 
            fingerprint: keyData.keyFingerprint, 
            error: keyErr.message 
          });
        }
      }
    }
    
    // Process tokens
    if (Array.isArray(tokens) && tokens.length > 0) {
      results.tokens.received = tokens.length;
      
      for (const tokenData of tokens) {
        try {
          // Validate token structure
          if (!tokenData.tokenHash && !tokenData.proof?.hash) {
            results.tokens.errors.push({ 
              id: tokenData.id || tokenData.payload?.vid, 
              error: 'Missing tokenHash' 
            });
            continue;
          }
          
          const tokenHash = tokenData.tokenHash || tokenData.proof?.hash;
          
          // Check for existing token with same hash
          const checkStmt = db.prepare(`
            SELECT id, authority, issuedAt, status FROM VATToken WHERE tokenHash = ?
          `);
          const existing = checkStmt.get(tokenHash);
          
          if (existing) {
            // Conflict resolution
            const existingAuth = AUTHORITY_PRECEDENCE[existing.authority] || 0;
            const incomingAuth = AUTHORITY_PRECEDENCE[tokenData.authority || tokenData.proof?.authority] || 0;
            
            if (incomingAuth > existingAuth) {
              // Higher authority wins - update existing
              const updateStmt = db.prepare(`
                UPDATE VATToken SET 
                  authority = ?, signature = ?, signerKeyFingerprint = ?, updatedAt = ?
                WHERE tokenHash = ?
              `);
              updateStmt.run(
                tokenData.authority || tokenData.proof?.authority,
                tokenData.signature || tokenData.proof?.signature,
                tokenData.signerKeyFingerprint || tokenData.proof?.signerKeyFingerprint,
                new Date().toISOString(),
                tokenHash
              );
              results.tokens.conflicts.push({
                tokenHash,
                resolution: 'updated',
                reason: 'Higher authority token'
              });
              results.tokens.inserted++;
            } else if (incomingAuth === existingAuth) {
              // Same authority - earlier issuedAt wins
              const existingTime = new Date(existing.issuedAt).getTime();
              const incomingTime = new Date(tokenData.issuedAt || tokenData.payload?.iat).getTime();
              
              if (incomingTime < existingTime) {
                const updateStmt = db.prepare(`
                  UPDATE VATToken SET issuedAt = ?, updatedAt = ? WHERE tokenHash = ?
                `);
                updateStmt.run(
                  tokenData.issuedAt || tokenData.payload?.iat,
                  new Date().toISOString(),
                  tokenHash
                );
                results.tokens.conflicts.push({
                  tokenHash,
                  resolution: 'updated',
                  reason: 'Earlier issuedAt'
                });
              } else {
                results.tokens.duplicates++;
              }
            } else {
              // Existing has higher authority - keep existing
              results.tokens.duplicates++;
            }
          } else {
            // New token - insert
            const tokenId = tokenData.id || tokenData.payload?.vid || dbUtils.generateUUID();
            
            // Extract fields from various input formats
            const payload = tokenData.payload || tokenData;
            const proof = tokenData.proof || {};
            
            const insertStmt = db.prepare(`
              INSERT INTO VATToken (
                id, tokenHash, batchId, productGlobalSku, originCompanyId, originTransactionId,
                quantity, grossAmount, vatAmount, vatRate, currencyCode,
                tokenPayload, signature, signerKeyFingerprint, authority,
                previousTokenId, status, issuedAt, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            insertStmt.run(
              tokenId,
              tokenHash,
              tokenData.batchId || payload.bid || null,
              tokenData.productGlobalSku || payload.pg || '',
              tokenData.originCompanyId || payload.cid || '',
              tokenData.originTransactionId || null,
              tokenData.quantity || payload.q || 0,
              tokenData.grossAmount || payload.g || 0,
              tokenData.vatAmount || payload.t || 0,
              tokenData.vatRate || payload.r || 0,
              tokenData.currencyCode || payload.c || 'GHS',
              typeof payload === 'object' ? JSON.stringify(payload) : tokenData.tokenPayload || '{}',
              tokenData.signature || proof.signature || '',
              tokenData.signerKeyFingerprint || proof.signerKeyFingerprint || proof.k || '',
              tokenData.authority || proof.authority || 'Company',
              tokenData.previousTokenId || payload.prev || null,
              tokenData.status || 'valid',
              tokenData.issuedAt || payload.iat || new Date().toISOString(),
              new Date().toISOString()
            );
            
            results.tokens.inserted++;
          }
        } catch (tokenErr) {
          results.tokens.errors.push({ 
            hash: tokenData.tokenHash || tokenData.proof?.hash,
            id: tokenData.id || tokenData.payload?.vid, 
            error: tokenErr.message 
          });
        }
      }
    }
    
    // Log sync activity
    if (syncerId) {
      try {
        const logStmt = db.prepare(`
          INSERT INTO VATTokenVerification (id, tokenId, verifierId, result, verificationMethod, notes)
          VALUES (?, ?, ?, ?, 'online', ?)
        `);
        logStmt.run(
          dbUtils.generateUUID(),
          'sync-batch', // Placeholder for batch sync
          syncerId,
          'valid',
          `Batch sync: ${results.tokens.inserted} tokens, ${results.publicKeys.inserted} keys`
        );
      } catch (logErr) {
        console.warn('Failed to log sync activity:', logErr.message);
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        tokensProcessed: results.tokens.received,
        tokensInserted: results.tokens.inserted,
        tokensDuplicate: results.tokens.duplicates,
        tokenConflicts: results.tokens.conflicts.length,
        tokenErrors: results.tokens.errors.length,
        keysProcessed: results.publicKeys.received,
        keysInserted: results.publicKeys.inserted
      }
    });
    
  } catch (error) {
    console.error('Error processing sync batch:', error);
    res.status(500).json({ error: 'Failed to process sync batch: ' + error.message });
  }
});

/**
 * GET /api/vat-tokens/sync/export
 * Export tokens for syncing to other nodes
 */
router.get('/sync/export', (req, res) => {
  try {
    const { companyId, since, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        t.id, t.tokenHash, t.batchId, t.productGlobalSku, t.originCompanyId,
        t.quantity, t.grossAmount, t.vatAmount, t.vatRate, t.currencyCode,
        t.tokenPayload, t.signature, t.signerKeyFingerprint, t.authority,
        t.previousTokenId, t.status, t.issuedAt, t.createdAt
      FROM VATToken t
      WHERE 1=1
    `;
    const params = [];
    
    if (companyId) {
      query += ` AND t.originCompanyId = ?`;
      params.push(companyId);
    }
    
    if (since) {
      query += ` AND t.createdAt > ?`;
      params.push(since);
    }
    
    query += ` ORDER BY t.createdAt ASC LIMIT ?`;
    params.push(parseInt(limit));
    
    const stmt = db.prepare(query);
    const tokens = stmt.all(...params);
    
    // Also export relevant public keys
    const keyQuery = db.prepare(`
      SELECT keyFingerprint, publicKey, companyId, companyName, tinNumber, authority
      FROM TrustedPublicKey WHERE status = 'active'
      UNION
      SELECT k.keyFingerprint, k.publicKey, k.companyId, 
             c.companyName, c.tinNumber, k.authority
      FROM VATKeyPair k
      LEFT JOIN Company c ON k.companyId = c.id
      WHERE k.status = 'active'
    `);
    const publicKeys = keyQuery.all();
    
    res.json({
      tokens,
      publicKeys,
      exportedAt: new Date().toISOString(),
      count: tokens.length
    });
    
  } catch (error) {
    console.error('Error exporting tokens for sync:', error);
    res.status(500).json({ error: 'Failed to export tokens: ' + error.message });
  }
});

module.exports = router;
