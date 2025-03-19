#!/bin/bash

# Script di configurazione completa per Gervis su AWS/VPS
# Questo script configurerà automaticamente l'intero ambiente per l'applicazione Gervis

# Definizione costanti
DOMAIN="gervis.it"
DB_PASSWORD="Oliver1"
SESSION_SECRET=$(openssl rand -hex 32)
EMAIL_PASSWORD="email_password_placeholder"

# Directory dell'applicazione
APP_DIR="/var/www/gervis"

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

# Funzione per verificare se un comando è disponibile
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "Il comando '$1' non è installato. Installalo con 'sudo apt-get install $1'"
    return 1
  fi
  return 0
}

# Banner di avvio
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║      CONFIGURAZIONE AUTOMATICA GERVIS          ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "Questo script configurerà automaticamente:"
echo "  - Nginx con il dominio $DOMAIN"
echo "  - PostgreSQL e il database gervis"
echo "  - PM2 per l'avvio automatico dell'applicazione"
echo "  - Let's Encrypt per HTTPS (opzionale)"
echo ""
echo "ATTENZIONE: Questo script deve essere eseguito come sudo!"
echo ""

# Verifica che lo script sia eseguito come root
if [ "$EUID" -ne 0 ]; then
  print_error "Questo script deve essere eseguito come root (sudo)!"
  exit 1
fi

# Verifica che la directory dell'applicazione esista
if [ ! -d "$APP_DIR" ]; then
  print_error "La directory $APP_DIR non esiste!"
  read -p "Vuoi crearla? (s/n): " CREATE_DIR
  if [[ $CREATE_DIR == "s" || $CREATE_DIR == "S" ]]; then
    mkdir -p $APP_DIR
    print_success "Directory $APP_DIR creata."
  else
    print_error "Impossibile continuare senza la directory dell'applicazione."
    exit 1
  fi
fi

# Verifica requisiti
print_status "Verifica dei requisiti..."
MISSING=0

check_command nginx || MISSING=$((MISSING+1))
check_command psql || MISSING=$((MISSING+1))
check_command nodejs || MISSING=$((MISSING+1))
check_command npm || MISSING=$((MISSING+1))

if [ $MISSING -gt 0 ]; then
  print_warning "Mancano $MISSING comandi necessari. Vuoi installarli automaticamente?"
  read -p "Installa i requisiti mancanti? (s/n): " INSTALL_DEPS
  if [[ $INSTALL_DEPS == "s" || $INSTALL_DEPS == "S" ]]; then
    print_status "Aggiornamento dei repository..."
    apt-get update

    # Installa Nginx se mancante
    if ! command -v nginx &> /dev/null; then
      print_status "Installazione di Nginx..."
      apt-get install -y nginx
    fi

    # Installa PostgreSQL se mancante
    if ! command -v psql &> /dev/null; then
      print_status "Installazione di PostgreSQL..."
      apt-get install -y postgresql postgresql-contrib
    fi

    # Installa Node.js se mancante
    if ! command -v nodejs &> /dev/null; then
      print_status "Installazione di Node.js..."
      curl -sL https://deb.nodesource.com/setup_18.x | bash -
      apt-get install -y nodejs
    fi

    # Installa PM2 globalmente
    print_status "Installazione di PM2..."
    npm install -g pm2
  else
    print_error "Impossibile continuare senza i requisiti necessari."
    exit 1
  fi
fi

print_success "Tutti i requisiti sono soddisfatti!"

# Configurazione PostgreSQL
print_status "Configurazione del database PostgreSQL..."

# Verifica se il database gervis esiste già
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw gervis; then
  print_warning "Il database 'gervis' esiste già."
else
  print_status "Creazione del database 'gervis'..."
  sudo -u postgres psql -c "CREATE DATABASE gervis;"
  print_status "Creazione dell'utente 'gervis'..."
  sudo -u postgres psql -c "CREATE USER gervis WITH PASSWORD '$DB_PASSWORD';"
  print_status "Assegnazione dei privilegi..."
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;"
  print_success "Database configurato con successo!"
fi

# Configurazione del file .env
print_status "Creazione del file .env..."

# Crea il file .env nella directory dell'applicazione
cat > $APP_DIR/.env << EOF
# Configurazione ambiente Gervis
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://gervis:$DB_PASSWORD@localhost:5432/gervis

# Sessione
SESSION_SECRET=$SESSION_SECRET

# Email (modifica le impostazioni per il tuo server SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@$DOMAIN
EMAIL_PASSWORD=$EMAIL_PASSWORD
EMAIL_FROM="Gervis <noreply@$DOMAIN>"

# URL di base per i link nelle email
BASE_URL=https://$DOMAIN
EOF

print_success "File .env creato con successo!"

# Configurazione di Nginx
print_status "Configurazione di Nginx per il dominio $DOMAIN..."

# Crea il file di configurazione Nginx
cat > /etc/nginx/sites-available/gervis << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/dist/client;

    # Logging
    access_log /var/log/nginx/gervis.access.log;
    error_log /var/log/nginx/gervis.error.log;

    # Gzip
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types application/javascript application/json application/xml text/css text/plain text/xml;

    # Gestione dei file statici
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Proxy verso l'applicazione Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Abilita il sito creando un symlink
if [ ! -L /etc/nginx/sites-enabled/gervis ]; then
  ln -s /etc/nginx/sites-available/gervis /etc/nginx/sites-enabled/
  print_status "Sito abilitato in Nginx."
fi

# Rimuovi il default site se esiste
if [ -L /etc/nginx/sites-enabled/default ]; then
  rm /etc/nginx/sites-enabled/default
  print_status "Sito default rimosso da Nginx."
fi

# Verifica la configurazione di Nginx
nginx -t
if [ $? -eq 0 ]; then
  # Riavvia Nginx per applicare le modifiche
  systemctl restart nginx
  print_success "Nginx configurato con successo!"
else
  print_error "Errore nella configurazione di Nginx!"
fi

# Configurazione di PM2
print_status "Configurazione di PM2..."

# Crea il file ecosystem.config.cjs
cat > $APP_DIR/ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'gervis',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

print_success "File ecosystem.config.cjs creato con successo!"

# Configura drizzle.config.json
print_status "Configurazione di Drizzle..."

cat > $APP_DIR/drizzle.config.json << EOF
{
  "out": "./drizzle",
  "schema": "./shared/schema.ts",
  "driver": "pg",
  "dbCredentials": {
    "connectionString": "postgresql://gervis:$DB_PASSWORD@localhost:5432/gervis"
  }
}
EOF

print_success "File drizzle.config.json creato con successo!"

# Avvio dell'applicazione con PM2
print_status "Avvio dell'applicazione con PM2..."

cd $APP_DIR

# Verifica se ci sono node_modules, altrimenti esegui npm install
if [ ! -d "$APP_DIR/node_modules" ]; then
  print_status "Installazione delle dipendenze..."
  npm ci
fi

# Esegui la build dell'applicazione
print_status "Build dell'applicazione..."
npm run build

# Avvia l'applicazione con PM2
pm2 start ecosystem.config.cjs

# Configura PM2 per avviarsi al boot
print_status "Configurazione di PM2 per l'avvio automatico..."
pm2 startup
pm2 save

print_success "Applicazione avviata con PM2 e configurata per l'avvio automatico!"

# Configurazione HTTPS con Let's Encrypt (opzionale)
print_status "Vuoi configurare HTTPS con Let's Encrypt?"
read -p "Configura HTTPS? (s/n): " SETUP_HTTPS

if [[ $SETUP_HTTPS == "s" || $SETUP_HTTPS == "S" ]]; then
  # Verifica se certbot è installato
  if ! command -v certbot &> /dev/null; then
    print_status "Installazione di Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
  fi

  # Richiedi il certificato
  print_status "Richiesta del certificato SSL per $DOMAIN..."
  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
  
  if [ $? -eq 0 ]; then
    print_success "HTTPS configurato con successo!"
  else
    print_error "Errore nella configurazione di HTTPS!"
  fi
fi

# Riepilogo finale
echo ""
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║         CONFIGURAZIONE COMPLETATA!             ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "L'applicazione Gervis è stata configurata con successo!"
echo ""
echo "Dettagli configurazione:"
echo "  - Dominio: $DOMAIN"
echo "  - Database: postgresql://gervis:******@localhost:5432/gervis"
echo "  - Applicazione in esecuzione con PM2"
echo "  - Nginx configurato per il routing"
if [[ $SETUP_HTTPS == "s" || $SETUP_HTTPS == "S" ]]; then
  echo "  - HTTPS configurato con Let's Encrypt"
fi
echo ""
echo "Per verificare lo stato dell'applicazione, esegui:"
echo "  pm2 status"
echo ""
echo "Per visualizzare i log dell'applicazione:"
echo "  pm2 logs gervis"
echo ""
echo "Per accedere all'applicazione, visita:"
if [[ $SETUP_HTTPS == "s" || $SETUP_HTTPS == "S" ]]; then
  echo "  https://$DOMAIN"
else
  echo "  http://$DOMAIN"
fi
echo ""
echo "Grazie per aver scelto Gervis!"