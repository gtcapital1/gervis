#!/bin/bash
# Script per correggere l'errore 502 Bad Gateway sul server AWS

echo "===== CORREZIONE SERVER AWS PER GERVIS ====="
echo ""

# Verifica se siamo sul server AWS
if [ ! -d "/var/www/gervis" ]; then
  echo "ERRORE: Questo script deve essere eseguito sul server AWS nella directory /var/www/gervis"
  exit 1
fi

# Assicurati di essere nella directory corretta
cd /var/www/gervis

# Aggiorna da Git
echo "1. Aggiornamento codice da Git..."
git pull

# Installa node-fetch (richiesto per market-api.ts)
echo "2. Installazione node-fetch..."
npm install node-fetch

# Esegui la build dell'applicazione
echo "3. Build dell'applicazione..."
npm run build

# Controlla se la directory dist esiste
if [ ! -d "dist" ]; then
  echo "ERRORE: La directory 'dist' non esiste dopo la build. Verifica gli errori durante la build."
  exit 1
fi

# Controlla se dist/index.js esiste
if [ ! -f "dist/index.js" ]; then
  echo "ERRORE: Il file 'dist/index.js' non esiste dopo la build. Verifica gli errori durante la build."
  exit 1
fi

# Riavvia completamente i processi Node
echo "4. Riavvio dei processi Node..."
echo "Arresto di tutti i processi PM2..."
pm2 stop all
pm2 delete all
killall -9 node 2>/dev/null || true

echo "5. Verifica che la porta 5000 sia libera..."
PORT_CHECK=$(lsof -i :5000)
if [ ! -z "$PORT_CHECK" ]; then
  echo "AVVISO: La porta 5000 è ancora in uso:"
  echo "$PORT_CHECK"
  echo "Tentativo di forzare il termine dei processi..."
  sudo killall -9 node
fi

# Riavvia l'applicazione usando PM2
echo "6. Avvio dell'applicazione con PM2..."
NODE_ENV=production HOST=0.0.0.0 PORT=5000 pm2 start ecosystem.config.cjs

# Verifica lo stato
echo "7. Verifica stato PM2..."
pm2 status

echo "8. Verifica porta 5000..."
lsof -i :5000 | grep LISTEN

# Riavvia Nginx
echo "9. Riavvio Nginx..."
sudo systemctl restart nginx

echo ""
echo "===== COMPLETATO ====="
echo "Verifica se il sito funziona correttamente accedendo a https://gervis.it"
echo "Per vedere i log dell'applicazione: pm2 logs gervis"