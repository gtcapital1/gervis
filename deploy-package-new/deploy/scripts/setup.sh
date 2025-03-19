#!/bin/bash

# Script completo per la configurazione dell'ambiente Gervis
# Questo script scarica e esegue tutti gli altri script necessari per il setup

set -e  # Interrompi lo script in caso di errore

echo "=== Setup completo ambiente Gervis ==="
echo "Questo script eseguirà tutte le fasi necessarie per configurare Gervis"

# Funzione per controllare se un comando esiste
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Controlla se Git è installato
if ! command_exists git; then
  echo "Git non è installato. Installazione in corso..."
  if command_exists apt-get; then
    sudo apt-get update
    sudo apt-get install -y git
  elif command_exists yum; then
    sudo yum install -y git
  else
    echo "Impossibile installare Git automaticamente. Installalo manualmente e riprova."
    exit 1
  fi
fi

# Controlla se curl è installato
if ! command_exists curl; then
  echo "curl non è installato. Installazione in corso..."
  if command_exists apt-get; then
    sudo apt-get update
    sudo apt-get install -y curl
  elif command_exists yum; then
    sudo yum install -y curl
  else
    echo "Impossibile installare curl automaticamente. Installalo manualmente e riprova."
    exit 1
  fi
fi

# Verifica l'ambiente
echo "Verifica dell'ambiente..."
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  OS=$NAME
  echo "Sistema operativo rilevato: $OS"
else
  echo "Sistema operativo non riconosciuto."
  OS="Unknown"
fi

# Offri di eseguire lo script di setup AWS se appropriato
if [[ $OS == *"Amazon Linux"* ]] || [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
  echo "Ambiente compatibile con AWS rilevato."
  read -p "Vuoi eseguire lo script di setup per AWS? (s/n): " setup_aws
  if [[ $setup_aws == "s" ]] || [[ $setup_aws == "S" ]]; then
    echo "Scaricamento dello script di setup AWS..."
    curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/deploy/scripts/setup-aws.sh
    chmod +x setup-aws.sh
    
    echo "Esecuzione dello script di setup AWS..."
    sudo ./setup-aws.sh
  fi
fi

# Scarica e prepara lo script per creare la cartella shared
echo "Scaricamento dello script per la configurazione dello schema..."
curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/setup-shared-schema.sh
chmod +x setup-shared-schema.sh

# Scarica e prepara lo script per creare il file .env
echo "Scaricamento dello script per la configurazione del file .env..."
curl -O https://raw.githubusercontent.com/gtcapital1/gervis/main/create-env-file.sh
chmod +x create-env-file.sh

# Crea la struttura di base se non esiste
mkdir -p shared

# Esegui lo script per configurare lo schema
echo "Configurazione dello schema..."
./setup-shared-schema.sh

# Crea drizzle.config.json se non esiste
if [ ! -f drizzle.config.json ]; then
  echo "Creazione del file drizzle.config.json..."
  cat > drizzle.config.json << EOF
{
  "out": "./migrations",
  "schema": "shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "\${DATABASE_URL}"
  }
}
EOF
fi

# Chiedi all'utente se vuole configurare il file .env
read -p "Vuoi configurare il file .env? (s/n): " setup_env
if [[ $setup_env == "s" ]] || [[ $setup_env == "S" ]]; then
  echo "Esecuzione dello script per configurare il file .env..."
  ./create-env-file.sh
fi

echo "=== Setup completato con successo! ==="
echo ""
echo "Dovresti ora avere:"
echo "- La cartella shared con lo schema"
echo "- Il file drizzle.config.json configurato"
if [[ $setup_env == "s" ]] || [[ $setup_env == "S" ]]; then
  echo "- Il file .env configurato"
else
  echo "- Esegui ./create-env-file.sh per configurare il file .env"
fi
echo ""
echo "Prossimi passi:"
echo "1. Installa le dipendenze con 'npm ci'"
echo "2. Costruisci l'applicazione con 'npm run build'"
echo "3. Applica lo schema al database con 'npm run db:push'"
echo "4. Avvia l'applicazione con 'npm start' o 'pm2 start'"