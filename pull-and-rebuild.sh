#!/bin/bash

# Script per fare il pull delle ultime modifiche e rebuild dell'applicazione

echo "===== AGGIORNAMENTO GERVIS CON ULTIME MODIFICHE ====="
echo "Questo script aggiornerà il codice e ricompilerà l'applicazione"
echo ""

# Pull delle ultime modifiche da Git
echo "1. Pull delle ultime modifiche da GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ Errore durante il pull. Interrompo l'esecuzione."
  exit 1
fi

echo "✅ Pull completato con successo!"

# Pulizia della cache
echo "2. Pulizia della cache e delle cartelle temporanee..."
rm -rf node_modules/.vite
rm -rf client/node_modules/.vite
rm -rf dist
rm -rf client/dist

# Reinstallazione dipendenze
echo "3. Reinstallazione delle dipendenze..."
npm install

# Build dell'applicazione
echo "4. Ricompilazione dell'applicazione..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Errore durante la build. Controlla i log per i dettagli."
  exit 1
fi

echo "✅ Build completata con successo!"

# Riavvio dell'applicazione
echo "5. Riavvio dell'applicazione..."
if command -v pm2 &> /dev/null; then
  pm2 restart gervis
  echo "✅ Applicazione riavviata con PM2"
else
  echo "ℹ️ PM2 non trovato. Riavvia manualmente l'applicazione."
fi

echo ""
echo "===== AGGIORNAMENTO COMPLETATO ====="
echo "L'applicazione dovrebbe ora mostrare le ultime modifiche."
echo "Se ancora non vedi le modifiche, prova a svuotare la cache del browser."