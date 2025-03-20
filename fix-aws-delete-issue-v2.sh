#!/bin/bash

# fix-aws-delete-issue-v2.sh - Script avanzato per risolvere il problema di eliminazione clienti su AWS
# Questo script aggiusta la configurazione nginx e aggiunge vincoli CASCADE per garantire
# la corretta eliminazione dei clienti e delle loro risorse associate.

# Verifica se lo script è eseguito con privileggi sudo
if [ "$EUID" -ne 0 ]; then
  echo "Questo script deve essere eseguito con privilegi sudo"
  exit 1
fi

echo "=== Correzione problema eliminazione clienti su AWS v2 ==="

# 1. Aggiunta intestazione Content-Type alle risposte JSON in Nginx
echo "1. Configurazione Nginx per aggiungere Content-Type appropriato..."

NGINX_CONF="/etc/nginx/sites-available/default"
NGINX_BACKUP="${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"

# Backup del file di configurazione esistente
cp $NGINX_CONF $NGINX_BACKUP
echo "Backup della configurazione Nginx salvato in: $NGINX_BACKUP"

# Aggiungi la direttiva per il Content-Type
if ! grep -q "application/json" $NGINX_CONF; then
  sed -i '/location \/ {/a \
        # Imposta Content-Type per le risposte JSON\
        proxy_hide_header Content-Type;\
        add_header Content-Type application/json always;\
        proxy_hide_header X-Powered-By;' $NGINX_CONF
  
  echo "Configurazione Nginx aggiornata con Content-Type per JSON"
else
  echo "La configurazione per Content-Type è già presente in Nginx"
fi

# Riavvia Nginx per applicare le modifiche
echo "Riavvio Nginx..."
systemctl restart nginx
echo "Nginx riavviato con la nuova configurazione"

# 2. Migrazione Database per aggiungere vincoli CASCADE
echo "2. Aggiunta vincoli CASCADE alle tabelle del database..."

# Script SQL per aggiungere vincoli CASCADE alle tabelle assets e recommendations
SQL_SCRIPT=$(cat <<EOF
-- Temporanei Drop dei vincoli esistenti
ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_client_id_clients_id_fk";
ALTER TABLE "recommendations" DROP CONSTRAINT IF EXISTS "recommendations_client_id_clients_id_fk";

-- Ri-creazione degli stessi vincoli ma con CASCADE
ALTER TABLE "assets" ADD CONSTRAINT "assets_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
  
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
  
-- Conferma che i vincoli sono stati creati
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('assets', 'recommendations')
  AND tc.constraint_type = 'FOREIGN KEY';
EOF
)

# Esegui lo script SQL sul database PostgreSQL
# Ottieni la variabile di ambiente con l'URL del database dall'environment
if [ -f /var/www/gervis/.env ]; then
  source /var/www/gervis/.env
  
  if [ -n "$DATABASE_URL" ]; then
    echo "Database URL trovato in .env"
    echo "$SQL_SCRIPT" | psql "$DATABASE_URL"
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
      echo "Vincoli CASCADE aggiunti con successo al database"
    else
      echo "Errore durante l'aggiunta dei vincoli CASCADE. Codice: $RESULT"
    fi
  else
    echo "DATABASE_URL non trovato in .env"
  fi
else
  echo "File .env non trovato in /var/www/gervis/"
fi

echo "=== Correzioni completate ==="
echo "Il problema di eliminazione clienti dovrebbe ora essere risolto."
echo "Per verificare, prova ad eliminare un cliente dalla dashboard."
echo "Nota: Le risorse associate al cliente (assets e raccomandazioni) verranno eliminate automaticamente."