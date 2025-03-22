#!/bin/bash
# Script per correggere il problema del container AI mancante in AWS
# Questo script rimuove il prefisso 'client.' dalle traduzioni

echo "Correzione del container AI mancante in AWS..."

# Parte 1: Correggi le traduzioni in AiClientProfile.tsx
echo "Correzione dei riferimenti alle chiavi di traduzione..."
cd /var/www/gervis
sed -i 's/t('"'"'client\./t('"'"'/g' client/src/components/advisor/AiClientProfile.tsx

# Parte 2: Ricompila l'applicazione
echo "Ricompilazione dell'applicazione..."
npm run build

# Parte 3: Riavvia il servizio PM2
echo "Riavvio del servizio PM2..."
pm2 restart all

echo "Correzione completata! Il container AI dovrebbe ora essere visibile."
echo "Per verificare, accedi all'applicazione e controlla la scheda 'Profilo AI' nella pagina del cliente."