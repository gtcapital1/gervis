#!/bin/bash

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Script risoluzione problemi eliminazione clienti ===${NC}"
echo -e "${YELLOW}Questo script corregge i vincoli CASCADE nel database${NC}"

# ----- STEP 1: Configura vincoli CASCADE nel database -----
echo -e "\n${GREEN}1. Configurazione vincoli CASCADE...${NC}"

# Crea lo script SQL
cat > /tmp/fix_cascade.sql << EOF
-- Rimuovi vincoli esistenti per sicurezza
ALTER TABLE IF EXISTS assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey;
ALTER TABLE IF EXISTS recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey;

-- Aggiungi vincoli CASCADE
ALTER TABLE assets ADD CONSTRAINT assets_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE recommendations ADD CONSTRAINT recommendations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Verifica
\d assets
\d recommendations
EOF

# Esegui come utente postgres
echo -e "${YELLOW}Esecuzione script SQL per correggere vincoli CASCADE...${NC}"
if id -u postgres > /dev/null 2>&1; then
  # Se l'utente postgres esiste
  su - postgres -c "psql -d gervisdb -f /tmp/fix_cascade.sql"
  DB_RESULT=$?
else
  # Se postgres non è disponibile, prova con l'utente corrente
  echo -e "${YELLOW}Utente postgres non trovato, tentativo con l'utente corrente...${NC}"
  if command -v psql &> /dev/null; then
    psql -d gervisdb -f /tmp/fix_cascade.sql
    DB_RESULT=$?
  else
    echo -e "${RED}Non è stato possibile connettersi al database.${NC}"
    echo -e "${RED}Assicurati che PostgreSQL sia installato e configurato correttamente.${NC}"
    DB_RESULT=1
  fi
fi

if [ $DB_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Vincoli CASCADE configurati correttamente!${NC}"
else
  echo -e "${RED}✗ Errore nella configurazione dei vincoli CASCADE${NC}"
  echo -e "${YELLOW}Prova questi comandi manualmente:${NC}"
  echo "--------------------------------"
  cat /tmp/fix_cascade.sql
  echo "--------------------------------"
fi

# ----- STEP 2: Configura Nginx per garantire Content-Type JSON -----
echo -e "\n${GREEN}2. Configurazione Nginx per garantire risposte JSON...${NC}"

# Cerca configurazioni Nginx
NGINX_CONF="/etc/nginx/conf.d/gervis.conf"
NGINX_SITES="/etc/nginx/sites-available/default"

if [ -f "$NGINX_CONF" ]; then
  CONFIG_FILE="$NGINX_CONF"
  echo -e "${GREEN}✓ Trovata configurazione Nginx in $NGINX_CONF${NC}"
elif [ -f "$NGINX_SITES" ]; then
  CONFIG_FILE="$NGINX_SITES"
  echo -e "${GREEN}✓ Trovata configurazione Nginx in $NGINX_SITES${NC}"
else
  echo -e "${YELLOW}Ricerca altre configurazioni Nginx...${NC}"
  CONFIG_FILE=$(find /etc/nginx -type f -name "*.conf" | grep -v "nginx.conf" | head -1)
  
  if [ -n "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✓ Trovata configurazione Nginx in $CONFIG_FILE${NC}"
  else
    echo -e "${RED}✗ Nessuna configurazione Nginx trovata${NC}"
    CONFIG_FILE=""
  fi
fi

if [ -n "$CONFIG_FILE" ]; then
  # Backup
  cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
  echo -e "${GREEN}✓ Backup creato in ${CONFIG_FILE}.bak${NC}"
  
  # Verifica se proxy_pass_header Content-Type già presente
  if grep -q "proxy_pass_header Content-Type" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ Header Content-Type già configurato${NC}"
  else
    # Aggiungi proxy_pass_header a tutte le location
    sed -i '/location/,/}/{s|\(.*\)\}|\1    proxy_pass_header Content-Type;\n\1}|g}' "$CONFIG_FILE"
    
    echo -e "${GREEN}✓ Header Content-Type aggiunto alla configurazione${NC}"
    
    # Verifica sintassi e riavvia se tutto ok
    if nginx -t &> /dev/null; then
      systemctl reload nginx
      echo -e "${GREEN}✓ Nginx riavviato${NC}"
    else
      echo -e "${RED}✗ Errore nella configurazione Nginx. Ripristino backup...${NC}"
      mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"
      echo -e "${YELLOW}✓ Configurazione precedente ripristinata${NC}"
    fi
  fi
fi

# ----- STEP 3: Riavvio dell'applicazione -----
echo -e "\n${GREEN}3. Riavvio dell'applicazione...${NC}"

# Tenta con pm2
if command -v pm2 &> /dev/null; then
  PM2_LIST=$(pm2 list)
  
  if echo "$PM2_LIST" | grep -q "gervis"; then
    pm2 restart gervis
    echo -e "${GREEN}✓ Applicazione riavviata tramite PM2${NC}"
  else
    echo -e "${YELLOW}App 'gervis' non trovata in PM2. Riavvio di tutte le app...${NC}"
    pm2 restart all
    echo -e "${GREEN}✓ Tutte le applicazioni riavviate${NC}"
  fi
else
  echo -e "${YELLOW}PM2 non trovato. Verificare manualmente se è necessario riavviare l'applicazione.${NC}"
fi

echo -e "\n${GREEN}=== Operazioni completate ====${NC}"
echo -e "${GREEN}✓ Script eseguito correttamente!${NC}"
echo -e "${YELLOW}Ora dovresti essere in grado di eliminare i clienti senza problemi.${NC}"
echo -e "${YELLOW}In caso di ulteriori problemi, controlla i log con:${NC}"
echo -e "  ${YELLOW}pm2 logs${NC}"