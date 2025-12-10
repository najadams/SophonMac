-- VAT Token System Migration
-- Adds tables for cryptographic VAT token infrastructure with SKA trust model
-- Compatible with SQLite (Sophon local) - see Supabase equivalent for cloud

-- =============================================================================
-- VAT KeyPairs (company-level signing keys issued/managed by SKA)
-- =============================================================================
CREATE TABLE IF NOT EXISTS VATKeyPair (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL UNIQUE,
    publicKey TEXT NOT NULL,               -- Base64-encoded Ed25519 public key
    privateKeyEncrypted TEXT NOT NULL,     -- AES-256-GCM encrypted private key (server custody)
    keyFingerprint TEXT NOT NULL UNIQUE,   -- SHA-256 hex of public key for identification
    algorithm TEXT DEFAULT 'Ed25519',
    authority TEXT NOT NULL DEFAULT 'SKA', -- SKA | GRA | Company
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'expired')),
    expiresAt TEXT,                        -- ISO8601 timestamp for key rotation
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- =============================================================================
-- VAT Tokens (cryptographically signed proof of VAT payment)
-- =============================================================================
CREATE TABLE IF NOT EXISTS VATToken (
    id TEXT PRIMARY KEY,                   -- Token UUID (vid in compact payload)
    tokenHash TEXT NOT NULL UNIQUE,        -- SHA-256 hex of canonical payload (dedup key)
    batchId TEXT,                          -- Link to Supplies.id (the restock batch)
    productGlobalSku TEXT NOT NULL,        -- Deterministic global product identifier
    originCompanyId TEXT NOT NULL,         -- Company that paid VAT (issuer)
    originTransactionId TEXT,              -- Optional link to original transaction
    quantity REAL NOT NULL,                -- Quantity covered by this token
    grossAmount REAL NOT NULL,             -- Total amount before VAT extraction
    vatAmount REAL NOT NULL,               -- VAT amount in local currency
    vatRate REAL NOT NULL,                 -- VAT rate at time of issuance (e.g., 12.5)
    currencyCode TEXT NOT NULL,            -- Currency code (e.g., 'GHS')
    tokenPayload TEXT NOT NULL,            -- JSON-serialized canonical payload
    signature TEXT NOT NULL,               -- Base64-encoded Ed25519 signature
    signerKeyFingerprint TEXT NOT NULL,    -- Links to VATKeyPair.keyFingerprint
    authority TEXT NOT NULL DEFAULT 'SKA', -- Authority level of signature
    previousTokenId TEXT,                  -- Chain to previous token (for goods resale)
    status TEXT DEFAULT 'valid' CHECK(status IN ('valid', 'revoked', 'expired', 'invalid')),
    issuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    expiresAt TEXT,                        -- Optional token expiry
    verifiedAt TEXT,                       -- When token was last verified
    verifiedBy TEXT,                       -- Company ID that verified
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (originCompanyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (batchId) REFERENCES Supplies(id) ON DELETE SET NULL,
    FOREIGN KEY (previousTokenId) REFERENCES VATToken(id) ON DELETE SET NULL
);

-- =============================================================================
-- VAT Token References (track quantity usage across transfers/splits)
-- =============================================================================
CREATE TABLE IF NOT EXISTS VATTokenReference (
    id TEXT PRIMARY KEY,
    tokenId TEXT NOT NULL,                 -- The VAT token being referenced
    productId TEXT,                        -- Product this reference applies to
    companyId TEXT NOT NULL,               -- Company making the reference (buyer/reseller)
    transactionId TEXT,                    -- Optional link to sale/transfer transaction
    quantity REAL NOT NULL,                -- Quantity being claimed from this token
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (tokenId) REFERENCES VATToken(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE SET NULL,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- =============================================================================
-- Trusted Public Keys (cached for offline verification)
-- =============================================================================
CREATE TABLE IF NOT EXISTS TrustedPublicKey (
    id TEXT PRIMARY KEY,
    keyFingerprint TEXT NOT NULL UNIQUE,   -- SHA-256 hex of public key
    publicKey TEXT NOT NULL,               -- Base64-encoded public key
    companyId TEXT,                        -- Optional link if from known company
    companyName TEXT,                      -- Human-readable issuer name
    tinNumber TEXT,                        -- TIN of key owner for display
    authority TEXT DEFAULT 'SKA',          -- Trust level (GRA > SKA > Company)
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'expired')),
    loadedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    expiresAt TEXT,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE SET NULL
);

-- =============================================================================
-- VAT Token Verification Log (audit trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS VATTokenVerification (
    id TEXT PRIMARY KEY,
    tokenId TEXT NOT NULL,                 -- Token that was verified
    verifierId TEXT NOT NULL,              -- Company ID that verified
    verifiedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    result TEXT NOT NULL CHECK(result IN ('valid', 'invalid', 'revoked', 'expired', 'unknown_issuer')),
    verificationMethod TEXT CHECK(verificationMethod IN ('online', 'offline')),
    notes TEXT,
    FOREIGN KEY (tokenId) REFERENCES VATToken(id) ON DELETE CASCADE,
    FOREIGN KEY (verifierId) REFERENCES Company(id) ON DELETE CASCADE
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_vattoken_hash ON VATToken(tokenHash);
CREATE INDEX IF NOT EXISTS idx_vattoken_batch ON VATToken(batchId);
CREATE INDEX IF NOT EXISTS idx_vattoken_origin_company ON VATToken(originCompanyId);
CREATE INDEX IF NOT EXISTS idx_vattoken_product_sku ON VATToken(productGlobalSku);
CREATE INDEX IF NOT EXISTS idx_vattoken_signer ON VATToken(signerKeyFingerprint);
CREATE INDEX IF NOT EXISTS idx_vattoken_status ON VATToken(status);
CREATE INDEX IF NOT EXISTS idx_vattokenref_token ON VATTokenReference(tokenId);
CREATE INDEX IF NOT EXISTS idx_vattokenref_company ON VATTokenReference(companyId);
CREATE INDEX IF NOT EXISTS idx_trustedkey_fingerprint ON TrustedPublicKey(keyFingerprint);
CREATE INDEX IF NOT EXISTS idx_trustedkey_company ON TrustedPublicKey(companyId);
CREATE INDEX IF NOT EXISTS idx_vatkeypair_company ON VATKeyPair(companyId);
CREATE INDEX IF NOT EXISTS idx_vatkeypair_fingerprint ON VATKeyPair(keyFingerprint);
CREATE INDEX IF NOT EXISTS idx_vatverification_token ON VATTokenVerification(tokenId);
