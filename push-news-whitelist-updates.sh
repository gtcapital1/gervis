#!/bin/bash
# Script per pushare le modifiche relative alla whitelist delle notizie finanziarie
# e lo script di creazione clienti demo

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Imposta il titolo del commit
COMMIT_MESSAGE="Aggiornamento whitelist fonti finanziarie e script demo clienti"

echo -e "${YELLOW}Controllo stato modifica...${NC}"
git status

echo -e "${YELLOW}Aggiungendo file modificati...${NC}"
git add server/market-api.ts server/spark-controller.ts create-demo-clients.js

echo -e "${GREEN}File aggiunti:${NC}"
echo " - server/market-api.ts (whitelist fonti notizie finanziarie)"
echo " - server/spark-controller.ts (integrazione whitelist in Spark)"
echo " - create-demo-clients.js (script generazione clienti demo)"

echo -e "${YELLOW}Commit delle modifiche...${NC}"
git commit -m "$COMMIT_MESSAGE"

echo -e "${YELLOW}Pushing al repository remoto...${NC}"
git push

echo -e "${GREEN}Operazione completata!${NC}"
echo "Modifiche inviate al repository con messaggio: $COMMIT_MESSAGE"