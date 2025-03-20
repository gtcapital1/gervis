#!/bin/bash
# Script per risolvere definitivamente il problema di eliminazione client su AWS
# Esegue una serie di operazioni per garantire che le eliminazioni funzionino

set -e  # Termina in caso di errori

echo "🔧 Script di risoluzione problemi eliminazione client su AWS"
echo "------------------------------------------------------------"

# Controlla se siamo in un ambiente AWS
is_aws() {
  if grep -q "amazon" /etc/os-release 2>/dev/null || grep -q "amzn" /etc/os-release 2>/dev/null; then
    return 0  # È AWS
  else
    return 1  # Non è AWS
  fi
}

# 1. Fix vincolo CASCADE sulla tabella assets
fix_cascade_constraints() {
  echo "📊 Configurazione vincoli CASCADE per assets collegati ai clienti..."
  
  cat > /tmp/fix_cascade.sql <<EOF
-- Script per aggiungere vincoli CASCADE alle tabelle che riferiscono clients
ALTER TABLE assets DROP CONSTRAINT IF EXISTS "assets_clientId_fkey";
ALTER TABLE assets ADD CONSTRAINT "assets_clientId_fkey" 
  FOREIGN KEY ("clientId") REFERENCES "clients"(id) ON DELETE CASCADE;

ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS "recommendations_clientId_fkey";
ALTER TABLE recommendations ADD CONSTRAINT "recommendations_clientId_fkey" 
  FOREIGN KEY ("clientId") REFERENCES "clients"(id) ON DELETE CASCADE;

-- Verifica vincoli
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'clients';
EOF

  if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f /tmp/fix_cascade.sql
    echo "✅ Vincoli CASCADE aggiornati con successo"
  else
    echo "❌ DATABASE_URL non impostato, impossibile modificare vincoli"
    return 1
  fi
}

# 2. Fix configurazione Nginx per assicurare header Content-Type corretti
fix_nginx_config() {
  echo "🌐 Configurazione Nginx per gestire correttamente le risposte API..."
  
  NGINX_CONF_PATH="/etc/nginx/conf.d/app.conf"
  if [ ! -f "$NGINX_CONF_PATH" ]; then
    if [ -d "/etc/nginx/sites-available" ]; then
      NGINX_CONF_PATH="/etc/nginx/sites-available/default"
    else
      echo "❌ Configurazione Nginx non trovata"
      return 1
    fi
  fi
  
  # Backup
  sudo cp "$NGINX_CONF_PATH" "${NGINX_CONF_PATH}.bak"
  
  # Controlla se esiste già la configurazione dei content type
  if grep -q "application/json" "$NGINX_CONF_PATH"; then
    echo "ℹ️ Configurazione content-type già presente"
  else
    # Aggiungi una location per forzare JSON per le richieste API
    sudo tee -a "$NGINX_CONF_PATH" > /dev/null <<EOF

    # Configurazione speciale per API json
    location ~* ^/api/.* {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Force JSON per le operazioni DELETE
        proxy_set_header Accept 'application/json';
        proxy_set_header Content-Type 'application/json';
        
        # Se è presente header X-Force-Content-Type, forza application/json
        if (\$http_x_force_content_type) {
            add_header Content-Type 'application/json' always;
        }
        
        # Se è presente header X-No-HTML-Response, assicura content-type JSON
        if (\$http_x_no_html_response) {
            add_header Content-Type 'application/json' always;
        }
        
        # Log dettagliati per debug
        error_log /var/log/nginx/api_error.log debug;
        access_log /var/log/nginx/api_access.log;
    }
EOF
    echo "✅ Configurazione Nginx aggiornata con regole Content-Type"
  fi
  
  # Riavvia Nginx
  echo "🔄 Riavvio Nginx per applicare le modifiche..."
  sudo systemctl restart nginx || sudo service nginx restart
  echo "✅ Nginx riavviato con successo"
}

# 3. Testa funzionalità di eliminazione
test_delete_functionality() {
  echo "🧪 Test funzionalità di eliminazione client..."
  
  # Usa POST per creare un cliente di test
  echo "1. Creazione cliente di test..."
  CLIENT_ID=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"DeleteTest","email":"delete_test@example.com","phone":"123456789"}' \
    http://localhost:5000/api/clients | 
    grep -o '"id":[0-9]*' | cut -d':' -f2)
  
  if [ -z "$CLIENT_ID" ]; then
    echo "❌ Impossibile creare cliente di test"
    return 1
  fi
  
  echo "✅ Cliente di test creato con ID: $CLIENT_ID"
  
  # Attendi un attimo
  sleep 1
  
  # Usa DELETE per eliminare il cliente
  echo "2. Eliminazione cliente di test..."
  DELETE_RESULT=$(curl -s -X DELETE \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Cache-Control: no-cache, no-store, must-revalidate" \
    -H "Pragma: no-cache" \
    -H "Expires: -1" \
    -H "X-Requested-With: XMLHttpRequest" \
    -H "X-No-HTML-Response: true" \
    -H "X-Force-Content-Type: application/json" \
    "http://localhost:5000/api/clients/$CLIENT_ID?_t=$(date +%s)")
  
  echo "Risposta DELETE: $DELETE_RESULT"
  
  # Verifica che il cliente sia effettivamente eliminato
  echo "3. Verifica eliminazione..."
  sleep 1
  VERIFY_RESULT=$(curl -s -X GET \
    -H "Accept: application/json" \
    -H "Cache-Control: no-cache" \
    "http://localhost:5000/api/clients/$CLIENT_ID")
  
  if echo "$VERIFY_RESULT" | grep -q "not found" || echo "$VERIFY_RESULT" | grep -q "\"success\":false"; then
    echo "✅ Cliente eliminato correttamente"
  else
    echo "❌ Cliente NON eliminato: $VERIFY_RESULT"
    return 1
  fi
}

# Esegui le operazioni
main() {
  echo "📌 Ambiente: $(uname -a)"
  if is_aws; then
    echo "☁️ Rilevato ambiente AWS"
  else
    echo "💻 Ambiente non-AWS (locale/Replit)"
  fi
  
  echo ""
  echo "1️⃣ Aggiornamento vincoli database"
  fix_cascade_constraints
  
  echo ""
  echo "2️⃣ Aggiornamento configurazione web server"
  if is_aws; then
    fix_nginx_config
  else
    echo "⏩ Saltato: non necessario in ambiente non-AWS"
  fi
  
  echo ""
  echo "3️⃣ Test funzionalità delete"
  test_delete_functionality
  
  echo ""
  echo "✨ Operazioni completate"
  echo "Se il test ha avuto successo, le eliminazioni ora funzionano correttamente!"
}

# Esegui
main