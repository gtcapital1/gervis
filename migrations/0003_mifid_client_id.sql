-- Convert client_id from text to integer
ALTER TABLE mifid 
  ALTER COLUMN client_id TYPE integer 
  USING client_id::integer; 