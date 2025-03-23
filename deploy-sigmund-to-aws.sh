#!/bin/bash

# Script per il deployment delle modifiche di Sigmund su AWS
# Versione specifica per l'ambiente di produzione

echo "===== DEPLOYMENT SIGMUND SU AWS ====="
echo "Questo script eseguirà:"
echo "1. Pull delle ultime modifiche dal repository Git (branch 'main')"
echo "2. Aggiornamento della struttura del database"
echo "3. Riavvio del server PM2"
echo ""

# Chiedi conferma prima di procedere
read -p "Vuoi procedere con il deployment? (s/n): " risposta
if [[ "$risposta" != "s" && "$risposta" != "S" ]]; then
  echo "Operazione annullata."
  exit 0
fi

# Verifica se siamo sul server AWS
if [ ! -d "/var/www/gervis" ]; then
  echo "ERRORE: Questo script deve essere eseguito sul server AWS!"
  echo "La directory /var/www/gervis non esiste."
  exit 1
fi

echo ""
echo "===== PULL DELLE MODIFICHE DA GIT ====="

# Verifica il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch corrente: $CURRENT_BRANCH"

# Se non siamo sul branch main, avvisa l'utente
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "ATTENZIONE: Il branch corrente è '$CURRENT_BRANCH', non 'main'."
  read -p "Vuoi continuare comunque? (s/n): " continua
  if [[ "$continua" != "s" && "$continua" != "S" ]]; then
    echo "Operazione annullata."
    exit 0
  fi
fi

# Pull delle ultime modifiche
echo "Esecuzione di git pull..."
git pull origin $CURRENT_BRANCH

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Pull completato con successo."
else
  echo "ERRORE: Pull fallito!"
  echo "Risolvi eventuali conflitti prima di procedere."
  exit 1
fi

echo ""
echo "===== AGGIORNAMENTO DATABASE ====="

# Verifica che lo script SQL esista
if [ ! -f "update-ai-profiles-schema.sql" ]; then
  echo "ERRORE: File SQL non trovato!"
  echo "Assicurati che 'update-ai-profiles-schema.sql' sia presente nella directory corrente."
  exit 1
fi

# Esegui lo script SQL per aggiornare il database
echo "Esecuzione dello script SQL..."
psql "$DATABASE_URL" -f update-ai-profiles-schema.sql

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Database aggiornato con successo."
else
  echo "ERRORE: Aggiornamento database fallito!"
  echo "Controlla gli errori sopra e correggi eventuali problemi prima di continuare."
  exit 1
fi

echo ""
echo "===== RICOSTRUZIONE E RIAVVIO DEL SERVER ====="

# Ricostruisci il progetto
echo "Ricostruzione del progetto..."
npm run build

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Build completata con successo."
else
  echo "ERRORE: Build fallita!"
  echo "Controlla gli errori sopra e correggi eventuali problemi prima di continuare."
  exit 1
fi

# Riavvia il server PM2
echo "Riavvio del server PM2..."
pm2 restart gervis

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Server riavviato con successo."
else
  echo "ERRORE: Riavvio server fallito!"
  echo "Controlla lo stato di PM2 con 'pm2 status'."
  exit 1
fi

echo ""
echo "===== DEPLOYMENT COMPLETATO ====="
echo "Il sistema Sigmund è stato aggiornato con successo sul server AWS."
echo "Verifica il funzionamento dell'applicazione nel browser."
echo ""
echo "Stato attuale di PM2:"
pm2 status

echo ""
echo "Log recenti (ultimi 10 eventi):"
pm2 logs --lines 10