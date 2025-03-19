# Guida al Deployment di Gervis su AWS

Questa guida fornisce istruzioni dettagliate per il deployment dell'applicazione Gervis su Amazon Web Services (AWS) utilizzando un'istanza EC2 con Amazon Linux. Il metodo consigliato prevede la build dell'applicazione in locale e il successivo trasferimento dei file sul server AWS.

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Creazione dell'istanza EC2](#creazione-dellistanza-ec2)
3. [Configurazione di PostgreSQL](#configurazione-di-postgresql)
4. [Preparazione del server](#preparazione-del-server)
5. [Build locale e deploy](#build-locale-e-deploy)
6. [Configurazione del server web](#configurazione-del-server-web)
7. [Sicurezza HTTPS](#sicurezza-https)
8. [Avvio dell'applicazione](#avvio-dellapplicazione)
9. [Manutenzione](#manutenzione)

## Prerequisiti

Prima di iniziare, assicurati di avere:
- Un account AWS attivo
- Conoscenze di base sulla gestione di server Linux
- Un dominio configurato con record DNS che puntano alla tua istanza EC2
- Il codice sorgente dell'applicazione Gervis sul tuo computer locale

## Creazione dell'istanza EC2

1. **Accedi alla console AWS e crea una nuova istanza EC2**:
   - Scegli "Amazon Linux 2023" come sistema operativo
   - Tipo di istanza consigliato: almeno t3.small per prestazioni adeguate
   - Configura il gruppo di sicurezza:
     - SSH (porta 22) dal tuo IP
     - HTTP (porta 80) da ovunque
     - HTTPS (porta 443) da ovunque
   - Assegna un Elastic IP all'istanza (consigliato)

2. **Connettiti all'istanza**:
   ```bash
   ssh -i /percorso/alla/tua/chiave.pem ec2-user@tuo-indirizzo-ip
   ```

3. **Aggiorna il sistema**:
   ```bash
   sudo dnf update -y
   ```

## Configurazione di PostgreSQL

1. **Installa PostgreSQL**:
   ```bash
   sudo dnf install -y postgresql15 postgresql15-server
   ```

2. **Inizializza e avvia il database**:
   ```bash
   sudo postgresql-setup --initdb
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

3. **Crea database e utente**:
   ```bash
   sudo -i -u postgres
   psql
   
   # Esegui questi comandi nel prompt psql:
   CREATE DATABASE gervis;
   CREATE USER gervisuser WITH ENCRYPTED PASSWORD 'ScegliUnaPasswordSicura';
   GRANT ALL PRIVILEGES ON DATABASE gervis TO gervisuser;
   \q
   exit
   ```

4. **Configura l'autenticazione**:
   ```bash
   sudo nano /var/lib/pgsql/data/pg_hba.conf
   ```
   
   Modifica la riga:
   ```
   host    all    all    127.0.0.1/32    ident
   ```
   
   In:
   ```
   host    all    all    127.0.0.1/32    md5
   ```

5. **Riavvia PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   ```

## Preparazione del server

1. **Installa le dipendenze necessarie**:
   ```bash
   # Node.js e npm
   sudo dnf install -y nodejs
   
   # Git, Nginx e Certbot
   sudo dnf install -y git nginx certbot python3-certbot-nginx
   
   # PM2 per la gestione dell'applicazione
   sudo npm install -g pm2 drizzle-kit
   ```

2. **Crea la directory per l'applicazione**:
   ```bash
   sudo mkdir -p /var/www/gervis
   sudo chown ec2-user:ec2-user /var/www/gervis
   ```

## Build locale e deploy

### 1. Preparazione dell'applicazione in locale

1. **Clona il repository**:
   ```bash
   git clone https://github.com/gtcapital1/gervis.git
   cd gervis
   ```

2. **Installa le dipendenze e crea la build**:
   ```bash
   npm ci
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

3. **Prepara il pacchetto per il deploy**:
   ```bash
   mkdir -p gervis-prod
   cp -r dist package.json package-lock.json deploy/scripts deploy/.env.production drizzle.config.json shared ./gervis-prod
   cd gervis-prod
   
   # Installa solo le dipendenze di produzione
   npm ci --only=production
   
   # Crea l'archivio
   cd ..
   tar -czf gervis-prod.tar.gz -C gervis-prod .
   ```

### 2. Caricamento e configurazione sul server

1. **Trasferisci il pacchetto sul server AWS**:
   ```bash
   scp -i /percorso/alla/tua/chiave.pem gervis-prod.tar.gz ec2-user@tuo-indirizzo-ip:/home/ec2-user/
   ```

2. **Estrai e configura l'applicazione**:
   ```bash
   # Sul server AWS
   cd /var/www/gervis
   tar -xzf /home/ec2-user/gervis-prod.tar.gz
   
   # Crea il file di configurazione
   cp deploy/.env.production .env
   nano .env
   ```

3. **Configura le variabili d'ambiente nel file .env**:
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

4. **Esegui le migrazioni del database**:
   ```bash
   cd /var/www/gervis
   
   # Se non esiste la cartella shared con lo schema, esegui lo script apposito
   if [ ! -d "shared" ]; then
     # Scarica lo script di creazione dello schema
     curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/setup-shared-schema.sh
     # Rendi lo script eseguibile
     chmod +x setup-shared-schema.sh
     # Esegui lo script
     ./setup-shared-schema.sh
   fi
   
   # Verifica che drizzle.config.json esista
   if [ ! -f drizzle.config.json ]; then
     cat > drizzle.config.json << EOF
   {
     "out": "./migrations",
     "schema": "shared/schema.ts",
     "dialect": "postgresql",
     "dbCredentials": {
       "url": "\$DATABASE_URL"
     }
   }
   EOF
   fi
   
   # Esegui la migrazione
   npm run db:push
   ```

## Configurazione del server web

### 1. Configura PM2

1. **Crea il file di configurazione per PM2**:
   ```bash
   # Sul server AWS
   cd /var/www/gervis
   nano ecosystem.config.js
   ```
   
   Contenuto del file:
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
   pm2 start ecosystem.config.js
   pm2 startup
   # Esegui il comando suggerito dall'output
   pm2 save
   ```

### 2. Configura Nginx

1. **Crea la configurazione di Nginx**:
   ```bash
   sudo nano /etc/nginx/conf.d/gervis.conf
   ```
   
   Contenuto del file:
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
       
       # Timeout maggiore per l'onboarding
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
       
       # Limite per upload di file
       client_max_body_size 10M;
   }
   ```

2. **Verifica e attiva la configurazione**:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Sicurezza HTTPS

1. **Ottieni un certificato SSL con Certbot**:
   ```bash
   sudo certbot --nginx -d tuo-dominio.com -d www.tuo-dominio.com
   ```
   
   Segui le istruzioni visualizzate. Certbot modificherà automaticamente la configurazione di Nginx.

2. **Verifica il rinnovo automatico del certificato**:
   ```bash
   sudo certbot renew --dry-run
   ```

## Avvio dell'applicazione

1. **Verifica lo stato dei servizi**:
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

3. **Accedi al tuo dominio** tramite browser per verificare che l'applicazione funzioni correttamente.

## Manutenzione

### Aggiornamento dell'applicazione

```bash
# Sul server AWS
cd /var/www/gervis
git pull  # Se hai usato git
# oppure carica i nuovi file manualmente

npm ci
npm run build

# Se non esiste la cartella shared con lo schema, esegui lo script apposito
if [ ! -d "shared" ]; then
  # Scarica lo script di creazione dello schema
  curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/setup-shared-schema.sh
  # Rendi lo script eseguibile
  chmod +x setup-shared-schema.sh
  # Esegui lo script
  ./setup-shared-schema.sh
fi

# Verifica la presenza di drizzle.config.json
if [ ! -f drizzle.config.json ]; then
  cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "shared/schema.ts",
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

1. **Crea una directory per i backup**:
   ```bash
   mkdir -p /var/backups/gervis
   ```

2. **Crea uno script di backup**:
   ```bash
   nano /var/backups/gervis/backup.sh
   ```
   
   Contenuto:
   ```bash
   #!/bin/bash
   DATE=$(date +%Y-%m-%d_%H-%M-%S)
   FILENAME="/var/backups/gervis/gervis_$DATE.sql"
   pg_dump -U postgres gervis > $FILENAME
   gzip $FILENAME
   
   # Rimuovi backup più vecchi di 30 giorni
   find /var/backups/gervis -name "gervis_*.sql.gz" -mtime +30 -delete
   ```

3. **Rendi lo script eseguibile e pianifica il backup**:
   ```bash
   chmod +x /var/backups/gervis/backup.sh
   
   # Aggiungi al crontab per esecuzione giornaliera alle 2:00
   sudo crontab -e
   ```
   
   Aggiungi:
   ```
   0 2 * * * /var/backups/gervis/backup.sh
   ```

### Monitoraggio e risoluzione problemi

**Log dell'applicazione:**
```bash
pm2 logs gervis
```

**Log di Nginx:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Log di PostgreSQL:**
```bash
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

---

Per assistenza più specifica, contatta il team di sviluppo di Gervis.