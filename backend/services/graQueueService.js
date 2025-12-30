const crypto = require('crypto');
const graAdapter = require('./graAdapter');

// Lazy load db
let db = null;
try {
    db = require('../data/db/db');
} catch (e) {
    console.warn('GRAQueueService: DB unavailable');
}

class GRAQueueService {
    constructor() {
        this.MAX_RETRIES = 5;
    }

    /**
     * Set DB instance (for testing or late init)
     */
    setDb(database) {
        db = database;
    }

    /**
     * Add a transaction to the tax queue
     * @param {Object} transaction - Full transaction object
     */
    enqueue(transaction) {
        if (!db) return;

        try {
            const payload = JSON.stringify(this._mapToGRASchema(transaction));
            const id = crypto.randomUUID();
            
            const stmt = db.prepare(`
                INSERT INTO TaxSubmissionQueue (id, transactionId, status, payload)
                VALUES (?, ?, 'pending', ?)
            `);
            
            stmt.run(id, transaction.id, payload);
            console.log(`Transaction ${transaction.id} queued for GRA submission`);
            
            // Trigger processing asynchronously (don't await)
            this.processQueue();
        } catch (error) {
            console.error('Failed to enqueue deferred tax submission:', error);
        }
    }

    /**
     * Process pending items in the queue
     */
    async processQueue() {
        if (!db) return;

        // Fetch pending items
        // Limit 5 to avoid clogging network channel
        const items = db.prepare(`
            SELECT * FROM TaxSubmissionQueue 
            WHERE status IN ('pending', 'retry') 
            AND (lastAttemptAt IS NULL OR lastAttemptAt < datetime('now', '-5 minutes'))
            ORDER BY createdAt ASC
            LIMIT 5
        `).all();

        if (items.length === 0) return;

        console.log(`Processing ${items.length} pending tax submissions...`);

        for (const item of items) {
            await this._processItem(item);
        }
    }

    async _processItem(item) {
        try {
            // Update attempt count
            db.prepare(`UPDATE TaxSubmissionQueue SET attempts = attempts + 1, lastAttemptAt = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(item.id);

            const payload = JSON.parse(item.payload);
            const result = await graAdapter.sendInvoice(payload);

            // Success
            db.prepare(`
                UPDATE TaxSubmissionQueue 
                SET status = 'submitted', externalReferenceId = ? 
                WHERE id = ?
            `).run(result.externalReferenceId, item.id);

            console.log(`Tax submission ${item.id} SUCCESS: ${result.externalReferenceId}`);

        } catch (error) {
            console.error(`Tax submission ${item.id} FAILED:`, error.message);
            
            // Determine if we should retry or fail permanently
            const status = item.attempts + 1 >= this.MAX_RETRIES ? 'failed' : 'retry';
            
            db.prepare(`
                UPDATE TaxSubmissionQueue 
                SET status = ?, errorResponse = ? 
                WHERE id = ?
            `).run(status, error.message, item.id);
        }
    }

    /**
     * Start background polling
     */
    startPolling(intervalMs = 60000) {
        setInterval(() => this.processQueue(), intervalMs);
    }

    /**
     * Mapper: Internal Transaction -> GRA JSON Format
     */
    _mapToGRASchema(transaction) {
        // This is a placeholder mapping based on typical VAT invoice schemas
        return {
            invoice_number: transaction.id,
            date: transaction.createdAt,
            currency: 'GHS',
            total_amount: transaction.totalAmount,
            tax_amount: transaction.vatAmount,
            items: (transaction.items || []).map(item => ({
                description: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                tax_rate: 0.0 // Simplified
            }))
        };
    }
}

module.exports = new GRAQueueService();
