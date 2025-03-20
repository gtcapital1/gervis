#!/bin/bash
# Script per pushare le modifiche alle gestione dei token e debug delle email

# Log delle operazioni
echo "Inizio operazioni di commit e push delle modifiche..."

# Staging delle modifiche
git add server/storage.ts server/routes.ts

# Commit con messaggio descrittivo
git commit -m "Fix: Riuso token onboarding esistenti e miglioramento debug errori email

- Modificato generateOnboardingToken per riutilizzare token esistenti se validi
- Aggiunto logging dettagliato per i token
- Migliorato gestione errori email con dettagli strutturati
- Aggiunta maggiore diagnostica per errori SMTP"

# Push su branch corrente
git push

echo "Operazioni completate."
