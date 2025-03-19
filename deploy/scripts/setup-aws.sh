#!/bin/bash
#
# Script di configurazione per Gervis su Amazon Linux 2023
# Esegui questo script come utente ec2-user (non root)
#

set -e  # Esce in caso di errore

echo "====================================================="
echo "    Configurazione di Gervis su Amazon Linux 2023    "
echo "====================================================="

# Controllo utente
if [ "$(whoami)" == "root" ]; then
    echo "ERRORE: Non eseguire questo script come root. Usa l'utente ec2-user."
    exit 1
fi

# Aggiorna il sistema
echo "1. Aggiornamento del sistema..."
sudo dnf update -y

# Installa le dipendenze
echo "2. Installazione delle dipendenze..."
sudo dnf install -y postgresql15 postgresql15-server nodejs git nginx certbot python3-certbot-nginx

# Verifica le versioni
echo "3. Verifica versioni..."
node -v
npm -v

# Configura PostgreSQL
echo "4. Configurazione di PostgreSQL..."
sudo postgresql-setup --initdb

# Modifica pg_hba.conf per consentire l'autenticazione con password
sudo sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf

# Avvia PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Crea database e utente
echo "5. Creazione database e utente..."
echo "Per favore, inserisci una password sicura per l'utente del database:"
read -s DB_PASSWORD
echo

# Crea un file SQL temporaneo
cat > /tmp/setup.sql << EOF
CREATE DATABASE gervis;
CREATE USER gervisuser WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE gervis TO gervisuser;
EOF

# Esegui il file SQL
sudo -u postgres psql -f /tmp/setup.sql

# Rimuovi il file temporaneo
rm /tmp/setup.sql

# Installa PM2
echo "6. Installazione di PM2..."
sudo npm install -g pm2

# Crea directory per l'applicazione
echo "7. Configurazione directory dell'applicazione..."
sudo mkdir -p /var/www/gervis
sudo chown $(whoami):$(whoami) /var/www/gervis

# Configura Nginx
echo "8. Configurazione di Nginx..."
echo "Inserisci il nome del dominio (es. gervis.tuo-dominio.com):"
read DOMAIN_NAME

cat > /tmp/gervis.conf << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
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
    
    # Maggior timeout per l'onboarding che può richiedere più tempo
    location /api/onboarding {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;  # 5 minuti di timeout
    }
    
    # Aumenta il limite del corpo della richiesta per upload di file
    client_max_body_size 10M;
}
EOF

sudo mv /tmp/gervis.conf /etc/nginx/conf.d/gervis.conf

# Verifica configurazione Nginx
sudo nginx -t

# Avvia e abilita Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# Crea variabili d'ambiente
echo "9. Creazione file .env..."
echo "Inserisci il segreto per la sessione (stringa casuale lunga):"
read SESSION_SECRET

echo "Inserisci l'host SMTP:"
read SMTP_HOST

echo "Inserisci la porta SMTP:"
read SMTP_PORT

echo "Inserisci l'utente SMTP:"
read SMTP_USER

echo "Inserisci la password SMTP:"
read -s SMTP_PASS
echo

echo "Inserisci l'indirizzo email 'from' per le email inviate dal sistema:"
read SMTP_FROM

cat > /var/www/gervis/.env << EOF
# Configurazione ambiente di produzione
NODE_ENV=production

# Configurazione database
DATABASE_URL=postgresql://gervisuser:$DB_PASSWORD@localhost:5432/gervis

# Configurazione applicazione
PORT=3000
HOST=0.0.0.0
SESSION_SECRET=$SESSION_SECRET

# URL base dell'applicazione (importante per le email e i link di onboarding)
BASE_URL=https://$DOMAIN_NAME

# Configurazione email SMTP
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM
SMTP_FROM_NAME=Gervis Financial Advisor

# Configurazione della sicurezza
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# Configurazione dei limiti
MAX_ASSET_COUNT=50
MAX_UPLOAD_SIZE_MB=10

# Impostazioni lingua predefinita (italian o english)
DEFAULT_LANGUAGE=italian

# Configurazione logging
LOG_LEVEL=error
EOF

# Configura HTTPS
echo "10. Configurazione HTTPS con Certbot..."
echo "Vuoi configurare HTTPS adesso? (s/n)"
read HTTPS_CONFIG

if [ "$HTTPS_CONFIG" == "s" ]; then
    sudo certbot --nginx -d $DOMAIN_NAME
    sudo certbot renew --dry-run
fi

# Istruzioni finali
echo ""
echo "====================================================="
echo "    Installazione completata con successo!           "
echo "====================================================="
echo ""
echo "Per completare la configurazione:"
echo ""
echo "1. Copia i file dell'applicazione Gervis in /var/www/gervis"
echo "2. Naviga nella directory: cd /var/www/gervis"
echo "3. Installa le dipendenze: npm ci"
echo "4. Costruisci l'applicazione: npm run build"
echo "5. Esegui le migrazioni del database: npm run db:push"
echo "6. Avvia l'applicazione con PM2: pm2 start ecosystem.config.js"
echo "7. Configura PM2 per avviarsi all'avvio: pm2 startup"
echo "8. Salva la configurazione PM2: pm2 save"
echo ""
echo "Accedi all'applicazione: https://$DOMAIN_NAME"
echo ""
echo "Grazie per aver installato Gervis!"