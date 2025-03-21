#!/bin/bash

# Script completo per applicare le modifiche al layout del radar chart e asset
# su ambiente AWS o di sviluppo

echo "==========================================================="
echo "    FIX LAYOUT PAGINA CLIENTE E GRAFICO RADAR"
echo "==========================================================="
echo "Questo script applica i seguenti miglioramenti:"
echo "- Grafico radar posizionato a destra (2/3 larghezza)"
echo "- Sezione informazioni personali più stretta (1/3 larghezza)"
echo "- Box asset con sfondo nero e testo bianco"
echo "- Rimozione delle sezioni duplicate (Esperienza e Orizzonte)"
echo ""

# Funzione per controllare errori
check_error() {
  if [ $? -ne 0 ]; then
    echo "❌ ERRORE: $1"
    echo "Interrompo l'esecuzione."
    exit 1
  fi
}

# 1. Pull delle ultime modifiche
echo "1️⃣ Aggiornamento del codice dal repository Git..."
git fetch origin main
check_error "Impossibile scaricare le ultime modifiche"

git reset --hard origin/main
check_error "Impossibile resettare alla versione remota"

echo "✅ Codice aggiornato alla versione più recente"

# 2. Pulizia completa della cache
echo ""
echo "2️⃣ Pulizia completa della cache e file temporanei..."
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf client/node_modules/.cache
rm -rf client/node_modules/.vite
rm -rf dist
rm -rf client/dist
rm -rf .parcel-cache
rm -rf client/.parcel-cache
check_error "Errore durante la pulizia della cache"

echo "✅ Cache pulita con successo"

# 3. Reinstallazione delle dipendenze
echo ""
echo "3️⃣ Reinstallazione delle dipendenze..."
npm ci
check_error "Errore durante l'installazione delle dipendenze"

echo "✅ Dipendenze reinstallate correttamente"

# 4. Compilazione dell'applicazione
echo ""
echo "4️⃣ Compilazione dell'applicazione..."
NODE_ENV=production npm run build
check_error "Errore durante la compilazione"

echo "✅ Applicazione compilata con successo"

# 5. Riavvio del servizio
echo ""
echo "5️⃣ Riavvio del servizio..."

# Controllo se siamo in un ambiente che usa PM2
if command -v pm2 &> /dev/null; then
  echo "Rilevato PM2, riavvio del servizio..."
  
  # Verifica se esiste un processo gervis
  if pm2 list | grep -q "gervis"; then
    pm2 reload gervis
    check_error "Errore durante il riavvio di PM2"
    echo "✅ Applicazione riavviata con PM2"
  else
    echo "⚠️ Processo 'gervis' non trovato in PM2."
    echo "Avvio nuovo processo..."
    pm2 start npm --name "gervis" -- start
  fi
else
  echo "⚠️ PM2 non rilevato. Riavvio manuale necessario:"
  echo "   npm start"
fi

echo ""
echo "==========================================================="
echo "    OPERAZIONE COMPLETATA ✨"
echo "==========================================================="
echo ""
echo "Se non vedi ancora le modifiche:"
echo "1. Svuota la cache del browser (Ctrl+F5 o Cmd+Shift+R)"
echo "2. Verifica che il servizio sia in esecuzione"
echo "3. Controlla i log per eventuali errori:"
echo "   PM2: pm2 logs gervis"
echo "   NPM: npm run dev"
echo ""
echo "Il layout del profilo cliente è stato aggiornato con successo!"