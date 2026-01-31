-- Add Paystack billing fields to Company table
ALTER TABLE Company ADD COLUMN paystackCustomerCode TEXT;
ALTER TABLE Company ADD COLUMN paystackSubscriptionCode TEXT;
ALTER TABLE Company ADD COLUMN planStatus TEXT DEFAULT 'active' CHECK(planStatus IN ('active', 'past_due', 'cancelled', 'trialing'));
