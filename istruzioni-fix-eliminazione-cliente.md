# Istruzioni per correggere l'eliminazione dei clienti

Questa documentazione spiega come risolvere i problemi di eliminazione dei clienti nell'applicazione Gervis.

## Problema

Quando si tenta di eliminare un cliente, potrebbe verificarsi un errore che impedisce l'eliminazione a causa di vincoli di integrità referenziale nel database. Questo accade perché:

1. Il cliente ha asset o raccomandazioni collegati
2. I vincoli tra le tabelle non sono configurati con l'opzione CASCADE DELETE

## Soluzione

Per risolvere il problema, è necessario modificare i vincoli di integrità referenziale nel database in modo che l'eliminazione di un cliente comporti automaticamente l'eliminazione di tutti gli asset e le raccomandazioni collegati.

## Passi per l'applicazione della correzione

### 1. Accedi al server di produzione

```bash
ssh utente@indirizzo-server
cd /var/www/gervis
```

### 2. Esegui lo script di correzione del database

Lo script `run-db-fixes.sh` automatizza tutto il processo di correzione. Per eseguirlo:

```bash
# Rendi lo script eseguibile (solo la prima volta)
chmod +x run-db-fixes.sh

# Esegui lo script
./run-db-fixes.sh
```

Lo script:
1. Verifica che tutte le dipendenze necessarie siano installate
2. Controlla la configurazione del database
3. Modifica i vincoli di integrità referenziale impostando CASCADE DELETE
4. Verifica che tutto sia stato configurato correttamente

### 3. Verifica il successo dell'operazione

Al termine dell'esecuzione, dovresti vedere un messaggio che conferma che i vincoli CASCADE DELETE sono stati configurati correttamente.

Se tutto è andato a buon fine, ora dovresti essere in grado di eliminare i clienti senza errori, anche se hanno asset o raccomandazioni collegati.

## Esecuzione manuale (solo se necessario)

Se per qualche motivo lo script automatico non funziona, puoi eseguire le query SQL manualmente:

```sql
-- Inizia una transazione
BEGIN;

-- Rimuovi i vincoli esistenti
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey;
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey;

-- Ricrea i vincoli con CASCADE DELETE
ALTER TABLE assets 
ADD CONSTRAINT assets_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

ALTER TABLE recommendations 
ADD CONSTRAINT recommendations_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

-- Commit delle modifiche
COMMIT;
```

## Verifica dei vincoli

Per verificare che i vincoli siano configurati correttamente:

```sql
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu 
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('assets', 'recommendations');
```

Per i vincoli configurati correttamente, il valore di `delete_rule` dovrebbe essere `CASCADE`.

## Supporto

Se riscontri problemi nell'applicazione di questa correzione, contatta il team di supporto tecnico di Gervis.