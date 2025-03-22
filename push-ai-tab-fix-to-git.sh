#!/bin/bash
# Script per caricare la correzione della visibilità del tab AI su GitHub

echo "Caricamento delle correzioni per la visibilità del tab AI su GitHub..."

# Verifica che il file fix-ai-tab-visibility.sh esista
if [ ! -f "fix-ai-tab-visibility.sh" ]; then
    echo "Errore: Il file fix-ai-tab-visibility.sh non esiste!"
    exit 1
fi

# Aggiunge il file al repository git
git add fix-ai-tab-visibility.sh

# Effettua il commit
git commit -m "Risolto problema di visibilità del tab AI nella pagina client"

# Carica su GitHub
git push origin ai-integration

echo "Caricamento completato! Le modifiche sono state pubblicate su GitHub."
echo "Per applicare le modifiche sull'ambiente di produzione AWS:"
echo "1. Accedi al server AWS"
echo "2. Esegui: cd /var/www/gervis"
echo "3. Esegui: git pull origin ai-integration"
echo "4. Esegui: bash fix-ai-tab-visibility.sh"