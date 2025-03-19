#!/bin/bash

# Script per generare il file .env per l'applicazione Gervis
# Questo script crea un file .env configurato per l'ambiente di produzione

set -e

# Colori per l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni per i messaggi
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Directory corrente
CURRENT_DIR=$(pwd)
print_status "Directory corrente: $CURRENT_DIR"

# Generare un session secret se non specificato
SESSION_SECRET=$(openssl rand -hex 32)

# Imposta le variabili di default
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"gervis"}
DB_PASSWORD=${DB_PASSWORD:-"Oliver1"}
DB_NAME=${DB_NAME:-"gervis"}
PORT=${PORT:-"5000"}
NODE_ENV=${NODE_ENV:-"production"}
HOST=${HOST:-"0.0.0.0"}
BASE_URL=${BASE_URL:-"https://gervis.it"}

# Crea il file .env
cat > "$CURRENT_DIR/.env" << EOF
# File di configurazione per Gervis

# Ambiente
NODE_ENV=$NODE_ENV
PORT=$PORT
HOST=$HOST
BASE_URL=$BASE_URL

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Sessione
SESSION_SECRET=$SESSION_SECRET

# SMTP (per invio email)
# Impostare queste variabili per abilitare l'invio di email
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASS=yourpassword
# SMTP_FROM=noreply@example.com
EOF

# Imposta i permessi corretti
chmod 600 "$CURRENT_DIR/.env"

print_success "File .env creato con successo in $CURRENT_DIR/.env"
print_status "Configurazione:"
print_status "- Node.js ambiente: $NODE_ENV"
print_status "- Server: $HOST:$PORT"
print_status "- Database: postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME"
print_status "- Base URL: $BASE_URL"

print_warning "IMPORTANTE: Se vuoi configurare l'invio di email, modifica il file .env e imposta le variabili SMTP_*"