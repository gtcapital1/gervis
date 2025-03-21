#!/bin/bash

# Script per inviare le modifiche al grafico radar e alla visualizzazione degli asset su GitHub

echo "===== PUSH DI AGGIORNAMENTI AL LAYOUT DEL PROFILO CLIENTE ====="
echo "Modifiche principali:"
echo "- Miglioramento layout grafico radar"
echo "- Rimozione indicatori numerici dal grafico"
echo "- Box asset con sfondo nero e testo bianco"
echo "- Rimozione scheda 'assets' ridondante"
echo "- Correzione duplicazioni nelle sezioni investimento"
echo ""

# Assicurarsi che non ci siano modifiche non committate
if [[ $(git status --porcelain) ]]; then
  echo "Ci sono modifiche non committate. Commit in corso..."
  git add .
  git commit -m "Fix layout pagina dettaglio cliente e miglioramenti UI"
fi

# Push al repository remoto
echo "Invio dei commit locali al repository remoto..."
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Push completato con successo!"
  echo "Le modifiche sono ora disponibili su GitHub."
else
  echo "❌ Errore durante il push. Verificare le credenziali o la connessione."
fi