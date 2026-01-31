const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/paystack');

const api = axios.create({
  baseURL: config.baseUrl,
  headers: {
    Authorization: `Bearer ${config.secretKey}`,
    'Content-Type': 'application/json',
  },
});

const PaystackService = {
  /**
   * Initialize a one-time transaction.
   */
  async initializeTransaction({ email, amount, metadata, callbackUrl }) {
    const { data } = await api.post('/transaction/initialize', {
      email,
      amount,
      currency: 'GHS',
      callback_url: callbackUrl || config.callbackUrl,
      metadata,
    });
    return data.data; // { authorization_url, access_code, reference }
  },

  /**
   * Verify a transaction by reference.
   */
  async verifyTransaction(reference) {
    const { data } = await api.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return data.data;
  },

  /**
   * Create a Paystack subscription plan (idempotent — check if exists first).
   */
  async getOrCreatePlan({ name, amount, interval }) {
    // List existing plans and find by name
    const { data: listData } = await api.get('/plan');
    const existing = listData.data.find(p => p.name === name && p.amount === amount);
    if (existing) return existing;

    const { data } = await api.post('/plan', {
      name,
      amount,
      interval,
      currency: 'GHS',
    });
    return data.data;
  },

  /**
   * Initialize a subscription transaction.
   * Paystack handles subscription creation after the first charge.
   */
  async initializeSubscription({ email, amount, planCode, metadata, callbackUrl }) {
    const { data } = await api.post('/transaction/initialize', {
      email,
      amount,
      currency: 'GHS',
      plan: planCode,
      callback_url: callbackUrl || config.callbackUrl,
      metadata,
    });
    return data.data;
  },

  /**
   * Cancel a subscription.
   */
  async cancelSubscription(subscriptionCode, emailToken) {
    const { data } = await api.post('/subscription/disable', {
      code: subscriptionCode,
      token: emailToken,
    });
    return data;
  },

  /**
   * Fetch subscription details.
   */
  async getSubscription(subscriptionCode) {
    const { data } = await api.get(`/subscription/${encodeURIComponent(subscriptionCode)}`);
    return data.data;
  },

  /**
   * Validate webhook signature (HMAC SHA512).
   */
  validateWebhook(signature, rawBody) {
    const hash = crypto
      .createHmac('sha512', config.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  },
};

module.exports = PaystackService;
