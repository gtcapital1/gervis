#!/bin/bash
# Script per resettare le sessioni e risolvere problemi di autenticazione

echo "=== RESET SESSIONI E RIAVVIO SERVER ==="
echo ""

# Ferma tutte le istanze dell'applicazione
echo "1. Arresto di tutte le istanze PM2..."
sudo pm2 stop all
sudo pm2 delete all
sudo killall -9 node 2>/dev/null || true

# Trova il database corretto
echo ""
echo "2. Ricerca del database..."
DATABASE_NAME=$(sudo -u postgres psql -c "\l" | grep -i gervis | awk '{print $1}')

if [ -z "$DATABASE_NAME" ]; then
  # Tentativo con nome generico se non troviamo gervis
  DATABASE_NAME=$(sudo grep -i "DATABASE_URL" /var/www/gervis/.env | sed 's/.*\/\([^?]*\).*/\1/')
fi

if [ -n "$DATABASE_NAME" ]; then
  echo "Database trovato: $DATABASE_NAME"
  
  # Verifica la tabella session
  echo ""
  echo "3. Verifica tabella session..."
  HAS_SESSION=$(sudo -u postgres psql -d $DATABASE_NAME -c "\dt session" | grep -c session)
  
  if [ "$HAS_SESSION" -gt 0 ]; then
    echo "Tabella session trovata. Pulizia tabella session..."
    sudo -u postgres psql -d $DATABASE_NAME -c "TRUNCATE session;"
    echo "Tabella session svuotata con successo!"
  else
    echo "Tabella session non trovata o problema di permessi."
    echo "Elenco delle tabelle nel database:"
    sudo -u postgres psql -d $DATABASE_NAME -c "\dt"
  fi
else
  echo "Nessun database trovato. Controllare manualmente la configurazione."
fi

# Riavvio del servizio PostgreSQL
echo ""
echo "4. Riavvio del servizio PostgreSQL..."
sudo systemctl restart postgresql
sleep 2
echo "PostgreSQL riavviato."

# Riavvio dell'applicazione
echo ""
echo "5. Avvio dell'applicazione..."
cd /var/www/gervis
sudo pm2 start ecosystem.config.cjs
echo "Applicazione avviata."

echo ""
echo "6. Verifico stato del processo..."
sudo pm2 list

echo ""
echo "=== COMPLETATO ==="
echo "Ora prova a ricaricare la pagina nel browser e accedere nuovamente."
echo "Se il problema persiste, cerca errori specifici nei log con:"
echo "sudo pm2 logs"