#!/bin/bash
# Script per creare un pacchetto di aggiornamento completo per Gervis
# Questo script crea un archivio tar.gz contenente tutti i file necessari per l'aggiornamento

# Nome del pacchetto di output
OUTPUT_PACKAGE="gervis-update-$(date +%Y%m%d).tar.gz"
COMPLETE_PACKAGE="gervis-complete-$(date +%Y%m%d).tar.gz"

# Verifica se ci sono modifiche non committate
if [[ -n $(git status --porcelain) ]]; then
  echo "ATTENZIONE: Ci sono modifiche non committate nel repository."
  echo "È consigliabile committare tutte le modifiche prima di creare un pacchetto di aggiornamento."
  read -p "Vuoi continuare comunque? (s/n): " confirm
  [[ "$confirm" != "s" ]] && exit 1
fi

echo "======================= PACCHETTO DI AGGIORNAMENTO ======================="
echo "Creazione pacchetto di aggiornamento base $OUTPUT_PACKAGE..."

# Lista dei file essenziali per l'aggiornamento
UPDATE_FILES=(
  "create-env-file.sh"
  ".env.example"
  "configurazione-email-aruba.md"
  "istruzioni-update-github.md"
  "checklist-deploy.md"
  "test-smtp.js"
  "README-UPDATE.md"
  "ecosystem.config.cjs"
)

# Crea un archivio con i file base
tar -czf "$OUTPUT_PACKAGE" "${UPDATE_FILES[@]}"

# Verifica il risultato
if [ $? -eq 0 ]; then
  echo "✅ Pacchetto di aggiornamento base creato con successo: $OUTPUT_PACKAGE"
  echo "Contenuto del pacchetto base:"
  tar -tvf "$OUTPUT_PACKAGE" | sort
else
  echo "❌ Errore durante la creazione del pacchetto base"
  exit 1
fi

echo ""
echo "======================= PACCHETTO COMPLETO ======================="
echo "Creazione pacchetto completo $COMPLETE_PACKAGE..."

# Escludiamo directory temporanee e file non necessari
EXCLUDE_PATTERN=(
  "--exclude=node_modules"
  "--exclude=.git"
  "--exclude=*.tar.gz"
  "--exclude=temp-*"
  "--exclude=.env"
  "--exclude=dist"
)

# Crea un archivio completo
tar -czf "$COMPLETE_PACKAGE" "${EXCLUDE_PATTERN[@]}" .

# Verifica il risultato
if [ $? -eq 0 ]; then
  echo "✅ Pacchetto completo creato con successo: $COMPLETE_PACKAGE"
  echo "Dimensione: $(du -h "$COMPLETE_PACKAGE" | cut -f1)"
else
  echo "❌ Errore durante la creazione del pacchetto completo"
  exit 1
fi

echo ""
echo "======================= ISTRUZIONI DI DEPLOYMENT ======================="
echo "Per applicare l'aggiornamento sul server:"
echo ""
echo "OPZIONE 1: Aggiornamento tramite Git (consigliato)"
echo "------------------------------------------------------------"
echo "1. Connessione al server: ssh username@server-ip"
echo "2. Navigazione: cd /var/www/gervis"
echo "3. Pull dei cambiamenti: git pull origin main"
echo "4. Installazione dipendenze: npm ci"
echo "5. Aggiornamento ambiente: ./create-env-file.sh"
echo "6. Riavvio applicazione: pm2 restart gervis"
echo ""
echo "OPZIONE 2: Aggiornamento tramite pacchetto base"
echo "------------------------------------------------------------"
echo "1. Carica il pacchetto sul server: scp $OUTPUT_PACKAGE username@server:/var/www/gervis/"
echo "2. Connessione al server: ssh username@server-ip"
echo "3. Navigazione: cd /var/www/gervis"
echo "4. Estrai i file: tar -xzf $OUTPUT_PACKAGE -C /var/www/gervis/"
echo "5. Rendi eseguibile lo script: chmod +x /var/www/gervis/create-env-file.sh"
echo "6. Riavvio applicazione: pm2 restart gervis"
echo ""
echo "OPZIONE 3: Installazione completa"
echo "------------------------------------------------------------"
echo "1. Carica il pacchetto sul server: scp $COMPLETE_PACKAGE username@server:/var/www/"
echo "2. Connessione al server: ssh username@server-ip"
echo "3. Backup directory esistente: mv /var/www/gervis /var/www/gervis-backup-$(date +%Y%m%d)"
echo "4. Creazione nuova directory: mkdir -p /var/www/gervis"
echo "5. Estrai i file: tar -xzf $COMPLETE_PACKAGE -C /var/www/gervis/"
echo "6. Configurazione: cd /var/www/gervis && chmod +x *.sh && ./create-env-file.sh"
echo "7. Installazione dipendenze: npm ci"
echo "8. Riavvio applicazione: pm2 restart gervis"
echo ""
echo "======================= VERIFICA DELL'AGGIORNAMENTO ======================="
echo "Dopo l'aggiornamento, verifica che tutto funzioni correttamente:"
echo "1. Test SMTP: node test-smtp.js"
echo "2. Controlla i log: pm2 logs gervis"
echo "3. Verifica l'accesso web: curl -I http://localhost:5000"

exit 0