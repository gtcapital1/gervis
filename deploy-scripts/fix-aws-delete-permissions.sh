#!/bin/bash

# Script per correggere i permessi DELETE nel database AWS
# Da eseguire sul server AWS dopo il deployment

set -e

echo "Inizializzazione script per correggere i permessi DELETE nel database AWS..."

# Posizionamento nella directory dell'applicazione
cd /var/www/gervis

# Esecuzione dello script di fix delle autorizzazioni
echo "Esecuzione script di fix delle autorizzazioni..."
node -e "require('./server/migrations/fix-delete-permissions').fixDeletePermissions().then(r => console.log(r));"

echo "Correzione permessi completata."