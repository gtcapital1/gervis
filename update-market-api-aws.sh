#!/bin/bash
# Script per aggiornare market-api.ts in modo compatibile con ES Modules (AWS Fix)

echo "Creo un nuovo commit con la versione aggiornata di market-api.ts"

# Esegui git add per il file modificato
git add server/market-api.ts
git add package.json

# Commit con il messaggio descrittivo
git commit -m "Fix: Sostituito axios con node-fetch in market-api.ts per compatibilità ES Modules su AWS"

# Push sul branch main
git push origin main

echo "Aggiornamento completato."
echo "Per applicare questo aggiornamento al server AWS:"
echo "1. Accedi al server AWS via SSH"
echo "2. Naviga alla directory del progetto: cd /var/www/gervis"
echo "3. Esegui: git pull"
echo "4. Installa node-fetch: npm install node-fetch"
echo "5. Riavvia l'applicazione: sudo pm2 restart all"