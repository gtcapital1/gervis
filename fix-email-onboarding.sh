#!/bin/bash

# fix-email-onboarding.sh - Script per risolvere i problemi con l'invio delle email di onboarding
# Questo script aggiorna i file necessari per garantire il corretto funzionamento 
# dell'invio di email personalizzate durante il processo di onboarding

echo "=== Script correzione email di onboarding ==="
echo "Verifica percorso dell'applicazione..."

# Stabilisci il percorso dell'applicazione
APP_DIR="/var/www/gervis"
if [ ! -d "$APP_DIR" ]; then
  echo "Directory dell'applicazione $APP_DIR non trovata."
  echo "Specificare il percorso corretto dell'applicazione:"
  read APP_DIR
  
  if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR non trovata. Impossibile procedere."
    exit 1
  fi
fi

echo "Directory dell'applicazione: $APP_DIR"

# Backup dei file originali
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="$APP_DIR/backup-$TIMESTAMP"
mkdir -p $BACKUP_DIR

echo "Creando backup dei file originali in $BACKUP_DIR"

# Backup di routes.ts
ROUTES_FILE="$APP_DIR/server/routes.ts"
ROUTES_BACKUP="$BACKUP_DIR/routes.ts.bak"
if [ -f "$ROUTES_FILE" ]; then
  cp "$ROUTES_FILE" "$ROUTES_BACKUP"
  echo "Backup di routes.ts creato: $ROUTES_BACKUP"
else
  echo "ERRORE: File routes.ts non trovato in $ROUTES_FILE"
  exit 1
fi

# Backup di email.ts
EMAIL_FILE="$APP_DIR/server/email.ts"
EMAIL_BACKUP="$BACKUP_DIR/email.ts.bak"
if [ -f "$EMAIL_FILE" ]; then
  cp "$EMAIL_FILE" "$EMAIL_BACKUP"
  echo "Backup di email.ts creato: $EMAIL_BACKUP"
else
  echo "ERRORE: File email.ts non trovato in $EMAIL_FILE"
  exit 1
fi

# Backup di storage.ts
STORAGE_FILE="$APP_DIR/server/storage.ts"
STORAGE_BACKUP="$BACKUP_DIR/storage.ts.bak"
if [ -f "$STORAGE_FILE" ]; then
  cp "$STORAGE_FILE" "$STORAGE_BACKUP"
  echo "Backup di storage.ts creato: $STORAGE_BACKUP"
else
  echo "ERRORE: File storage.ts non trovato in $STORAGE_FILE"
  exit 1
fi

echo "Backup completati. Procedo con le correzioni..."

# 1. Aggiornamento del file routes.ts
echo "1. Aggiornamento file routes.ts per gestire correttamente customSubject..."

# Verifica se è presente il parametro customSubject nella chiamata a generateOnboardingToken
if grep -q "customSubject" "$ROUTES_FILE"; then
  echo "Il parametro customSubject è già presente nel file routes.ts"
else
  # Aggiungi il parametro customSubject nella chiamata a generateOnboardingToken
  sed -i 's/\(generateOnboardingToken(\s*clientId,\s*language\s*as\s*.*,\s*customMessage,\s*req\.user\.email\)\)/\1, customSubject/g' "$ROUTES_FILE"
  echo "Aggiunto parametro customSubject alla chiamata generateOnboardingToken in routes.ts"
fi

# Verifica se ci sono log di debug per il parametro customSubject
if grep -q "DEBUG.*customSubject" "$ROUTES_FILE"; then
  echo "Log di debug per customSubject presenti."
else
  # Aggiungi log di debug dopo la riga che destruttura i parametri dalla request
  sed -i '/const { language = .* }/a \ \ \ \ \ \ // Log di debug per verificare il valore di customSubject\n\ \ \ \ \ \ console.log("DEBUG - customSubject ricevuto:", customSubject);' "$ROUTES_FILE"
  echo "Aggiunti log di debug per customSubject in routes.ts"
fi

echo "File routes.ts aggiornato con successo."

# 2. Aggiornamento del file email.ts
echo "2. Aggiornamento file email.ts per gestire correttamente customSubject..."

# Verifica se la funzione sendOnboardingEmail accetta il parametro customSubject
if grep -q "customSubject?:" "$EMAIL_FILE"; then
  echo "Il parametro customSubject è già definito nella funzione sendOnboardingEmail"
else
  # Aggiungi il parametro customSubject nella firma della funzione
  sed -i 's/\(export async function sendOnboardingEmail(\s*.*,\s*advisorEmail?:\s*string\)\)/\1, customSubject?: string/g' "$EMAIL_FILE"
  echo "Aggiunto parametro customSubject alla firma della funzione sendOnboardingEmail"
fi

# Verifica se ci sono log di debug specifici per customSubject
if grep -q "DEBUG.*customSubject.*originale" "$EMAIL_FILE"; then
  echo "Log di debug per customSubject presenti."
else
  # Aggiungi log di debug per customSubject
  sed -i '/const emailSubject =/i \ \ \ \ console.log("DEBUG - sendOnboardingEmail - customSubject originale:", customSubject);' "$EMAIL_FILE"
  echo "Aggiunti log di debug per customSubject in email.ts"
fi

echo "File email.ts aggiornato con successo."

# 3. Aggiornamento del file storage.ts
echo "3. Aggiornamento file storage.ts per supportare customSubject..."

# Verifica se l'interfaccia IStorage include il parametro customSubject
if grep -q "customSubject?: string" "$STORAGE_FILE"; then
  echo "Il parametro customSubject è già presente nell'interfaccia IStorage"
else
  # Aggiungi il parametro customSubject nella definizione dell'interfaccia
  sed -i 's/\(generateOnboardingToken(clientId: number, language?: .*, customMessage?: string, advisorEmail?: string\))/\1, customSubject?: string/g' "$STORAGE_FILE"
  echo "Aggiunto parametro customSubject alla definizione dell'interfaccia IStorage"
fi

# Verifica se l'implementazione di PostgresStorage include il parametro customSubject
IMPLEMENTATION_PATTERN="async generateOnboardingToken(clientId: number, language: .* = 'english', customMessage?: string, advisorEmail?: string"
if grep -q "$IMPLEMENTATION_PATTERN, customSubject?: string" "$STORAGE_FILE"; then
  echo "Il parametro customSubject è già presente nell'implementazione di generateOnboardingToken"
else
  # Aggiungi il parametro customSubject all'implementazione
  sed -i "s/$IMPLEMENTATION_PATTERN)/$IMPLEMENTATION_PATTERN, customSubject?: string)/g" "$STORAGE_FILE"
  echo "Aggiunto parametro customSubject all'implementazione di generateOnboardingToken"
fi

# Aggiungi log di debug per customSubject nell'implementazione
if grep -q "DEBUG Storage.*customSubject" "$STORAGE_FILE"; then
  echo "Log di debug per customSubject in storage.ts presenti."
else
  # Cerca la posizione dei log di debug esistenti
  LOG_LINE_NUM=$(grep -n "DEBUG Storage - advisorEmail:" "$STORAGE_FILE" | cut -d: -f1)
  if [ -n "$LOG_LINE_NUM" ]; then
    # Inserisci il log dopo la riga dei log esistenti
    sed -i "${LOG_LINE_NUM}a \ \ \ \ console.log(\`DEBUG Storage - customSubject: \${customSubject || \"(non specificato)\"}\`);" "$STORAGE_FILE"
    echo "Aggiunti log di debug per customSubject in storage.ts"
  else
    echo "AVVISO: Non è stato possibile trovare il punto di inserimento per i log di debug in storage.ts"
  fi
fi

echo "File storage.ts aggiornato con successo."

# Riavvio dell'applicazione
echo "4. Riavvio dell'applicazione..."

# Verifica se l'applicazione usa PM2
if command -v pm2 &> /dev/null && pm2 list | grep -q gervis; then
  pm2 restart gervis
  echo "Applicazione riavviata con PM2."
elif [ -f "$APP_DIR/ecosystem.config.cjs" ] || [ -f "$APP_DIR/ecosystem.config.js" ]; then
  cd "$APP_DIR" && pm2 reload ecosystem.config.cjs
  echo "Applicazione riavviata con PM2 usando il file ecosystem.config.cjs"
else
  echo "AVVISO: Impossibile riavviare automaticamente l'applicazione."
  echo "Riavviare manualmente l'applicazione con il comando appropriato."
fi

echo "=== Correzioni completate ==="
echo "Le modifiche per risolvere i problemi con l'invio delle email di onboarding sono state applicate."
echo "Per verificare, generare un nuovo token di onboarding e inviarlo via email."
echo ""
echo "Backup dei file originali disponibili in: $BACKUP_DIR"