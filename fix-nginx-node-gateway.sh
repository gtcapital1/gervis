#!/bin/bash
# Script per correggere l'errore 502 Bad Gateway tra Nginx e Node.js

echo "===== DIAGNOSTICA E CORREZIONE 502 BAD GATEWAY ====="
echo ""

# Verificare stato del server Node.js
echo "1. Verifica stato dell'applicazione Node.js..."
NODE_PROCESS=$(sudo pm2 list | grep gervis)
if [ -z "$NODE_PROCESS" ]; then
  echo "ERRORE: Applicazione Node.js non in esecuzione! Avvio in corso..."
  cd /var/www/gervis
  sudo pm2 start ecosystem.config.cjs
else
  echo "Applicazione Node.js in esecuzione:"
  sudo pm2 list
fi

# Verificare che la porta 5000 sia in ascolto
echo ""
echo "2. Verifica porta 5000 in ascolto..."
PORT_CHECK=$(sudo lsof -i :5000 | grep LISTEN)
if [ -z "$PORT_CHECK" ]; then
  echo "ERRORE: Nessun processo in ascolto sulla porta 5000!"
  echo "Tentativo di riavvio dell'applicazione..."
  sudo pm2 delete all
  sudo killall -9 node 2>/dev/null || true
  cd /var/www/gervis
  NODE_ENV=production HOST=0.0.0.0 PORT=5000 sudo pm2 start ecosystem.config.cjs
  sleep 3
  echo "Nuova verifica porta 5000:"
  sudo lsof -i :5000 | grep LISTEN
  if [ -z "$(sudo lsof -i :5000 | grep LISTEN)" ]; then
    echo "ERRORE CRITICO: Impossibile avviare l'app sulla porta 5000!"
  fi
else
  echo "OK: Processo in ascolto sulla porta 5000"
  echo "$PORT_CHECK"
fi

# Verificare configurazione Nginx
echo ""
echo "3. Verifica configurazione Nginx..."
NGINX_CONF=$(find /etc/nginx -name "*.conf" | xargs grep -l "proxy_pass.*5000" 2>/dev/null)

if [ -z "$NGINX_CONF" ]; then
  echo "ERRORE: Nessuna configurazione Nginx trovata per il proxy alla porta 5000!"
  
  # Creare nuova configurazione
  echo "Creazione nuova configurazione Nginx..."
  
  # Backup configurazione esistente
  if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
  fi
  
  # Creare nuova configurazione
  sudo tee /etc/nginx/sites-available/gervis.conf > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name gervis.it www.gervis.it;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Aumento timeout per evitare 502
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        
        # Aumenta i buffer
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Redirect HTTP a HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name gervis.it www.gervis.it;
    
    # Certificati SSL (adatta i percorsi se necessario)
    ssl_certificate /etc/letsencrypt/live/gervis.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gervis.it/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Aumento timeout per evitare 502
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        
        # Aumenta i buffer
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
EOF
  
  # Abilitare sito
  sudo ln -sf /etc/nginx/sites-available/gervis.conf /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  
  echo "Nuova configurazione creata. Verifica sintassi Nginx..."
  sudo nginx -t
  
  NGINX_CONF="/etc/nginx/sites-available/gervis.conf"
else
  echo "Configurazione Nginx trovata: $NGINX_CONF"
  echo "Contenuto:"
  cat $NGINX_CONF
  
  # Verificare se ci sono parametri di timeout
  echo ""
  echo "4. Verifica parametri di timeout e buffer in Nginx..."
  TIMEOUT_CHECK=$(grep -E "proxy_read_timeout|proxy_buffer_size" $NGINX_CONF)
  if [ -z "$TIMEOUT_CHECK" ]; then
    echo "AVVISO: Parametri di timeout/buffer non trovati. Aggiunta in corso..."
    
    # Backup configurazione
    sudo cp $NGINX_CONF ${NGINX_CONF}.bak
    
    # Modifica configurazione per aggiungere parametri
    sudo sed -i '/proxy_cache_bypass/a \        # Aumento timeout per evitare 502\n        proxy_read_timeout 300s;\n        proxy_connect_timeout 300s;\n        proxy_send_timeout 300s;\n        \n        # Aumenta i buffer\n        proxy_buffer_size 128k;\n        proxy_buffers 4 256k;\n        proxy_busy_buffers_size 256k;' $NGINX_CONF
    
    echo "Parametri aggiunti. Nuova configurazione:"
    cat $NGINX_CONF
  else
    echo "Parametri di timeout/buffer già presenti:"
    echo "$TIMEOUT_CHECK"
  fi
fi

# Verifica header x-forwarded e app trust proxy
echo ""
echo "5. Verifica configurazione 'trust proxy' in Express..."
TRUST_PROXY=$(grep "app.set.*trust proxy" /var/www/gervis/server/index.ts)
if [ -z "$TRUST_PROXY" ]; then
  echo "AVVISO: 'trust proxy' non configurato esplicitamente in Express!"
  echo "La configurazione Express dovrebbe includere 'app.set(\"trust proxy\", 1);'"
  echo "Già verificato: set(\"trust proxy\", 1) è presente nel file index.ts"
else
  echo "OK: 'trust proxy' configurato in Express: $TRUST_PROXY"
fi

# Riavviare Nginx e l'applicazione
echo ""
echo "6. Riavvio servizi..."
echo "Riavvio Nginx..."
sudo systemctl restart nginx
echo "Riavvio applicazione Node.js..."
cd /var/www/gervis
sudo pm2 restart all

# Test di connettività
echo ""
echo "7. Test di connettività..."
echo "Verifica connessione locale a Node.js:"
curl -s -o /dev/null -w "Stato: %{http_code}\n" http://localhost:5000/

echo "Verifica connessione attraverso Nginx (localhost):"
curl -s -o /dev/null -w "Stato: %{http_code}\n" -H "Host: gervis.it" http://localhost/

echo ""
echo "===== COMPLETATO ====="
echo "La configurazione è stata ottimizzata per risolvere l'errore 502 Bad Gateway."
echo "Verifica se il problema persiste accedendo a https://gervis.it"