#!/bin/bash

# Script per eseguire le migrazioni del database utilizzando Drizzle
# Utilizza questo script per aggiornare lo schema del database alla versione più recente

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Aggiornamento dello schema del database ===${NC}"

# Verifica se l'ambiente è configurato
if [ ! -f ".env" ]; then
  echo -e "${RED}Errore: File .env non trovato.${NC}"
  echo "Crea prima il file .env con le credenziali del database."
  exit 1
fi

# Carica le variabili d'ambiente
source .env

# Verifica che drizzle-kit sia installato
if ! npx drizzle-kit --version > /dev/null 2>&1; then
  echo -e "${YELLOW}Installazione di drizzle-kit...${NC}"
  npm install -D drizzle-kit
fi

# Esegui la migrazione
echo "Esecuzione di drizzle-kit push..."
npx drizzle-kit push:pg

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Migrazione del database completata con successo!${NC}"
else
  echo -e "${RED}Errore durante la migrazione del database.${NC}"
  echo "Controlla le credenziali nel file .env e assicurati che PostgreSQL sia in esecuzione."
  exit 1
fi

# Esegui gli script di migrazione personalizzati
echo "Esecuzione script di migrazione personalizzati..."
for migration_file in server/migrations/*.ts; do
  if [ -f "$migration_file" ]; then
    echo "Elaborazione $migration_file..."
    npx tsx "$migration_file"
  fi
done

echo -e "${GREEN}=== Aggiornamento dello schema del database completato ===${NC}"