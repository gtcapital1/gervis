#!/bin/bash
# Script per verificare la configurazione PM2

echo "Verificare il file ecosystem.config.cjs per vedere quale percorso è configurato:"
echo
echo "# Eseguire sul server AWS:"
echo "cat /var/www/gervis/ecosystem.config.cjs"
echo
echo "Verificare che il percorso dello script sia corretto."
echo "Se necessario, modificare il percorso nel file ecosystem.config.cjs:"
echo
echo "Opzione 1: Se il file index.js è nella directory principale:"
echo "module.exports = {"
echo "  apps: [{"
echo "    name: 'gervis',"
echo "    script: 'index.js',"
echo "    // altre configurazioni..."
echo "  }]"
echo "};"
echo
echo "Opzione 2: Usare un percorso diretto al file principale:"
echo "# Eseguire sul server AWS:"
echo "node /var/www/gervis/index.js"
echo 
echo "Se il file si avvia correttamente, configurare PM2 per usare quel percorso."
