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

# Controlla se il file .env esiste già
if [ -f ".env" ]; then
  print_warning "Il file .env esiste già."
  read -p "Vuoi sovrascriverlo? (s/n): " OVERWRITE
  if [[ $OVERWRITE != "s" && $OVERWRITE != "S" ]]; then
    print_error "Operazione annullata."
    exit 1
  fi
fi

# Generazione del session secret casuale
SESSION_SECRET=$(openssl rand -hex 32)

# Chiedi le variabili all'utente
print_status "Inserisci i dati per il file .env:"
echo ""

# Chiedi la URL del database
read -p "URL del database PostgreSQL [postgresql://gervis:password@localhost:5432/gervis]: " DATABASE_URL
DATABASE_URL=${DATABASE_URL:-"postgresql://gervis:password@localhost:5432/gervis"}

# Chiedi la porta dell'applicazione
read -p "Porta dell'applicazione [3000]: " PORT
PORT=${PORT:-3000}

# Chiedi il dominio di base
read -p "Dominio di base (es. https://gervis.it) [http://localhost:$PORT]: " BASE_URL
BASE_URL=${BASE_URL:-"http://localhost:$PORT"}

# Chiedi le impostazioni email
read -p "Configurare le impostazioni email? (s/n) [n]: " SETUP_EMAIL
SETUP_EMAIL=${SETUP_EMAIL:-"n"}

if [[ $SETUP_EMAIL == "s" || $SETUP_EMAIL == "S" ]]; then
  read -p "Host SMTP [smtp.example.com]: " EMAIL_HOST
  EMAIL_HOST=${EMAIL_HOST:-"smtp.example.com"}
  
  read -p "Porta SMTP [587]: " EMAIL_PORT
  EMAIL_PORT=${EMAIL_PORT:-587}
  
  read -p "Utente SMTP [noreply@example.com]: " EMAIL_USER
  EMAIL_USER=${EMAIL_USER:-"noreply@example.com"}
  
  read -p "Password SMTP: " -s EMAIL_PASSWORD
  echo ""
  
  read -p "Email mittente [Gervis <noreply@example.com>]: " EMAIL_FROM
  EMAIL_FROM=${EMAIL_FROM:-"Gervis <noreply@example.com>"}
fi

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