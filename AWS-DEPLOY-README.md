# Guida al Deployment di Gervis su AWS/VPS

Questa guida ti aiuterà a configurare Gervis sul tuo server AWS EC2 o VPS.

## Requisiti

- Un server con Ubuntu/Debian o Amazon Linux
- Accesso root o sudo
- Un dominio puntato al tuo server (es. gervis.it)

## Metodo 1: Configurazione Automatica (Raccomandato)

Abbiamo creato uno script che configura automaticamente tutto l'ambiente necessario per Gervis:

```bash
# Scarica lo script di configurazione
curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/deploy/scripts/setup-aws.sh

# Rendi lo script eseguibile
chmod +x setup-aws.sh

# Esegui lo script come sudo
sudo ./setup-aws.sh
```

Lo script configurerà automaticamente:

- Nginx con il tuo dominio
- Database PostgreSQL
- PM2 per l'avvio automatico dell'applicazione
- HTTPS con Let's Encrypt (opzionale)

## Metodo 2: Configurazione Manuale

Se preferisci configurare manualmente il tuo ambiente, segui questi passaggi:

### 1. Installare le Dipendenze

```bash
# Aggiorna i repository
sudo apt update

# Installa Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installa PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Installa Nginx
sudo apt install -y nginx

# Installa PM2 globalmente
sudo npm install -g pm2
```

### 2. Configurare il Database

```bash
# Crea il database e l'utente
sudo -u postgres psql -c "CREATE DATABASE gervis;"
sudo -u postgres psql -c "CREATE USER gervis WITH PASSWORD 'password_sicura';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;"
```

### 3. Configurare l'Applicazione

```bash
# Crea la directory dell'applicazione
sudo mkdir -p /var/www/gervis

# Clona il repository
git clone https://github.com/gtcapital1/gervis.git /var/www/gervis

# Installa le dipendenze
cd /var/www/gervis
npm ci

# Crea il file .env
cat > /var/www/gervis/.env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://gervis:password_sicura@localhost:5432/gervis
SESSION_SECRET=$(openssl rand -hex 32)
BASE_URL=https://tuo-dominio.it
EOF

# Esegui la build dell'applicazione
npm run build
```

### 4. Configurare PM2

```bash
# Crea il file di configurazione PM2
cat > /var/www/gervis/ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'gervis',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Avvia l'applicazione con PM2
pm2 start ecosystem.config.cjs

# Configura PM2 per avviarsi al boot
pm2 startup
# Esegui il comando suggerito dall'output
pm2 save
```

### 5. Configurare Nginx

```bash
# Crea il file di configurazione Nginx
cat > /etc/nginx/sites-available/gervis << EOF
server {
    listen 80;
    server_name tuo-dominio.it www.tuo-dominio.it;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Abilita il sito
sudo ln -s /etc/nginx/sites-available/gervis /etc/nginx/sites-enabled/

# Rimuovi il default site se necessario
sudo rm /etc/nginx/sites-enabled/default

# Verifica la configurazione e riavvia Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Configurare HTTPS (Opzionale)

```bash
# Installa Certbot
sudo apt install -y certbot python3-certbot-nginx

# Ottieni il certificato
sudo certbot --nginx -d tuo-dominio.it -d www.tuo-dominio.it
```

## Risoluzione dei Problemi

Se riscontri problemi, puoi utilizzare i nostri script di diagnostica:

### Fix Nginx

Se Nginx mostra la pagina predefinita invece di Gervis:

```bash
curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/deploy/scripts/fix-nginx.sh
chmod +x fix-nginx.sh
sudo ./fix-nginx.sh
```

### Verifica Stato Applicazione

Per verificare lo stato dell'applicazione:

```bash
curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/deploy/scripts/check-app-status.sh
chmod +x check-app-status.sh
./check-app-status.sh
```

### Controllo dei Log

```bash
# Log Nginx
sudo tail -f /var/log/nginx/error.log

# Log PM2
pm2 logs gervis

# Log PostgreSQL
sudo tail -f /var/lib/postgresql/data/log/postgresql-*.log
```

## Contatti e Supporto

Se hai bisogno di ulteriore assistenza, non esitare a contattarci:

- Email: support@gervis.it
- Telefono: +39 123 456 789

---

© 2024 Gervis. Tutti i diritti riservati.