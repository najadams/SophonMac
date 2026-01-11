-- Test Data for Supabase PostgreSQL Schema
-- This file contains sample data to test the POS system functionality

-- Insert test company
INSERT INTO Company (name, address, phone, email, tax_id, password) VALUES
('Test Company Ltd', '123 Main Street, City, State 12345', '+1-555-0123', 'admin@testcompany.com', 'TAX123456789', '$2b$10$example.hash.for.password123');

-- Insert test settings (assuming company_id = 1)
INSERT INTO Settings (company_id, key, value) VALUES
(1, 'currency', 'USD'),
(1, 'tax_rate', '0.08'),
(1, 'receipt_footer', 'Thank you for your business!'),
(1, 'business_hours', '9:00 AM - 6:00 PM'),
(1, 'max_discount_percent', '20');

-- Insert test workers
INSERT INTO Worker (name, position, phone, email, password, role, company_id) VALUES
('John Admin', 'Manager', '+1-555-0124', 'john@testcompany.com', '$2b$10$example.hash.for.password123', 'admin', 1),
('Jane Cashier', 'Cashier', '+1-555-0125', 'jane@testcompany.com', '$2b$10$example.hash.for.password123', 'worker', 1),
('Bob Supervisor', 'Supervisor', '+1-555-0126', 'bob@testcompany.com', '$2b$10$example.hash.for.password123', 'admin', 1);

-- Insert test company allowed units
INSERT INTO CompanyAllowedUnits (company_id, unit_name, unit_symbol, base_unit, conversion_factor, is_base_unit) VALUES
(1, 'Pieces', 'pcs', 'pcs', 1.0, true),
(1, 'Kilograms', 'kg', 'kg', 1.0, true),
(1, 'Grams', 'g', 'kg', 0.001, false),
(1, 'Liters', 'L', 'L', 1.0, true),
(1, 'Milliliters', 'mL', 'L', 0.001, false),
(1, 'Boxes', 'box', 'pcs', 12.0, false);

-- Insert test inventory items
INSERT INTO Inventory (name, description, quantity, unit_price, category, company_id, barcode, sku, cost_price, selling_price, reorder_level, unit) VALUES
('Coca Cola 330ml', 'Coca Cola Can 330ml', 100, 1.50, 'Beverages', 1, '1234567890123', 'COKE-330', 1.00, 1.50, 20, 'pcs'),
('Bread Loaf', 'White Bread Loaf', 50, 2.99, 'Bakery', 1, '2345678901234', 'BREAD-WHITE', 2.00, 2.99, 10, 'pcs'),
('Milk 1L', 'Fresh Milk 1 Liter', 30, 3.49, 'Dairy', 1, '3456789012345', 'MILK-1L', 2.50, 3.49, 5, 'pcs'),
('Bananas', 'Fresh Bananas', 25, 1.99, 'Fruits', 1, '4567890123456', 'BANANA-KG', 1.20, 1.99, 10, 'kg'),
('Notebook A4', 'A4 Spiral Notebook', 75, 4.99, 'Stationery', 1, '5678901234567', 'NOTE-A4', 3.50, 4.99, 15, 'pcs');

-- Insert test customers
INSERT INTO Customer (name, address, phone, email, company_id, credit_limit, current_balance) VALUES
('Alice Johnson', '456 Oak Avenue, City, State 12345', '+1-555-0201', 'alice@email.com', 1, 500.00, 0.00),
('Bob Smith', '789 Pine Street, City, State 12345', '+1-555-0202', 'bob@email.com', 1, 1000.00, 150.00),
('Carol Davis', '321 Elm Road, City, State 12345', '+1-555-0203', 'carol@email.com', 1, 750.00, 0.00),
('David Wilson', '654 Maple Lane, City, State 12345', '+1-555-0204', 'david@email.com', 1, 300.00, 75.50);

-- Insert test vendors
INSERT INTO Vendor (name, contact_person, phone, email, address, company_id, payment_terms, tax_id) VALUES
('Beverage Distributors Inc', 'Mike Johnson', '+1-555-0301', 'mike@beveragedist.com', '100 Industrial Blvd, City, State 12345', 1, 'Net 30', 'VEN123456'),
('Fresh Foods Wholesale', 'Sarah Brown', '+1-555-0302', 'sarah@freshfoods.com', '200 Market Street, City, State 12345', 1, 'Net 15', 'VEN234567'),
('Office Supplies Co', 'Tom Green', '+1-555-0303', 'tom@officesupplies.com', '300 Business Park, City, State 12345', 1, 'Net 45', 'VEN345678');

-- Insert test receipts
INSERT INTO Receipt (receipt_number, date, total_amount, payment_method, customer_id, company_id, processed_by, discount_amount, tax_amount, notes, status) VALUES
('RCP-001', NOW() - INTERVAL '2 days', 8.97, 'cash', 1, 1, 2, 0.00, 0.72, 'Cash sale', 'completed'),
('RCP-002', NOW() - INTERVAL '1 day', 15.46, 'card', 2, 1, 2, 1.00, 1.24, 'Credit card payment', 'completed'),
('RCP-003', NOW(), 6.48, 'cash', 3, 1, 3, 0.50, 0.52, 'Small discount applied', 'completed');

-- Insert test receipt details
INSERT INTO ReceiptDetail (receipt_id, inventory_id, quantity, unit_price, total_price, discount_amount, company_id) VALUES
-- Receipt 1 details
(1, 1, 2, 1.50, 3.00, 0.00, 1), -- 2 Coca Cola
(1, 2, 1, 2.99, 2.99, 0.00, 1), -- 1 Bread
(1, 3, 1, 3.49, 3.49, 0.00, 1), -- 1 Milk
-- Receipt 2 details  
(2, 1, 3, 1.50, 4.50, 0.00, 1), -- 3 Coca Cola
(2, 4, 2, 1.99, 3.98, 0.00, 1), -- 2 kg Bananas
(2, 5, 2, 4.99, 9.98, 1.00, 1), -- 2 Notebooks with discount
-- Receipt 3 details
(3, 2, 2, 2.99, 5.98, 0.50, 1); -- 2 Bread with discount

-- Insert test debts
INSERT INTO Debt (amount, due_date, description, status, customer_id, company_id, receipt_id) VALUES
(150.00, CURRENT_DATE + INTERVAL '30 days', 'Outstanding balance from previous purchases', 'pending', 2, 1, NULL),
(75.50, CURRENT_DATE + INTERVAL '15 days', 'Partial payment pending', 'pending', 4, 1, NULL);

-- Insert test debt payments
INSERT INTO DebtPayment (debt_id, amount, payment_date, payment_method, reference, notes, processed_by, company_id) VALUES
(1, 50.00, NOW() - INTERVAL '5 days', 'cash', 'CASH-001', 'Partial payment received', 2, 1);

-- Insert test notifications
INSERT INTO Notification (title, message, type, is_read, company_id, worker_id) VALUES
('Low Stock Alert', 'Milk 1L is running low (5 units remaining)', 'warning', false, 1, 1),
('New Sale', 'Receipt RCP-003 completed successfully', 'info', true, 1, 3),
('System Update', 'POS system updated to version 2.1.0', 'info', false, 1, NULL);

-- Insert test supplies
INSERT INTO Supplies (supplier_name, total_amount, supply_date, payment_status, notes, company_id, processed_by) VALUES
('Local Grocery Supplier', 250.00, NOW() - INTERVAL '3 days', 'paid', 'Weekly inventory restock', 1, 1),
('Beverage Supplier', 180.00, NOW() - INTERVAL '1 week', 'pending', 'Monthly beverage order', 1, 1);

-- Insert test supplies details
INSERT INTO SuppliesDetail (supplies_id, inventory_id, quantity, unit_cost, total_cost, company_id) VALUES
-- Supply 1 details
(1, 2, 20, 2.00, 40.00, 1), -- 20 Bread loaves
(1, 3, 15, 2.50, 37.50, 1), -- 15 Milk cartons
(1, 4, 30, 1.20, 36.00, 1), -- 30 kg Bananas
-- Supply 2 details
(2, 1, 120, 1.00, 120.00, 1); -- 120 Coca Cola cans

-- Insert test purchases
INSERT INTO Purchases (vendor_id, purchase_date, total_amount, payment_status, notes, company_id, processed_by) VALUES
(1, NOW() - INTERVAL '1 week', 500.00, 'paid', 'Monthly beverage order', 1, 1),
(2, NOW() - INTERVAL '3 days', 300.00, 'pending', 'Fresh produce order', 1, 1);

-- Insert test purchases details
INSERT INTO PurchasesDetail (purchases_id, inventory_id, quantity, unit_cost, total_cost, company_id) VALUES
-- Purchase 1 details
(1, 1, 200, 1.00, 200.00, 1), -- 200 Coca Cola at $1.00 each
-- Purchase 2 details
(2, 2, 50, 2.00, 100.00, 1), -- 50 Bread loaves at $2.00 each
(2, 3, 40, 2.50, 100.00, 1), -- 40 Milk cartons at $2.50 each
(2, 4, 50, 1.20, 60.00, 1); -- 50 kg Bananas at $1.20 per kg

-- Insert test purchase orders
INSERT INTO PurchaseOrder (order_number, order_date, delivery_date, status, total_amount, vendor_id, company_id, created_by, notes) VALUES
('PO-001', NOW(), CURRENT_DATE + INTERVAL '7 days', 'pending', 600.00, 1, 1, 1, 'Weekly beverage restock'),
('PO-002', NOW() - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 'approved', 400.00, 2, 1, 1, 'Fresh produce order');

-- Insert test purchase order items
INSERT INTO PurchaseOrderItem (purchase_order_id, inventory_id, quantity, unit_price, total_price, received_quantity, company_id) VALUES
-- PO-001 items
(1, 1, 300, 1.00, 300.00, 0, 1), -- 300 Coca Cola
-- PO-002 items
(2, 2, 100, 2.00, 200.00, 0, 1), -- 100 Bread loaves
(2, 3, 80, 2.50, 200.00, 0, 1); -- 80 Milk cartons

-- Insert test vendor payments
INSERT INTO VendorPayment (vendor_id, company_id, purchase_order_id, amount, payment_date, payment_method, reference, notes, processed_by) VALUES
(1, 1, NULL, 500.00, NOW() - INTERVAL '1 week', 'bank_transfer', 'TXN-12345', 'Payment for invoice #INV-001', 1),
(2, 1, NULL, 150.00, NOW() - INTERVAL '3 days', 'check', 'CHK-67890', 'Partial payment for fresh produce', 1);

-- Update inventory quantities based on sales (simulate realistic stock levels)
UPDATE Inventory SET quantity = quantity - 7 WHERE id = 1; -- Coca Cola sold
UPDATE Inventory SET quantity = quantity - 3 WHERE id = 2; -- Bread sold  
UPDATE Inventory SET quantity = quantity - 1 WHERE id = 3; -- Milk sold
UPDATE Inventory SET quantity = quantity - 2 WHERE id = 4; -- Bananas sold
UPDATE Inventory SET quantity = quantity - 2 WHERE id = 5; -- Notebooks sold

-- Add some sample sync outbox entries (simulating pending sync operations)
INSERT INTO SyncOutbox (table_name, record_id, operation, data, sync_id, status) VALUES
('Receipt', 3, 'INSERT', '{"id": 3, "receipt_number": "RCP-003", "total_amount": 6.48}', uuid_generate_v4()::TEXT, 'pending'),
('Inventory', 1, 'UPDATE', '{"id": 1, "quantity": 93}', uuid_generate_v4()::TEXT, 'pending');

-- Add sample sync log entries
INSERT INTO SyncLog (table_name, operation, records_processed, records_failed, started_at, completed_at, status) VALUES
('Company', 'SYNC_DOWN', 1, 0, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '59 minutes', 'completed'),
('Inventory', 'SYNC_UP', 5, 0, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '28 minutes', 'completed'),
('Receipt', 'SYNC_UP', 2, 1, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '8 minutes', 'completed');