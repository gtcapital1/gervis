#!/bin/bash

# Script di configurazione per Gervis su Ubuntu 22.04 LTS
# Questo script installa e configura tutte le dipendenze necessarie per eseguire Gervis

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Setup Gervis su Ubuntu 22.04 LTS ===${NC}"

# Aggiorna il sistema
echo -e "${GREEN}Aggiornamento del sistema...${NC}"
sudo apt update
sudo apt upgrade -y

# Installa le dipendenze di base
echo -e "${GREEN}Installazione dipendenze di base...${NC}"
sudo apt install -y curl git build-essential ca-certificates gnupg

# Installa Node.js 20
echo -e "${GREEN}Installazione Node.js 20...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
    sudo apt update
    sudo apt install -y nodejs
    echo -e "${GREEN}Node.js $(node -v) installato${NC}"
else
    echo -e "${YELLOW}Node.js $(node -v) già installato${NC}"
fi

# Installa PM2
echo -e "${GREEN}Installazione PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}PM2 installato${NC}"
else
    echo -e "${YELLOW}PM2 già installato${NC}"
fi

# Installa PostgreSQL 15
echo -e "${GREEN}Installazione PostgreSQL 15...${NC}"
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql-common
    sudo sh /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
    sudo apt update
    sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15
    echo -e "${GREEN}PostgreSQL 15 installato${NC}"
else
    echo -e "${YELLOW}PostgreSQL già installato: $(psql --version)${NC}"
fi

# Avvia PostgreSQL
echo -e "${GREEN}Avvio servizio PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configura PostgreSQL per Gervis
echo -e "${GREEN}Configurazione PostgreSQL per Gervis...${NC}"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='gervis'" | grep -q 1; then
    echo -e "${YELLOW}Utente PostgreSQL 'gervis' già esistente${NC}"
else
    echo -e "${GREEN}Creazione utente PostgreSQL 'gervis'...${NC}"
    sudo -u postgres psql -c "CREATE USER gervis WITH PASSWORD 'Oliver1';"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='gervis'" | grep -q 1; then
    echo -e "${YELLOW}Database 'gervis' già esistente${NC}"
else
    echo -e "${GREEN}Creazione database 'gervis'...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE gervis;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;"
    sudo -u postgres psql -c "ALTER USER gervis WITH SUPERUSER;"
fi

# Installa Nginx
echo -e "${GREEN}Installazione Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo ufw allow 'Nginx Full'
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}Nginx installato e configurato${NC}"
else
    echo -e "${YELLOW}Nginx già installato${NC}"
fi

# Configura Nginx per Gervis
echo -e "${GREEN}Configurazione Nginx per Gervis...${NC}"
sudo tee /etc/nginx/sites-available/gervis << EOF
server {
    listen 80;
    server_name gervis.it www.gervis.it;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/gervis /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Crea directory per l'applicazione
echo -e "${GREEN}Creazione directory per l'applicazione...${NC}"
sudo mkdir -p /var/www/gervis
sudo chown $USER:$USER /var/www/gervis

# Clona il repository
echo -e "${GREEN}Clonazione del repository...${NC}"
cd /var/www
if [ -d "/var/www/gervis/.git" ]; then
    echo -e "${YELLOW}Repository già clonato, aggiornamento...${NC}"
    cd gervis
    git pull
else
    echo -e "${GREEN}Clonazione del repository...${NC}"
    git clone https://github.com/gervisdigital/gervis.git gervis
    cd gervis
fi

# Installa le dipendenze
echo -e "${GREEN}Installazione dipendenze Node.js...${NC}"
npm install

# Crea file .env
echo -e "${GREEN}Creazione file .env...${NC}"
cat > .env << EOF
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
EOF

# Esegui build
echo -e "${GREEN}Esecuzione build...${NC}"
npm run build

# Fix per il path public
echo -e "${GREEN}Fix per la directory public...${NC}"
chmod +x fix-public-path.sh
./fix-public-path.sh

# Migrazione database
echo -e "${GREEN}Esecuzione migrazione database...${NC}"
chmod +x run-db-push.sh
./run-db-push.sh

# Configura PM2
echo -e "${GREEN}Configurazione PM2...${NC}"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# Configura nginx per HTTPS (se necessario)
echo -e "${YELLOW}Per configurare HTTPS, eseguire:${NC}"
echo "sudo apt install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d gervis.it -d www.gervis.it"

echo -e "${BLUE}=== Setup completato con successo! ===${NC}"
echo "L'applicazione Gervis è ora disponibile su: http://gervis.it"
echo "Controlla lo stato con: pm2 status gervis"
echo "Visualizza i log con: pm2 logs gervis"