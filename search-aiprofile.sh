#!/bin/bash

# Script per cercare il file AiClientProfile.tsx nell'ambiente AWS

echo "Ricerca del file AiClientProfile.tsx in AWS..."
echo "=================================================================="
echo "Esegui questo comando sul server AWS:"
echo "find /var/www/gervis -name AiClientProfile.tsx"
echo "=================================================================="
echo "Una volta trovato il file, usa il comando sed sull'effettivo percorso del file:"
echo "sed -i \"s/t('client\\./t('/g\" PERCORSO_TROVATO && npm run build && pm2 restart all"
echo "=================================================================="

chmod +x search-aiprofile.sh
