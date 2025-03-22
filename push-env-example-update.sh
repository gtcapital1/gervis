#!/bin/bash
# Script per il push dell'aggiornamento di .env.example a GitHub

echo "Iniziando il push delle modifiche al file .env.example a GitHub..."

# Aggiungi il file .env.example
git add .env.example

# Crea il commit con un messaggio descrittivo
git commit -m "Aggiunta variabile FINANCIAL_API_KEY in .env.example per supportare le chiamate API finanziarie"

# Fai il push delle modifiche
git push

echo "Push completato con successo!"