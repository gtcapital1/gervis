#!/bin/bash

# Script di deployment per Gervis
# ----------------------------------
# Questo script automatizza il processo di deployment dell'applicazione
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
REPO_URL="https://github.com/username/gervis.git"  # Cambia con il tuo repository
BRANCH="main"

echo -e "${YELLOW}Avvio deployment di Gervis su sito.it${NC}"

# Verifica se la directory esiste
if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}La directory esiste, aggiornamento del codice...${NC}"
    cd "$APP_DIR"
    git pull origin "$BRANCH"
else
    echo -e "${GREEN}Clonazione del repository...${NC}"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Installazione delle dipendenze
echo -e "${GREEN}Installazione delle dipendenze...${NC}"
npm install --production

# Compilazione del frontend
echo -e "${GREEN}Compilazione del frontend...${NC}"
npm run build

# Verifica se il file .env esiste
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}File .env non trovato. Creazione da .env.example...${NC}"
    cp deploy/.env.example .env
    echo -e "${RED}IMPORTANTE: Modifica il file .env con i valori corretti!${NC}"
fi

# Riavvio dell'applicazione con PM2
if pm2 list | grep -q "gervis"; then
    echo -e "${GREEN}Riavvio dell'applicazione con PM2...${NC}"
    pm2 reload gervis
else
    echo -e "${GREEN}Avvio dell'applicazione con PM2...${NC}"
    pm2 start ecosystem.config.js
fi

# Verifica dello stato
echo -e "${GREEN}Verifica dello stato dell'applicazione...${NC}"
pm2 status

echo -e "${GREEN}Deployment completato con successo!${NC}"