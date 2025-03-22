#!/bin/bash

# Script per inviare la correzione ES Modules a GitHub

echo "===== INVIO CORREZIONE ES MODULES A GITHUB ====="

# Controllo stato attuale
echo "1. Verifica modifiche:"
git status

# Aggiunta dei file modificati
echo ""
echo "2. Aggiunta file alla staging area:"
git add ecosystem.config.cjs fix-aws-server.sh istruzioni-correzione-aws.md

# Commit delle modifiche
echo ""
echo "3. Creazione commit:"
git commit -m "Fix: Risolto problema ES Modules su AWS utilizzando il file compilato dist/index.js"

# Push al repository
echo ""
echo "4. Invio modifiche a GitHub:"
git push origin main

echo ""
echo "===== COMPLETATO ====="
echo "Modifica inviata correttamente a GitHub"
echo "Ora esegui ./fix-aws-server.sh sul server AWS per applicare la correzione"