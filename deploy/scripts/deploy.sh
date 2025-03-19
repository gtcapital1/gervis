#!/bin/bash

# Script per eseguire il deployment del pacchetto Gervis su un server remoto
# Questo script trasferisce il pacchetto e configura l'ambiente di produzione

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi di stato
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Funzione per stampare messaggi di successo
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Funzione per stampare messaggi di errore
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Funzione per stampare messaggi di avvertimento
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner di avvio
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║         DEPLOYMENT GERVIS SU SERVER            ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# Verifica esistenza del pacchetto
DEPLOY_PACKAGE="gervis-deploy.tar.gz"
if [ ! -f "$DEPLOY_PACKAGE" ]; then
  print_error "Pacchetto di deployment non trovato: $DEPLOY_PACKAGE"
  print_warning "Esegui prima lo script prepare-for-deploy.sh"
  exit 1
fi

# Chiedi le informazioni per la connessione
print_status "Inserisci le informazioni per la connessione al server:"
read -p "Indirizzo IP o nome host [13.38.161.27]: " SERVER_HOST
SERVER_HOST=${SERVER_HOST:-"13.38.161.27"}

read -p "Nome utente SSH [ec2-user]: " SSH_USER
SSH_USER=${SSH_USER:-"ec2-user"}

read -p "Porta SSH [22]: " SSH_PORT
SSH_PORT=${SSH_PORT:-"22"}

read -p "Percorso della chiave SSH (lascia vuoto per usare l'autenticazione predefinita): " SSH_KEY
SSH_OPTIONS=""
if [ ! -z "$SSH_KEY" ]; then
  if [ ! -f "$SSH_KEY" ]; then
    print_error "File della chiave SSH non trovato: $SSH_KEY"
    exit 1
  fi
  SSH_OPTIONS="-i $SSH_KEY"
fi

# Directory di destinazione sul server
read -p "Directory di destinazione [/var/www/gervis]: " DEST_DIR
DEST_DIR=${DEST_DIR:-"/var/www/gervis"}

# Conferma prima di procedere
echo ""
print_status "Riepilogo delle informazioni:"
echo "  - Server: $SSH_USER@$SERVER_HOST:$SSH_PORT"
echo "  - Directory di destinazione: $DEST_DIR"
echo "  - Pacchetto: $DEPLOY_PACKAGE"
echo ""
read -p "Vuoi procedere con il deployment? (s/n): " CONFIRM
if [[ $CONFIRM != "s" && $CONFIRM != "S" ]]; then
  print_error "Deployment annullato."
  exit 1
fi

# Passo 1: Trasferisci il pacchetto
print_status "Trasferimento del pacchetto sul server..."
scp $SSH_OPTIONS -P $SSH_PORT $DEPLOY_PACKAGE $SSH_USER@$SERVER_HOST:/tmp/
if [ $? -ne 0 ]; then
  print_error "Errore durante il trasferimento del pacchetto."
  exit 1
fi
print_success "Pacchetto trasferito con successo."

# Passo 2: Esegui le operazioni sul server
print_status "Configurazione dell'ambiente sul server..."

# Crea un file di script temporaneo per le operazioni sul server
SCRIPT_FILE=$(mktemp)
cat > $SCRIPT_FILE << EOF
#!/bin/bash
set -e

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\${GREEN}[1/6]\${NC} Estrazione del pacchetto..."
cd /tmp
tar -xzf $DEPLOY_PACKAGE

echo -e "\${GREEN}[2/6]\${NC} Creazione directory di destinazione..."
sudo mkdir -p $DEST_DIR
sudo chown \$(whoami):\$(whoami) $DEST_DIR

echo -e "\${GREEN}[3/6]\${NC} Backup delle configurazioni esistenti..."
if [ -d "$DEST_DIR" ]; then
  # Backup del file .env se esiste
  if [ -f "$DEST_DIR/.env" ]; then
    cp $DEST_DIR/.env /tmp/env.backup
  fi
  
  # Backup di drizzle.config.json se esiste
  if [ -f "$DEST_DIR/drizzle.config.json" ]; then
    cp $DEST_DIR/drizzle.config.json /tmp/drizzle.config.json.backup
  fi
fi

echo -e "\${GREEN}[4/6]\${NC} Copia dei file..."
# Prima svuota la cartella di destinazione (preservando i backup)
sudo rm -rf $DEST_DIR/*

# Copia tutti i file dalla directory temporanea
cp -r /tmp/deploy-package/* $DEST_DIR/

# Ripristina i file di configurazione se esistono
if [ -f "/tmp/env.backup" ]; then
  cp /tmp/env.backup $DEST_DIR/.env
  echo "File .env ripristinato."
fi

if [ -f "/tmp/drizzle.config.json.backup" ]; then
  cp /tmp/drizzle.config.json.backup $DEST_DIR/drizzle.config.json
  echo "File drizzle.config.json ripristinato."
fi

echo -e "\${GREEN}[5/6]\${NC} Installazione delle dipendenze..."
cd $DEST_DIR
npm ci --production

echo -e "\${GREEN}[6/6]\${NC} Configurazione dell'ambiente di produzione..."
# Rendi eseguibili gli script
chmod +x $DEST_DIR/deploy/scripts/*.sh
chmod +x $DEST_DIR/create-env-file.sh 2>/dev/null || true
chmod +x $DEST_DIR/run-db-push.sh 2>/dev/null || true

# Se il file .env non esiste, crealo
if [ ! -f "$DEST_DIR/.env" ]; then
  cd $DEST_DIR
  ./create-env-file.sh
fi

# Avvia o riavvia l'applicazione con PM2
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "gervis"; then
    pm2 restart gervis
    echo "Applicazione riavviata con PM2."
  else
    cd $DEST_DIR
    pm2 start ecosystem.config.cjs || pm2 start dist/index.js --name gervis
    pm2 save
    echo "Applicazione avviata con PM2."
  fi
else
  echo "PM2 non è installato. Esegui il setup completo con:"
  echo "cd $DEST_DIR && sudo ./deploy/scripts/setup-aws.sh"
fi

echo -e "\${GREEN}Deployment completato con successo!\${NC}"
echo "Per completare la configurazione, esegui:"
echo "cd $DEST_DIR && sudo ./deploy/scripts/setup-aws.sh"

# Pulisci i file temporanei
rm -rf /tmp/deploy-package
rm -f /tmp/$DEPLOY_PACKAGE
rm -f /tmp/env.backup
rm -f /tmp/drizzle.config.json.backup

EOF

# Trasferisci ed esegui lo script sul server
chmod +x $SCRIPT_FILE
scp $SSH_OPTIONS -P $SSH_PORT $SCRIPT_FILE $SSH_USER@$SERVER_HOST:/tmp/deploy-gervis.sh
ssh $SSH_OPTIONS -p $SSH_PORT $SSH_USER@$SERVER_HOST "bash /tmp/deploy-gervis.sh"
if [ $? -ne 0 ]; then
  print_error "Errore durante la configurazione sul server."
  exit 1
fi

# Rimuovi lo script temporaneo
rm -f $SCRIPT_FILE

print_success "Deployment completato con successo!"
echo ""
echo "Per verificare lo stato dell'applicazione, esegui:"
echo "  ssh $SSH_USER@$SERVER_HOST -p $SSH_PORT"
echo "  cd $DEST_DIR"
echo "  ./deploy/scripts/check-app-status.sh"
echo ""
echo "Per configurare completamente l'ambiente (Nginx, HTTPS, etc.), esegui:"
echo "  ssh $SSH_USER@$SERVER_HOST -p $SSH_PORT"
echo "  cd $DEST_DIR"
echo "  sudo ./deploy/scripts/setup-aws.sh"
echo ""