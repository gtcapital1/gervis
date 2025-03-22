#!/bin/bash
# Script per fare il push dell'integrazione AI a GitHub in modo sicuro

echo "Iniziando il push dell'integrazione AI a GitHub..."

# Proteggi il file .env per evitare che venga caricato con le chiavi API
git update-index --assume-unchanged .env

# Aggiungi i file dell'integrazione AI
git add server/ai-services.ts
git add server/routes-ai.ts
git add client/src/components/advisor/AiClientProfile.tsx

# Aggiungi le modifiche a index.ts che registrano le rotte AI
git add server/index.ts

# Aggiungi le modifiche alla pagina del cliente
git add client/src/pages/ClientDetail.tsx

# Aggiungi le traduzioni aggiornate
git add client/src/i18n/locales/it/client.json
git add client/src/i18n/locales/en/client.json

# Aggiungi gli script di test per OpenAI
git add check-openai-api.js

# Aggiungi la documentazione sull'integrazione AI
git add AI-INTEGRATION-README.md || true
git add AI-INTEGRATION-DOCS.md || true
git add AI-INTEGRATION-CHANGELOG.md || true

# Crea il commit con un messaggio descrittivo
git commit -m "Implementata integrazione AI con OpenAI GPT-4 per generare profili cliente arricchiti"

# Fai il push delle modifiche
git push

echo "Push completato con successo!"