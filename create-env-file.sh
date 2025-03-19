#!/bin/bash

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Creazione del file .env per il server Gervis ===${NC}"

# Percorso del file .env
ENV_FILE=".env"

# Controlla se il file .env esiste già
if [ -f "$ENV_FILE" ]; then
  echo "Il file .env esiste già."
  read -p "Vuoi sovrascriverlo? (s/n): " SOVRASCRIVERE
  if [ "$SOVRASCRIVERE" != "s" ]; then
    echo "Operazione annullata."
    exit 0
  fi
fi

# Crea il file .env con le impostazioni di base
cat > $ENV_FILE << EOL
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
EOL

echo -e "${GREEN}File .env creato con successo!${NC}"
echo "Contenuto del file:"
cat $ENV_FILE
echo -e "${GREEN}=== Fine della creazione del file .env ===${NC}"

# Informazioni aggiuntive
echo ""
echo -e "${GREEN}Per applicare questo file sul server:${NC}"
echo "1. Trasferisci il file sul server: scp .env user@server:/tmp/"
echo "2. Accedi al server: ssh user@server"
echo "3. Sposta il file: sudo mv /tmp/.env /var/www/gervis/.env"
echo "4. Riavvia l'applicazione: sudo pm2 restart gervis"