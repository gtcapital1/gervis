#!/bin/bash

# Script per correggere il path della directory public
# Questo script risolve il problema della directory public non trovata
# durante l'esecuzione dell'applicazione Node.js

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Script di correzione path directory public ===${NC}"

# Percorsi
REPO_ROOT=$(pwd)
DIST_DIR="${REPO_ROOT}/dist"
SERVER_DIR="${REPO_ROOT}/server"
PUBLIC_DIR="${DIST_DIR}/public"

# Verifica se siamo nella cartella giusta
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}Errore: directory server non trovata.${NC}"
    echo "Assicurati di eseguire questo script dalla root del progetto."
    exit 1
fi

# Verifica se la build è stata eseguita
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Errore: directory dist non trovata.${NC}"
    echo "Esegui prima 'npm run build' per creare la directory dist."
    exit 1
fi

# Verifica se esiste la directory public nella build
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}Errore: directory public non trovata nella build.${NC}"
    echo "Esegui prima 'npm run build' per creare la directory dist/public."
    exit 1
fi

# Crea il link simbolico alla directory public
echo "Creazione del link simbolico alla directory public..."
if [ -L "${SERVER_DIR}/public" ]; then
    echo "Rimozione del link simbolico esistente..."
    rm "${SERVER_DIR}/public"
fi

cd "${SERVER_DIR}"
ln -sf "${PUBLIC_DIR}" public

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Link simbolico creato con successo!${NC}"
    echo -e "La directory ${PUBLIC_DIR} è ora collegata a ${SERVER_DIR}/public"
else
    echo -e "${RED}Errore nella creazione del link simbolico.${NC}"
    exit 1
fi

# Verifica se il collegamento funziona
echo "Verifica del collegamento..."
if [ -L "${SERVER_DIR}/public" ] && [ -d "${SERVER_DIR}/public" ]; then
    echo -e "${GREEN}Verifica completata: il collegamento è valido!${NC}"
else
    echo -e "${RED}Errore: il collegamento non è valido.${NC}"
    exit 1
fi

echo -e "${BLUE}=== Fine script di correzione path directory public ===${NC}"
echo "Per eseguire l'applicazione, usa 'npm start' o 'pm2 start ecosystem.config.cjs'"