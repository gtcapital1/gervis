#!/bin/bash
# Script per inviare a Git le modifiche alla Market API con miglioramenti per AWS
# Creato: 22 marzo 2025

set -e  # Termina lo script se un comando fallisce

echo "Preparazione all'invio delle modifiche su Git..."

# Verifica se Git è inizializzato e configurato
if [ ! -d ".git" ]; then
  echo "ERROR: La directory .git non esiste. Assicurati di essere nella cartella principale del repository."
  exit 1
fi

# Controlla se ci sono modifiche pendenti
if [ -z "$(git status --porcelain)" ]; then
  echo "AVVISO: Non ci sono modifiche da committare!"
  exit 0
fi

# Configura info Git se necessario
if [ -z "$(git config --get user.email)" ]; then
  git config --global user.email "gianmarco.trapasso@gmail.com"
  git config --global user.name "Gianmarco Trapasso"
  echo "Configurazione Git impostata."
fi

# Aggiungi i file modificati
echo "Aggiungendo le modifiche alla Market API..."
git add server/market-api.ts
git add push-market-api-fix-to-git.sh

# Crea il commit
echo "Creazione commit..."
git commit -m "Migliorata robustezza Market API per AWS

- Aumentato timeout richieste HTTP a 8 secondi
- Aggiunto User-Agent e header specifici
- Migliorato logging per diagnostica
- Gestione errori più robusta
- Modificato fetch per axios nelle API di notizie"

# Push al repository remoto
echo "Invio modifiche al repository remoto..."
git push origin main

echo "=========================================="
echo "✅ Modifiche inviate con successo!"
echo "Le modifiche alla Market API sono ora disponibili su GitHub."
echo "Puoi ora procedere con l'aggiornamento su AWS."
echo "=========================================="