#!/bin/bash

# Script di setup completo per Gervis
# Questo script clona il repository, esegue la build e configura il server
# Eseguire come root o con sudo

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

# Configurazioni
GITHUB_REPO="https://github.com/gtcapital1/gervis.git"
DOMAIN="gervis.it"
APP_DIR="/var/www/gervis"
DB_PASSWORD="Oliver1"
SESSION_SECRET=$(openssl rand -hex 32)

# Banner di avvio
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║      SETUP COMPLETO GERVIS DA ZERO             ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# 1. Installa le dipendenze di sistema
print_status "Installazione dipendenze di sistema..."
if grep -q "Amazon Linux" /etc/os-release; then
  # Amazon Linux
  print_status "Sistema rilevato: Amazon Linux"
  amazon-linux-extras install epel -y
  yum update -y
  yum install -y git curl nginx postgresql-server postgresql-contrib
  
  # Installa Node.js
  curl -sL https://rpm.nodesource.com/setup_18.x | bash -
  yum install -y nodejs
elif [ -f /etc/redhat-release ]; then
  # CentOS/RHEL
  print_status "Sistema rilevato: Red Hat / CentOS"
  yum install -y epel-release
  yum update -y
  yum install -y git curl nginx postgresql-server postgresql-contrib
  
  # Installa Node.js
  curl -sL https://rpm.nodesource.com/setup_18.x | bash -
  yum install -y nodejs
else
  # Debian/Ubuntu
  print_status "Sistema rilevato: Debian/Ubuntu"
  apt-get update
  apt-get install -y git curl nginx postgresql postgresql-contrib
  
  # Installa Node.js
  curl -sL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# Installa PM2 globalmente
print_status "Installazione di PM2..."
npm install -g pm2

# 2. Configura PostgreSQL
print_status "Configurazione di PostgreSQL..."
if [ -f /etc/redhat-release ] || grep -q "Amazon Linux" /etc/os-release; then
  # Inizializzazione database (solo per RHEL/CentOS/Amazon Linux)
  if [ ! -d "/var/lib/pgsql/data" ] || [ -z "$(ls -A /var/lib/pgsql/data)" ]; then
    postgresql-setup initdb || service postgresql initdb
  fi
  
  # Configurazione pg_hba.conf
  PG_HBA_CONF=$(find /var -name pg_hba.conf | head -n 1)
  if [ -n "$PG_HBA_CONF" ]; then
    print_status "Configurazione autenticazione PostgreSQL..."
    cp "$PG_HBA_CONF" "${PG_HBA_CONF}.bak"
    sed -i 's/ident/md5/g' "$PG_HBA_CONF"
    sed -i 's/peer/md5/g' "$PG_HBA_CONF"
  fi
  
  # Avvio e abilitazione servizio
  systemctl start postgresql || service postgresql start
  systemctl enable postgresql || chkconfig postgresql on
fi

# Attendi che il servizio sia pronto
print_status "Attesa avvio servizio PostgreSQL..."
sleep 5

# Creazione database e utente
print_status "Creazione database e utente..."
if [ -f /etc/redhat-release ] || grep -q "Amazon Linux" /etc/os-release; then
  # RHEL/CentOS/Amazon Linux usa un utente postgres diverso
  sudo -u postgres psql -c "CREATE DATABASE gervis;" || true
  sudo -u postgres psql -c "CREATE USER gervis WITH PASSWORD '$DB_PASSWORD';" || true
  sudo -u postgres psql -c "ALTER USER gervis WITH PASSWORD '$DB_PASSWORD';" || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;" || true
else
  # Debian/Ubuntu
  su -c "psql -c \"CREATE DATABASE gervis;\"" postgres || true
  su -c "psql -c \"CREATE USER gervis WITH PASSWORD '$DB_PASSWORD';\"" postgres || true
  su -c "psql -c \"ALTER USER gervis WITH PASSWORD '$DB_PASSWORD';\"" postgres || true
  su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;\"" postgres || true
fi

# 3. Clona il repository
print_status "Eliminazione della directory esistente se presente..."
rm -rf "$APP_DIR"
print_status "Clonazione del repository Git..."
git clone "$GITHUB_REPO" "$APP_DIR"
cd "$APP_DIR"

# 4. Configura le variabili d'ambiente
print_status "Creazione del file .env..."
cat > "$APP_DIR/.env" << EOF
# Configurazione ambiente Gervis
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://gervis:$DB_PASSWORD@localhost:5432/gervis

# Sessione
SESSION_SECRET=$SESSION_SECRET

# Email (modifica le impostazioni per il tuo server SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@$DOMAIN
EMAIL_PASSWORD=email_password_placeholder
EMAIL_FROM="Gervis <noreply@$DOMAIN>"

# URL di base per i link nelle email
BASE_URL=https://$DOMAIN
EOF

# 5. Installa le dipendenze e esegui la build
print_status "Installazione dipendenze npm..."
cd "$APP_DIR"
npm ci || npm install

print_status "Esecuzione build..."
npm run build

# 6. Configura PM2
print_status "Configurazione di PM2..."
cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [{
    name: 'gervis',
    script: 'tsx',
    args: 'server/index.ts',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# 7. Configura Nginx
print_status "Configurazione di Nginx..."
if grep -q "Amazon Linux" /etc/os-release || [ -f /etc/redhat-release ]; then
  # Amazon Linux / RHEL / CentOS
  NGINX_CONFIG_PATH="/etc/nginx/conf.d/gervis.conf"
else
  # Debian / Ubuntu
  NGINX_CONFIG_PATH="/etc/nginx/sites-available/gervis"
fi

cat > "$NGINX_CONFIG_PATH" << EOF
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
        proxy_pass http://localhost:5000;
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

# Abilita il sito (solo per Debian/Ubuntu)
if [ ! -f /etc/redhat-release ] && ! grep -q "Amazon Linux" /etc/os-release; then
  if [ ! -L /etc/nginx/sites-enabled/gervis ]; then
    ln -s /etc/nginx/sites-available/gervis /etc/nginx/sites-enabled/
  fi
  
  # Rimuovi default site
  if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
  fi
fi

# Verifica la configurazione di Nginx
nginx -t
if [ $? -eq 0 ]; then
  systemctl restart nginx || service nginx restart
  systemctl enable nginx || chkconfig nginx on
  print_success "Nginx configurato con successo!"
else
  print_error "Errore nella configurazione di Nginx!"
fi

# 8. Avvia l'applicazione con PM2
print_status "Avvio dell'applicazione con PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 9. Configura HTTPS con Let's Encrypt (opzionale)
print_status "Installazione Certbot per HTTPS..."
if grep -q "Amazon Linux" /etc/os-release; then
  # Amazon Linux
  amazon-linux-extras install epel -y
  yum install -y certbot python2-certbot-nginx || yum install -y certbot python-certbot-nginx
elif [ -f /etc/redhat-release ]; then
  # RHEL/CentOS
  yum install -y certbot python2-certbot-nginx || yum install -y certbot python-certbot-nginx
else
  # Debian/Ubuntu
  apt-get install -y certbot python3-certbot-nginx
fi

print_status "Configurazione HTTPS..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || true

# 10. Riepilogo finale
echo ""
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║         SETUP COMPLETATO!                      ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "L'applicazione Gervis è stata configurata da zero con successo!"
echo ""
echo "Dettagli configurazione:"
echo "  - Applicazione: $APP_DIR"
echo "  - Database: postgresql://gervis:******@localhost:5432/gervis"
echo "  - Applicazione in esecuzione con PM2"
echo "  - Nginx configurato per il dominio $DOMAIN"
echo ""
echo "Per verificare lo stato dell'applicazione, esegui:"
echo "  pm2 status"
echo ""
echo "Per visualizzare i log dell'applicazione:"
echo "  pm2 logs gervis"
echo ""

# Verifica se l'applicazione è in esecuzione
if curl -s http://localhost:5000 > /dev/null; then
  print_success "L'applicazione è in esecuzione correttamente!"
else
  print_warning "L'applicazione potrebbe non essere in esecuzione. Verifica i log con 'pm2 logs gervis'"
fi

echo ""
echo "Il sito dovrebbe essere ora accessibile all'indirizzo:"
echo "  https://$DOMAIN"
echo ""
echo "Grazie per aver scelto Gervis!"