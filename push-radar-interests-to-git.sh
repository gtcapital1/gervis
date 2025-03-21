#!/bin/bash

# Script per inviare le modifiche agli interessi di investimento al repository Git
# Questo script assume che le modifiche siano già state fatte localmente

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparazione per l'invio delle modifiche agli interessi di investimento...${NC}"

# Aggiungi il file modificato a Git
echo -e "${YELLOW}Aggiungendo il file radar-interest-changes.tar.gz a Git...${NC}"
git add radar-interest-changes.tar.gz

# Verifica se ci sono modifiche da committare
if git diff --cached --quiet; then
  echo -e "${RED}Nessuna modifica rilevata nel file!${NC}"
  exit 1
fi

# Crea un commit con un messaggio descrittivo
echo -e "${YELLOW}Creando commit con le modifiche...${NC}"
git commit -m "Aggiunto pacchetto di modifiche per gli interessi di investimento nel form di modifica cliente"

# Invia le modifiche al repository remoto
echo -e "${YELLOW}Inviando le modifiche al repository remoto...${NC}"
git push origin main

echo -e "${GREEN}Modifiche inviate con successo!${NC}"
echo -e "${GREEN}Istruzioni per applicare le modifiche:${NC}"
echo -e "1. Scaricare il file radar-interest-changes.tar.gz"
echo -e "2. Estrarre il contenuto: tar -xzvf radar-interest-changes.tar.gz"
echo -e "3. Entrare nella directory: cd radar-interest-changes"
echo -e "4. Eseguire lo script: ./apply-changes.sh"