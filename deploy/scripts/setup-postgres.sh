#!/bin/bash

# Script per configurare PostgreSQL su Amazon Linux
# Esegui come sudo: sudo ./setup-postgres.sh

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

# Database settings
DB_NAME="gervis"
DB_USER="gervis"
DB_PASSWORD="Oliver1"

print_status "Rilevazione del sistema operativo..."
if grep -q "Amazon Linux" /etc/os-release; then
  print_status "Sistema rilevato: Amazon Linux"
  print_status "Installazione di PostgreSQL..."
  amazon-linux-extras install postgresql14 -y || yum install postgresql-server postgresql-contrib -y
elif [ -f /etc/redhat-release ]; then
  print_status "Sistema rilevato: Red Hat / CentOS"
  print_status "Installazione di PostgreSQL..."
  yum install postgresql-server postgresql-contrib -y
else
  print_status "Sistema sconosciuto, tentativo di installazione con yum..."
  yum install postgresql-server postgresql-contrib -y
fi

# Inizializzazione del database
print_status "Inizializzazione del database PostgreSQL..."
if [ -d "/var/lib/pgsql/data" ] && [ "$(ls -A /var/lib/pgsql/data)" ]; then
  print_status "Database già inizializzato."
else
  postgresql-setup initdb || /usr/bin/postgresql-setup --initdb || initdb -D /var/lib/pgsql/data
fi

# Avvio e abilitazione del servizio
print_status "Avvio del servizio PostgreSQL..."
systemctl start postgresql || service postgresql start
print_status "Abilitazione dell'avvio automatico..."
systemctl enable postgresql || chkconfig postgresql on

# Modifica pg_hba.conf per consentire l'autenticazione con password
print_status "Configurazione dell'autenticazione..."
PG_HBA_CONF=$(find /var -name pg_hba.conf | head -n 1)

if [ -z "$PG_HBA_CONF" ]; then
  print_error "File pg_hba.conf non trovato!"
  exit 1
fi

# Backup pg_hba.conf
cp $PG_HBA_CONF ${PG_HBA_CONF}.bak

# Modifica delle regole di autenticazione
sed -i 's/ident/md5/g' $PG_HBA_CONF
sed -i 's/peer/md5/g' $PG_HBA_CONF

# Riavvio del servizio per applicare le modifiche
print_status "Riavvio del servizio PostgreSQL..."
systemctl restart postgresql || service postgresql restart

# Creazione del database e dell'utente
print_status "Creazione del database e dell'utente..."

# Funzione per eseguire comandi come utente postgres
run_psql() {
  if [ -x "$(command -v su)" ]; then
    su -c "psql -c \"$1\"" postgres
  else
    sudo -u postgres psql -c "$1"
  fi
}

# Verifica se il database esiste già
if run_psql "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1; then
  print_status "Il database '$DB_NAME' esiste già."
else
  print_status "Creazione del database '$DB_NAME'..."
  run_psql "CREATE DATABASE $DB_NAME;"
  print_success "Database '$DB_NAME' creato."
fi

# Verifica se l'utente esiste già
if run_psql "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER';" | grep -q 1; then
  print_status "L'utente '$DB_USER' esiste già."
  print_status "Aggiornamento della password..."
  run_psql "ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
  print_status "Creazione dell'utente '$DB_USER'..."
  run_psql "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
  print_success "Utente '$DB_USER' creato."
fi

# Assegnazione dei privilegi
print_status "Assegnazione dei privilegi all'utente '$DB_USER'..."
run_psql "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
print_success "Privilegi assegnati."

print_success "PostgreSQL configurato con successo!"
print_status "Dettagli della connessione:"
print_status "  - Database: $DB_NAME"
print_status "  - Utente: $DB_USER"
print_status "  - Stringa di connessione: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"