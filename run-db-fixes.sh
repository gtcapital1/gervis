#!/bin/bash
# Script per eseguire tutte le correzioni del database relative all'eliminazione dei clienti
# Questo script è utile sia in fase di sviluppo che in produzione

echo "Esecuzione delle correzioni del database per l'eliminazione dei clienti..."

# Controlla se NODE_ENV è impostato
if [ -z "$NODE_ENV" ]; then
  echo "NODE_ENV non impostato, utilizzo development come default"
  export NODE_ENV=development
fi

echo "Ambiente: $NODE_ENV"

# Esegui lo script di correzione principale
npx tsx server/migrations/run-all-fixes.ts

# Verifica il risultato
if [ $? -eq 0 ]; then
  echo "✅ Correzioni del database eseguite con successo!"
else
  echo "❌ Si è verificato un errore durante l'esecuzione delle correzioni del database"
  exit 1
fi

# Aggiunge una nota sul come verificare il funzionamento
echo ""
echo "Per verificare che le correzioni funzionino correttamente:"
echo "1. Accedi alla dashboard degli advisor"
echo "2. Crea un nuovo cliente di test"
echo "3. Aggiungi asset e raccomandazioni al cliente"
echo "4. Prova a eliminare il cliente"
echo "5. Controlla che il cliente e tutti i suoi dati correlati siano stati eliminati correttamente"

exit 0