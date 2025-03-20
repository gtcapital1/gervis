#!/bin/bash
# Script per correggere il problema di eliminazione client su AWS
# Il problema si verifica quando il server restituisce HTML invece di JSON

echo "Correzione problema delete client su AWS Ubuntu..."

# 1. Verificare la configurazione di Nginx
echo "Verifica configurazione Nginx..."
if [ -f "/etc/nginx/sites-available/default" ]; then
  # Backup della configurazione originale
  sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

  # Aggiornare la configurazione per passare le richieste DELETE correttamente
  cat > /tmp/nginx_fix.conf << 'EOL'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Fix per error 413 Request Entity Too Large
        client_max_body_size 10M;
        
        # Timeout più lunghi per operazioni più complesse
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOL

  # Installare la nuova configurazione
  sudo cp /tmp/nginx_fix.conf /etc/nginx/sites-available/default
  sudo nginx -t && sudo systemctl restart nginx
  echo "Configurazione Nginx aggiornata."
else
  echo "File di configurazione Nginx non trovato in /etc/nginx/sites-available/default"
fi

# 2. Aggiornare il file index.js per assicurarsi che gestisca correttamente le risposte HTML invece di JSON
echo "Aggiornamento applicazione per gestire correttamente le risposte non-JSON..."

if [ -f "/var/www/gervis/server/index.js" ]; then
  # Backup del file originale
  cp /var/www/gervis/server/index.js /var/www/gervis/server/index.js.bak
  
  # Aggiungi middleware per assicurarsi che tutte le risposte siano JSON
  cat >> /var/www/gervis/server/index.js << 'EOL'

// Middleware aggiunto dal fix-aws-delete-issue.sh per assicurare risposte JSON coerenti
app.use((req, res, next) => {
  // Salva il metodo originale res.send
  const originalSend = res.send;
  
  // Sovrascrive res.send per controllare il content-type
  res.send = function(body) {
    if (!res.headersSent) {
      // Assicurati che le risposte siano JSON per le richieste API
      if (req.path.startsWith('/api/') && !res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
    }
    
    // Chiama il metodo originale
    return originalSend.call(this, body);
  };
  
  next();
});
EOL
  
  echo "File index.js aggiornato con middleware per Content-Type JSON."
else
  echo "File index.js non trovato in /var/www/gervis/server/"
fi

# 3. Riavvia il servizio PM2
echo "Riavvio dell'applicazione..."
cd /var/www/gervis && pm2 restart gervis
echo "Applicazione riavviata."

echo "Correzione completata. Si prega di testare l'eliminazione del cliente."