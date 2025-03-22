#!/bin/bash
# Script per aggiornare la chiave API Financial Modeling Prep nel file .env
# 
# Utilizzo: sudo bash update-api-key.sh NUOVA_API_KEY
#
# Esempio: sudo bash update-api-key.sh AbCdEfGhIjKlMnOpQrStUvWxYz123456

# Verifica che sia fornita una chiave API
if [ -z "$1" ]; then
  echo "Errore: Nessuna API key fornita"
  echo "Utilizzo: sudo bash update-api-key.sh NUOVA_API_KEY"
  exit 1
fi

NEW_API_KEY="$1"
ENV_FILE="/var/www/gervis/.env"

# Verifica che il file .env esista
if [ ! -f "$ENV_FILE" ]; then
  echo "Errore: File .env non trovato in $ENV_FILE"
  exit 1
fi

# Crea un backup del file .env originale
cp "$ENV_FILE" "${ENV_FILE}.backup"
echo "Backup creato: ${ENV_FILE}.backup"

# Aggiorna la chiave API nel file .env
if grep -q "FINANCIAL_API_KEY=" "$ENV_FILE"; then
  # La variabile esiste, aggiorniamola
  sed -i "s/FINANCIAL_API_KEY=.*/FINANCIAL_API_KEY=$NEW_API_KEY/" "$ENV_FILE"
  echo "Chiave API aggiornata con successo in $ENV_FILE"
else
  # La variabile non esiste, aggiungiamola
  echo "FINANCIAL_API_KEY=$NEW_API_KEY" >> "$ENV_FILE"
  echo "Chiave API aggiunta con successo a $ENV_FILE"
fi

# Verifica la chiave aggiornata
echo "Verifica della nuova configurazione:"
grep "FINANCIAL_API_KEY" "$ENV_FILE"

echo "Riavvio pm2 per applicare le modifiche..."
pm2 restart all

echo "Fatto! L'applicazione è stata riavviata con la nuova chiave API."
echo "Se le pagine di mercato ancora non funzionano, attendi qualche minuto per"
echo "il riavvio completo dell'applicazione o verifica i log con 'pm2 logs'."