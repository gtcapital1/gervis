#!/bin/bash
# Script per fare il push dei cambiamenti relativi a Spark e Sigmund a GitHub

echo "Iniziando il push delle modifiche a GitHub..."

# Aggiungi i file modificati
git add client/src/lib/i18n.ts

# Crea il commit con un messaggio descrittivo
git commit -m "Rinominato 'Portfolio Intelligence' in 'Spark' e modificato le descrizioni per evidenziare che Gervis (non l'IA) analizza i dati dei clienti"

# Fai il push delle modifiche
git push

echo "Push completato con successo!"