#!/bin/bash

# Script per eseguire i fix del database
# Questo script automatizza l'esecuzione degli script di migrazione
# per correggere problemi di configurazione del database

echo "╔═════════════════════════════════════════════════════════╗"
echo "║ Gervis - Script per la correzione del database           ║"
echo "╚═════════════════════════════════════════════════════════╝"

# Assicurati che il codice TypeScript sia disponibile
if [ ! -d "server/migrations" ]; then
  echo "❌ Errore: La directory server/migrations non esiste."
  echo "   Assicurati di eseguire questo script dalla directory principale del progetto."
  exit 1
fi

# Verifica che node e tsx siano disponibili
command -v node >/dev/null 2>&1 || { 
  echo "❌ Errore: Node.js non è installato"; 
  echo "   Installa Node.js ed esegui nuovamente lo script."; 
  exit 1; 
}

command -v npx >/dev/null 2>&1 || { 
  echo "❌ Errore: npx non è disponibile"; 
  echo "   Esegui 'npm install -g npx' ed esegui nuovamente lo script."; 
  exit 1; 
}

echo "✅ Prerequisiti verificati"

# Verifica che il file .env esista
if [ ! -f ".env" ]; then
  echo "⚠️ Attenzione: File .env non trovato."
  echo "   Assicurati che DATABASE_URL sia configurato correttamente."
  
  # Se esiste .env.example, offri di copiarlo
  if [ -f ".env.example" ]; then
    echo -n "   Vuoi copiare .env.example in .env? (s/n): "
    read resp
    if [ "$resp" = "s" ]; then
      cp .env.example .env
      echo "   File .env creato da .env.example. Modifica il file con i valori corretti."
    fi
  fi
fi

echo "📦 Installo dipendenze necessarie..."
npm install --no-save dotenv postgres

echo "🛠️ Esecuzione fix database..."
npx tsx server/migrations/run-all-fixes.ts

# Verifica il codice di uscita
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Fix database completati con successo!"
  echo ""
  echo "I vincoli CASCADE DELETE sono stati configurati correttamente."
  echo "Ora dovresti essere in grado di eliminare i clienti senza errori."
else
  echo ""
  echo "❌ Si è verificato un errore durante l'esecuzione dei fix."
  echo ""
  echo "Verifica i messaggi di errore sopra e assicurati che:"
  echo "- DATABASE_URL sia configurato correttamente nel file .env"
  echo "- Il database sia accessibile"
  echo "- L'utente del database abbia i permessi necessari"
fi

echo ""
echo "Esecuzione script completata."