#!/bin/bash

# Script per eseguire la migrazione fix-cascade-delete.ts sul server AWS

# Verifica l'esistenza della directory di destinazione
mkdir -p /tmp/gervis-migrations

# Copia lo script di migrazione nella directory temporanea
cp ./server/migrations/fix-cascade-delete.ts /tmp/gervis-migrations/

# Naviga nella directory principale dell'applicazione
cd /var/www/gervis

# Esegui lo script di migrazione con TSX
echo "Esecuzione dello script di migrazione fix-cascade-delete.ts..."
tsx /tmp/gervis-migrations/fix-cascade-delete.ts

# Verifica il risultato dell'esecuzione
if [ $? -eq 0 ]; then
  echo "Migrazione completata con successo"
else
  echo "Errore durante l'esecuzione della migrazione"
  exit 1
fi

# Pulizia
echo "Pulizia file temporanei..."
rm -rf /tmp/gervis-migrations

echo "Procedura completata"