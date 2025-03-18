#!/bin/bash

# Script di configurazione per Gervis
# ----------------------------------
# Questo script automatizza l'installazione e configurazione iniziale di Gervis
# su un server di produzione.

# Interrompi in caso di errori
set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurazione
APP_DIR="/var/www/gervis"
NGINX_CONF="/etc/nginx/sites-available/gervis"
NGINX_ENABLED="/etc/nginx/sites-enabled/gervis"
DB_NAME="gervis"
DB_USER="gervis_user"

echo -e "${YELLOW}Configurazione di Gervis su sito.it${NC}"

# Verifica dei prerequisiti
echo -e "${GREEN}Verifica dei prerequisiti...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js non è installato. Installalo prima di continuare.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm non è installato. Installalo prima di continuare.${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${YELLOW}PM2 non è installato. Installazione in corso...${NC}"; npm install -g pm2; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}PostgreSQL non è installato. Installalo prima di continuare.${NC}"; exit 1; }

# Configurazione della directory dell'applicazione
echo -e "${GREEN}Creazione della directory dell'applicazione...${NC}"
sudo mkdir -p "$APP_DIR"
sudo chown $(whoami):$(whoami) "$APP_DIR"

# Configurazione di PostgreSQL
echo -e "${GREEN}Configurazione del database PostgreSQL...${NC}"
echo -e "${YELLOW}Per favore inserisci la password per l'utente PostgreSQL:${NC}"
read -s DB_PASSWORD

# Creazione del database e dell'utente
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo -e "${GREEN}Database configurato con successo!${NC}"

# Configurazione di Nginx
echo -e "${GREEN}Configurazione di Nginx...${NC}"
sudo cp deploy/nginx.conf "$NGINX_CONF"

# Sostituisci il dominio nel file di configurazione
sudo sed -i "s/sito.it/$(hostname -f)/g" "$NGINX_CONF"

# Abilita il sito
sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Verifica la configurazione di Nginx
sudo nginx -t

# Riavvia Nginx
sudo systemctl restart nginx

echo -e "${GREEN}Nginx configurato con successo!${NC}"

# Configurazione .env
echo -e "${GREEN}Configurazione del file .env...${NC}"
cp deploy/.env.example .env

# Aggiorna il file .env con i valori corretti
sed -i "s/postgres:\/\/username:password@localhost:5432\/gervis/postgres:\/\/$DB_USER:$DB_PASSWORD@localhost:5432\/$DB_NAME/g" .env
sed -i "s/SESSION_SECRET=cambia_questa_stringa_con_una_password_lunga_e_complessa/SESSION_SECRET=$(openssl rand -hex 32)/g" .env
sed -i "s/BASE_URL=https:\/\/sito.it/BASE_URL=https:\/\/$(hostname -f)/g" .env

echo -e "${GREEN}File .env configurato con successo!${NC}"
echo -e "${YELLOW}IMPORTANTE: Devi ancora configurare le impostazioni email nel file .env!${NC}"

echo -e "${GREEN}Configurazione completata con successo!${NC}"
echo -e "${YELLOW}Puoi ora procedere con il deployment usando lo script deploy.sh${NC}"