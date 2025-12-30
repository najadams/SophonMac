-- Governance System Tables
-- Adds tables for SKA Root Key management and history

-- =============================================================================
-- Root Key History (SKA/GRA Level Keys)
-- =============================================================================
CREATE TABLE IF NOT EXISTS RootKeyHistory (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,      -- SHA-256 of public key
    publicKey TEXT NOT NULL,               -- Base64 encoded public key
    privateKeyEncrypted TEXT NOT NULL,     -- Encrypted private key (HSM handle or AES)
    authority TEXT NOT NULL DEFAULT 'SKA', -- SKA or GRA
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'revoked', 'expired')),
    issuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    revokedAt TEXT,
    signatureByParent TEXT,                -- Signature by the previous root key (chain of trust)
    parentFingerprint TEXT,                -- Fingerprint of the key that signed this one
    rotationReason TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rootkey_fingerprint ON RootKeyHistory(fingerprint);
CREATE INDEX IF NOT EXISTS idx_rootkey_status ON RootKeyHistory(status);
