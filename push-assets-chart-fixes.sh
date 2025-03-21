#!/bin/bash
echo "Caricamento modifiche su Git..."

# Add, commit e push delle modifiche
git add client/src/pages/ClientDetail.tsx
git commit -m "Miglioramenti UI: box asset sfondo nero e fix visualizzazione radar chart"
git push origin main

echo "Push completato!"