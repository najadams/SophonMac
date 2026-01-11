-- Sophon POS - PostgreSQL-Optimized Supabase Schema
-- UUID primary keys, snake_case naming, timestamptz, numeric types, sync metadata

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Currency
CREATE TABLE IF NOT EXISTS currency (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text,
  decimals integer NOT NULL DEFAULT 2
);

INSERT INTO currency (code, name, symbol, decimals)
VALUES
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'British Pound', '£', 2),
  ('GHS', 'Ghanaian Cedi', '₵', 2),
  ('TZS', 'Tanzanian Shilling', 'Sh', 2)
ON CONFLICT (code) DO NOTHING;

-- Common function for updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- ------------------------------------------------------------------
-- Core tenant / company
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL UNIQUE,
  email text UNIQUE,
  password text NOT NULL,
  is_email_verified boolean DEFAULT false,
  email_verification_token text,
  email_verification_expires timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,
  refresh_token text,
  contact text,
  location text,
  tax_rate numeric CHECK (tax_rate >= 0 AND tax_rate <= 100),
  currency_code text NOT NULL DEFAULT 'GHS' REFERENCES currency(code),
  current_plan text,
  email_notifications boolean DEFAULT false,
  momo text,
  next_billing_date timestamptz,
  payment_method text,
  payment_provider text,
  sms_notifications boolean DEFAULT false,
  store_address text,
  tax_id text,
  tin_number text,
  tax_mode text DEFAULT 'independent' CHECK (tax_mode IN ('independent','umbrella')),
  parent_company_id uuid REFERENCES company(id) ON DELETE SET NULL,
  tax_id_type text DEFAULT 'TIN' CHECK (tax_id_type IN ('TIN','GH-Card')),
  receipt_template text DEFAULT 'template1',
  receipt_header text,
  receipt_footer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- sync metadata
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  CHECK (tax_mode <> 'umbrella' OR parent_company_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_company_parent ON company(parent_company_id);

-- Company network
CREATE TABLE IF NOT EXISTS company_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  target_company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('subsidiary','partner','branch')),
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (source_company_id, target_company_id),
  CHECK (source_company_id <> target_company_id)
);

-- Company allowed units
CREATE TABLE IF NOT EXISTS company_allowed_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, unit)
);

-- Company allowed categories
CREATE TABLE IF NOT EXISTS company_allowed_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, category)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  currency_code text NOT NULL DEFAULT 'GHS' REFERENCES currency(code),
  theme text DEFAULT 'light' CHECK(theme IN ('light','dark')),
  rounding_sales boolean DEFAULT false,
  lock_receipts_older_than_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id)
);

-- User access roles
CREATE TABLE IF NOT EXISTS user_access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id uuid NOT NULL REFERENCES settings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'sales' CHECK(role IN ('admin','manager','sales','inventory','viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (settings_id, user_id)
);

-- Worker
CREATE TABLE IF NOT EXISTS worker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  adminstatus boolean DEFAULT false,
  name text NOT NULL,
  username text,
  contact text,
  email text,
  password text NOT NULL,
  role text CHECK(role IN ('admin','manager','sales','inventory','cashier')),
  deleted boolean DEFAULT false,
  is_email_verified boolean DEFAULT false,
  email_verification_token text,
  email_verification_expires timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,
  refresh_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, username)
);

CREATE INDEX IF NOT EXISTS idx_worker_company_active ON worker(company_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_worker_email ON worker(email) WHERE email IS NOT NULL;

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'none',
  base_unit text DEFAULT 'none',
  cost_price numeric DEFAULT 0 CHECK (cost_price >= 0),
  sales_price numeric NOT NULL CHECK (sales_price >= 0),
  onhand numeric DEFAULT 0 CHECK (onhand >= 0),
  deleted boolean DEFAULT false,
  reorder_point numeric DEFAULT 0 CHECK (reorder_point >= 0),
  minimum_stock numeric DEFAULT 0 CHECK (minimum_stock >= 0),
  description text,
  sku text,
  barcode text,
  allows_unit_breakdown boolean DEFAULT false,
  atomic_unit text,
  atomic_unit_quantity numeric,
  loss_factor numeric DEFAULT 0 CHECK (loss_factor >= 0 AND loss_factor <= 100),
  last_breakdown_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, name),
  UNIQUE (company_id, sku),
  UNIQUE (company_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_inventory_company_active ON inventory(company_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(company_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(company_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory(company_id, onhand, reorder_point) WHERE deleted = false;

-- Inventory units (many-to-many)
CREATE TABLE IF NOT EXISTS inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (inventory_id, unit)
);

-- Unit conversion
CREATE TABLE IF NOT EXISTS unit_conversion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  conversion_rate numeric NOT NULL CHECK (conversion_rate > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (inventory_id, from_unit, to_unit)
);

-- Price change history
CREATE TABLE IF NOT EXISTS price_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  cost_price numeric CHECK (cost_price >= 0),
  sales_price numeric CHECK (sales_price >= 0),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Stock transactions
CREATE TABLE IF NOT EXISTS stock_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('inbound','outbound','adjustment','breakdown')),
  quantity numeric NOT NULL,
  cost_price numeric NOT NULL CHECK (cost_price >= 0),
  sales_price numeric,
  expiration_date date,
  transaction_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Inventory calculations
CREATE TABLE IF NOT EXISTS inventory_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  avg_daily_demands numeric NOT NULL CHECK (avg_daily_demands >= 0),
  eoq numeric NOT NULL CHECK (eoq >= 0),
  reorder_point numeric NOT NULL CHECK (reorder_point >= 0),
  safety_stock numeric NOT NULL CHECK (safety_stock >= 0),
  average_daily_sales numeric NOT NULL CHECK (average_daily_sales >= 0),
  lead_time_days numeric DEFAULT 7 NOT NULL CHECK (lead_time_days >= 0),
  demand_std_dev numeric NOT NULL CHECK (demand_std_dev >= 0),
  lead_time_std_dev numeric NOT NULL CHECK (lead_time_std_dev >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (product_id)
);

-- Breakdown history
CREATE TABLE IF NOT EXISTS breakdown_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  loss numeric DEFAULT 0 CHECK (loss >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Vendor
CREATE TABLE IF NOT EXISTS vendor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  email text,
  address text,
  phone text,
  tax_id text,
  payment_terms text,
  balance numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  notes text,
  last_purchase_date timestamptz,
  total_purchases numeric DEFAULT 0 CHECK (total_purchases >= 0),
  total_amount numeric DEFAULT 0,
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, name)
);

-- Inventory-Vendor link
CREATE TABLE IF NOT EXISTS inventory_vendor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (inventory_id, vendor_id)
);

-- Customer
CREATE TABLE IF NOT EXISTS customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  belongs_to uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  company text DEFAULT 'nocompany',
  name text NOT NULL,
  address text,
  city text,
  loyalty_points numeric DEFAULT 0 CHECK (loyalty_points >= 0),
  total_spent numeric DEFAULT 0 CHECK (total_spent >= 0),
  last_purchase_date timestamptz,
  notes text,
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (belongs_to, name, company)
);

-- Customer phones/emails
CREATE TABLE IF NOT EXISTS customer_phone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (customer_id, phone)
);

CREATE TABLE IF NOT EXISTS customer_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (customer_id, email)
);

-- Debt and payments
CREATE TABLE IF NOT EXISTS debt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES worker(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','written_off')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS debt_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debt(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  amount_paid numeric NOT NULL CHECK (amount_paid > 0),
  worker_id uuid REFERENCES worker(id) ON DELETE SET NULL,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','card','mobile_money','bank_transfer','cheque')),
  reference text,
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Receipt
CREATE TABLE IF NOT EXISTS receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES worker(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customer(id) ON DELETE SET NULL,
  debt_id uuid REFERENCES debt(id) ON DELETE SET NULL,
  total numeric NOT NULL CHECK (total >= 0),
  amount_paid numeric NOT NULL CHECK (amount_paid >= 0),
  discount numeric DEFAULT 0 CHECK (discount >= 0),
  balance numeric DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','card','mobile_money','bank_transfer','cheque','split')),
  flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (debt_id)
);

-- Receipt (continued)
CREATE INDEX IF NOT EXISTS idx_receipt_company ON receipt(company_id);
CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_worker ON receipt(worker_id);
CREATE INDEX IF NOT EXISTS idx_receipt_customer ON receipt(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flagged ON receipt(company_id) WHERE flagged = true;

-- Receipt payments (One-to-Many)
CREATE TABLE IF NOT EXISTS receipt_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL,
  reference text,
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_receipt_payment_receipt ON receipt_payment(receipt_id);

-- Receipt details
CREATE TABLE IF NOT EXISTS receipt_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipt(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES inventory(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0),
  sales_price numeric NOT NULL CHECK (sales_price >= 0),
  sales_unit text,
  original_quantity numeric,
  base_unit_quantity numeric,
  conversion_rate numeric DEFAULT 1 CHECK (conversion_rate > 0),
  atomic_quantity numeric,
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_receipt_company ON receipt(company_id);
CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_worker ON receipt(worker_id);
CREATE INDEX IF NOT EXISTS idx_receipt_customer ON receipt(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipt_flagged ON receipt(company_id) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_receiptdetail_inventory ON receipt_detail(inventory_id);

-- Notification
CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text CHECK (type IN ('info','warning','error','success')),
  status text DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Supplies and details
CREATE TABLE IF NOT EXISTS supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES vendor(id) ON DELETE SET NULL,
  total_cost numeric CHECK (total_cost >= 0),
  total_quantity numeric CHECK (total_quantity >= 0),
  amount_paid numeric DEFAULT 0 CHECK (amount_paid >= 0),
  discount numeric DEFAULT 0 CHECK (discount >= 0),
  balance numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending','partial','completed','cancelled')),
  restock_date timestamptz DEFAULT now(),
  restocked_by uuid NOT NULL REFERENCES worker(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS supplies_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplies_id uuid NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0),
  sales_price numeric NOT NULL CHECK (sales_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Purchases and details
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  total_amount numeric CHECK (total_amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS purchases_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchases_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  cost_price numeric NOT NULL CHECK (cost_price >= 0),
  sales_price numeric NOT NULL CHECK (sales_price >= 0),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Purchase order
CREATE TABLE IF NOT EXISTS purchase_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','ordered','received','cancelled')),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  amount_paid numeric DEFAULT 0 CHECK (amount_paid >= 0),
  due_date timestamptz,
  notes text,
  ordered_by uuid NOT NULL REFERENCES worker(id) ON DELETE RESTRICT,
  received_by uuid REFERENCES worker(id) ON DELETE SET NULL,
  received_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, order_number),
  CHECK (amount_paid <= total_amount)
);

CREATE TABLE IF NOT EXISTS purchase_order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  cost_price numeric NOT NULL CHECK (cost_price >= 0),
  total_cost numeric NOT NULL CHECK (total_cost >= 0),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Vendor payment
CREATE TABLE IF NOT EXISTS vendor_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_order(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','card','mobile_money','bank_transfer','cheque')),
  reference text,
  notes text,
  processed_by uuid NOT NULL REFERENCES worker(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

-- Device and device state
CREATE TABLE IF NOT EXISTS device (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  name text,
  status text DEFAULT 'offline' CHECK (status IN ('online','offline','maintenance')),
  last_heartbeat timestamptz,
  software_version text,
  last_synced_event_id bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1,
  UNIQUE (company_id, device_id)
);

CREATE TABLE IF NOT EXISTS device_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES device(id) ON DELETE CASCADE,
  last_pulled_at timestamptz,
  last_pushed_at timestamptz
);

-- Event log
CREATE TABLE IF NOT EXISTS event_log (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Network config
CREATE TABLE IF NOT EXISTS network_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  config jsonb,
  is_master boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  sync_id uuid DEFAULT gen_random_uuid(),
  is_synced boolean DEFAULT false,
  last_synced_at timestamptz,
  sync_version integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_networkconfig_company ON network_config(company_id);

-- Sync state & logs
CREATE TABLE IF NOT EXISTS sync_state (
  key text PRIMARY KEY,
  last_synced_id bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  operation text CHECK (operation IN ('insert','update','delete')) NOT NULL,
  timestamp timestamptz DEFAULT now(),
  data jsonb,
  sent boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS sync_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL,
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running',
  error_message text
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  operation text CHECK (operation IN ('insert','update','delete')) NOT NULL,
  data jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Sync outbox for offline operations
CREATE TABLE IF NOT EXISTS sync_outbox (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  operation text NOT NULL,
  data jsonb,
  sync_id uuid,
  created_at timestamptz DEFAULT now(),
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  error_message text,
  status text DEFAULT 'pending'
);

-- ------------------------------------------------------------------
-- Triggers: keep updated_at accurate
-- ------------------------------------------------------------------

-- Apply trigger to multiple tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    -- If table has updated_at column, create trigger (guard against duplicates)
    IF EXISTS(
      SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_%s_updated_at ON %I;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', tbl, tbl);
    END IF;
  END LOOP;
END$$;

-- ------------------------------------------------------------------
-- Indexes for performance (additional to per-table index above)
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eventlog_company ON event_log(company_id);
CREATE INDEX IF NOT EXISTS idx_change_log_table ON change_log(table_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name, timestamp);

-- ------------------------------------------------------------------
-- Row Level Security (RLS) - enable (policies left as templates)
-- ------------------------------------------------------------------
-- NOTE: customize policies to match your auth claims (e.g. auth.jwt() company_id claim)

-- Enable RLS on tables that should be tenant-scoped
ALTER TABLE company ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_allowed_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payment ENABLE ROW LEVEL SECURITY;

-- Example policy template: allow access only to rows matching jwt company_id claim
-- Replace or adapt according to your auth token shape
-- CREATE POLICY "tenant_access" ON inventory
--   USING ((current_setting('jwt.claims.company_id', true) IS NOT NULL AND current_setting('jwt.claims.company_id')::uuid = company_id))
--   WITH CHECK (current_setting('jwt.claims.company_id', true) IS NOT NULL AND current_setting('jwt.claims.company_id')::uuid = company_id);

-- ------------------------------------------------------------------
-- Final notes in schema (human-readable)
-- ------------------------------------------------------------------
-- This schema is optimized for PostgreSQL (Supabase):
-- - uuid primary keys (gen_random_uuid)
-- - timestamptz for created_at/updated_at
-- - numeric for monetary/quantity fields
-- - boolean for flags
-- - sync metadata fields kept (sync_id, is_synced, last_synced_at, sync_version)
--
-- Next steps:
-- 1) Review RLS policies and adapt to your JWT claims (company_id in token)
-- 2) Run this SQL in your Supabase SQL editor
-- 3) Migrate data from SQLite to Postgres (pgloader, custom ETL or script), mapping TEXT UUIDs to UUID type
-- 4) Test sync flows and offline scenarios

-- End of schema
