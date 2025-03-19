#!/bin/bash

# Script per creare il file .env di produzione per Gervis
# Da eseguire quando la cartella deploy non esiste o manca il file .env.production

echo "Creazione del file .env di produzione..."

# Chiedi all'utente di inserire i valori necessari o usa valori predefiniti
read -p "Inserisci l'URL del database PostgreSQL [postgresql://gervisuser:password@localhost:5432/gervis]: " db_url
db_url=${db_url:-postgresql://gervisuser:password@localhost:5432/gervis}

read -p "Inserisci la porta del server [3000]: " port
port=${port:-3000}

read -p "Inserisci il BASE_URL (es. https://tuo-dominio.com): " base_url
base_url=${base_url:-https://tuodominio.com}

read -p "Inserisci un SECRET per le sessioni (stringa casuale lunga): " session_secret
session_secret=${session_secret:-$(openssl rand -hex 32)}

# Impostazioni email
read -p "Inserisci l'host SMTP [smtp.example.com]: " smtp_host
smtp_host=${smtp_host:-smtp.example.com}

read -p "Inserisci la porta SMTP [587]: " smtp_port
smtp_port=${smtp_port:-587}

read -p "Inserisci l'utente SMTP: " smtp_user
read -p "Inserisci la password SMTP: " smtp_pass

read -p "Inserisci l'indirizzo mittente [no-reply@tuodominio.com]: " smtp_from
smtp_from=${smtp_from:-no-reply@tuodominio.com}

# Crea il file .env
cat > .env << EOF
# Configurazione del database
DATABASE_URL=${db_url}

# Configurazione del server
NODE_ENV=production
PORT=${port}
BASE_URL=${base_url}
SESSION_SECRET=${session_secret}

# Configurazione email
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
SMTP_FROM=${smtp_from}
EOF

echo "File .env creato con successo!"
echo "Puoi modificarlo manualmente con 'nano .env' se necessario."