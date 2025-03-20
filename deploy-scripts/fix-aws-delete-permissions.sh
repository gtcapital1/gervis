#!/bin/bash
# Script per correggere i permessi e le configurazioni su AWS che potrebbero influire sulle 
# operazioni di eliminazione client.
#
# Questo script risolve problemi comuni che causano la restituzione di HTML invece di JSON
# nelle operazioni DELETE.
#
# Eseguire con sudo su AWS: sudo bash fix-aws-delete-permissions.sh

echo "Correzione delle configurazioni del server per le operazioni DELETE..."

# Directory dell'applicazione
APP_DIR="${APP_DIR:-/var/www/gervis}"

# 1. Verifica esistenza directory
if [ ! -d "$APP_DIR" ]; then
  echo "ERRORE: Directory $APP_DIR non trovata!"
  exit 1
fi

echo "Utilizzando directory applicazione: $APP_DIR"

# 2. Correzione configurazione Nginx
echo "Aggiornamento configurazione Nginx..."
if [ -f "/etc/nginx/sites-available/default" ]; then
  # Backup della configurazione
  sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S)
  
  # Aggiornamento configurazione
  sudo cat > /tmp/nginx.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;  # Sostituisci con il tuo dominio in produzione

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Fix per il timeout durante operazioni lunghe
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
        
        # Fix per error 413 Request Entity Too Large
        client_max_body_size 10M;
        
        # Importante: Non bufferizzare le risposte per evitare HTML 502 su richieste DELETE
        proxy_buffering off;
        
        # Evita la compressione per le richieste API (elimina problemi di parsing JSON)
        gzip off;
        gzip_vary off;
    }
}
EOF

  sudo mv /tmp/nginx.conf /etc/nginx/sites-available/default
  
  # Verifica configurazione Nginx
  echo "Verifica configurazione Nginx..."
  sudo nginx -t
  
  if [ $? -eq 0 ]; then
    echo "Riavvio Nginx..."
    sudo systemctl restart nginx
  else
    echo "ERRORE: Configurazione Nginx non valida. Ripristino backup..."
    sudo cp /etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S) /etc/nginx/sites-available/default
    sudo systemctl restart nginx
  fi
else
  echo "ATTENZIONE: File configurazione Nginx non trovato!"
fi

# 3. Correzione configurazione Express/Node.js
echo "Aggiornamento configurazione Express/Node.js..."

# Aggiunta middleware Express per assicurare risposte JSON coerenti
MIDDLEWARE_FILE="$APP_DIR/server/fix-middleware.js"

cat > $MIDDLEWARE_FILE << 'EOF'
// Middleware per assicurare risposte JSON coerenti
module.exports = function fixJsonMiddleware(req, res, next) {
  // Salva riferimento al metodo originale
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Intercetta risposte per assicurare Content-Type corretto
  res.send = function(body) {
    // Per richieste API, assicura content-type JSON
    if (req.path.startsWith('/api/') && !res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      
      // Se la richiesta è DELETE, assicura che la risposta sia JSON
      if (req.method === 'DELETE' && typeof body === 'string' && body.trim().startsWith('<!DOCTYPE')) {
        console.error('[ERROR] Rilevata risposta HTML per richiesta DELETE API. Correzione in corso...');
        return originalJson.call(this, { 
          success: false, 
          message: 'Errore del server durante eliminazione. Operazione non completata.', 
          error: 'response_format_error' 
        });
      }
    }
    
    return originalSend.call(this, body);
  };
  
  // Assicura header nel caso di res.end() diretta
  res.end = function(chunk, encoding) {
    if (req.path.startsWith('/api/') && !res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};
EOF

# Aggiorna il file principale per includere il middleware
if [ -f "$APP_DIR/server/index.js" ]; then
  # Backup del file index.js
  cp "$APP_DIR/server/index.js" "$APP_DIR/server/index.js.bak.$(date +%Y%m%d%H%M%S)"
  
  # Cerca il punto appropriato per inserire il middleware
  if grep -q "app.use(express.json())" "$APP_DIR/server/index.js"; then
    # Inserisci dopo express.json()
    sed -i '/app.use(express.json())/a \
// Middleware per risolvere problemi di formato risposta (aggiunto da fix-aws-delete-permissions.sh)\
const fixJsonMiddleware = require("./fix-middleware.js");\
app.use(fixJsonMiddleware);' "$APP_DIR/server/index.js"
  else
    # Inserisci alla fine delle inizializzazioni di express
    sed -i '/const app = express()/a \
// Middleware per risolvere problemi di formato risposta (aggiunto da fix-aws-delete-permissions.sh)\
const fixJsonMiddleware = require("./fix-middleware.js");\
app.use(fixJsonMiddleware);' "$APP_DIR/server/index.js"
  fi
  
  echo "Middleware aggiunto al file index.js"
else
  echo "ERRORE: File index.js non trovato in $APP_DIR/server/"
fi

# 4. Aggiornamento configurazione PM2
echo "Aggiornamento configurazione PM2..."
if command -v pm2 &> /dev/null; then
  # Aggiorna configurazione PM2 per aumentare limiti memoria
  cd $APP_DIR
  pm2 stop gervis
  
  # Aggiorna configurazione ecosystem
  if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    cp "$APP_DIR/ecosystem.config.js" "$APP_DIR/ecosystem.config.js.bak.$(date +%Y%m%d%H%M%S)"
    
    cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'gervis',
    script: 'server/index.js',
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '1G',
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 30000,
    max_restarts: 10,
    restart_delay: 4000
  }]
};
EOF
    
    echo "Configurazione PM2 aggiornata"
  else
    echo "ATTENZIONE: File ecosystem.config.js non trovato"
  fi
  
  # Riavvia l'applicazione
  pm2 start ecosystem.config.js
  pm2 save
else
  echo "ATTENZIONE: PM2 non installato"
fi

echo "Operazione completata. È necessario testare manualmente la funzionalità di eliminazione cliente."
echo "Utilizzare lo script check-aws-client-error-improved.js per testare il funzionamento."