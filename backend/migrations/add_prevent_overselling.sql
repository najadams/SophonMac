-- Add preventOverselling column to Settings table
ALTER TABLE Settings ADD COLUMN preventOverselling INTEGER DEFAULT 0;
