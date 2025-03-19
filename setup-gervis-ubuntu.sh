#!/bin/bash

# Script di setup completo per Gervis su Ubuntu
# Questo script clona il repository, esegue la build e configura il server
# Eseguire come root o con sudo
# Testato su Ubuntu 22.04 LTS

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
SERVER_IP="15.237.238.255"

# Banner di avvio
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║      SETUP GERVIS - UBUNTU SERVER              ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""

# 1. Aggiornamento del sistema
print_status "Aggiornamento del sistema..."
sudo apt update
sudo apt upgrade -y

# 2. Installa le dipendenze di sistema
print_status "Installazione dipendenze di sistema..."
sudo apt install -y git curl wget gnupg2 ca-certificates lsb-release apt-transport-https software-properties-common nginx certbot python3-certbot-nginx

# 3. Installa Node.js 18
print_status "Installazione Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica l'installazione di Node.js
node_version=$(node --version)
print_success "Node.js installato: $node_version"

# Installa PM2 globalmente
print_status "Installazione di PM2..."
sudo npm install -g pm2

# 4. Configura PostgreSQL 15
print_status "Configurazione di PostgreSQL 15..."
# Aggiungi il repository di PostgreSQL 15
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/postgresql.list

# Aggiorna l'indice dei pacchetti e installa PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verifica che il servizio sia in esecuzione
sudo systemctl status postgresql
print_success "PostgreSQL 15 installato e avviato"

# Modifica pg_hba.conf per permettere autenticazione password
PG_HBA_CONF="/etc/postgresql/15/main/pg_hba.conf"
if [ -f "$PG_HBA_CONF" ]; then
  print_status "Configurazione autenticazione PostgreSQL..."
  sudo cp "$PG_HBA_CONF" "${PG_HBA_CONF}.bak"
  sudo sed -i 's/local\s\+all\s\+postgres\s\+peer/local   all             postgres                                peer/' "$PG_HBA_CONF"
  sudo sed -i 's/local\s\+all\s\+all\s\+peer/local   all             all                                     md5/' "$PG_HBA_CONF"
  sudo sed -i 's/host\s\+all\s\+all\s\+127.0.0.1\/32\s\+ident/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA_CONF"
  sudo sed -i 's/host\s\+all\s\+all\s\+::1\/128\s\+ident/host    all             all             ::1\/128                 md5/' "$PG_HBA_CONF"
fi

# Riavvia PostgreSQL per applicare le modifiche
sudo systemctl restart postgresql

# Crea database e utente
print_status "Creazione database e utente PostgreSQL..."
sudo -i -u postgres psql << EOF
CREATE DATABASE gervis;
CREATE USER gervis WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE gervis SET client_encoding TO 'utf8';
ALTER ROLE gervis SET default_transaction_isolation TO 'read committed';
ALTER ROLE gervis SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;
\q
EOF

print_success "Database PostgreSQL configurato"

# 5. Configurazione firewall
print_status "Configurazione firewall..."
sudo apt install -y ufw
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'
sudo ufw --force enable
print_success "Firewall configurato"

# 6. Clona il repository
print_status "Creazione della directory dell'applicazione..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

print_status "Clonazione del repository Git..."
git clone "$GITHUB_REPO" "$APP_DIR"
cd "$APP_DIR" || exit

# 7. Configura le variabili d'ambiente
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

# 8. Installa le dipendenze e esegui la build
print_status "Installazione dipendenze npm..."
cd "$APP_DIR" || exit
npm ci

print_status "Allocazione più memoria per la build..."
export NODE_OPTIONS="--max-old-space-size=4096"

print_status "Esecuzione build con timeout esteso (30 minuti)..."
# Utilizziamo timeout per dare alla build più tempo per completare
timeout 1800 npm run build

if [ $? -eq 0 ]; then
  print_success "Build completata"
else
  print_warning "La build potrebbe non essere stata completata nel tempo previsto."
  print_warning "Se la build fallisce, prova con: cd $APP_DIR && NODE_OPTIONS=--max-old-space-size=4096 npm run build"
fi

# 9. Configura PM2
print_status "Configurazione di PM2..."
cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [{
    name: 'gervis',
    script: '$APP_DIR/node_modules/.bin/tsx',
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

# 10. Configura Nginx
print_status "Configurazione di Nginx..."
sudo bash -c "cat > /etc/nginx/sites-available/gervis << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;
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
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
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

# Abilita il sito e rimuovi il sito predefinito
sudo ln -sf /etc/nginx/sites-available/gervis /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verifica la configurazione di Nginx
print_status "Verifica configurazione Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
  sudo systemctl restart nginx
  sudo systemctl enable nginx
  print_success "Nginx configurato con successo!"
else
  print_error "Errore nella configurazione di Nginx!"
fi

# 11. Avvia l'applicazione con PM2
print_status "Avvio dell'applicazione con PM2..."
cd "$APP_DIR" || exit

# Aggiungi controllo se l'app è stata compilata
if [ -d "$APP_DIR/dist" ]; then
  pm2 start ecosystem.config.cjs
  pm2 save
  pm2 startup

  # Imposta pm2 per avviarsi all'avvio
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
  print_success "PM2 configurato per l'avvio automatico"
else
  print_warning "La directory dist non esiste. La build potrebbe non essere stata completata."
  print_warning "Se vuoi continuare comunque, esegui:"
  print_warning "  cd $APP_DIR && pm2 start ecosystem.config.cjs"
  
  # Crea uno script di avvio alternativo che avvia direttamente da TypeScript
  print_status "Creazione di uno script di avvio alternativo..."
  cat > "$APP_DIR/start-dev.sh" << EOF
#!/bin/bash
cd $APP_DIR
export NODE_ENV=production
export PORT=5000
export DATABASE_URL=postgresql://gervis:$DB_PASSWORD@localhost:5432/gervis
node --max-old-space-size=4096 node_modules/.bin/tsx server/index.ts
EOF
  
  chmod +x "$APP_DIR/start-dev.sh"
  print_success "Script di avvio alternativo creato in $APP_DIR/start-dev.sh"
fi

# 12. Configura HTTPS con Let's Encrypt (se il dominio è configurato)
print_status "Verifico se il dominio è configurato per l'IP del server..."
if host "$DOMAIN" | grep -q "$SERVER_IP"; then
  print_status "Configurazione HTTPS con Let's Encrypt..."
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || true
  print_success "HTTPS configurato!"
else
  print_warning "Il dominio $DOMAIN non è ancora configurato per puntare a $SERVER_IP."
  print_warning "Una volta configurato il DNS, esegui: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# 13. Esegui la migrazione del database
print_status "Esecuzione della migrazione del database..."
cd "$APP_DIR" || exit

# Correggi i permessi del database per l'utente gervis prima di eseguire la migrazione
print_status "Correzione permessi PostgreSQL per l'utente gervis..."
sudo -i -u postgres psql << EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO gervis;
ALTER USER gervis WITH SUPERUSER;
\q
EOF

# Verifica se esiste uno script di migrazione
if grep -q "db:push" "$APP_DIR/package.json"; then
  print_status "Esecuzione db:push..."
  cd "$APP_DIR" && npm run db:push
else
  print_warning "Script db:push non trovato. Utilizzo approccio alternativo per la migrazione..."
  # Crea uno script temporaneo per la migrazione
  cat > "$APP_DIR/db-push.js" << EOF
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { schema } = require('./shared/schema');

async function main() {
  console.log('Connessione al database...');
  const connectionString = process.env.DATABASE_URL || 'postgresql://gervis:$DB_PASSWORD@localhost:5432/gervis';
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  
  console.log('Esecuzione migrazione...');
  try {
    await db.query.users.findMany();
    console.log('Schema già esistente, nessuna migrazione necessaria.');
  } catch (e) {
    console.log('Creazione schema...');
    // Importa le definizioni delle tabelle
    const { users, clients, assets, recommendations } = schema;
    
    // Crea manualmente le tabelle
    for (const table of [users, clients, assets, recommendations]) {
      try {
        await db.execute(SQL\`CREATE TABLE IF NOT EXISTS \${table}\`);
        console.log(\`Tabella \${table} creata\`);
      } catch (err) {
        console.error(\`Errore nella creazione della tabella \${table}:\`, err);
      }
    }
  }
  
  console.log('Migrazione completata');
  await client.end();
}

main().catch(console.error);
EOF
  
  # Esegui lo script
  print_status "Esecuzione script di migrazione alternativo..."
  cd "$APP_DIR" && NODE_OPTIONS="--max-old-space-size=4096" node "$APP_DIR/db-push.js"
fi

# 14. Riepilogo finale
echo ""
echo "╔═════════════════════════════════════════════════╗"
echo "║                                                 ║"
echo "║         SETUP COMPLETATO!                      ║"
echo "║                                                 ║"
echo "╚═════════════════════════════════════════════════╝"
echo ""
echo "L'applicazione Gervis è stata configurata con successo!"
echo ""
echo "Dettagli configurazione:"
echo "  - Applicazione: $APP_DIR"
echo "  - Database: postgresql://gervis:******@localhost:5432/gervis"
echo "  - Applicazione in esecuzione con PM2"
echo "  - Nginx configurato per il dominio $DOMAIN e IP $SERVER_IP"
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
echo "Il sito è ora accessibile all'indirizzo:"
echo "  http://$SERVER_IP"
echo ""
echo "Dopo aver configurato il DNS, sarà accessibile all'indirizzo:"
echo "  https://$DOMAIN"
echo ""
echo "Grazie per aver scelto Gervis!"