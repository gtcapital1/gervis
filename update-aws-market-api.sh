#!/bin/bash
# Script per aggiornare Market API su AWS
# Questo script esegue l'aggiornamento del file market-api.ts su AWS

set -e  # Termina lo script se un comando fallisce

echo "========================================================"
echo "Aggiornamento Market API per AWS"
echo "========================================================"

# Verifica se l'utente ha fornito il percorso dell'applicazione
if [ -z "$1" ]; then
  echo "Utilizzo: ./update-aws-market-api.sh /percorso/alla/tua/app"
  echo "Esempio: ./update-aws-market-api.sh /home/ubuntu/gervis"
  exit 1
fi

APP_PATH="$1"

# Verifica che il percorso esista
if [ ! -d "$APP_PATH" ]; then
  echo "ERRORE: La directory $APP_PATH non esiste!"
  exit 1
fi

# Verifica che sia un'installazione valida di Gervis
if [ ! -f "$APP_PATH/server/market-api.ts" ]; then
  echo "ERRORE: $APP_PATH non sembra essere un'installazione valida di Gervis!"
  echo "Non trovo il file server/market-api.ts"
  exit 1
fi

echo "Aggiornamento delle modifiche da GitHub..."
cd "$APP_PATH"

# Salva lo stato corrente del file market-api.ts prima dell'aggiornamento
cp "$APP_PATH/server/market-api.ts" "$APP_PATH/server/market-api.ts.backup"
echo "✅ Creato backup di server/market-api.ts"

# Esegui il pull dal repository
echo "Esecuzione pull da GitHub..."
git pull origin main
git_status=$?

if [ $git_status -ne 0 ]; then
  echo "ERRORE: Git pull fallito! Ripristino il backup..."
  cp "$APP_PATH/server/market-api.ts.backup" "$APP_PATH/server/market-api.ts"
  exit 1
fi

echo "Ricompilazione dell'applicazione..."
npm run build
build_status=$?

if [ $build_status -ne 0 ]; then
  echo "ERRORE: La compilazione è fallita! Ripristino il backup..."
  cp "$APP_PATH/server/market-api.ts.backup" "$APP_PATH/server/market-api.ts"
  exit 1
fi

echo "Riavvio dell'applicazione..."
pm2 restart all
restart_status=$?

if [ $restart_status -ne 0 ]; then
  echo "AVVISO: Problema nel riavvio dell'applicazione!"
  echo "Controlla lo stato dei servizi con 'pm2 status'"
else
  echo "✅ Applicazione riavviata con successo"
fi

echo "========================================================"
echo "✅ Aggiornamento completato!"
echo "Le modifiche alla Market API sono ora attive."
echo ""
echo "Per verificare il corretto funzionamento:"
echo "1. Accedi a https://gervis.it/market"
echo "2. Controlla che i dati di mercato vengano caricati correttamente"
echo "3. Controlla i log per eventuali errori: pm2 logs"
echo "========================================================"

# Se tutto è andato bene, rimuoviamo il backup
if [ $git_status -eq 0 ] && [ $build_status -eq 0 ]; then
  rm "$APP_PATH/server/market-api.ts.backup"
  echo "Backup rimosso"
else
  echo "NOTA: Il backup è stato mantenuto in server/market-api.ts.backup"
fi