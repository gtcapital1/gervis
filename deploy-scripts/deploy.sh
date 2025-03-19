#!/bin/bash

# Script di deployment per Gervis Financial
# Questo script deve essere eseguito sul server di produzione

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variabili
APP_DIR="/var/www/gervis"
TEMP_DIR="/tmp/gervis-deploy"
GIT_REPO="https://github.com/gervisdigital/gervis.git"
BRANCH="main"

echo -e "${GREEN}=== Iniziando il processo di deployment di Gervis ===${NC}"

# Crea la directory dell'applicazione se non esiste
if [ ! -d "$APP_DIR" ]; then
  echo "Creazione directory $APP_DIR..."
  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR
fi

# Pulisci eventuali residui di deployment precedenti
if [ -d "$TEMP_DIR" ]; then
  echo "Rimozione directory temporanea precedente..."
  rm -rf $TEMP_DIR
fi

# Clona il repository
echo "Clonazione del repository da GitHub..."
git clone -b $BRANCH $GIT_REPO $TEMP_DIR

if [ $? -ne 0 ]; then
  echo -e "${RED}Errore durante il clone del repository. Verificare le credenziali e la connessione.${NC}"
  exit 1
fi

# Entra nella directory del repository
cd $TEMP_DIR

# Installa le dipendenze
echo "Installazione delle dipendenze Node.js..."
npm install

if [ $? -ne 0 ]; then
  echo -e "${RED}Errore durante l'installazione delle dipendenze Node.js.${NC}"
  exit 1
fi

# Esegui la build dell'applicazione
echo "Build dell'applicazione..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Errore durante la build dell'applicazione.${NC}"
  exit 1
fi

# Backup dei dati importanti dal deployment corrente
if [ -f "$APP_DIR/.env" ]; then
  echo "Backup del file .env esistente..."
  cp $APP_DIR/.env $TEMP_DIR/.env.backup
fi

# Ferma l'applicazione in esecuzione
echo "Arresto dell'applicazione in esecuzione..."
sudo pm2 stop gervis || true

# Copia i file nel percorso di destinazione
echo "Copia dei file nel percorso di destinazione..."
sudo rsync -av --delete --exclude='.env' --exclude='node_modules' $TEMP_DIR/ $APP_DIR/

# Ripristina i file di configurazione
if [ -f "$TEMP_DIR/.env.backup" ]; then
  echo "Ripristino del file .env..."
  cp $TEMP_DIR/.env.backup $APP_DIR/.env
fi

# Assicurati che fix-public-path.sh sia eseguibile
if [ -f "$APP_DIR/fix-public-path.sh" ]; then
  echo "Rendendo fix-public-path.sh eseguibile..."
  sudo chmod +x $APP_DIR/fix-public-path.sh
  cd $APP_DIR
  ./fix-public-path.sh
fi

# Aggiorna le dipendenze sul server
echo "Aggiornamento delle dipendenze Node.js sul server..."
cd $APP_DIR
npm install --production

# Esegui migrazione del database se necessario
if [ -f "$APP_DIR/run-db-push.sh" ]; then
  echo "Esecuzione della migrazione del database..."
  sudo chmod +x $APP_DIR/run-db-push.sh
  ./run-db-push.sh
fi

# Riavvia l'applicazione
echo "Riavvio dell'applicazione..."
sudo pm2 start ecosystem.config.cjs

# Verifica lo stato dell'applicazione
echo "Verifica dello stato dell'applicazione..."
sudo pm2 status gervis

# Pulizia
echo "Pulizia dei file temporanei..."
rm -rf $TEMP_DIR

echo -e "${GREEN}=== Deployment completato con successo! ===${NC}"

# Aggiungi verifica del server
echo "Verifica del server in esecuzione..."
curl -I http://localhost:5000

echo -e "${GREEN}=== Fine del processo di deployment ===${NC}"