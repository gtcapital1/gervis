#!/bin/bash
# Script per eseguire correzioni sul database PostgreSQL
# Questo script è progettato per essere eseguito sia localmente che su AWS

# Verifica dei permessi e configurazione iniziale
CONFIG_DIR="./deploy-scripts"
echo "Esecuzione script di correzione database..."

# Se la directory deploy-scripts esiste, esegui gli script di correzione
if [ -d "$CONFIG_DIR" ]; then
    echo "Directory deploy-scripts trovata."
    
    # Esecuzione dello script fix-cascade-delete.sh se presente
    if [ -f "$CONFIG_DIR/fix-cascade-delete.sh" ]; then
        echo "Esecuzione fix-cascade-delete.sh..."
        bash "$CONFIG_DIR/fix-cascade-delete.sh"
    else
        echo "ATTENZIONE: Script fix-cascade-delete.sh non trovato."
    fi
    
    # Aggiunta di altri script di correzione in futuro qui
else
    echo "ERRORE: Directory deploy-scripts non trovata."
    exit 1
fi

echo "Operazioni di correzione database completate."