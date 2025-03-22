#!/bin/bash
# Script per il push automatico dei miglioramenti diagnostici di autenticazione su Git

echo "===== PREPARAZIONE PUSH MIGLIORAMENTI AUTENTICAZIONE ====="
echo ""

# Verifica lo stato attuale
echo "Stato corrente dei file modificati:"
git status -s
echo ""

# Aggiunta dei file modificati
echo "Aggiunta dei file diagnostici di autenticazione..."
git add server/auth.ts server/index.ts client/src/hooks/use-auth.tsx client/src/lib/queryClient.ts client/src/lib/protected-route.tsx

# Verifica cosa è stato aggiunto
echo ""
echo "File aggiunti per il commit:"
git status -s
echo ""

# Creazione del commit
echo "Creazione commit con i miglioramenti diagnostici..."
git commit -m "Migliorata gestione sessioni e debugging autenticazione

- Aggiunta strumentazione diagnostica completa in auth.ts
- Migliorato logging dell'autenticazione con dettagli sessione
- Implementata validazione deserializzazione utente
- Aggiunto monitoraggio dettagliato delle richieste API
- Ottimizzata gestione cookie con tracciamento specifico"

# Push al repository
echo ""
echo "Esecuzione push dei miglioramenti diagnostici..."
git push origin main

echo ""
echo "===== COMPLETATO ====="
echo "I miglioramenti diagnostici di autenticazione sono stati inviati al repository."
echo "Queste modifiche aiuteranno a identificare problemi di sessione in AWS."