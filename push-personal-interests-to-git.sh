#!/bin/bash

# Script per inviare le modifiche degli interessi personali a GitHub
# Questo script:
# 1. Aggiunge i file modificati al staging
# 2. Crea un commit con un messaggio descrittivo
# 3. Pusha le modifiche al repository remoto

echo "=== Inizio procedura push degli interessi personali a GitHub ==="

# Aggiunge i file modificati
echo "Aggiunta dei file modificati..."
git add client/src/pages/OnboardingForm.tsx
git add client/src/lib/i18n.ts
git add server/migrations/add-personal-interests.ts

# Verifica se ci sono altri file da aggiungere
echo "Vuoi aggiungere altri file? Se sì, digita i nomi dei file separati da spazi, altrimenti premi invio."
read additional_files

if [ ! -z "$additional_files" ]; then
  git add $additional_files
  echo "File aggiuntivi aggiunti: $additional_files"
fi

# Crea un commit
echo "Creazione del commit..."
git commit -m "Aggiunta funzionalità interessi personali al modulo di onboarding"

# Push al repository remoto
echo "Pushing delle modifiche al repository remoto..."
git push

echo "=== Procedura completata ==="
echo "Le modifiche sono state inviate a GitHub."