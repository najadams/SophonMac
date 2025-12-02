-- Supabase Migration: Add lockReceiptsOlderThanDay to Settings table
-- Run this in your Supabase SQL Editor

-- Add the new column to Settings table
ALTER TABLE "Settings" 
ADD COLUMN "lockReceiptsOlderThanDay" INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN "Settings"."lockReceiptsOlderThanDay" IS 'Prevents editing receipts older than 24 hours when set to 1';
