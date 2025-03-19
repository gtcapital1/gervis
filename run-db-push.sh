#!/bin/bash

# Script per eseguire le migrazioni del database
# Questo script configura Drizzle e esegue le migrazioni automaticamente

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
echo "║     MIGRAZIONE DATABASE GERVIS CON DRIZZLE     ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# Verifica se il file .env esiste
if [ ! -f ".env" ]; then
  print_warning "File .env non trovato."
  read -p "Vuoi crearlo automaticamente? (s/n): " CREATE_ENV
  if [[ $CREATE_ENV == "s" || $CREATE_ENV == "S" ]]; then
    if [ -f "./create-env-file.sh" ]; then
      print_status "Esecuzione script create-env-file.sh..."
      bash ./create-env-file.sh
    else
      print_error "Script create-env-file.sh non trovato!"
      print_status "Creazione di un file .env di base..."
      
      # Generazione del session secret casuale
      SESSION_SECRET=$(openssl rand -hex 32)
      
      cat > .env << EOF
# Configurazione ambiente Gervis
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://gervis:password@localhost:5432/gervis

# Sessione
SESSION_SECRET=$SESSION_SECRET

# URL di base per i link nelle email
BASE_URL=http://localhost:3000
EOF
      print_success "File .env di base creato con successo!"
    fi
  else
    print_error "Il file .env è necessario per configurare Drizzle."
    exit 1
  fi
fi

# Estrai la URL del database dal file .env
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)

# Se DATABASE_URL è vuoto, chiedi all'utente
if [ -z "$DATABASE_URL" ]; then
  print_warning "URL del database non trovato nel file .env."
  read -p "Inserisci l'URL del database PostgreSQL: " DATABASE_URL
  if [ -z "$DATABASE_URL" ]; then
    print_error "URL del database non specificato. Impossibile continuare."
    exit 1
  fi
  
  # Aggiungi la URL del database al file .env
  echo "DATABASE_URL=$DATABASE_URL" >> .env
  print_success "URL del database aggiunto al file .env."
fi

print_status "URL del database configurato: $DATABASE_URL"

# Controlla se il file drizzle.config.json esiste
if [ ! -f "drizzle.config.json" ]; then
  print_status "Creazione file drizzle.config.json..."
  
  cat > drizzle.config.json << EOF
{
  "out": "./drizzle",
  "schema": "./shared/schema.ts",
  "driver": "pg",
  "dbCredentials": {
    "connectionString": "$DATABASE_URL"
  }
}
EOF
  print_success "File drizzle.config.json creato con successo!"
else
  print_status "File drizzle.config.json esistente trovato."
  
  # Aggiorna il connectionString nel file drizzle.config.json
  print_status "Aggiornamento connectionString in drizzle.config.json..."
  
  # Usa sed per aggiornare la connectionString
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS usa un'implementazione diversa di sed
    sed -i '' 's|"connectionString": ".*"|"connectionString": "'"$DATABASE_URL"'"|g' drizzle.config.json
  else
    # Linux e altri sistemi
    sed -i 's|"connectionString": ".*"|"connectionString": "'"$DATABASE_URL"'"|g' drizzle.config.json
  fi
  
  print_success "connectionString aggiornato con successo!"
fi

# Esegui la migrazione
print_status "Esecuzione delle migrazioni con Drizzle..."
npx drizzle-kit push

# Verifica se la migrazione è andata a buon fine
if [ $? -eq 0 ]; then
  print_success "Migrazioni completate con successo!"
else
  print_error "Errore durante l'esecuzione delle migrazioni!"
  print_warning "Prova ad eseguire manualmente: npx drizzle-kit push"
  exit 1
fi

echo ""
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║          MIGRAZIONE COMPLETATA!                ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "Il database è stato aggiornato con lo schema più recente."
echo "Puoi verificare le tabelle create con:"
echo "  psql -U gervis -h localhost -d gervis -c '\\dt'"
echo ""
echo "Ricorda di riavviare l'applicazione se è in esecuzione:"
echo "  pm2 restart gervis  # Se stai usando PM2"
echo "  npm run dev         # In ambiente di sviluppo"
echo ""