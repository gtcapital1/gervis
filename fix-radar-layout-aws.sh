#!/bin/bash

# Script per applicare automaticamente le modifiche radar/interests su AWS
# Questo script deve essere eseguito sulla macchina AWS

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory di lavoro
APP_DIR="/opt/gervis"
BACKUP_DIR="/opt/gervis/backups/$(date +%Y%m%d%H%M%S)"

echo -e "${YELLOW}Script di correzione layout radar e interessi di investimento...${NC}"

# Verifica se il file di pacchetto esiste
if [ ! -f "${APP_DIR}/radar-interest-changes.tar.gz" ]; then
  echo -e "${RED}File pacchetto non trovato. Assicurati di aver caricato radar-interest-changes.tar.gz in ${APP_DIR}${NC}"
  exit 1
fi

# Crea directory di backup
mkdir -p ${BACKUP_DIR}
echo -e "${YELLOW}Creazione backup in ${BACKUP_DIR}...${NC}"

# Backup del file originale
cp ${APP_DIR}/client/src/components/advisor/ClientEditDialog.tsx ${BACKUP_DIR}/

# Estrai il pacchetto
echo -e "${YELLOW}Estraendo il pacchetto di modifiche...${NC}"
tar -xzvf ${APP_DIR}/radar-interest-changes.tar.gz -C ${APP_DIR}

# Applica le modifiche
echo -e "${YELLOW}Applicando le modifiche...${NC}"
cp ${APP_DIR}/radar-interest-changes/ClientEditDialog.tsx ${APP_DIR}/client/src/components/advisor/ClientEditDialog.tsx

# Ricostruisci l'applicazione
echo -e "${YELLOW}Ricostruendo l'applicazione...${NC}"
cd ${APP_DIR}
npm run build

# Riavvia il servizio
echo -e "${YELLOW}Riavviando il servizio...${NC}"
pm2 restart gervis-web

echo -e "${GREEN}Modifiche applicate con successo!${NC}"
echo -e "${GREEN}Backup del file originale disponibile in: ${BACKUP_DIR}${NC}"