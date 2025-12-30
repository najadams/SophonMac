// Axios removed to avoid dependency issues in this mock implementation
// const axios = require('axios');

// Configuration (Mock)
const GRA_CONFIG = {
    apiUrl: process.env.GRA_API_URL || 'https://api.gra.gov.gh/v1/invoice',
    apiKey: process.env.GRA_API_KEY || 'mock-api-key',
    enabled: process.env.GRA_ENABLED === 'true'
};

class GRAAdapter {
    constructor() {}

    /**
     * Send invoice data to GRA
     * @param {Object} invoiceData - The invoice payload
     * @returns {Promise<Object>} Response with externalReferenceId
     */
    async sendInvoice(invoiceData) {
        if (!GRA_CONFIG.enabled) {
            console.log('GRA Integration disabled or mocking. Simulating success.');
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Randomly fail for testing robustness (optional, strictly controllable in tests)
            // if (Math.random() > 0.9) throw new Error('Simulated random network failure');

            return {
                success: true,
                externalReferenceId: `GRA-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            };
        }

        try {
            // Real implementation would look like this:
            /*
            const response = await axios.post(GRA_CONFIG.apiUrl, invoiceData, {
                headers: {
                    'Authorization': `Bearer ${GRA_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                success: true,
                externalReferenceId: response.data.transaction_id
            };
            */
            throw new Error('Real GRA API not yet implemented');
        } catch (error) {
            console.error('GRA API Error:', error.message);
            throw error;
        }
    }
}

module.exports = new GRAAdapter();
