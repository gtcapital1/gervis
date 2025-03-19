# Istruzioni per la Configurazione del Server Gervis

Questo documento contiene le istruzioni per configurare correttamente il server di produzione per l'applicazione Gervis.

## 1. File di Configurazione Ambientale (.env)

Copiare questo contenuto nel file `/var/www/gervis/.env` sul server di produzione:

```bash
# Ambiente
NODE_ENV=production

# Server
PORT=5000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=gervis
DB_PASSWORD=Oliver1
DB_NAME=gervis

# Base URL
BASE_URL=https://gervis.it

# Sessione
SESSION_SECRET=gervisSuperSecretKey2024!

# Email (impostazioni Aruba)
SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_USER=registration@gervis.it
SMTP_PASS=88900Gervis!
SMTP_FROM=registration@gervis.it

# Anche nel formato EMAIL_ per compatibilità
EMAIL_HOST=smtps.aruba.it
EMAIL_PORT=465
EMAIL_USER=registration@gervis.it
EMAIL_PASSWORD=88900Gervis!
EMAIL_FROM=registration@gervis.it
```

## 2. Correzione Path Directory Public

Questo script crea un collegamento simbolico dalla directory public di build alla directory server, necessario per il corretto funzionamento di Vite.

Assicurarsi che `fix-public-path.sh` sia eseguibile:

```bash
cd /var/www/gervis
chmod +x fix-public-path.sh
./fix-public-path.sh
```

## 3. Configurazione PM2

Verificare che il file `ecosystem.config.cjs` abbia le impostazioni corrette:

```javascript
module.exports = {
  apps: [
    {
      name: "gervis",
      script: "node ./dist/server/index.js",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
    },
  ],
};
```

## 4. Riavvio dell'Applicazione

Dopo aver configurato tutto, riavviare l'applicazione:

```bash
sudo pm2 restart gervis
```

## 5. Verifica Logs

In caso di problemi, verificare i log:

```bash
sudo pm2 logs gervis
```

Oppure solo gli errori:

```bash
sudo pm2 logs gervis --err
```

## 6. Risoluzione Problemi

Se la directory public non viene trovata, eseguire:

```bash
cd /var/www/gervis/server
sudo ln -sf /var/www/gervis/dist/public public
```

Per problemi con l'invio email, verificare che le credenziali SMTP siano corrette nel file `.env`.