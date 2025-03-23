#!/bin/bash
# Script per fare il push delle modifiche relative alla rimozione di Spark e all'aumento del limite delle notizie

echo "Iniziando il push delle modifiche a GitHub..."

# Aggiungi i file modificati
git add client/src/pages/ClientDetail.tsx
git add server/market-api.ts

# Crea il commit con un messaggio descrittivo
git commit -m "Miglioramenti UX: rimosso tab Spark dalla pagina cliente e aumentato limite notizie a 100

- Rimosso il tab Spark dalla pagina dettaglio cliente per semplificare l'interfaccia
- Aumentato il limite di notizie finanziarie da 10 a 100 nell'API
- Migliorato l'accesso alla sezione di analisi Sigmund"

# Fai il push delle modifiche
git push

echo "Push completato con successo!"