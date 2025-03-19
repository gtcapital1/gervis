#!/bin/bash

# Script per installare Node.js su Amazon Linux
# Esegui come sudo: sudo ./setup-nodejs.sh

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

NODE_VERSION="18"

print_status "Rilevazione del sistema operativo..."
if grep -q "Amazon Linux" /etc/os-release; then
  print_status "Sistema rilevato: Amazon Linux"
  print_status "Installazione di Node.js ${NODE_VERSION}..."
  
  # Rimuovi versioni vecchie di Node.js se esistono
  if yum list installed nodejs &>/dev/null; then
    print_status "Rimozione di versioni precedenti di Node.js..."
    yum remove -y nodejs npm
  fi
  
  # Installa Node.js tramite Amazon Linux Extras o tramite NodeSource
  if command -v amazon-linux-extras &>/dev/null; then
    amazon-linux-extras install nodejs${NODE_VERSION} -y
  else
    # Utilizziamo il repository NodeSource
    print_status "Configurazione del repository NodeSource..."
    curl -sL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
    print_status "Installazione di Node.js tramite yum..."
    yum install -y nodejs
  fi
elif [ -f /etc/redhat-release ]; then
  print_status "Sistema rilevato: Red Hat / CentOS"
  print_status "Installazione di Node.js ${NODE_VERSION}..."
  
  # Rimuovi versioni vecchie di Node.js se esistono
  if yum list installed nodejs &>/dev/null; then
    print_status "Rimozione di versioni precedenti di Node.js..."
    yum remove -y nodejs npm
  fi
  
  # Installa Node.js tramite NodeSource
  print_status "Configurazione del repository NodeSource..."
  curl -sL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
  print_status "Installazione di Node.js tramite yum..."
  yum install -y nodejs
else
  print_status "Sistema sconosciuto, tentativo di installazione con yum..."
  print_status "Configurazione del repository NodeSource..."
  curl -sL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
  print_status "Installazione di Node.js tramite yum..."
  yum install -y nodejs
fi

# Verifica l'installazione
if command -v node &>/dev/null; then
  NODE_INSTALLED_VERSION=$(node -v)
  print_success "Node.js ${NODE_INSTALLED_VERSION} installato con successo!"
else
  print_error "Errore nell'installazione di Node.js!"
  exit 1
fi

# Installa pm2 globalmente
print_status "Installazione di PM2 globalmente..."
npm install -g pm2

if command -v pm2 &>/dev/null; then
  PM2_VERSION=$(pm2 -v)
  print_success "PM2 versione ${PM2_VERSION} installato con successo!"
else
  print_error "Errore nell'installazione di PM2!"
  exit 1
fi

print_success "Node.js e PM2 configurati con successo!"