#!/bin/bash
# Script per diagnosticare problemi di sessione in un'applicazione Express

echo "=== CONTROLLO CONFIGURAZIONE SESSIONE ==="
echo ""

echo "1. Controllo configurazione sessione in server/index.ts:"
grep -A 15 "session" /var/www/gervis/server/index.ts

echo ""
echo "2. Controllo configurazione della sessione nel database PostgreSQL:"
sudo -u postgres psql -c "\l" | grep gervis
DATABASE_NAME=$(sudo -u postgres psql -c "\l" | grep gervis | awk '{print $1}')

if [ -n "$DATABASE_NAME" ]; then
  echo "Database trovato: $DATABASE_NAME"
  echo "Controllo tabella session:"
  sudo -u postgres psql -d $DATABASE_NAME -c "\dt session"
  
  echo "Verifica contenuto tabella session:"
  sudo -u postgres psql -d $DATABASE_NAME -c "SELECT COUNT(*) FROM session;"
  
  echo "Esempi di sessioni (se presenti):"
  sudo -u postgres psql -d $DATABASE_NAME -c "SELECT sid, expire FROM session LIMIT 3;"
else
  echo "Nessun database trovato con nome simile a 'gervis'"
  echo "Elenco di tutti i database:"
  sudo -u postgres psql -c "\l"
fi

echo ""
echo "3. Controllo variabili d'ambiente relative alla sessione:"
grep -i "session\|cookie\|secret" /var/www/gervis/.env | grep -v PASSWORD

echo ""
echo "4. Controllo storage.ts per verificare la configurazione PgSession:"
grep -A 15 "setupPgSession\|PgSession" /var/www/gervis/server/storage.ts

echo ""
echo "5. Informazioni sul server e risorse:"
echo "Memoria:"
free -m

echo "Utilizzo disco:"
df -h /var/www/gervis

echo ""
echo "6. Controllo log recenti relativi alla sessione:"
grep -i "session\|connect.sid\|cookie" /root/.pm2/logs/gervis-error-0.log | tail -10

echo ""
echo "=== COMPLETATO ==="
echo "Esegui questi comandi per riavviare il servizio e pulire le sessioni:"
echo "sudo pm2 delete all"
echo "sudo -u postgres psql -d <database_name> -c 'TRUNCATE session;'"
echo "cd /var/www/gervis && sudo pm2 start ecosystem.config.cjs"