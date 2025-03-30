-- Add active and onboarded_at columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP;

-- Update onboarded_at for existing onboarded clients (set to current timestamp)
UPDATE clients 
SET onboarded_at = NOW() 
WHERE is_onboarded = TRUE AND onboarded_at IS NULL; 