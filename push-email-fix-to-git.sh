#!/bin/bash

# Script per inviare le correzioni della funzionalità email a GitHub

echo "=== Push delle correzioni email a GitHub ==="

# Configurazione
REPO_URL="https://github.com/gtcapital1/gervis.git"
BRANCH="fix-email-onboarding"
COMMIT_MSG="Fix: Risolto problema con l'invio di email di onboarding personalizzate"

# Verifica che git sia installato
if ! command -v git &> /dev/null; then
    echo "Git non è installato. Installalo con 'sudo apt-get install git'"
    exit 1
fi

# Verifica che siamo nella directory corretta
if [ ! -f "server/email.ts" ] || [ ! -f "server/routes.ts" ] || [ ! -f "server/storage.ts" ]; then
    echo "ERRORE: Non sei nella directory principale del progetto."
    echo "Assicurati di eseguire questo script dalla root del progetto."
    exit 1
fi

# Crea/cambia al branch corretto
if git rev-parse --verify $BRANCH &> /dev/null; then
    echo "Branch $BRANCH esiste già, cambiando branch..."
    git checkout $BRANCH
else
    echo "Creando nuovo branch $BRANCH..."
    git checkout -b $BRANCH
fi

echo "Branch attuale: $(git branch --show-current)"

# Aggiungi i file modificati
echo "Aggiungendo i file modificati..."
git add server/email.ts server/routes.ts server/storage.ts
git add test-email-onboarding.js test-email-onboarding-full.js || true
git add fix-email-onboarding.sh verifica-fix-email.md || true

# Verifica le modifiche
echo "Modifiche da includere nel commit:"
git status

# Crea il commit
echo "Creando commit con messaggio: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Push al repository remoto
echo "Invio modifiche al repository remoto..."
if git push origin $BRANCH; then
    echo "=== Invio completato con successo ==="
    echo "Branch: $BRANCH"
    echo "Messaggio commit: $COMMIT_MSG"
    echo "Le modifiche sono state inviate con successo a $REPO_URL"
else
    echo "ERRORE: Non è stato possibile inviare le modifiche al repository remoto."
    echo "Verifica le credenziali e le autorizzazioni di accesso."
    exit 1
fi

echo ""
echo "Per completare il processo, crea una Pull Request su GitHub:"
echo "1. Vai a $REPO_URL"
echo "2. Clicca su 'Pull Requests'"
echo "3. Clicca su 'New Pull Request'"
echo "4. Seleziona il branch $BRANCH come 'compare'"
echo "5. Completa la creazione della Pull Request"
echo ""