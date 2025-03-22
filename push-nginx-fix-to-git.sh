#!/bin/bash
# Script per il push automatico dello script di correzione gateway Nginx

echo "===== PREPARAZIONE PUSH CORREZIONE NGINX GATEWAY ====="
echo ""

# Verifica lo stato attuale
echo "Stato corrente dei file modificati:"
git status -s
echo ""

# Aggiunta dei file
echo "Aggiunta dello script di correzione Nginx gateway..."
git add fix-nginx-node-gateway.sh

# Verifica cosa è stato aggiunto
echo ""
echo "File aggiunti per il commit:"
git status -s
echo ""

# Creazione del commit
echo "Creazione commit con script correzione Nginx gateway..."
git commit -m "Aggiunto script risoluzione 502 Bad Gateway

- Creato script diagnostico per errore 502 Bad Gateway tra Nginx e Node.js
- Implementata configurazione ottimizzata per Nginx con aumento timeout e buffer
- Aggiunta verifica proxy_pass e configurazione trust proxy
- Migliorata compatibilità tra Nginx e applicazione Node.js"

# Push al repository
echo ""
echo "Esecuzione push dello script di correzione..."
git push origin main

echo ""
echo "===== COMPLETATO ====="
echo "Lo script di correzione Nginx è stato inviato al repository."
echo "Esegui questo script sul server AWS per risolvere l'errore 502 Bad Gateway."