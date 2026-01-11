-- Minimal Supabase Schema for Testing Sync
-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company table (required for foreign keys)
CREATE TABLE IF NOT EXISTS Company (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    tax_id TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Sync metadata
    sync_id TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- VendorPayment table (we have data for this)
CREATE TABLE IF NOT EXISTS VendorPayment (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    company_id INTEGER REFERENCES Company(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Sync metadata
    sync_id TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Notification table (we have data for this)
CREATE TABLE IF NOT EXISTS Notification (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    company_id INTEGER REFERENCES Company(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Sync metadata
    sync_id TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Insert a default company for testing
INSERT INTO Company (name, email, password) 
VALUES ('Test Company', 'test@example.com', 'test123')
ON CONFLICT (email) DO NOTHING;