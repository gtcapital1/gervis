#!/bin/bash

# Script per aggiungere i campi degli interessi personali al database su AWS
# Questo script deve essere eseguito sul server AWS dopo il deployment dell'aggiornamento

echo "=== Aggiunta dei campi per gli interessi personali al database Gervis ==="
echo "Questo script aggiunge le colonne personalInterests, personalInterestsNotes"
echo "e i campi di valutazione degli obiettivi di investimento alla tabella clients."

# Verifica che lo script sia eseguito su un server AWS
if [ ! -f /etc/os-release ] || ! grep -q "Amazon Linux\|Ubuntu" /etc/os-release; then
  echo "ATTENZIONE: Questo script dovrebbe essere eseguito solo su un server AWS."
  echo "Vuoi continuare comunque? (y/n)"
  read answer
  if [ "$answer" != "y" ]; then
    echo "Operazione annullata."
    exit 1
  fi
fi

# Verifica che Node.js sia installato
if ! command -v node &> /dev/null; then
  echo "ERRORE: Node.js non è installato. Installalo prima di continuare."
  exit 1
fi

# Verifica la presenza del file di migrazione
MIGRATION_FILE="/var/www/gervis/server/migrations/add-personal-interests.ts"
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERRORE: File di migrazione non trovato in $MIGRATION_FILE"
  echo "Assicurati di aver estratto correttamente il pacchetto di aggiornamento."
  exit 1
fi

# Esecuzione della migrazione
echo "Esecuzione della migrazione per aggiungere i campi degli interessi personali..."
cd /var/www/gervis
node "$MIGRATION_FILE"

# Verifica dell'esito
if [ $? -eq 0 ]; then
  echo "Migrazione completata con successo!"
  echo "Le seguenti colonne sono state aggiunte alla tabella clients:"
  echo "- personalInterests (array di stringhe)"
  echo "- personalInterestsNotes (testo)"
  echo "- retirementInterest, wealthGrowthInterest, incomeGenerationInterest, capitalPreservationInterest, estatePlanningInterest (valutazioni da 1 a 5)"
  
  # Visualizza le nuove colonne
  echo "Verifica delle colonne aggiunte:"
  sudo -u postgres psql -d gervis -c "SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name LIKE '%interest%';"
  
  echo "=== Procedura completata ==="
  echo "Riavvia l'applicazione con: sudo pm2 restart gervis"
else
  echo "ERRORE: La migrazione non è stata completata correttamente."
  echo "Controlla i log per maggiori dettagli."
  exit 1
fi