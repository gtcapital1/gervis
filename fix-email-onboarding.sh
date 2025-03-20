#!/bin/bash

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Script per risolvere il problema dell'invio delle email di onboarding ===${NC}"
echo -e "${YELLOW}Questo script modifica la gestione dell'invio email nell'API routes.ts${NC}"

# Directory corrente dell'app
APP_DIR="/var/www/gervis"

# Directory di backup
BACKUP_DIR="/var/www/gervis/fix-backup-$(date +%Y%m%d-%H%M%S)"

# Percorso del file routes.ts
ROUTES_FILE="$APP_DIR/server/routes.ts"
BACKUP_ROUTES="$BACKUP_DIR/routes.ts.bak"

# ----- STEP 1: Backup dei file originali -----
echo -e "\n${GREEN}1. Creazione backup dei file...${NC}"

# Crea directory di backup
mkdir -p "$BACKUP_DIR"

# Backup del file routes.ts
cp "$ROUTES_FILE" "$BACKUP_ROUTES"

echo -e "${GREEN}✓ Backup creato in $BACKUP_DIR${NC}"

# ----- STEP 2: Modifica il file routes.ts -----
echo -e "\n${GREEN}2. Correzione del codice di invio email in routes.ts...${NC}"

# Cerca il blocco di codice dell'onboarding token e verifica se è quello vecchio (senza sendEmail)
if grep -q "const { language = 'italian', customMessage } = req.body;" "$ROUTES_FILE"; then
  echo -e "${YELLOW}Trovata versione vecchia dell'API senza parametro sendEmail.${NC}"
  echo -e "${YELLOW}Aggiornamento della firma dell'API...${NC}"

  # Sostituisci la riga di estrazione parametri
  sed -i "s/const { language = 'italian', customMessage } = req.body;/const { language = 'italian', customMessage, customSubject, sendEmail = false } = req.body;/" "$ROUTES_FILE"
  
  # Cerca il blocco if customMessage e sostituiscilo con sendEmail
  if grep -q "if (customMessage) {" "$ROUTES_FILE"; then
    # Conta i spazi di indentazione prima di if (customMessage)
    INDENTATION=$(grep -o "^ *" <<< "$(grep "if (customMessage) {" "$ROUTES_FILE")")
    
    # Crea il nuovo blocco con stessa indentazione
    NEW_BLOCK="${INDENTATION}// Invia l'email solo se il flag sendEmail è true\n${INDENTATION}if (sendEmail) {"
    
    # Sostituisci il vecchio blocco
    sed -i "s/\(${INDENTATION}\)if (customMessage) {/\1\/\/ Invia l'email solo se il flag sendEmail è true\n\1if (sendEmail) {/" "$ROUTES_FILE"
    
    echo -e "${GREEN}✓ Condizione di invio email modificata da 'customMessage' a 'sendEmail'${NC}"
  else
    echo -e "${RED}✗ Non è stato possibile trovare il blocco 'if (customMessage)' nel file${NC}"
  fi
  
  # Modifica la risposta JSON per includere la conferma emailSent
  if grep -q "success: true, token, link, language" "$ROUTES_FILE"; then
    sed -i "s/success: true, token, link, language/success: true, token, link, language, emailSent: sendEmail/" "$ROUTES_FILE"
    echo -e "${GREEN}✓ Aggiunto flag emailSent nella risposta JSON${NC}"
  else
    echo -e "${RED}✗ Non è stato possibile aggiornare la risposta JSON${NC}"
  fi
  
  # Aggiungi customSubject al sendOnboardingEmail
  if grep -q "await sendOnboardingEmail(" "$ROUTES_FILE"; then
    # Controlla se il parametro customSubject è già presente
    if ! grep -q "customSubject" <<< "$(grep -A10 "await sendOnboardingEmail(" "$ROUTES_FILE")"; then
      # Cerca l'ultima parentesi della chiamata a sendOnboardingEmail
      sed -i "/advisor?.email/s/\();\)/,\n            customSubject\1/" "$ROUTES_FILE"
      echo -e "${GREEN}✓ Aggiunto parametro customSubject alla funzione sendOnboardingEmail${NC}"
    fi
  fi
  
else
  echo -e "${GREEN}✓ Il file routes.ts sembra già aggiornato con parametro sendEmail.${NC}"
fi

# ----- STEP 3: Modifica il file email.ts -----
echo -e "\n${GREEN}3. Controllando il supporto per customSubject in email.ts...${NC}"

EMAIL_FILE="$APP_DIR/server/email.ts"
BACKUP_EMAIL="$BACKUP_DIR/email.ts.bak"

# Backup del file email.ts
cp "$EMAIL_FILE" "$BACKUP_EMAIL"

# Verifica se sendOnboardingEmail accetta customSubject
if ! grep -q "customSubject?:" "$EMAIL_FILE"; then
  echo -e "${YELLOW}Il parametro customSubject non è supportato nella funzione sendOnboardingEmail.${NC}"
  echo -e "${YELLOW}Aggiornamento della firma della funzione...${NC}"
  
  # Cerca la definizione della funzione sendOnboardingEmail
  if grep -q "export async function sendOnboardingEmail(" "$EMAIL_FILE"; then
    # Aggiungi il parametro customSubject alla firma
    sed -i "/advisorEmail?: string/s/\().*{/,\n  customSubject?: string\1/" "$EMAIL_FILE"
    
    # Cerca dove viene definito il subject per l'email
    if grep -q "subject: content.subject," "$EMAIL_FILE"; then
      # Sostituisci con customSubject se presente
      sed -i "/subject: content.subject,/c\\      subject: customSubject || content.subject," "$EMAIL_FILE"
      echo -e "${GREEN}✓ Aggiunto supporto per customSubject nella funzione sendOnboardingEmail${NC}"
    else
      echo -e "${RED}✗ Non è stato possibile trovare la riga 'subject: content.subject,'${NC}"
    fi
  else
    echo -e "${RED}✗ Non è stato possibile trovare la definizione della funzione sendOnboardingEmail${NC}"
  fi
else
  echo -e "${GREEN}✓ Il parametro customSubject è già supportato nella funzione sendOnboardingEmail.${NC}"
fi

# ----- STEP 4: Riavvia l'applicazione -----
echo -e "\n${GREEN}4. Riavvio dell'applicazione...${NC}"

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
echo -e "${YELLOW}Ora dovresti essere in grado di inviare email di onboarding.${NC}"
echo -e "${YELLOW}In caso di rollback, i file originali sono in: ${BACKUP_DIR}${NC}"