#!/bin/bash
# Script per creare un pacchetto di aggiornamento per Gervis
# Questo script crea un archivio tar.gz contenente solo i file necessari per l'aggiornamento

# Nome del pacchetto di output
OUTPUT_PACKAGE="gervis-update-$(date +%Y%m%d).tar.gz"

# Lista dei file da includere nell'aggiornamento
UPDATE_FILES=(
  "create-env-file.sh"
  ".env.example"
  "configurazione-email-aruba.md"
  "istruzioni-update-github.md"
  "checklist-deploy.md"
  "test-smtp.js"
  "README-UPDATE.md"
)

echo "Creazione pacchetto di aggiornamento $OUTPUT_PACKAGE..."

# Crea un archivio temporaneo
tar -czf "$OUTPUT_PACKAGE" "${UPDATE_FILES[@]}"

# Verifica il risultato
if [ $? -eq 0 ]; then
  echo "Pacchetto di aggiornamento creato con successo: $OUTPUT_PACKAGE"
  echo "Contenuto del pacchetto:"
  tar -tvf "$OUTPUT_PACKAGE"
else
  echo "Errore durante la creazione del pacchetto"
  exit 1
fi

echo ""
echo "Per applicare l'aggiornamento sul server:"
echo "1. Carica il pacchetto sul server: scp $OUTPUT_PACKAGE username@server:/var/www/gervis/"
echo "2. Estrai i file: tar -xzf $OUTPUT_PACKAGE -C /var/www/gervis/"
echo "3. Rendi eseguibile lo script: chmod +x /var/www/gervis/create-env-file.sh"
echo "4. Riavvia l'applicazione: pm2 restart gervis"

exit 0