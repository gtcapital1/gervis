# Deployment di Gervis su AWS con Amazon Linux

Questa guida fornisce istruzioni dettagliate per il deployment dell'applicazione Gervis su Amazon Web Services (AWS) utilizzando un'istanza EC2 con Amazon Linux. Seguendo questi passaggi, sarai in grado di configurare un ambiente di produzione funzionante, completo di database PostgreSQL, server Node.js e web server Nginx.

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Creazione e configurazione dell'istanza EC2](#creazione-e-configurazione-dellistanza-ec2)
3. [Configurazione del database PostgreSQL](#configurazione-del-database-postgresql)
4. [Installazione delle dipendenze](#installazione-delle-dipendenze)
5. [Metodo 1: Configurazione dell'applicazione (build sul server)](#configurazione-dellapplicazione)
6. [Metodo 2: Build locale e trasferimento (Raccomandato)](#metodo-2-build-locale-e-trasferimento-raccomandato)
7. [Configurazione di PM2](#configurazione-di-pm2)
8. [Configurazione di Nginx](#configurazione-di-nginx)
9. [Configurazione HTTPS con Certbot](#configurazione-https-con-certbot)
10. [Avvio e test dell'applicazione](#avvio-e-test-dellapplicazione)
11. [Manutenzione e aggiornamenti](#manutenzione-e-aggiornamenti)

## Prerequisiti

Prima di iniziare, assicurati di avere:

- Un account AWS attivo
- Conoscenze di base sulla gestione di server Linux
- Un dominio configurato con record DNS che puntano alla tua istanza EC2
- Il codice sorgente dell'applicazione Gervis

## Creazione e configurazione dell'istanza EC2

1. **Crea una nuova istanza EC2**:
   - Accedi alla console AWS e vai al servizio EC2
   - Clicca su "Launch Instance"
   - Scegli "Amazon Linux 2023" come Amazon Machine Image (AMI)
   - Scegli un tipo di istanza adeguato (consigliato almeno t3.small per prestazioni accettabili)
   - Configura il gruppo di sicurezza:
     - Permetti SSH (porta 22) dal tuo IP
     - Permetti HTTP (porta 80) da ovunque
     - Permetti HTTPS (porta 443) da ovunque
   - Assegna un Elastic IP all'istanza (opzionale ma consigliato)

2. **Connettiti all'istanza**:
   ```bash
   ssh -i /percorso/alla/tua/chiave.pem ec2-user@tuo-indirizzo-ip
   ```

3. **Aggiorna il sistema**:
   ```bash
   sudo dnf update -y
   ```

## Configurazione del database PostgreSQL

1. **Installa PostgreSQL**:
   ```bash
   sudo dnf install -y postgresql15 postgresql15-server
   ```

2. **Inizializza il database**:
   ```bash
   sudo postgresql-setup --initdb
   ```

3. **Abilita e avvia PostgreSQL**:
   ```bash
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

4. **Crea un database e un utente per l'applicazione**:
   ```bash
   sudo -i -u postgres
   psql
   
   # Nel prompt psql, esegui:
   CREATE DATABASE gervis;
   CREATE USER gervisuser WITH ENCRYPTED PASSWORD 'ScegliUnaPasswordSicura';
   GRANT ALL PRIVILEGES ON DATABASE gervis TO gervisuser;
   
   # Esci da psql
   \q
   exit
   ```

5. **Configura l'autenticazione**:
   ```bash
   sudo nano /var/lib/pgsql/data/pg_hba.conf
   ```
   
   Modifica la riga:
   ```
   host    all             all             127.0.0.1/32            ident
   ```
   
   In:
   ```
   host    all             all             127.0.0.1/32            md5
   ```

6. **Riavvia PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   ```

## Installazione delle dipendenze

1. **Installa Node.js e npm**:
   ```bash
   sudo dnf install -y nodejs
   ```

2. **Verifica le versioni**:
   ```bash
   node -v  # Dovrebbe essere 16.x o superiore
   npm -v   # Dovrebbe essere 7.x o superiore
   ```

3. **Installa Git e altre utilità**:
   ```bash
   sudo dnf install -y git nginx certbot python3-certbot-nginx
   ```

4. **Installa PM2 globalmente**:
   ```bash
   sudo npm install -g pm2
   ```

## Metodo 1: Configurazione dell'applicazione (build sul server)

1. **Crea una directory per l'applicazione**:
   ```bash
   sudo mkdir -p /var/www/gervis
   sudo chown ec2-user:ec2-user /var/www/gervis
   ```

2. **Clona il repository**:
   ```bash
   cd /var/www/gervis
   git clone https://github.com/gtcapital1/gervis-financial-advisor.git .
   ```

   Oppure, se stai caricando i file manualmente:
   ```bash
   # Dal tuo computer locale:
   scp -i /percorso/alla/tua/chiave.pem -r gervis-deploy.tar.gz ec2-user@tuo-indirizzo-ip:/var/www/gervis/
   
   # Sull'istanza EC2:
   cd /var/www/gervis
   tar -xzf gervis-deploy.tar.gz
   ```

3. **Crea il file .env con le variabili di ambiente**:
   ```bash
   nano /var/www/gervis/.env
   ```
   
   Aggiungi le seguenti variabili (sostituisci con i tuoi valori):
   ```
   DATABASE_URL=postgresql://gervisuser:ScegliUnaPasswordSicura@localhost:5432/gervis
   NODE_ENV=production
   PORT=3000
   BASE_URL=https://tuo-dominio.com
   SESSION_SECRET=ScegliUnSecretComplicatoELungo
   SMTP_HOST=smtp.tuoservizio.com
   SMTP_PORT=587
   SMTP_USER=tuo-email@example.com
   SMTP_PASS=TuaPasswordEmail
   SMTP_FROM=no-reply@tuo-dominio.com
   ```

4. **Installa le dipendenze**:
   ```bash
   cd /var/www/gervis
   npm ci
   ```

5. **Costruisci l'applicazione**:
   ```bash
   # Aumenta il limite di memoria per Node.js se necessario
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

6. **Esegui le migrazioni del database**:
   ```bash
   # Assicurati che il file drizzle.config.json esista
   # Se non esiste, crealo con il seguente contenuto:
   cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "./shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "\$DATABASE_URL"
  }
}
EOF

   # Esegui la migrazione
   npm run db:push
   ```

## Metodo 2: Build locale e trasferimento (Raccomandato)

Questo metodo è consigliato se riscontri problemi durante il build sul server AWS, come blocchi o errori di memoria.

### Fase 1: Build locale

1. **Ottieni il codice sorgente sul tuo computer locale**:
   ```bash
   git clone https://github.com/gtcapital1/gervis-financial-advisor.git gervis
   cd gervis
   ```

2. **Installa le dipendenze**:
   ```bash
   npm ci
   ```

3. **Esegui il build dell'applicazione**:
   ```bash
   # Aumenta il limite di memoria per Node.js
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

4. **Prepara il pacchetto per il trasferimento**:
   ```bash
   mkdir -p gervis-prod
   cp -r dist package.json package-lock.json deploy/scripts deploy/.env.production ./gervis-prod
   cd gervis-prod
   
   # Installa solo le dipendenze di produzione
   npm ci --only=production
   
   # Crea un archivio
   cd ..
   tar -czf gervis-prod.tar.gz -C gervis-prod .
   ```

### Fase 2: Preparazione del server AWS

1. **Crea una directory per l'applicazione**:
   ```bash
   sudo mkdir -p /var/www/gervis
   sudo chown ec2-user:ec2-user /var/www/gervis
   ```

2. **Carica il pacchetto sull'istanza AWS**:
   ```bash
   # Dal tuo computer locale
   scp -i /percorso/alla/tua/chiave.pem gervis-prod.tar.gz ec2-user@tuo-indirizzo-ip:/home/ec2-user/
   ```

3. **Estrai il pacchetto sul server**:
   ```bash
   # Sull'istanza AWS
   cd /var/www/gervis
   tar -xzf /home/ec2-user/gervis-prod.tar.gz
   ```

4. **Crea il file .env con le variabili di ambiente**:
   ```bash
   # Copia il file .env.production
   cp deploy/.env.production .env
   
   # Modifica le variabili con i tuoi valori
   nano .env
   ```

5. **Esegui le migrazioni del database**:
   ```bash
   # Installa drizzle-kit se necessario
   npm install -g drizzle-kit
   
   # Assicurati che il file drizzle.config.json esista
   # Se non esiste, crealo con il seguente contenuto:
   cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "./shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "\$DATABASE_URL"
  }
}
EOF
   
   # Esegui le migrazioni
   npm run db:push
   ```

## Configurazione di PM2

1. **Crea un file di configurazione per PM2**:
   ```bash
   nano /var/www/gervis/ecosystem.config.js
   ```
   
   Aggiungi il seguente contenuto:
   ```javascript
   module.exports = {
     apps: [{
       name: 'gervis',
       script: 'dist/server/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       watch: false,
       max_memory_restart: '1G'
     }]
   };
   ```

2. **Avvia l'applicazione con PM2**:
   ```bash
   cd /var/www/gervis
   pm2 start ecosystem.config.js
   ```

3. **Configura PM2 per avviarsi all'avvio del sistema**:
   ```bash
   pm2 startup
   # Segui le istruzioni che appaiono sullo schermo
   pm2 save
   ```

## Configurazione di Nginx

1. **Crea un file di configurazione Nginx**:
   ```bash
   sudo nano /etc/nginx/conf.d/gervis.conf
   ```
   
   Aggiungi il seguente contenuto:
   ```nginx
   server {
       listen 80;
       server_name tuo-dominio.com www.tuo-dominio.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Maggior timeout per l'onboarding che può richiedere più tempo
       location /api/onboarding {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 300s;  # 5 minuti di timeout
       }
       
       # Aumenta il limite del corpo della richiesta per upload di file (PDF, immagini, ecc.)
       client_max_body_size 10M;
   }
   ```

2. **Verifica la sintassi della configurazione Nginx**:
   ```bash
   sudo nginx -t
   ```

3. **Riavvia Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

## Configurazione HTTPS con Certbot

1. **Ottieni un certificato SSL con Certbot**:
   ```bash
   sudo certbot --nginx -d tuo-dominio.com -d www.tuo-dominio.com
   ```
   
   Segui le istruzioni visualizzate. Certbot modificherà automaticamente la configurazione di Nginx.

2. **Verifica il rinnovo automatico del certificato**:
   ```bash
   sudo certbot renew --dry-run
   ```

## Avvio e test dell'applicazione

1. **Assicurati che tutti i servizi siano attivi**:
   ```bash
   sudo systemctl status nginx
   sudo systemctl status postgresql
   pm2 status
   ```

2. **Aggiorna il BASE_URL nell'applicazione** (se necessario):
   ```bash
   cd /var/www/gervis
   node deploy/base-url-update.js https://tuo-dominio.com
   ```

3. **Visita il tuo dominio in un browser** per verificare che l'applicazione funzioni correttamente.

## Manutenzione e aggiornamenti

### Aggiornamento dell'applicazione

Per aggiornare l'applicazione:

```bash
cd /var/www/gervis
git pull  # Se hai usato git
# o carica i nuovi file manualmente

npm ci
npm run build

# Assicurati che il file drizzle.config.json esista prima di eseguire db:push
if [ ! -f drizzle.config.json ]; then
  cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "./shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "\$DATABASE_URL"
  }
}
EOF
fi

npm run db:push  # Solo se ci sono modifiche allo schema
pm2 restart gervis
```

### Backup del database

Configura un backup regolare del database:

```bash
# Crea una directory per i backup
mkdir -p /var/backups/gervis

# Crea uno script di backup
nano /var/backups/gervis/backup.sh
```

Aggiungi il seguente contenuto allo script:
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="/var/backups/gervis/gervis_$DATE.sql"
pg_dump -U postgres gervis > $FILENAME
gzip $FILENAME

# Rimuovi backup più vecchi di 30 giorni
find /var/backups/gervis -name "gervis_*.sql.gz" -mtime +30 -delete
```

Rendi lo script eseguibile:
```bash
chmod +x /var/backups/gervis/backup.sh
```

Aggiungi un job cron per eseguire il backup ogni giorno:
```bash
sudo crontab -e
```

Aggiungi la seguente riga:
```
0 2 * * * /var/backups/gervis/backup.sh
```

### Monitoraggio

Per monitorare l'applicazione:

1. **Controlla i log di PM2**:
   ```bash
   pm2 logs gervis
   ```

2. **Controlla i log di Nginx**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

3. **Controlla i log di PostgreSQL**:
   ```bash
   sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
   ```

## Risoluzione dei problemi

### L'applicazione non si avvia

1. Verifica i log dell'applicazione:
   ```bash
   pm2 logs gervis
   ```

2. Assicurati che il database sia in esecuzione:
   ```bash
   sudo systemctl status postgresql
   ```

3. Controlla che il file .env contenga le variabili corrette.

### Problemi con Nginx

1. Verifica la sintassi della configurazione:
   ```bash
   sudo nginx -t
   ```

2. Controlla i log di errore:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### Problemi di connessione al database

1. Verifica che PostgreSQL sia in esecuzione:
   ```bash
   sudo systemctl status postgresql
   ```

2. Controlla la stringa di connessione nel file .env.

3. Verifica che l'utente del database abbia i permessi corretti:
   ```bash
   sudo -i -u postgres
   psql -c "\du"
   psql -c "\l"
   ```

---

Questa guida fornisce i passaggi essenziali per il deployment di Gervis su AWS con Amazon Linux. Per assistenza più specifica o per problemi di deployment, consulta la documentazione di AWS o contatta il team di sviluppo.