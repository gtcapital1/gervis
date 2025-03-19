#!/bin/bash

# Script per correggere la configurazione di Nginx su Amazon Linux
# Esegui come sudo: sudo ./fix-nginx.sh

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

DOMAIN="gervis.it"
APP_DIR="/var/www/gervis"

print_status "Rilevazione del sistema operativo..."
if grep -q "Amazon Linux" /etc/os-release; then
  print_status "Sistema rilevato: Amazon Linux"
  print_status "Installazione di Nginx..."
  amazon-linux-extras install nginx1 -y || yum install nginx -y
elif [ -f /etc/redhat-release ]; then
  print_status "Sistema rilevato: Red Hat / CentOS"
  print_status "Installazione di Nginx..."
  yum install nginx -y
else
  print_status "Sistema sconosciuto, tentativo di installazione con yum..."
  yum install nginx -y || amazon-linux-extras install nginx1 -y
fi

print_status "Creazione della configurazione Nginx..."

# Crea la directory conf.d se non esiste
if [ ! -d "/etc/nginx/conf.d" ]; then
  mkdir -p /etc/nginx/conf.d
fi

# Crea il file di configurazione
cat > /etc/nginx/conf.d/gervis.conf << EOF
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

print_status "Configurazione creata. Verifica sintassi..."
nginx -t

if [ $? -eq 0 ]; then
  print_status "Riavvio di Nginx..."
  systemctl restart nginx || service nginx restart
  print_success "Nginx configurato con successo!"
else
  print_error "Errore nella configurazione di Nginx!"
fi

print_status "Abilita Nginx all'avvio..."
systemctl enable nginx || chkconfig nginx on

print_success "Nginx è stato configurato per avviarsi automaticamente all'avvio!"
print_status "Verifica che l'applicazione sia raggiungibile all'indirizzo: http://$DOMAIN"