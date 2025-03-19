#!/bin/bash

# Script per correggere la configurazione di Nginx che mostra solo la pagina predefinita
# Questo script configura correttamente Nginx per inviare il traffico all'applicazione Gervis

set -e  # Interrompi lo script in caso di errore

echo "=== Script di configurazione Nginx per Gervis ==="

# Controlla i privilegi di root
if [ "$(id -u)" -ne 0 ]; then
  echo "Questo script deve essere eseguito come root o con sudo."
  exit 1
fi

# Chiedi il dominio da configurare
read -p "Inserisci il dominio del sito (es. gervis.it, lascia vuoto per usare l'IP del server): " DOMAIN

# Se il dominio è vuoto, usa l'IP del server
if [ -z "$DOMAIN" ]; then
  # Ottieni l'IP pubblico del server (funziona su EC2)
  IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
  
  # Se non è un'istanza EC2, prova con ifconfig.me
  if [ -z "$IP" ]; then
    IP=$(curl -s ifconfig.me)
  fi
  
  DOMAIN=$IP
  echo "Nessun dominio specificato, uso l'IP: $DOMAIN"
fi

# Crea un backup della configurazione esistente
TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo "Creazione backup della configurazione esistente..."

# Controlla dove si trova il file di configurazione di Nginx
if [ -f "/etc/nginx/conf.d/gervis.conf" ]; then
  CONFIG_PATH="/etc/nginx/conf.d/gervis.conf"
  cp $CONFIG_PATH "${CONFIG_PATH}.${TIMESTAMP}.bak" 2>/dev/null || echo "Nessun file esistente da copiare."
elif [ -f "/etc/nginx/sites-available/gervis" ]; then
  CONFIG_PATH="/etc/nginx/sites-available/gervis"
  cp $CONFIG_PATH "${CONFIG_PATH}.${TIMESTAMP}.bak" 2>/dev/null || echo "Nessun file esistente da copiare."
else
  # Determina la directory di configurazione appropriata
  if [ -d "/etc/nginx/conf.d" ]; then
    CONFIG_PATH="/etc/nginx/conf.d/gervis.conf"
  else
    CONFIG_PATH="/etc/nginx/sites-available/gervis"
    # Assicurati che esista la directory sites-enabled
    mkdir -p /etc/nginx/sites-enabled
  fi
fi

# Crea la nuova configurazione
echo "Creazione nuova configurazione Nginx per $DOMAIN..."

cat > $CONFIG_PATH << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
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
    
    # Timeout maggiore per l'onboarding
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
    
    # Limite per upload di file
    client_max_body_size 10M;
}
EOF

# Se stiamo usando sites-available, crea il symlink in sites-enabled
if [[ "$CONFIG_PATH" == "/etc/nginx/sites-available/"* ]]; then
  echo "Creazione symlink in sites-enabled..."
  ln -sf $CONFIG_PATH /etc/nginx/sites-enabled/gervis
  
  # Rimuovi il default se esiste
  if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "Rimozione configurazione default di Nginx..."
    rm -f /etc/nginx/sites-enabled/default
  fi
fi

# Verifica la configurazione
echo "Verifica della configurazione Nginx..."
nginx -t

if [ $? -eq 0 ]; then
  echo "Riavvio Nginx per applicare le modifiche..."
  systemctl restart nginx
  echo "Nginx riavviato con successo!"
  
  echo ""
  echo "=== Configurazione completata! ==="
  echo "Nginx è ora configurato per inviare il traffico all'applicazione Gervis."
  echo "Assicurati che l'applicazione Gervis sia in esecuzione sulla porta 3000."
  echo ""
  echo "Per verificare lo stato dell'applicazione, esegui:"
  echo "pm2 status"
  echo ""
  echo "Per avviare l'applicazione se non è in esecuzione:"
  echo "cd /var/www/gervis"
  echo "pm2 start ecosystem.config.js"
else
  echo "Errore nella configurazione di Nginx. Per favore, controlla manualmente."
fi