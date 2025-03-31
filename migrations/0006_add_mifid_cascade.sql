-- Drop existing foreign key constraint if it exists
ALTER TABLE "mifid" 
  DROP CONSTRAINT IF EXISTS "mifid_client_id_clients_id_fk";

-- Add new foreign key constraint with ON DELETE CASCADE
ALTER TABLE "mifid" 
  ADD CONSTRAINT "mifid_client_id_clients_id_fk" 
  FOREIGN KEY ("client_id") 
  REFERENCES "clients"("id") 
  ON DELETE CASCADE; 