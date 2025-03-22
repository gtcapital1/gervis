#!/bin/bash

# Script per correggere l'errore di ES Modules su AWS
# Questo script risolve l'errore:
# "ReferenceError: require is not defined in ES module scope, you can use import instead"

# Mostra i comandi che vengono eseguiti
set -x

# Verifica e rinomina index.js in index.cjs (per usare CommonJS)
if [ -f index.js ]; then
  echo "Backup del file index.js"
  cp index.js index.js.backup

  echo "Rinomina index.js in index.cjs"
  mv index.js index.cjs
fi

# Verifica e aggiorna ecosystem.config.cjs
if [ -f ecosystem.config.cjs ]; then
  echo "Backup del file ecosystem.config.cjs"
  cp ecosystem.config.cjs ecosystem.config.cjs.backup

  echo "Aggiornamento di ecosystem.config.cjs per utilizzare index.cjs"
  sed -i 's/index\.js/index.cjs/g' ecosystem.config.cjs
fi

# Verifica e aggiorna package.json
if [ -f package.json ]; then
  echo "Backup del file package.json"
  cp package.json package.json.backup

  echo "Aggiornamento scripts in package.json"
  sed -i 's/"start": "node index.js"/"start": "node index.cjs"/g' package.json
  sed -i 's/"dev": "node index.js"/"dev": "node index.cjs"/g' package.json
  
  # Rimuove "type": "module" dal package.json
  # Questo è cruciale per risolvere l'errore di ES Modules
  sed -i '/"type": "module"/d' package.json
fi

# Esegui git add, commit e push delle modifiche
echo "Aggiunta modifiche a git"
git add index.cjs ecosystem.config.cjs package.json
git commit -m "Fix: Risolto problema ES Modules rinominando index.js in index.cjs e aggiornando configurazione"
git push

echo ""
echo "====================================================="
echo "Modifiche completate e inviate al repository Git."
echo "Per applicare sul server AWS:"
echo "1. Accedi al server AWS via SSH"
echo "2. Naviga alla directory del progetto: cd /var/www/gervis"
echo "3. Esegui: git pull"
echo "4. Riavvia completamente l'applicazione:"
echo "   sudo pm2 stop all"
echo "   sudo pm2 delete all"
echo "   sudo killall -9 node"
echo "   sudo pm2 start ecosystem.config.cjs"
echo "5. Verifica lo stato: sudo pm2 logs gervis --lines 20"
echo "====================================================="