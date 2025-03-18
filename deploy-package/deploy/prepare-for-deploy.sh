#!/bin/bash

# Script per preparare il progetto per il deployment
# ----------------------------------
# Questo script crea un archivio con tutti i file necessari
# per il deployment su un server di produzione.

# Interrompi in caso di errori
set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurazione
ARCHIVE_NAME="gervis-deploy.zip"
TEMP_DIR="./deploy-temp"

echo -e "${YELLOW}Preparazione del progetto Gervis per il deployment su sito.it${NC}"

# Crea directory temporanea
echo -e "${GREEN}Creazione directory temporanea...${NC}"
mkdir -p "$TEMP_DIR"

# Compila il frontend
echo -e "${GREEN}Compilazione del frontend...${NC}"
npm run build

# Copia i file necessari
echo -e "${GREEN}Copia dei file necessari...${NC}"
cp -r server "$TEMP_DIR/"
cp -r client/dist "$TEMP_DIR/client"
cp -r deploy "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/"
cp drizzle.config.ts "$TEMP_DIR/"
cp -r shared "$TEMP_DIR/"

# Rimuovi i file non necessari
echo -e "${GREEN}Pulizia dei file temporanei...${NC}"
find "$TEMP_DIR" -name "*.test.js" -type f -delete
find "$TEMP_DIR" -name "*.spec.js" -type f -delete
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} +
find "$TEMP_DIR" -name ".git" -type d -exec rm -rf {} +

# Crea l'archivio
echo -e "${GREEN}Creazione dell'archivio...${NC}"
cd "$TEMP_DIR"
zip -r "../$ARCHIVE_NAME" .
cd ..

# Pulizia
echo -e "${GREEN}Pulizia...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Preparazione completata con successo!${NC}"
echo -e "${YELLOW}L'archivio $ARCHIVE_NAME è pronto per essere caricato sul server.${NC}"
echo -e "${YELLOW}Per installare Gervis sul server, esegui:${NC}"
echo -e "${GREEN}1. Estrai l'archivio sul server: unzip $ARCHIVE_NAME${NC}"
echo -e "${GREEN}2. Esegui lo script di setup: bash deploy/scripts/setup.sh${NC}"
echo -e "${GREEN}3. Esegui lo script di deployment: bash deploy/scripts/deploy.sh${NC}"