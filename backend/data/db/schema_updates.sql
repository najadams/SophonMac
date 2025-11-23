-- Add check constraint for tax_mode
ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS check_tax_mode;
ALTER TABLE "Company" ADD CONSTRAINT check_tax_mode 
  CHECK (tax_mode IN ('independent', 'umbrella_parent', 'umbrella_child'));

-- Add index for parent_company_id to speed up aggregation
CREATE INDEX IF NOT EXISTS idx_company_parent_id ON "Company"(parent_company_id);

-- Create view for Umbrella Tax Liability Aggregation
-- This view sums up the VAT payable for all children of a parent company
CREATE OR REPLACE VIEW view_umbrella_tax_liability AS
SELECT 
  p.id AS parent_company_id,
  p.name AS parent_company_name,
  COUNT(c.id) AS child_company_count,
  COALESCE(SUM(vp.amount), 0) AS total_vat_payable,
  MAX(vp.updated_at) AS last_transaction_at
FROM "Company" p
JOIN "Company" c ON c.parent_company_id = p.id
LEFT JOIN "VendorPayment" vp ON vp.company_id = c.id 
-- Assuming VendorPayment tracks tax payments or liabilities. 
-- If liability is tracked elsewhere (e.g. Sales), this needs to be adjusted.
-- For now, based on available tables, we are aggregating payments/liabilities.
WHERE p.tax_mode = 'umbrella_parent'
GROUP BY p.id, p.name;
