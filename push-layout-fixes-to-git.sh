#!/bin/bash

# Script per effettuare il push delle modifiche al layout
# Questo script invierà a Git le modifiche al layout 2/5 - 3/5 implementate in ClientEditDialog.tsx

echo "Inizio del processo di push su Git..."

# Verifica stato Git
echo "Verifica dello stato Git attuale..."
git status

# Aggiungi le modifiche specifiche
echo "Aggiunta delle modifiche al layout..."
git add client/src/components/advisor/ClientEditDialog.tsx

# Commit delle modifiche
echo "Commit delle modifiche con messaggio descrittivo..."
git commit -m "Implementato layout 2/5 - 3/5 in ClientEditDialog.tsx per migliorare coerenza visiva con OnboardingForm"

# Push al repository remoto
echo "Push delle modifiche al repository remoto..."
git push

echo "Processo completato con successo!"