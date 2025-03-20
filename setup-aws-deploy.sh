#!/bin/bash
# Script per compilare e avviare Gervis su AWS

echo "=== Script di compilazione e deploy per Gervis ==="
echo

# Istruzioni per eseguire sul server
echo "Per compilare e avviare l'applicazione, copia e incolla questi comandi sul server:"
echo
echo "# 1. Navigare alla directory dell'applicazione"
echo "cd /var/www/gervis"
echo
echo "# 2. Aggiornare il codice con le ultime modifiche"
echo "git pull"
echo
echo "# 3. Compilare l'applicazione"
echo "npm run build"
echo
echo "# 4. Verificare che la directory dist sia stata creata correttamente"
echo "ls -la dist/server/"
echo
echo "# 5. Avviare l'applicazione con PM2"
echo "pm2 start ecosystem.config.cjs"
echo
echo "# 6. Verificare che l'applicazione sia in esecuzione"
echo "pm2 list"
echo
echo "# 7. Monitorare i log per vedere i messaggi di debug"
echo "pm2 logs gervis"
echo

echo "=== Fine delle istruzioni ==="
