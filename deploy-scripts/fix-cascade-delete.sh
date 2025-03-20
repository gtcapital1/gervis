#!/bin/bash
# Script per correggere i vincoli CASCADE tra le tabelle
# Questo script aggiorna i vincoli delle foreign key per garantire che quando viene eliminato un cliente
# vengano eliminate a cascata anche le entità dipendenti (asset, recommendations)
#
# Eseguire questo script sul server di produzione con:
# bash fix-cascade-delete.sh

echo "Aggiornamento vincoli CASCADE per le tabelle..."

# Connessione al database
DB_URL="${DATABASE_URL:-postgresql://neondb_owner:password@db.example.com/neondb}"

# Rimuovere i vincoli esistenti e ricrearli con CASCADE
psql "$DB_URL" <<EOF
-- Eliminazione dei vincoli esistenti
ALTER TABLE IF EXISTS assets 
  DROP CONSTRAINT IF EXISTS assets_client_id_clients_id_fk;

ALTER TABLE IF EXISTS recommendations 
  DROP CONSTRAINT IF EXISTS recommendations_client_id_clients_id_fk;

-- Ricreazione dei vincoli con CASCADE
ALTER TABLE assets 
  ADD CONSTRAINT assets_client_id_clients_id_fk 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

ALTER TABLE recommendations 
  ADD CONSTRAINT recommendations_client_id_clients_id_fk 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Verifica vincoli 
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, rc.update_rule, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('assets', 'recommendations');
EOF

echo "Operazione completata. Vincoli CASCADE aggiornati correttamente."