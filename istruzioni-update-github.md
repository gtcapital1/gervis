# Aggiornamento Gervis tramite GitHub

Questo documento descrive il processo di aggiornamento dell'applicazione Gervis utilizzando Git.

## Istruzioni

1. **Accedi al server di produzione**
   ```bash
   ssh ubuntu@<indirizzo-ip-server>
   ```

2. **Vai alla directory del progetto**
   ```bash
   cd /var/www/gervis
   ```

3. **Fai il pull delle ultime modifiche da GitHub**
   ```bash
   sudo git pull origin main
   ```

4. **Verifica il file .env**
   ```bash
   # Verifica che il file .env esista
   sudo ls -la .env
   
   # Se non esiste, crealo copiando .env.example
   sudo cp .env.example .env
   sudo nano .env
   ```

5. **Assicurati che le seguenti variabili siano configurate nel file .env**
   ```
   # Database
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

   # Server e ambiente
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=5000
   BASE_URL=https://gervis.it

   # Email (essenziali per l'invio di notifiche e onboarding)
   SMTP_USER=registration@gervis.it
   SMTP_PASS=[password-email]
   EMAIL_USER=registration@gervis.it  # fallback per SMTP_USER
   EMAIL_PASSWORD=[password-email]    # fallback per SMTP_PASS

   # Sicurezza
   SESSION_SECRET=[valore-casuale-lungo]
   ```

6. **Installa le dipendenze (se necessario)**
   ```bash
   sudo npm install
   ```

7. **Riavvia l'applicazione con PM2**
   ```bash
   sudo pm2 restart gervis
   ```

8. **Verifica i log per eventuali errori**
   ```bash
   sudo pm2 logs gervis --err --lines 30
   ```

## Test SMTP

Per verificare che la configurazione SMTP funzioni correttamente, puoi usare lo script di test incluso:

1. **Crea un file test-smtp.js nella directory del progetto**
   ```bash
   sudo nano test-smtp.js
   ```

2. **Copia il contenuto del file test-smtp.js fornito nel repository**

3. **Esegui il test**
   ```bash
   sudo node test-smtp.js
   ```

Se tutto funziona correttamente, dovresti vedere il messaggio "Connessione SMTP verificata con successo!" e "Email inviata con successo!".

## Verifica dell'ambiente

Per verificare che tutte le variabili d'ambiente siano caricate correttamente, puoi eseguire:

```bash
sudo -u [utente-che-esegue-pm2] printenv | grep SMTP
```

Se non vedi le variabili SMTP, significa che non sono disponibili nell'ambiente e devi assicurarti che:
1. Il file .env sia presente nella directory corretta
2. PM2 sia configurato per caricare il file .env (verificato nel file ecosystem.config.cjs)
3. Il processo PM2 sia stato riavviato dopo le modifiche

## Problemi comuni e soluzioni

### Errore: Failed to send verification email
- **Problema**: Le credenziali SMTP sono errate o non caricate correttamente.
- **Soluzione**: Verificare che le variabili SMTP_USER, SMTP_PASS, EMAIL_USER, EMAIL_PASSWORD siano correttamente impostate nel file .env.

### Errore: Could not load the .env file
- **Problema**: Il file .env non viene trovato o caricato.
- **Soluzione**: Assicurarsi che il file .env esista nella directory del progetto e che PM2 sia configurato per caricare le variabili d'ambiente dal file .env.

### Errore: Error: getaddrinfo ENOTFOUND smtps.aruba.it
- **Problema**: Il server non riesce a risolvere il nome del server SMTP.
- **Soluzione**: Verificare la connessione internet e che il server DNS sia configurato correttamente.