#!/bin/bash

# Script per preparare il pacchetto di deployment di Gervis
# Questo script esegue la build locale e prepara un pacchetto per il deployment

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
echo "║     PREPARAZIONE PACCHETTO DEPLOY GERVIS       ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# Verifica che lo script sia eseguito dalla directory del progetto
if [ ! -f "package.json" ]; then
  print_error "Questo script deve essere eseguito dalla directory principale del progetto!"
  print_warning "Esegui: cd /path/to/project && ./deploy/prepare-for-deploy.sh"
  exit 1
fi

# Variabili di configurazione
BUILD_DIR="dist"
TEMP_DIR="deploy-package"
DEPLOY_PACKAGE="gervis-deploy.tar.gz"
FULL_PACKAGE="gervis-complete.tar.gz"

# Chiedi conferma prima di iniziare
read -p "Questo script creerà un pacchetto per il deployment. Vuoi continuare? (s/n): " CONFIRM
if [[ $CONFIRM != "s" && $CONFIRM != "S" ]]; then
  print_error "Operazione annullata."
  exit 1
fi

# Passo 1: Pulisci le directory di build e il pacchetto precedente
print_status "Pulizia delle directory di build..."
rm -rf $BUILD_DIR
rm -rf $TEMP_DIR
rm -f $DEPLOY_PACKAGE
rm -f $FULL_PACKAGE

# Passo 2: Installa le dipendenze se necessario
if [ ! -d "node_modules" ]; then
  print_status "Installazione delle dipendenze..."
  npm ci
  if [ $? -ne 0 ]; then
    print_error "Errore durante l'installazione delle dipendenze."
    exit 1
  fi
  print_success "Dipendenze installate con successo."
else
  print_status "Le dipendenze sono già installate."
fi

# Passo 3: Esegui la build
print_status "Esecuzione della build..."
npm run build
if [ $? -ne 0 ]; then
  print_error "Errore durante la build del progetto."
  exit 1
fi
print_success "Build completata con successo."

# Passo 4: Prepara la directory per il pacchetto
print_status "Preparazione della directory per il pacchetto..."
mkdir -p $TEMP_DIR

# Copia i file necessari per il deployment
print_status "Copia dei file necessari..."
# Copia la directory di build
cp -r $BUILD_DIR $TEMP_DIR/

# Copia i file di configurazione e script
cp package.json $TEMP_DIR/
cp package-lock.json $TEMP_DIR/
cp -r deploy $TEMP_DIR/

# Copia i file necessari per le migrazioni del database
cp -r shared $TEMP_DIR/
cp -r server $TEMP_DIR/
cp drizzle.config.ts $TEMP_DIR/
cp drizzle.config.json $TEMP_DIR/ 2>/dev/null || :
cp create-env-file.sh $TEMP_DIR/
cp run-db-push.sh $TEMP_DIR/

# Copia altri file di configurazione
cp tsconfig.json $TEMP_DIR/
cp vite.config.ts $TEMP_DIR/
cp postcss.config.js $TEMP_DIR/
cp tailwind.config.ts $TEMP_DIR/
cp theme.json $TEMP_DIR/

# Crea anche un pacchetto completo con node_modules (opzionale, per backup)
print_status "Vuoi creare anche un pacchetto completo con node_modules?"
read -p "Creare pacchetto completo? (s/n) [n]: " CREATE_FULL
CREATE_FULL=${CREATE_FULL:-"n"}

if [[ $CREATE_FULL == "s" || $CREATE_FULL == "S" ]]; then
  print_status "Creazione del pacchetto completo..."
  tar -czf $FULL_PACKAGE --exclude='.git' --exclude='node_modules/.cache' .
  print_success "Pacchetto completo creato: $FULL_PACKAGE"
fi

# Passo 5: Crea il pacchetto di deployment
print_status "Creazione del pacchetto di deployment..."
tar -czf $DEPLOY_PACKAGE $TEMP_DIR
print_success "Pacchetto di deployment creato: $DEPLOY_PACKAGE"

# Passo 6: Pulisci la directory temporanea
print_status "Pulizia della directory temporanea..."
rm -rf $TEMP_DIR
print_success "Pulizia completata."

# Passo 7: Istruzioni finali
echo ""
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║           PACCHETTO CREATO CON SUCCESSO        ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "Il pacchetto di deployment è stato creato: $DEPLOY_PACKAGE"
if [[ $CREATE_FULL == "s" || $CREATE_FULL == "S" ]]; then
  echo "Il pacchetto completo è stato creato: $FULL_PACKAGE"
fi
echo ""
echo "Per trasferire il pacchetto sul server:"
echo "  scp $DEPLOY_PACKAGE utente@server:/tmp/"
echo ""
echo "Per estrarre e configurare il pacchetto sul server:"
echo "  ssh utente@server"
echo "  cd /tmp"
echo "  tar -xzf $DEPLOY_PACKAGE"
echo "  sudo mv deploy-package /var/www/gervis"
echo "  cd /var/www/gervis"
echo "  ./deploy/scripts/setup-aws.sh"
echo ""
echo "Ti suggeriamo di creare una copia dell'istruzione qui sopra"
echo "perché verrà usata nella fase successiva del deployment."
echo ""