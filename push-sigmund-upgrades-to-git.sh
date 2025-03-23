#!/bin/bash

# Script per inviare le modifiche del modulo Sigmund a Git
# Questo script raggruppa tutte le modifiche relative al nuovo formato di raccomandazioni

echo "Inizializzazione del push delle modifiche di Sigmund (ex AI Profile) a Git..."

# Ottieni il branch corrente
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch corrente: $CURRENT_BRANCH"

# Aggiungi i file modificati e i nuovi file
git add server/ai/openai-service.ts
git add client/src/components/advisor/AiClientProfile.tsx
git add server/ai/profile-controller.ts
git add server/migrations/update-ai-profiles-structure.ts
git add update-ai-profiles-schema.sql
git add update-and-deploy-sigmund.sh
git add push-sigmund-upgrades-to-git.sh

# Commit con un messaggio descrittivo
git commit -m "Aggiornato sistema Sigmund con nuovo formato di raccomandazioni unificate
- Semplificato l'output del sistema AI unificando approfondimenti e suggerimenti
- Migliorato il prompt OpenAI per generare raccomandazioni con azioni specifiche
- Aggiornata visualizzazione con tema scuro e migliore contrasto
- Rimossa intestazione superflua dalle raccomandazioni
- Ottimizzato algoritmo di parsing JSON per il nuovo formato
- Aggiunti script per migrazione database e aggiornamento struttura"

# Push delle modifiche al repository remoto
git push origin $CURRENT_BRANCH

echo "Push completato. Verifica eventuali errori sopra."
echo "Se necessario, esegui manualmente 'git pull' prima di un nuovo push."