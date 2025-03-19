#!/bin/bash

# Script per configurare Let's Encrypt con Certbot su Amazon Linux
# Esegui come sudo: sudo ./setup-certbot.sh

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
EMAIL="admin@${DOMAIN}"

print_status "Rilevazione del sistema operativo..."
if grep -q "Amazon Linux" /etc/os-release; then
  print_status "Sistema rilevato: Amazon Linux"
  
  # Installa EPEL repository (necessario per certbot)
  print_status "Installazione di EPEL repository..."
  amazon-linux-extras install epel -y || yum install -y epel-release
  
  # Installa Certbot e plugin per Nginx
  print_status "Installazione di Certbot..."
  yum install -y certbot python-certbot-nginx || yum install -y certbot python3-certbot-nginx
elif [ -f /etc/redhat-release ]; then
  print_status "Sistema rilevato: Red Hat / CentOS"
  
  # Installa EPEL repository (necessario per certbot)
  print_status "Installazione di EPEL repository..."
  yum install -y epel-release
  
  # Installa Certbot e plugin per Nginx
  print_status "Installazione di Certbot..."
  yum install -y certbot python-certbot-nginx || yum install -y certbot python3-certbot-nginx
else
  print_status "Sistema presumibilmente Debian/Ubuntu..."
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

# Verifica se Certbot è stato installato correttamente
if ! command -v certbot &> /dev/null; then
  print_error "Errore nell'installazione di Certbot. Provando con pip..."
  pip install certbot certbot-nginx || pip3 install certbot certbot-nginx
  
  if ! command -v certbot &> /dev/null; then
    print_error "Impossibile installare Certbot. Configurazione HTTPS fallita."
    exit 1
  fi
fi

# Ferma Nginx per evitare conflitti
print_status "Arresto temporaneo di Nginx..."
systemctl stop nginx || service nginx stop

# Richiedi il certificato in modalità standalone
print_status "Richiesta del certificato per ${DOMAIN}..."
certbot certonly --standalone --preferred-challenges http \
  --agree-tos --email "${EMAIL}" --non-interactive \
  -d "${DOMAIN}" -d "www.${DOMAIN}"

if [ $? -eq 0 ]; then
  print_success "Certificato ottenuto con successo!"
  
  # Verifica se il certificato è stato creato
  if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    print_status "Aggiornamento della configurazione Nginx per utilizzare HTTPS..."
    
    # Determina dove si trova il file di configurazione Nginx
    if [ -f "/etc/nginx/conf.d/gervis.conf" ]; then
      NGINX_CONFIG="/etc/nginx/conf.d/gervis.conf"
    elif [ -f "/etc/nginx/sites-available/gervis" ]; then
      NGINX_CONFIG="/etc/nginx/sites-available/gervis"
    else
      print_error "File di configurazione Nginx non trovato!"
      exit 1
    fi
    
    # Backup della configurazione esistente
    cp "${NGINX_CONFIG}" "${NGINX_CONFIG}.bak"
    
    # Crea una nuova configurazione con supporto HTTPS
    cat > "${NGINX_CONFIG}" << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Redirect to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};
    root /var/www/gervis/dist/client;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
    
    # Recommended SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
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

    # Configurazione rinnovo automatico
    print_status "Configurazione del rinnovo automatico del certificato..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl restart nginx || service nginx restart'") | crontab -
    
    # Avvia Nginx
    print_status "Avvio di Nginx..."
    systemctl start nginx || service nginx start
    
    print_success "HTTPS configurato con successo! Il sito è ora accessibile tramite https://${DOMAIN}"
  else
    print_error "Certificato ottenuto ma non trovato nella directory prevista."
    exit 1
  fi
else
  print_error "Errore nell'ottenimento del certificato."
  exit 1
fi