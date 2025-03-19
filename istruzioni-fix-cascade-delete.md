# Istruzioni per il fix dell'eliminazione a cascata dei clienti

Questo documento fornisce le istruzioni per applicare la correzione al problema di eliminazione dei clienti nell'ambiente AWS.

## Problema

Il problema di eliminazione dei clienti è causato da due fattori principali:

1. Mancanza di vincoli `ON DELETE CASCADE` nelle tabelle `assets` e `recommendations`
2. Permessi `DELETE` insufficienti per l'utente del database

## Soluzione

La soluzione include:

1. Aggiunta di vincoli di eliminazione a cascata per assets e recommendations
2. Concessione esplicita dei permessi DELETE all'utente del database
3. Verifica che tutti i vincoli siano stati impostati correttamente

## Files inclusi nel pacchetto

- `server/migrations/fix-cascade-delete.ts` - Script di migrazione che configura i vincoli e i permessi
- `deploy-scripts/fix-cascade-delete.sh` - Script di shell per eseguire la migrazione su AWS

## Procedura di deployment

### 1. Preparazione

1. Accedi al server AWS tramite SSH
   ```
   ssh -i ~/.ssh/tua-chiave.pem ubuntu@indirizzo-ip-server
   ```

2. Crea una directory temporanea per il backup
   ```
   mkdir -p ~/gervis-backup
   ```

3. Esegui un backup del database (opzionale ma consigliato)
   ```
   pg_dump -U postgres gervis > ~/gervis-backup/gervis-$(date +%Y%m%d).sql
   ```

### 2. Upload dei file

1. Carica il pacchetto di aggiornamento sul server
   ```
   scp -i ~/.ssh/tua-chiave.pem gervis-update-cascade-fix.tar.gz ubuntu@indirizzo-ip-server:~
   ```

2. Estrai il pacchetto sul server
   ```
   tar -xzvf gervis-update-cascade-fix.tar.gz -C /tmp
   ```

### 3. Applicazione della correzione

1. Copia i file di migrazione nella directory dell'applicazione
   ```
   sudo cp -r /tmp/server/migrations/fix-cascade-delete.ts /var/www/gervis/server/migrations/
   sudo cp -r /tmp/deploy-scripts/fix-cascade-delete.sh /var/www/gervis/deploy-scripts/
   ```

2. Imposta i permessi di esecuzione
   ```
   sudo chmod +x /var/www/gervis/deploy-scripts/fix-cascade-delete.sh
   ```

3. Esegui lo script di correzione
   ```
   cd /var/www/gervis
   sudo ./deploy-scripts/fix-cascade-delete.sh
   ```

### 4. Verifica

1. Controlla i log per verificare che la migrazione sia stata eseguita con successo
   ```
   sudo pm2 logs gervis
   ```

2. Testa la funzionalità di eliminazione dei clienti attraverso l'interfaccia utente

### 5. Risoluzione dei problemi

Se i problemi persistono:

1. Verifica i log per eventuali errori specifici
   ```
   sudo pm2 logs gervis --lines 100
   ```

2. Controlla lo stato del database
   ```
   sudo -u postgres psql -d gervis -c "\d assets"
   sudo -u postgres psql -d gervis -c "\d recommendations"
   ```

3. Verifica i permessi dell'utente
   ```
   sudo -u postgres psql -d gervis -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='clients'"
   ```

### Note aggiuntive

- Lo script modifica la struttura del database, quindi è consigliabile eseguirlo in un momento di basso traffico
- In caso di problemi, è possibile ripristinare il backup del database creato nel passaggio 1.3

## Supporto

Per qualsiasi problema o domanda durante l'applicazione di questa correzione, contattare:
- Email: support@gervis.it
- Telefono: +39 XXX XXX XXXX