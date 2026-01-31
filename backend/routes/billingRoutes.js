const express = require('express');
const router = express.Router();
const dbUtils = require('../utils/dbUtils');
const PaystackService = require('../services/paystackService');
const paystackConfig = require('../config/paystack');
const { PLANS } = require('../config/plans');

// Initialize a payment for plan upgrade
router.post('/initialize', async (req, res) => {
  try {
    const { companyId, plan } = req.body;
    const planKey = plan?.toUpperCase();

    if (!companyId || !planKey) {
      return res.status(400).json({ error: 'companyId and plan are required.' });
    }

    if (!PLANS[planKey] || planKey === 'ENTERPRISE') {
      return res.status(400).json({
        error: planKey === 'ENTERPRISE'
          ? 'Enterprise plans require contacting sales.'
          : 'Invalid plan. Must be one of: STARTER, TRADER, BUSINESS.',
      });
    }

    const company = await dbUtils.dbGet('SELECT id, email, companyName, currentPlan FROM Company WHERE id = ?', [companyId]);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const planDef = PLANS[planKey];
    const metadata = { companyId, plan: planKey, companyName: company.companyName };

    let result;
    if (!planDef.interval) {
      // One-time payment (STARTER)
      result = await PaystackService.initializeTransaction({
        email: company.email,
        amount: planDef.price,
        metadata,
      });
    } else {
      // Subscription (TRADER, BUSINESS)
      const paystackPlan = await PaystackService.getOrCreatePlan({
        name: `Sophon ${planDef.name}`,
        amount: planDef.price,
        interval: planDef.interval,
      });

      result = await PaystackService.initializeSubscription({
        email: company.email,
        amount: planDef.price,
        planCode: paystackPlan.plan_code,
        metadata,
      });
    }

    res.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
      access_code: result.access_code,
    });
  } catch (err) {
    console.error('Billing initialize error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initialize payment.' });
  }
});

// Paystack webhook — receives payment events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!PaystackService.validateWebhook(signature, rawBody)) {
      return res.status(401).json({ error: 'Invalid signature.' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      const metadata = data.metadata || {};
      const { companyId, plan } = metadata;

      if (!companyId || !plan) {
        console.warn('Webhook charge.success missing metadata:', metadata);
        return res.sendStatus(200);
      }

      const planDef = PLANS[plan];
      const isSubscription = !!planDef?.interval;

      // Calculate expiry
      let planExpiry = null;
      let nextBillingDate = null;
      if (isSubscription) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        planExpiry = expiry.toISOString();
        nextBillingDate = planExpiry;
      }

      await dbUtils.dbRun(
        `UPDATE Company SET
          currentPlan = ?,
          planStatus = 'active',
          planExpiry = ?,
          nextBillingDate = ?,
          paymentProvider = 'paystack',
          paymentMethod = ?,
          paystackCustomerCode = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          plan,
          planExpiry,
          nextBillingDate,
          data.channel || 'card',
          data.customer?.customer_code || null,
          companyId,
        ]
      );

      console.log(`Plan upgraded: company=${companyId} plan=${plan}`);
    }

    if (eventType === 'subscription.create') {
      const { subscription_code, customer } = data;
      if (customer?.metadata?.companyId) {
        await dbUtils.dbRun(
          'UPDATE Company SET paystackSubscriptionCode = ? WHERE id = ?',
          [subscription_code, customer.metadata.companyId]
        );
      }
    }

    if (eventType === 'invoice.payment_failed') {
      const customerCode = data.customer?.customer_code;
      if (customerCode) {
        await dbUtils.dbRun(
          "UPDATE Company SET planStatus = 'past_due', updatedAt = CURRENT_TIMESTAMP WHERE paystackCustomerCode = ?",
          [customerCode]
        );
        console.warn(`Payment failed for customer: ${customerCode}`);
      }
    }

    if (eventType === 'subscription.disable') {
      const subscriptionCode = data.subscription_code;
      if (subscriptionCode) {
        await dbUtils.dbRun(
          "UPDATE Company SET planStatus = 'cancelled', updatedAt = CURRENT_TIMESTAMP WHERE paystackSubscriptionCode = ?",
          [subscriptionCode]
        );
        console.warn(`Subscription disabled: ${subscriptionCode}`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200); // Always return 200 to Paystack to prevent retries
  }
});

// Get billing status for a company
router.get('/status/:companyId', async (req, res) => {
  try {
    const company = await dbUtils.dbGet(
      `SELECT currentPlan, planStatus, planExpiry, nextBillingDate, paymentProvider, paystackSubscriptionCode
       FROM Company WHERE id = ?`,
      [req.params.companyId]
    );

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    res.json({
      currentPlan: company.currentPlan || 'STARTER',
      planStatus: company.planStatus || 'active',
      planExpiry: company.planExpiry,
      nextBillingDate: company.nextBillingDate,
      paymentProvider: company.paymentProvider,
      hasSubscription: !!company.paystackSubscriptionCode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
router.post('/cancel/:companyId', async (req, res) => {
  try {
    const company = await dbUtils.dbGet(
      'SELECT paystackSubscriptionCode, email FROM Company WHERE id = ?',
      [req.params.companyId]
    );

    if (!company?.paystackSubscriptionCode) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    // Fetch subscription to get email token
    const subscription = await PaystackService.getSubscription(company.paystackSubscriptionCode);
    await PaystackService.cancelSubscription(company.paystackSubscriptionCode, subscription.email_token);

    await dbUtils.dbRun(
      "UPDATE Company SET planStatus = 'cancelled', updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [req.params.companyId]
    );

    res.json({ success: true, message: 'Subscription cancelled. Plan remains active until expiry.' });
  } catch (err) {
    console.error('Cancel subscription error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
});

module.exports = router;
