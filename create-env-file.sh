#!/bin/bash
# Script per generare automaticamente il file .env durante il deployment

# Controlla se è già presente un file .env
if [ -f .env ]; then
  echo "AVVISO: File .env già esistente. Rinominando il file esistente in .env.backup..."
  mv .env .env.backup
fi

# Controlla se sono presenti variabili d'ambiente necessarie
echo "Verifica variabili d'ambiente necessarie..."

# Lista delle variabili necessarie
REQUIRED_VARS=(
  "DATABASE_URL"
  "BASE_URL"
  "SMTP_USER"
  "SMTP_PASS"
  "SESSION_SECRET"
)

# Flag per tenere traccia se tutte le variabili sono presenti
ALL_VARS_PRESENT=true

# Controlla ogni variabile
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "ERRORE: Variabile d'ambiente $VAR non impostata"
    ALL_VARS_PRESENT=false
  else
    echo "✅ Variabile $VAR presente"
  fi
done

# Se mancano variabili, esci con errore
if [ "$ALL_VARS_PRESENT" = false ]; then
  echo "ERRORE: Mancano alcune variabili d'ambiente necessarie. Assicurati di impostarle prima di eseguire nuovamente lo script."
  exit 1
fi

# Crea il file .env con le variabili necessarie
echo "Creazione file .env..."

cat > .env << EOF
# File .env generato automaticamente da create-env-file.sh
# Data: $(date)

# Database
DATABASE_URL="${DATABASE_URL}"

# Application
BASE_URL="${BASE_URL}"
PORT=5000
HOST="0.0.0.0"
NODE_ENV="production"

# Email (SMTP)
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="${SMTP_USER}"

# Session
SESSION_SECRET="${SESSION_SECRET}"

# Other
EOF

echo "File .env creato con successo!"
echo "Contenuto del file .env:"
grep -v "SMTP_PASS\|SESSION_SECRET" .env | cat -n

# Imposta i permessi corretti
chmod 600 .env
echo "Permessi file impostati a 600 (lettura/scrittura solo per il proprietario)"

exit 0