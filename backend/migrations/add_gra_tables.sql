-- GRA Integration Tables
-- Queue for asynchronous tax reporting

CREATE TABLE IF NOT EXISTS TaxSubmissionQueue (
    id TEXT PRIMARY KEY,
    transactionId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'failed', 'retry')),
    payload TEXT NOT NULL, -- JSON payload required by GRA
    attempts INTEGER DEFAULT 0,
    lastAttemptAt TEXT,
    externalReferenceId TEXT, -- ID returned by GRA upon success
    errorResponse TEXT,       -- Last error message from GRA
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tax_queue_status ON TaxSubmissionQueue(status);
CREATE INDEX IF NOT EXISTS idx_tax_queue_tx ON TaxSubmissionQueue(transactionId);
