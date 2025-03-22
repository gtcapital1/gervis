#!/bin/bash
# Script per il push automatico delle modifiche alle API di mercato disabilitate

echo "===== PREPARAZIONE PUSH DISABILITAZIONE API MERCATO ====="
echo ""

# Verifica lo stato attuale
echo "Stato corrente dei file modificati:"
git status -s
echo ""

# Aggiunta dei file
echo "Aggiunta delle modifiche al file market-api.ts..."
git add server/market-api.ts

# Verifica cosa è stato aggiunto
echo ""
echo "File aggiunti per il commit:"
git status -s
echo ""

# Creazione del commit
echo "Creazione commit con modifiche API mercato..."
git commit -m "Disabilitazione temporanea delle API di mercato per test di autenticazione

- Disabilitate chiamate API esterne per indici finanziari, ticker e notizie
- Impostata risposta con dati vuoti per evitare errori sul frontend
- Aggiunto logging per debugging delle chiamate API
- Modifiche temporanee per verificare problemi di autenticazione su AWS"

# Push al repository
echo ""
echo "Esecuzione push delle modifiche..."
git push origin main

echo ""
echo "===== COMPLETATO ====="
echo "Le modifiche sono state inviate al repository."
echo "Riavvia l'applicazione sul server AWS per applicare le modifiche."