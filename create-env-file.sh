#!/bin/bash

# Script per creare e configurare il file .env per Gervis

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi di stato
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Funzione per stampare messaggi di successo
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Funzione per stampare messaggi di errore
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Funzione per stampare messaggi di avvertimento
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner di avvio
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║     CONFIGURAZIONE FILE .ENV PER GERVIS        ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# Controlla se il file .env esiste già - in modalità non interattiva, sovrascriviamo sempre
if [ -f ".env" ]; then
  print_warning "Il file .env esiste già, ma sarà preservato per mantenere le configurazioni."
  exit 0
fi

# Generazione del session secret casuale
SESSION_SECRET=$(openssl rand -hex 32)

# Imposta i valori predefiniti (modalità non interattiva)
print_status "Impostazione dei valori predefiniti per il file .env..."

# Determina i valori di base
DATABASE_URL="postgresql://gervis:Oliver1@localhost:5432/gervis"
PORT=3000
BASE_URL="https://gervis.it"

# Impostazioni email predefinite
SETUP_EMAIL="s"
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER="noreply@gervis.it"
EMAIL_PASSWORD="email_password_placeholder"
EMAIL_FROM="Gervis <noreply@gervis.it>"

# Crea il file .env
print_status "Creazione del file .env..."

cat > .env << EOF
# Configurazione ambiente Gervis
NODE_ENV=production
PORT=$PORT

# Database
DATABASE_URL=$DATABASE_URL

# Sessione
SESSION_SECRET=$SESSION_SECRET

# URL di base per i link nelle email
BASE_URL=$BASE_URL
EOF

# Aggiungi le impostazioni email se configurate
if [[ $SETUP_EMAIL == "s" || $SETUP_EMAIL == "S" ]]; then
  cat >> .env << EOF

# Email
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_USER=$EMAIL_USER
EMAIL_PASSWORD=$EMAIL_PASSWORD
EMAIL_FROM="$EMAIL_FROM"
EOF
fi

print_success "File .env creato con successo!"
echo ""
echo "Puoi modificare manualmente questo file in qualsiasi momento."
echo "Per applicare le modifiche, riavvia l'applicazione:"
echo "  pm2 restart gervis  # Se stai usando PM2"
echo "  npm run dev         # In ambiente di sviluppo"
echo ""