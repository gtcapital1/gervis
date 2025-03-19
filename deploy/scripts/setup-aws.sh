#!/bin/bash

# Script di configurazione automatica per il deployment di Gervis su AWS
# Da eseguire come utente root su un'istanza EC2 appena creata
# Questo script eseguirà tutti i passaggi necessari per preparare l'ambiente

set -e  # Interrompi lo script in caso di errore

echo "=== Inizio setup server AWS per Gervis ==="

# Aggiorna tutti i pacchetti
echo "Aggiornamento sistema..."
yum update -y

# Installa dipendenze essenziali
echo "Installazione dipendenze essenziali..."
yum install -y git curl wget nano
yum install -y gcc gcc-c++ make

# Installa Node.js e npm
echo "Installazione Node.js..."
curl -sL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Verifica le versioni
echo "Versioni installate:"
node -v
npm -v

# Installa PM2 globalmente
echo "Installazione PM2..."
npm install -g pm2

# Installa Nginx
echo "Installazione Nginx..."
amazon-linux-extras install nginx1 -y
systemctl enable nginx
systemctl start nginx

# Installa PostgreSQL 15
echo "Installazione PostgreSQL 15..."
amazon-linux-extras install postgresql15 -y
yum install -y postgresql postgresql-server postgresql-devel postgresql-contrib

# Inizializza il database PostgreSQL
echo "Inizializzazione database PostgreSQL..."
postgresql-setup --initdb

# Modifica la configurazione di PostgreSQL per consentire autenticazione con password
echo "Configurazione PostgreSQL..."
sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf

# Abilita e avvia il servizio PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Crea utente e database per Gervis
echo "Creazione utente e database..."
su - postgres -c "psql -c \"CREATE USER gervisuser WITH PASSWORD 'password';\""
su - postgres -c "psql -c \"CREATE DATABASE gervis OWNER gervisuser;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE gervis TO gervisuser;\""

# Crea directory per l'applicazione
echo "Creazione directory dell'applicazione..."
mkdir -p /var/www/gervis
chown -R ec2-user:ec2-user /var/www/gervis

# Installa Certbot per HTTPS
echo "Installazione Certbot per SSL/HTTPS..."
amazon-linux-extras install epel -y
yum install -y certbot python-certbot-nginx

# Crea una configurazione di base per Nginx
echo "Creazione configurazione Nginx base..."
cat > /etc/nginx/conf.d/gervis.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Timeout maggiore per l'onboarding
    location /api/onboarding {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;  # 5 minuti di timeout
    }
    
    # Limite per upload di file
    client_max_body_size 10M;
}
EOF

# Riavvia Nginx per applicare la configurazione
systemctl restart nginx

# Crea script di backup del database
echo "Configurazione backup database..."
mkdir -p /var/backups/gervis

cat > /var/backups/gervis/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="/var/backups/gervis/gervis_$DATE.sql"
pg_dump -U postgres gervis > $FILENAME
gzip $FILENAME

# Rimuovi backup più vecchi di 30 giorni
find /var/backups/gervis -name "gervis_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /var/backups/gervis/backup.sh

# Aggiungi il backup al crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /var/backups/gervis/backup.sh") | crontab -

echo "=== Setup completato con successo! ==="
echo ""
echo "Ora puoi caricare i file dell'applicazione in /var/www/gervis"
echo "e configurare il file .env per la connessione al database."
echo ""
echo "Informazioni di accesso al database:"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: gervis"
echo "Username: gervisuser"
echo "Password: password (cambiala in produzione!)"
echo ""
echo "Per favore, assicurati di:"
echo "1. Caricare i file dell'applicazione"
echo "2. Creare il file .env con lo script create-env-file.sh"
echo "3. Eseguire le migrazioni del database con npm run db:push"
echo "4. Avviare l'applicazione con PM2"
echo "5. Configurare un dominio e ottenere un certificato SSL con Certbot"
echo ""
echo "Verifica le istruzioni dettagliate nel file AWS-DEPLOY-README.md"