#!/bin/bash

# Script per fare il push delle correzioni per l'invio delle email onboarding
# Questo script aggiorna i file necessari e li invia al repository Git

# Funzione per gestire errori
handle_error() {
  echo "ERRORE: $1"
  exit 1
}

# Verifica repository Git
echo "Verifico repository Git..."
if [ ! -d .git ]; then
  handle_error "Repository Git non trovato. Eseguire 'git init' prima."
fi

# Creazione del branch per il fix
echo "Creazione branch per il fix..."
git checkout -b fix-email-onboarding || handle_error "Impossibile creare il branch"

# Aggiungi i file modificati
echo "Aggiungo i file modificati..."
git add server/routes.ts
git add server/email.ts
git add server/storage.ts
git add client/src/pages/ClientDetail.tsx

# Crea il commit
echo "Creazione commit con le modifiche..."
git commit -m "Fix: Corretto problema di invio email durante onboarding

- Aggiunto parametro sendEmail nella gestione dell'API onboarding-token
- Implementata corretta gestione del parametro customSubject
- Aggiunta flag emailSent nella risposta API
- Migliorata gestione degli errori e logging" || handle_error "Impossibile creare il commit"

# Push al repository
echo "Invio modifiche al repository remoto..."
git push origin fix-email-onboarding || handle_error "Impossibile inviare le modifiche. Verifica le credenziali e la connessione."

echo "==========================================="
echo "Fix completato e inviato con successo!"
echo "Branch: fix-email-onboarding"
echo "Ora puoi fare pull da questo branch sul server."
echo "==========================================="