#!/bin/bash

# Script combinato per aggiornare la struttura del database e inviare le modifiche a Git
# Questo script esegue tutte le operazioni necessarie per implementare il nuovo formato di Sigmund

echo "===== AGGIORNAMENTO COMPLETO SIGMUND ====="
echo "Questo script eseguirà:"
echo "1. Aggiornamento della struttura del database"
echo "2. Push delle modifiche al repository Git"
echo ""

# Chiedi conferma prima di procedere
read -p "Vuoi procedere con l'aggiornamento? (s/n): " risposta
if [[ "$risposta" != "s" && "$risposta" != "S" ]]; then
  echo "Operazione annullata."
  exit 0
fi

echo ""
echo "===== AGGIORNAMENTO DATABASE ====="

# Esegui lo script SQL per aggiornare il database
echo "Esecuzione dello script SQL..."
psql "$DATABASE_URL" -f update-ai-profiles-schema.sql

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Database aggiornato con successo."
else
  echo "ERRORE: Aggiornamento database fallito!"
  echo "Controlla gli errori sopra e correggi eventuali problemi prima di continuare."
  exit 1
fi

echo ""
echo "===== PUSH DELLE MODIFICHE A GIT ====="

# Aggiungi i file modificati
git add server/ai/openai-service.ts
git add client/src/components/advisor/AiClientProfile.tsx
git add server/ai/profile-controller.ts
git add server/migrations/update-ai-profiles-structure.ts
git add update-ai-profiles-schema.sql
git add update-and-deploy-sigmund.sh
git add push-sigmund-upgrades-to-git.sh

# Commit con un messaggio descrittivo
git commit -m "Aggiornato sistema Sigmund con nuovo formato raccomandazioni unificate
- Semplificato output del sistema AI unificando approfondimenti e suggerimenti
- Migliorato prompt OpenAI per generare raccomandazioni con azioni specifiche
- Aggiornata visualizzazione con tema scuro e migliore contrasto
- Rimossa intestazione superflua dalle raccomandazioni
- Ottimizzato algoritmo di parsing JSON per il nuovo formato
- Aggiunto script di migrazione database per il nuovo formato
- Aggiunto indice per migliorare performance query"

# Push delle modifiche al repository remoto
# Ottieni il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Push sul branch: $CURRENT_BRANCH"

# Esegui il push sul branch corrente
git push origin $CURRENT_BRANCH

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Push delle modifiche completato con successo."
else
  echo "ERRORE: Push a Git fallito!"
  echo "Prova ad eseguire 'git pull' e poi ripeti il push manualmente."
  exit 1
fi

echo ""
echo "===== AGGIORNAMENTO COMPLETATO ====="
echo "Il sistema Sigmund è stato aggiornato con successo."
echo "Verifica il funzionamento dell'applicazione nel browser."
echo ""