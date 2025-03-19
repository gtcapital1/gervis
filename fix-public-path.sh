#!/bin/bash

# Script per risolvere il problema del percorso della directory public
# Questo script crea un link simbolico dalla directory che il server si aspetta alla directory che viene effettivamente creata dalla build

set -e

# Colori per l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni per i messaggi
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Cartella di base del progetto
BASE_DIR=$(pwd)
print_status "Directory base: $BASE_DIR"

# Se siamo in una directory diversa da /var/www/gervis, chiedi conferma
if [ "$BASE_DIR" != "/var/www/gervis" ] && [ "$1" != "--force" ]; then
  print_warning "Non sei nella directory /var/www/gervis."
  print_warning "Sei sicuro di voler continuare? (y/n)"
  read -r CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    print_error "Operazione annullata."
    exit 1
  fi
fi

# 1. Esegui npm run build se dist/public non esiste
if [ ! -d "$BASE_DIR/dist/public" ]; then
  print_status "La directory dist/public non esiste. Esecuzione di npm run build..."
  npm run build
  
  if [ ! -d "$BASE_DIR/dist/public" ]; then
    print_error "Build fallita. La directory dist/public non è stata creata."
    exit 1
  else
    print_success "Build completata con successo."
  fi
else
  print_status "La directory dist/public esiste già."
fi

# 2. Crea collegamenti simbolici in diverse posizioni per supportare vari percorsi
declare -a DIRECTORIES=(
  "$BASE_DIR/server"
  "$BASE_DIR/dist/server"
)

# Verifica ed eventualmente crea tutte le directory necessarie
for DIR in "${DIRECTORIES[@]}"; do
  if [ ! -d "$DIR" ]; then
    print_status "Creazione directory $DIR..."
    mkdir -p "$DIR"
  fi
  
  # Crea collegamento simbolico alla directory public
  cd "$DIR" || exit
  
  # Se esiste già, rimuovi il link simbolico
  if [ -L "public" ]; then
    print_status "Rimozione del link simbolico esistente in $DIR/public..."
    rm public
  fi
  
  # Se c'è una directory, rinominala per sicurezza
  if [ -d "public" ]; then
    print_status "Backup della directory public esistente in $DIR..."
    mv public public.backup.$(date +%s)
  fi
  
  # Crea il collegamento simbolico
  print_status "Creazione del collegamento simbolico $DIR/public -> $BASE_DIR/dist/public..."
  ln -s "$BASE_DIR/dist/public" public
  
  print_success "Collegamento simbolico creato in $DIR/public"
done

# 3. Verifica tutti i percorsi
print_status "Controllo finale dei percorsi:"
for DIR in "${DIRECTORIES[@]}"; do
  if [ -L "$DIR/public" ]; then
    TARGET=$(readlink -f "$DIR/public")
    print_success "$DIR/public -> $TARGET"
  else
    print_error "$DIR/public non è un collegamento simbolico o non esiste!"
  fi
done

# 4. Verifica che i file necessari esistano
if [ -f "$BASE_DIR/dist/public/index.html" ]; then
  print_success "File index.html trovato in dist/public"
else
  print_warning "File index.html non trovato in dist/public!"
fi

print_success "============================================="
print_success "Fix dei path completato! Riavvia ora l'applicazione con:"
print_success "  sudo pm2 restart gervis"
print_success "============================================="