#!/bin/bash

# Script per verificare e diagnosticare il problema del container AI su AWS

echo "Verifica problema container AI mancante in AWS..."

# Connettersi al server AWS e controllare il file AiClientProfile.tsx
echo "Controlla il contenuto del file AiClientProfile.tsx:"
echo "=================================================================="
echo "Esegui questo comando sul server AWS:"
echo "cat /var/www/gervis/client/src/components/advisor/AiClientProfile.tsx | grep -n \"t('client.\""
echo "=================================================================="
echo "Se vedi righe contenenti t('client.<qualcosa>'), queste sono le righe che devono essere corrette."
echo
echo "Per correggere il problema, esegui questo comando direttamente sul server AWS:"
echo "=================================================================="
echo "cd /var/www/gervis && sed -i \"s/t('client\\./t('/g\" client/src/components/advisor/AiClientProfile.tsx && npm run build && pm2 restart all"
echo "=================================================================="
echo
echo "In alternativa, puoi utilizzare lo script già preparato 'fix-aws-ai-container.sh'."

chmod +x aws-check-container.sh
