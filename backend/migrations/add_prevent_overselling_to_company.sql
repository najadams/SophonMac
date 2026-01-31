-- Add preventOverselling column to Company table
-- (Previously added to Settings table, but frontend reads/writes via Company)
ALTER TABLE Company ADD COLUMN preventOverselling INTEGER DEFAULT 0 CHECK(preventOverselling IN (0,1));
