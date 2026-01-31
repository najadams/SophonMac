module.exports = {
  secretKey: process.env.PAYSTACK_SECRET_KEY || '',
  publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  baseUrl: 'https://api.paystack.co',
  plans: {
    STARTER: { amount: 20000, interval: null, name: 'Sophon Starter' },
    TRADER: { amount: 1500, interval: 'monthly', name: 'Sophon Trader' },
    BUSINESS: { amount: 4500, interval: 'monthly', name: 'Sophon Business' },
  },
  callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:5173/billing/callback',
};
