#!/bin/bash

# Script per eseguire la migrazione del database
# Questo script configura l'URL del database e poi esegue db:push

# Controlla se esiste il file .env
if [ ! -f .env ]; then
  echo "Il file .env non esiste. Vuoi crearlo adesso? (s/n)"
  read create_env
  if [[ $create_env == "s" ]] || [[ $create_env == "S" ]]; then
    if [ -f ./create-env-file.sh ]; then
      ./create-env-file.sh
    else
      echo "Lo script create-env-file.sh non è disponibile. Creazione manuale del file .env..."
      cat > .env << EOF
# Configurazione del database
DATABASE_URL=postgresql://gervisuser:password@localhost:5432/gervis

# Configurazione del server
NODE_ENV=production
PORT=3000
BASE_URL=https://tuo-dominio.com
SESSION_SECRET=$(openssl rand -hex 32)

# Configurazione email
SMTP_HOST=smtp.esempio.com
SMTP_PORT=587
SMTP_USER=user@esempio.com
SMTP_PASS=password
SMTP_FROM=no-reply@tuo-dominio.com
EOF
      echo "File .env creato con valori predefiniti. Modificalo se necessario."
    fi
  else
    echo "Per favore, crea un file .env prima di eseguire questo script."
    exit 1
  fi
fi

# Controlla se esiste la directory shared
if [ ! -d "shared" ]; then
  echo "La cartella shared non esiste. Esecuzione script setup-shared-schema.sh..."
  if [ -f ./setup-shared-schema.sh ]; then
    ./setup-shared-schema.sh
  else
    echo "Lo script setup-shared-schema.sh non è disponibile. Per favore, crea la cartella shared manualmente."
    exit 1
  fi
fi

# Estrai l'URL del database dal file .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

# Se l'URL è vuoto, chiedi all'utente
if [ -z "$DB_URL" ]; then
  echo "URL del database non trovato nel file .env."
  read -p "Inserisci l'URL del database [postgresql://gervisuser:password@localhost:5432/gervis]: " DB_URL
  DB_URL=${DB_URL:-postgresql://gervisuser:password@localhost:5432/gervis}
  
  # Aggiorna il file .env
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
fi

# Crea o aggiorna drizzle.config.json con l'URL corretto
cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "$DB_URL"
  }
}
EOF

echo "File drizzle.config.json creato con l'URL del database corretto."
echo "Esecuzione della migrazione del database..."

# Esporta DATABASE_URL come variabile d'ambiente
export DATABASE_URL="$DB_URL"

# Esegui la migrazione
npm run db:push

echo "Migrazione completata!"