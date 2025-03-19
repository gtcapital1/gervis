#!/bin/bash

# Script per creare un pacchetto di aggiornamento specifico per il fix CASCADE DELETE

# Imposta la data attuale nel formato YYYYMMDD
DATE=$(date +%Y%m%d)

# Nome del pacchetto di aggiornamento
PACKAGE_NAME="gervis-update-cascade-fix-$DATE.tar.gz"

# Crea una directory temporanea per il pacchetto
mkdir -p temp-update-cascade

# Copia i file necessari nella directory temporanea
cp -r server/migrations/fix-cascade-delete.ts temp-update-cascade/fix-cascade-delete.ts
cp -r deploy-scripts/fix-cascade-delete.sh temp-update-cascade/fix-cascade-delete.sh
cp -r istruzioni-fix-cascade-delete.md temp-update-cascade/istruzioni-fix-cascade-delete.md

# Crea il pacchetto di aggiornamento
tar -czvf $PACKAGE_NAME -C temp-update-cascade .

# Pulisci la directory temporanea
rm -rf temp-update-cascade

echo "Pacchetto di aggiornamento $PACKAGE_NAME creato con successo"