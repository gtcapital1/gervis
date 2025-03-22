#!/bin/bash
# Script per risolvere errori 502 in applicazione Node.js con proxy

echo "=== DIAGNOSTICA E RISOLUZIONE ERRORE 502 BAD GATEWAY ==="
echo ""

# Ferma tutte le istanze dell'applicazione
echo "1. Arresto di tutte le istanze PM2..."
sudo pm2 stop all
sudo pm2 delete all
sudo killall -9 node 2>/dev/null || true

# Verifica porte in uso
echo ""
echo "2. Verifica porte in uso..."
PORTS_IN_USE=$(sudo lsof -i :5000)
if [ -n "$PORTS_IN_USE" ]; then
  echo "ATTENZIONE: La porta 5000 è ancora in uso da altri processi:"
  echo "$PORTS_IN_USE"
  echo "Tentativo di terminare tutti i processi sulla porta 5000..."
  sudo fuser -k 5000/tcp
  echo "Verifica dopo la terminazione:"
  sudo lsof -i :5000
else
  echo "Porta 5000 libera e disponibile."
fi

# Verifica configurazione del sistema
echo ""
echo "3. Controllo della configurazione del sistema..."
echo "Limiti di file aperti:"
ulimit -n
echo "Memoria disponibile:"
free -m
echo "Spazio su disco:"
df -h

# Riavvia il database
echo ""
echo "4. Riavvio di PostgreSQL..."
sudo systemctl restart postgresql
sleep 2
echo "PostgreSQL riavviato."

# Verifica configurazione Nginx
echo ""
echo "5. Verifica presenza e configurazione di Nginx..."
if command -v nginx >/dev/null 2>&1; then
  echo "Nginx è installato. Verifico la configurazione..."
  NGINX_CONF=$(find /etc/nginx -name "*.conf" | xargs grep -l "proxy_pass.*5000" 2>/dev/null)
  
  if [ -n "$NGINX_CONF" ]; then
    echo "Trovata configurazione Nginx che inoltra al server Node.js:"
    echo "$NGINX_CONF"
    echo "Contenuto della configurazione:"
    cat $NGINX_CONF
    
    echo "Verifico timeout e buffer di Nginx..."
    grep -E "proxy_read_timeout|proxy_buffer_size|proxy_buffers|proxy_busy_buffers_size" $NGINX_CONF
    
    echo "Riavvio Nginx..."
    sudo systemctl restart nginx
    echo "Nginx riavviato."
  else
    echo "Non ho trovato configurazioni Nginx che inoltrino alla porta 5000."
  fi
else
  echo "Nginx non è installato. Ignoro questo passaggio."
fi

# Ottimizza le impostazioni dell'app
echo ""
echo "6. Ottimizzazione dell'applicazione..."

# Aumenta i timeout
TIMEOUT_VARS="const originalResJson.*\|const originalSend.*\|app.use\(express.json.*\|app.use\(express.urlencoded.*"
echo "Verifico impostazioni di timeout nell'app:"
grep -E "$TIMEOUT_VARS" /var/www/gervis/server/index.ts

# Verifica il file .env
echo ""
echo "7. Controllo variabili d'ambiente critiche..."
sudo grep -i "SESSION_SECRET\|NODE_ENV\|BASE_URL\|HOST\|PORT" /var/www/gervis/.env | grep -v "PASSWORD"

# Avvio dell'applicazione con configurazione ottimizzata
echo ""
echo "8. Avvio dell'applicazione con configurazione ottimizzata..."
cd /var/www/gervis

# Imposta variabili d'ambiente esplicite per evitare problemi di proxy
echo "Avvio dell'app con configurazione proxy esplicita..."
NODE_ENV=production HOST=0.0.0.0 PORT=5000 sudo pm2 start ecosystem.config.cjs

# Verifica lo stato dell'app
echo ""
echo "9. Verifica dello stato dell'applicazione..."
sleep 3
sudo pm2 list
sudo pm2 logs --lines 20

echo ""
echo "=== COMPLETATO ==="
echo "Aprire l'applicazione nel browser e verificare che l'errore 502 sia stato risolto."
echo "Se il problema persiste, controlla i log con 'sudo pm2 logs' e verifica eventuali"
echo "firewall o limitazioni di rete che potrebbero interferire con la comunicazione."
echo ""
echo "Altri comandi utili per il debug:"
echo "- Verifica richieste in tempo reale: sudo pm2 logs --lines 100"
echo "- Test API con curl: curl -v http://localhost:5000/api/user"