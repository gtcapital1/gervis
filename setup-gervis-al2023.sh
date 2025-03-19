#!/bin/bash

# Script di setup completo per Gervis su Amazon Linux 2023
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
echo "║      SETUP GERVIS - AMAZON LINUX 2023          ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# 1. Installa le dipendenze di sistema
print_status "Installazione dipendenze di sistema..."
sudo dnf update -y
sudo dnf install -y git curl nginx

# Installa Node.js 18
print_status "Installazione Node.js 18..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Installa PM2 globalmente
print_status "Installazione di PM2..."
sudo npm install -g pm2

# 2. Configura PostgreSQL 15
print_status "Configurazione di PostgreSQL 15..."
# Installa PostgreSQL 15
sudo dnf install -y postgresql15 postgresql15-server postgresql15-contrib

# Inizializza il database
sudo postgresql-setup --initdb --unit postgresql-15

# Modifica pg_hba.conf per permettere autenticazione password
PG_HBA_CONF="/var/lib/pgsql/15/data/pg_hba.conf"
if [ -f "$PG_HBA_CONF" ]; then
  print_status "Configurazione autenticazione PostgreSQL..."
  sudo cp "$PG_HBA_CONF" "${PG_HBA_CONF}.bak"
  sudo sed -i 's/ident/md5/g' "$PG_HBA_CONF"
  sudo sed -i 's/peer/md5/g' "$PG_HBA_CONF"
fi

# Avvia e abilita il servizio PostgreSQL
print_status "Avvio servizio PostgreSQL..."
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Attendi che il servizio sia pronto
print_status "Attesa avvio servizio PostgreSQL..."
sleep 5

# Crea database e utente come utente postgres
print_status "Creazione database e utente PostgreSQL..."
sudo -i -u postgres psql -c "CREATE DATABASE gervis;" || true
sudo -i -u postgres psql -c "CREATE USER gervis WITH PASSWORD '$DB_PASSWORD';" || true
sudo -i -u postgres psql -c "ALTER USER gervis WITH PASSWORD '$DB_PASSWORD';" || true
sudo -i -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;" || true

# 3. Clona il repository
print_status "Eliminazione della directory esistente se presente..."
sudo rm -rf "$APP_DIR"
print_status "Clonazione del repository Git..."
sudo git clone "$GITHUB_REPO" "$APP_DIR"
cd "$APP_DIR" || exit

# 4. Configura le variabili d'ambiente
print_status "Creazione del file .env..."
sudo bash -c "cat > \"$APP_DIR/.env\" << EOF
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
EMAIL_FROM=\"Gervis <noreply@$DOMAIN>\"

# URL di base per i link nelle email
BASE_URL=https://$DOMAIN
EOF"

# 5. Installa le dipendenze e esegui la build
print_status "Impostazione delle autorizzazioni corrette..."
sudo chown -R ec2-user:ec2-user "$APP_DIR"

print_status "Installazione dipendenze npm..."
cd "$APP_DIR" || exit
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
sudo bash -c "cat > /etc/nginx/conf.d/gervis.conf << EOF
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
        add_header Cache-Control \"public, no-transform\";
    }

    # Proxy verso l'applicazione Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"

# Verifica la configurazione di Nginx
nginx -t
if [ $? -eq 0 ]; then
  systemctl restart nginx
  systemctl enable nginx
  print_success "Nginx configurato con successo!"
else
  print_error "Errore nella configurazione di Nginx!"
fi

# 8. Avvia l'applicazione con PM2
print_status "Avvio dell'applicazione con PM2..."
cd "$APP_DIR" || exit
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 9. Configura HTTPS con Let's Encrypt (opzionale)
print_status "Installazione Certbot per HTTPS..."
sudo dnf install -y certbot python3-certbot-nginx

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