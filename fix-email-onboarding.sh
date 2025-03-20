#!/bin/bash

# Script per correggere il problema di invio email nell'onboarding dei clienti
# Questo script aggiorna i file necessari sul server di produzione

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funzione per gestire errori
handle_error() {
  echo -e "${RED}ERRORE: $1${NC}"
  exit 1
}

echo -e "${YELLOW}=== FIX PER INVIO EMAIL ONBOARDING ===${NC}"
echo "Questo script corregge il problema di invio email durante l'onboarding dei clienti."
echo ""

# Directory dell'applicazione
APP_DIR="/var/www/gervis"
if [ ! -d "$APP_DIR" ]; then
  handle_error "Directory dell'applicazione '$APP_DIR' non trovata. Verificare il percorso."
fi

# Backup dei file originali
echo -e "${YELLOW}Creazione backup dei file originali...${NC}"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="$APP_DIR/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

cp "$APP_DIR/server/routes.ts" "$BACKUP_DIR/routes.ts.bak" || handle_error "Impossibile creare backup di routes.ts"
cp "$APP_DIR/server/email.ts" "$BACKUP_DIR/email.ts.bak" || handle_error "Impossibile creare backup di email.ts"
cp "$APP_DIR/server/storage.ts" "$BACKUP_DIR/storage.ts.bak" || handle_error "Impossibile creare backup di storage.ts"
cp "$APP_DIR/client/src/pages/ClientDetail.tsx" "$BACKUP_DIR/ClientDetail.tsx.bak" || handle_error "Impossibile creare backup di ClientDetail.tsx"

echo -e "${GREEN}Backup completato in: $BACKUP_DIR${NC}"

# Aggiorna il progetto dal repository Git
echo -e "${YELLOW}Aggiornamento dal repository Git...${NC}"
cd "$APP_DIR"
git fetch origin || handle_error "Impossibile scaricare le ultime modifiche dal repository"
git checkout fix-email-onboarding || handle_error "Impossibile passare al branch fix-email-onboarding"
git pull origin fix-email-onboarding || handle_error "Impossibile scaricare le ultime modifiche del branch"

# Ricostruisci l'applicazione
echo -e "${YELLOW}Ricostruzione dell'applicazione...${NC}"
npm run build || handle_error "Impossibile ricostruire l'applicazione"

# Riavvia il server
echo -e "${YELLOW}Riavvio del server...${NC}"
pm2 restart gervis || handle_error "Impossibile riavviare il server"

echo -e "${GREEN}=== FIX COMPLETATO CON SUCCESSO ===${NC}"
echo "Le modifiche sono state applicate e il server è stato riavviato."
echo "Testare il funzionamento dell'invio email dalla dashboard."
echo ""