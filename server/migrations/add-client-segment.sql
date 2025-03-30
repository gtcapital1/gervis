-- Aggiungi la colonna client_segment alla tabella clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS client_segment TEXT;

-- Popola il campo client_segment in base al net_worth
UPDATE clients 
SET client_segment = 
  CASE 
    WHEN net_worth < 100000 THEN 'mass_market'
    WHEN net_worth >= 100000 AND net_worth < 500000 THEN 'affluent'
    WHEN net_worth >= 500000 AND net_worth < 2000000 THEN 'hnw'
    WHEN net_worth >= 2000000 AND net_worth < 10000000 THEN 'vhnw'
    WHEN net_worth >= 10000000 THEN 'uhnw'
    ELSE NULL
  END
WHERE net_worth IS NOT NULL; 