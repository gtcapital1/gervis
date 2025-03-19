# Istruzioni per l'Aggiornamento del Progetto tramite GitHub

Questo documento spiega come aggiornare l'applicazione Gervis in produzione utilizzando la repository GitHub.

## Prerequisiti

- Accesso SSH al server di produzione
- Credenziali Git per accedere alla repository GitHub
- Variabili d'ambiente necessarie già configurate sul server

## Procedura di aggiornamento

1. **Connessione al server**

   ```bash
   ssh username@your-server-ip
   ```

2. **Navigazione alla directory del progetto**

   ```bash
   cd /var/www/gervis
   ```

3. **Backup del database (opzionale ma consigliato)**

   ```bash
   # Esempio per PostgreSQL
   pg_dump -U username -h hostname database_name > database_backup_$(date +%Y%m%d).sql
   ```

4. **Pull dei cambiamenti da GitHub**

   ```bash
   # Assicurarsi di essere nel branch principale
   git checkout main
   
   # Recuperare i cambiamenti senza applicarli
   git fetch origin
   
   # Visualizzare i cambiamenti che verranno applicati
   git log HEAD..origin/main --oneline
   
   # Applicare i cambiamenti
   git pull origin main
   ```

5. **Installazione delle dipendenze (se necessario)**

   ```bash
   npm ci
   ```

6. **Aggiornamento del file .env**

   ```bash
   # Eseguire lo script per aggiornare il file .env
   ./create-env-file.sh
   ```

7. **Riavvio dell'applicazione**

   ```bash
   # Se si utilizza PM2
   pm2 restart gervis
   
   # Oppure, se si utilizza systemd
   sudo systemctl restart gervis
   ```

8. **Verifica dell'aggiornamento**

   ```bash
   # Controllare i log per verificare che l'applicazione si avvii correttamente
   pm2 logs gervis
   
   # Oppure, se si utilizza systemd
   sudo journalctl -u gervis -f
   ```

## Risoluzione dei problemi

### Errori SMTP

Se si verificano errori di connessione SMTP:

1. Verificare che le variabili d'ambiente SMTP siano impostate correttamente

   ```bash
   # Controllare le variabili d'ambiente
   printenv | grep SMTP
   ```

2. Eseguire il test della connessione SMTP:

   ```bash
   node test-smtp.js
   ```

### Errori di caricamento delle variabili d'ambiente

Se l'applicazione non riesce a caricare le variabili d'ambiente:

1. Verificare che il file `.env` esista e sia nella posizione corretta (directory root del progetto)
2. Controllare i permessi del file `.env` (dovrebbe essere leggibile dall'utente che esegue l'applicazione)
3. Ricreare il file `.env` utilizzando lo script `create-env-file.sh`

## Note tecniche

- L'applicazione è configurata come modulo ES (ESM) e utilizza `import 'dotenv/config'` per caricare le variabili d'ambiente
- Per la connessione SMTP con Aruba, è importante utilizzare il protocollo TLS sulla porta 465
- Le email vengono inviate utilizzando l'account `registration@gervis.it`