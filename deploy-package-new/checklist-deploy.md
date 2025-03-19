# Checklist per il deployment dell'aggiornamento

## Prerequisiti
- Assicurarsi che il server abbia accesso a internet per verificare la connessione SMTP
- Verificare che la porta 465 (SMTP/SSL) sia aperta verso l'esterno

## Procedura di deployment

1. **Trasferire il pacchetto sul server**
   ```bash
   scp gervis-deploy-update.tar.gz ubuntu@[indirizzo-server]:/home/ubuntu/
   ```

2. **Accedere al server e scompattare il pacchetto**
   ```bash
   ssh ubuntu@[indirizzo-server]
   cd /var/www/gervis
   sudo cp /home/ubuntu/gervis-deploy-update.tar.gz .
   sudo tar -xzf gervis-deploy-update.tar.gz
   ```

3. **Verificare e aggiornare il file .env**
   ```bash
   # Controllare se il file .env esiste
   sudo ls -la .env

   # Se non esiste, crearlo a partire da .env.example
   sudo cp .env.example .env
   sudo nano .env
   ```

4. **Assicurarsi che le seguenti variabili siano impostate nel file .env**
   ```
   # Configurazione database
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

   # Configurazione server
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=5000
   BASE_URL=https://gervis.it

   # Configurazione email (essenziale!)
   SMTP_USER=registration@gervis.it
   SMTP_PASS=[la-tua-password]
   EMAIL_USER=registration@gervis.it
   EMAIL_PASSWORD=[la-tua-password]

   # Configurazione sessione
   SESSION_SECRET=[un-valore-casuale]
   ```

5. **Installare le dipendenze (se necessario)**
   ```bash
   sudo npm install
   ```

6. **Riavviare l'applicazione con PM2**
   ```bash
   sudo pm2 restart gervis
   ```

7. **Verificare i log per eventuali errori**
   ```bash
   sudo pm2 logs gervis --err --lines 30
   ```

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