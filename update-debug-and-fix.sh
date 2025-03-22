#!/bin/bash
# Script per aggiornare ed eseguire il debug della Market API su AWS
# Creato: 22 marzo 2025

set -e  # Termina lo script se un comando fallisce

echo "========================================================"
echo "Aggiornamento Market API con debug esteso per AWS"
echo "========================================================"

# Verifica se l'utente ha fornito il percorso dell'applicazione
if [ -z "$1" ]; then
  echo "Utilizzo: ./update-debug-and-fix.sh /percorso/alla/tua/app"
  echo "Esempio: ./update-debug-and-fix.sh /home/ubuntu/gervis"
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

echo "Preparazione aggiornamento da GitHub..."
cd "$APP_PATH"

# Abilita log aggiuntivi in PM2
echo "Incremento livello di logging PM2 per debug..."
pm2 set pm2:max_logs_size 20M
pm2 set pm2:error_log 1
pm2 set pm2:debug 1

# Aggiungiamo un timestamp per identificare l'aggiornamento nei log
echo "MARKET API DEBUG UPDATE: $(date)" >> "$APP_PATH/update-log.txt"

# Esegui il pull dal repository
echo "Esecuzione pull da GitHub..."
git pull origin main
git_status=$?

if [ $git_status -ne 0 ]; then
  echo "ERRORE: Git pull fallito!"
  exit 1
fi

echo "Ricompilazione dell'applicazione..."
npm run build
build_status=$?

if [ $build_status -ne 0 ]; then
  echo "ERRORE: La compilazione è fallita!"
  exit 1
fi

echo "Riavvio dell'applicazione con logging esteso..."
NODE_ENV=production NODE_DEBUG=http,https,net,http2,tls,request pm2 restart all
restart_status=$?

if [ $restart_status -ne 0 ]; then
  echo "AVVISO: Problema nel riavvio dell'applicazione!"
  echo "Controlla lo stato dei servizi con 'pm2 status'"
else
  echo "✅ Applicazione riavviata con debug esteso"
fi

echo "========================================================"
echo "✅ Aggiornamento completato!"
echo ""
echo "Per visualizzare i log estesi in tempo reale:"
echo "  pm2 logs --lines 200"
echo ""
echo "Per salvare i log in un file per analisi:"
echo "  pm2 logs --lines 1000 > market-api-debug.log"
echo ""
echo "Per verificare il corretto funzionamento:"
echo "1. Accedi a https://gervis.it/market"
echo "2. Controlla che i dati di mercato vengano caricati correttamente"
echo "========================================================"