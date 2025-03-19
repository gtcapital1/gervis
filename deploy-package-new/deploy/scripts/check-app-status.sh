#!/bin/bash

# Script per verificare lo stato dell'applicazione Gervis
# Questo script controlla se tutti i componenti sono attivi e funzionanti

set -e  # Interrompi lo script in caso di errore

echo "=== Controllo stato applicazione Gervis ==="

check_command() {
  if ! command -v $1 &> /dev/null; then
    echo "⨯ Il comando '$1' non è installato."
    return 1
  fi
  return 0
}

# Controlla requisiti
echo -n "Verifica requisiti... "
MISSING=0

if ! check_command systemctl; then MISSING=$((MISSING+1)); fi
if ! check_command curl; then MISSING=$((MISSING+1)); fi
if ! check_command pm2; then MISSING=$((MISSING+1)); fi
if ! check_command psql; then MISSING=$((MISSING+1)); fi

if [ $MISSING -eq 0 ]; then
  echo "✓ Tutti i comandi necessari sono disponibili."
else
  echo "⨯ Mancano $MISSING comandi necessari."
fi

# Controlla Nginx
echo -n "Controllo stato Nginx... "
if systemctl is-active --quiet nginx; then
  echo "✓ Nginx è in esecuzione."
else
  echo "⨯ Nginx non è in esecuzione!"
  echo "   Prova a eseguire: sudo systemctl start nginx"
fi

# Controlla la configurazione di Nginx
echo -n "Controllo configurazione Nginx... "

# Controlla dove si trova il file di configurazione di Nginx
if [ -f "/etc/nginx/conf.d/gervis.conf" ]; then
  CONFIG_PATH="/etc/nginx/conf.d/gervis.conf"
elif [ -f "/etc/nginx/sites-available/gervis" ]; then
  CONFIG_PATH="/etc/nginx/sites-available/gervis"
  if [ ! -L "/etc/nginx/sites-enabled/gervis" ]; then
    echo "⨯ Il file di configurazione esiste ma non è attivato in sites-enabled!"
    exit 1
  fi
else
  echo "⨯ File di configurazione di Nginx per Gervis non trovato!"
  echo "   Esegui lo script fix-nginx.sh per creare la configurazione."
  exit 1
fi

# Ottieni il dominio configurato
DOMAIN=$(grep "server_name" $CONFIG_PATH | awk '{print $2}' | sed 's/;//')
echo "✓ Trovata configurazione Nginx per il dominio: $DOMAIN"

# Controlla PostgreSQL
echo -n "Controllo stato PostgreSQL... "
if systemctl is-active --quiet postgresql; then
  echo "✓ PostgreSQL è in esecuzione."
else
  echo "⨯ PostgreSQL non è in esecuzione!"
  echo "   Prova a eseguire: sudo systemctl start postgresql"
fi

# Controlla se il database Gervis esiste
echo -n "Controllo database Gervis... "
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw gervis; then
  echo "✓ Il database 'gervis' esiste."
else
  echo "⨯ Il database 'gervis' non esiste!"
  exit 1
fi

# Controlla PM2 e l'applicazione Gervis
echo -n "Controllo applicazione in PM2... "
if pm2 list | grep -q "gervis"; then
  PM2_STATUS=$(pm2 list | grep "gervis" | awk '{print $10}')
  if [ "$PM2_STATUS" == "online" ]; then
    echo "✓ L'applicazione Gervis è in esecuzione con PM2."
  else
    echo "⨯ L'applicazione Gervis è registrata in PM2 ma non è in esecuzione (stato: $PM2_STATUS)!"
    echo "   Prova a eseguire: pm2 restart gervis"
  fi
else
  echo "⨯ L'applicazione Gervis non è configurata in PM2!"
  echo "   Controlla se il file ecosystem.config.js esiste e avvia l'applicazione con:"
  echo "   cd /var/www/gervis && pm2 start ecosystem.config.js"
fi

# Verifica la connettività all'applicazione
echo -n "Verifica connettività all'applicazione (localhost:3000)... "
if curl -s http://localhost:3000 -o /dev/null; then
  echo "✓ L'applicazione risponde su localhost:3000."
else
  echo "⨯ Impossibile connettersi all'applicazione su localhost:3000!"
  echo "   Controlla i log dell'applicazione con: pm2 logs gervis"
fi

# Verifica la connettività tramite Nginx
echo -n "Verifica connettività tramite Nginx ($DOMAIN)... "
CURL_RESULT=$(curl -s -L -o /dev/null -w "%{http_code}" "http://$DOMAIN")
if [ "$CURL_RESULT" == "200" ]; then
  echo "✓ Il sito è accessibile tramite Nginx ($CURL_RESULT)."
elif [ "$CURL_RESULT" == "301" ] || [ "$CURL_RESULT" == "302" ]; then
  echo "✓ Il sito risponde con redirect ($CURL_RESULT). Probabilmente hai HTTPS configurato."
else
  echo "⨯ Il sito non risponde correttamente tramite Nginx (codice HTTP: $CURL_RESULT)!"
  echo "   Controlla i log di Nginx con: sudo tail -f /var/log/nginx/error.log"
fi

echo ""
echo "=== Controllo completato! ==="
echo ""
echo "Se riscontri problemi, controlla i seguenti file di log:"
echo "- Log Nginx: sudo tail -f /var/log/nginx/error.log"
echo "- Log PostgreSQL: sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log"
echo "- Log applicazione: pm2 logs gervis"