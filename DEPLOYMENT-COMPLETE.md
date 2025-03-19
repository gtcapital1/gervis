# Documentazione Deployment Gervis

## Stato del progetto

✅ **Autenticazione GitHub**: Configurato con GitHub PAT
✅ **Configurazione SMTP**: Funzionante con email Aruba
✅ **Database PostgreSQL**: Connessione verificata
✅ **Sistema di deployment**: Completato con opzioni multiple
✅ **Pacchetti di aggiornamento**: Generati per il deployment manuale

## File e script chiave

- `create-update-package-full.sh`: Script per generare pacchetti di deployment
- `create-env-file.sh`: Script per configurare le variabili d'ambiente
- `test-smtp.js`: Utility per verificare la configurazione email
- `istruzioni-update-github.md`: Guida per aggiornamenti tramite GitHub
- `configurazione-email-aruba.md`: Dettagli configurazione SMTP Aruba
- `checklist-deploy.md`: Procedura completa di deployment

## Pacchetti di deployment

Sono stati generati due pacchetti di deployment:

1. **Pacchetto base** (`gervis-update-20250319.tar.gz`): 
   - Contiene i file di configurazione essenziali
   - Ideale per aggiornamenti rapidi
   
2. **Pacchetto completo** (`gervis-complete-20250319.tar.gz`):
   - Contiene l'intero progetto (esclusi node_modules, .git, ecc.)
   - Per installazioni complete o reinstallazioni

## Procedure di deployment

### Opzione 1: Tramite GitHub (Consigliato)

1. Connessione al server: `ssh username@server-ip`
2. Navigazione: `cd /var/www/gervis`
3. Pull dei cambiamenti: `git pull origin main`
4. Installazione dipendenze: `npm ci`
5. Aggiornamento ambiente: `./create-env-file.sh`
6. Riavvio applicazione: `pm2 restart gervis`

### Opzione 2: Tramite pacchetto base

1. Carica il pacchetto: `scp gervis-update-20250319.tar.gz username@server:/var/www/gervis/`
2. Connessione: `ssh username@server-ip`
3. Navigazione: `cd /var/www/gervis`
4. Estrai i file: `tar -xzf gervis-update-20250319.tar.gz -C /var/www/gervis/`
5. Rendi eseguibile lo script: `chmod +x /var/www/gervis/create-env-file.sh`
6. Riavvio applicazione: `pm2 restart gervis`

### Opzione 3: Installazione completa

1. Carica il pacchetto: `scp gervis-complete-20250319.tar.gz username@server:/var/www/`
2. Connessione: `ssh username@server-ip`
3. Backup: `mv /var/www/gervis /var/www/gervis-backup-$(date +%Y%m%d)`
4. Creazione directory: `mkdir -p /var/www/gervis`
5. Estrai i file: `tar -xzf gervis-complete-20250319.tar.gz -C /var/www/gervis/`
6. Configurazione: `cd /var/www/gervis && chmod +x *.sh && ./create-env-file.sh`
7. Installazione dipendenze: `npm ci`
8. Riavvio applicazione: `pm2 restart gervis`

## Verifica del deployment

Dopo il deployment, verificare il corretto funzionamento:

1. Test SMTP: `node test-smtp.js`
2. Controlla i log: `pm2 logs gervis`
3. Verifica l'accesso web: `curl -I http://localhost:5000`

## Variabili d'ambiente richieste

Il file `.env` deve contenere:

```
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
DATABASE_URL=postgresql://[utente]:[password]@[host]:[porta]/[database]
BASE_URL=https://gervis.it
SMTP_USER=registration@gervis.it
SMTP_PASS=[password_email]
SMTP_FROM=registration@gervis.it
SESSION_SECRET=[chiave_segreta_sessione]
```

## Risoluzione problemi comuni

### Errori SMTP:

1. Verificare le credenziali nel file `.env`
2. Controllare che la porta 465 sia aperta nel firewall
3. Eseguire `node test-smtp.js` per diagnosticare problemi

### Errori database:

1. Verificare la connessione PostgreSQL
2. Controllare che il database esista e sia accessibile
3. Assicurarsi che lo schema del database sia aggiornato

### Errori di avvio applicazione:

1. Controllare i log: `pm2 logs gervis`
2. Verificare che tutte le dipendenze siano installate: `npm ci`
3. Controllare che le variabili d'ambiente siano configurate correttamente

## Aggiornamenti futuri

Per gli aggiornamenti futuri, si consiglia di utilizzare il metodo GitHub (Opzione 1) per mantenere semplicità e tracciabilità delle modifiche. Se non è possibile, utilizzare l'Opzione 2 o 3 a seconda della natura dell'aggiornamento.

---

Documentazione creata il 19/03/2025