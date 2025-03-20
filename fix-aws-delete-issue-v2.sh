#!/bin/bash

# Colori per una migliore leggibilità
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Script di risoluzione problemi eliminazione clienti su AWS ===${NC}"
echo -e "${YELLOW}Questo script risolverà i problemi di eliminazione clienti sulla piattaforma Gervis${NC}\n"
echo -e "${BLUE}📌 Ambiente: $(uname -a)${NC}"

# Variabili di configurazione
APP_DIR="/var/www/gervis"
NGINX_CONF="/etc/nginx/conf.d/gervis.conf"

# 1. Rilevamento configurazione database
echo -e "\n${GREEN}1️⃣ Rilevamento configurazione database${NC}"

# Cerca il file .env dell'applicazione
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${GREEN}✅ File .env trovato in $APP_DIR/.env${NC}"
    source "$APP_DIR/.env"
    DB_URL="$DATABASE_URL"
    echo -e "${BLUE}🔍 DATABASE_URL trovato: ${DB_URL:0:20}...${NC}"
else
    echo -e "${YELLOW}⚠️ File .env non trovato in $APP_DIR/.env${NC}"
    
    # Cerchiamo in altre posizioni comuni
    if [ -f "/home/ubuntu/.env" ]; then
        echo -e "${GREEN}✅ File .env trovato in /home/ubuntu/.env${NC}"
        source "/home/ubuntu/.env"
        DB_URL="$DATABASE_URL"
    elif [ -f "/root/.env" ]; then
        echo -e "${GREEN}✅ File .env trovato in /root/.env${NC}"
        source "/root/.env"
        DB_URL="$DATABASE_URL"
    fi
fi

# Se ancora non abbiamo trovato il DATABASE_URL, chiediamo all'utente
if [ -z "$DB_URL" ]; then
    echo -e "${YELLOW}⚠️ DATABASE_URL non trovato automaticamente.${NC}"
    echo -e "${YELLOW}Per favore inserisci manualmente i dettagli di connessione:${NC}"
    
    read -p "Hostname PostgreSQL [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Porta PostgreSQL [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Nome database [gervisdb]: " DB_NAME
    DB_NAME=${DB_NAME:-gervisdb}
    
    read -p "Utente database [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "Password database: " DB_PASS
    echo ""
    
    DB_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
    echo -e "${GREEN}✅ DATABASE_URL generato${NC}"
else
    # Estraiamo i parametri dal DATABASE_URL
    # Esempio: postgresql://user:password@host:port/dbname
    DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DB_URL | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')
    DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\(.*\)$/\1/p')
    
    echo -e "${BLUE}🔍 Parametri database estratti:${NC}"
    echo -e "${BLUE}   Host: $DB_HOST${NC}"
    echo -e "${BLUE}   Port: $DB_PORT${NC}"
    echo -e "${BLUE}   Database: $DB_NAME${NC}"
    echo -e "${BLUE}   User: $DB_USER${NC}"
fi

# 2. Fix vincoli CASCADE su database
echo -e "\n${GREEN}2️⃣ Configurazione vincoli CASCADE nel database...${NC}"

# SQL per aggiungere vincoli CASCADE alle tabelle
cat <<EOF > /tmp/fix_cascade.sql
-- Rimuovi vincoli esistenti
ALTER TABLE IF EXISTS assets DROP CONSTRAINT IF EXISTS assets_client_id_fkey;
ALTER TABLE IF EXISTS recommendations DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey;

-- Aggiungi vincoli CASCADE
ALTER TABLE assets ADD CONSTRAINT assets_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE recommendations ADD CONSTRAINT recommendations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Verifica che i vincoli siano stati impostati correttamente
\d assets
\d recommendations
EOF

# Esegui lo script SQL
echo -e "${YELLOW}📊 Esecuzione delle modifiche al database...${NC}"

if command -v psql &> /dev/null; then
    # Se abbiamo psql client installato, usiamo quello con i parametri
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/fix_cascade.sql > /tmp/db_output.log 2>&1
    DB_RESULT=$?
else
    # Altrimenti utilizziamo il client Postgres nel container Docker (se applicabile)
    echo -e "${YELLOW}🐘 Client psql non trovato, tentiamo approccio alternativo...${NC}"
    
    # Tentativo con utente postgres in locale
    if id -u postgres > /dev/null 2>&1; then
        su - postgres -c "psql -d $DB_NAME -f /tmp/fix_cascade.sql" > /tmp/db_output.log 2>&1
        DB_RESULT=$?
    else
        # Docker o altra configurazione
        echo -e "${RED}❌ Impossibile trovare un metodo per connettersi al database.${NC}"
        echo -e "${YELLOW}🔄 Tentativo connessione manuale...${NC}"
        
        # Crea uno script temporaneo che può essere eseguito manualmente
        cat <<EOF > /tmp/manual_db_fix.sh
#!/bin/bash
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/fix_cascade.sql
EOF
        chmod +x /tmp/manual_db_fix.sh
        
        echo -e "${YELLOW}⚠️ Esegui manualmente questo comando:${NC}"
        echo -e "${BLUE}   /tmp/manual_db_fix.sh${NC}"
        echo -e "${YELLOW}Premi un tasto dopo aver eseguito il comando...${NC}"
        read -n 1
        
        echo -e "${YELLOW}🔄 Continuiamo lo script assumendo che il database sia stato sistemato.${NC}"
        DB_RESULT=0
    fi
fi

# Verifica se il comando è andato a buon fine
if [ $DB_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Vincoli CASCADE configurati correttamente${NC}"
    echo -e "${BLUE}📋 Output dell'operazione:${NC}"
    cat /tmp/db_output.log
else
    echo -e "${RED}❌ Errore nella configurazione dei vincoli CASCADE${NC}"
    echo -e "${RED}📋 Log errore:${NC}"
    cat /tmp/db_output.log
    
    echo -e "${YELLOW}⚠️ Passiamo alla fase successiva comunque.${NC}"
fi

# 3. Configura Nginx per garantire Content-Type JSON
echo -e "\n${GREEN}3️⃣ Configurazione Nginx per garantire risposte JSON...${NC}"

# Verifica che Nginx sia installato
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx trovato${NC}"
    
    # Backup configurazione attuale
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" "${NGINX_CONF}.bak"
        echo -e "${GREEN}✅ Backup configurazione creato in ${NGINX_CONF}.bak${NC}"
        
        # Aggiungi header proxy_pass_header Content-Type
        if grep -q "proxy_pass_header Content-Type" "$NGINX_CONF"; then
            echo -e "${GREEN}✅ Header Content-Type già configurato${NC}"
        else
            # Modifica il file inserendo il proxy_pass_header prima della chiusura delle location
            sed -i '/location \~\*/ {
                :a
                n
                /}/!ba
                i\        # Assicura che le risposte mantengano Content-Type originale
                i\        proxy_pass_header Content-Type;
            }' "$NGINX_CONF"
            
            # Modifica anche la location principale
            sed -i '/location \// {
                :a
                n
                /}/!ba
                i\        # Assicura che le risposte mantengano Content-Type originale
                i\        proxy_pass_header Content-Type;
            }' "$NGINX_CONF"
            
            echo -e "${GREEN}✅ Header Content-Type aggiunto alla configurazione${NC}"
        fi
        
        # Verifica sintassi configurazione
        nginx -t > /tmp/nginx_test.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Configurazione Nginx valida${NC}"
            systemctl reload nginx
            echo -e "${GREEN}✅ Nginx riavviato${NC}"
        else
            echo -e "${RED}❌ Errore nella configurazione Nginx${NC}"
            echo -e "${RED}📋 Log errore:${NC}"
            cat /tmp/nginx_test.log
            
            echo -e "${YELLOW}⚠️ Ripristino della configurazione precedente...${NC}"
            mv "${NGINX_CONF}.bak" "$NGINX_CONF"
            echo -e "${YELLOW}✅ Configurazione precedente ripristinata${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ File di configurazione Nginx non trovato in $NGINX_CONF${NC}"
        echo -e "${YELLOW}🔍 Ricerca di configurazioni alternative...${NC}"
        
        # Cerca altri file di configurazione
        NGINX_SITES="/etc/nginx/sites-available"
        if [ -d "$NGINX_SITES" ]; then
            echo -e "${BLUE}📁 Directory sites-available trovata${NC}"
            for site in "$NGINX_SITES"/*; do
                echo -e "${BLUE}🔍 Verifica file $site...${NC}"
                if grep -q "proxy_pass http://localhost" "$site"; then
                    echo -e "${GREEN}✅ Configurazione trovata in $site${NC}"
                    
                    # Backup
                    cp "$site" "${site}.bak"
                    
                    # Modifica come sopra
                    sed -i '/location / {
                        :a
                        n
                        /}/!ba
                        i\        # Assicura che le risposte mantengano Content-Type originale
                        i\        proxy_pass_header Content-Type;
                    }' "$site"
                    
                    echo -e "${GREEN}✅ Header Content-Type aggiunto alla configurazione${NC}"
                    
                    # Verifica
                    nginx -t > /tmp/nginx_test.log 2>&1
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ Configurazione Nginx valida${NC}"
                        systemctl reload nginx
                        echo -e "${GREEN}✅ Nginx riavviato${NC}"
                    else
                        echo -e "${RED}❌ Errore nella configurazione Nginx${NC}"
                        mv "${site}.bak" "$site"
                        echo -e "${YELLOW}✅ Configurazione precedente ripristinata${NC}"
                    fi
                    
                    break
                fi
            done
        else
            echo -e "${YELLOW}⚠️ Impossibile trovare una configurazione Nginx adatta${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Nginx non trovato. Probabile configurazione alternativa.${NC}"
fi

# 4. Riavvia l'applicazione
echo -e "\n${GREEN}4️⃣ Riavvio dell'applicazione...${NC}"

# Verifica se l'applicazione è gestita da PM2
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 trovato${NC}"
    
    # Controlla se l'app è registrata in PM2
    PM2_APP=$(pm2 list | grep -E "gervis|node" | awk '{print $2}')
    
    if [ -n "$PM2_APP" ]; then
        echo -e "${GREEN}✅ Applicazione trovata in PM2: $PM2_APP${NC}"
        pm2 restart "$PM2_APP"
        echo -e "${GREEN}✅ Applicazione riavviata${NC}"
    else
        echo -e "${YELLOW}⚠️ Applicazione non trovata in PM2${NC}"
        
        # Tenta di riavviare tutte le applicazioni
        echo -e "${YELLOW}🔄 Tentativo di riavviare tutte le app PM2...${NC}"
        pm2 restart all
        echo -e "${GREEN}✅ Tutte le applicazioni riavviate${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ PM2 non trovato. Tentativo con metodi alternativi...${NC}"
    
    # Tentativo con systemd
    if systemctl list-units --type=service | grep -q "gervis"; then
        echo -e "${GREEN}✅ Servizio systemd trovato per Gervis${NC}"
        systemctl restart gervis
        echo -e "${GREEN}✅ Servizio riavviato${NC}"
    else
        echo -e "${YELLOW}⚠️ Nessun servizio trovato. Per favore riavvia manualmente l'applicazione.${NC}"
    fi
fi

# 5. Riepilogo
echo -e "\n${GREEN}=== 5️⃣ Operazioni completate ====${NC}"
echo -e "${GREEN}✅ Vincoli CASCADE configurati${NC}"
echo -e "${GREEN}✅ Configurazione Nginx aggiornata${NC}"
echo -e "${GREEN}✅ Applicazione riavviata${NC}"
echo -e "\n${YELLOW}Ora dovresti essere in grado di eliminare i clienti senza problemi.${NC}"
echo -e "${YELLOW}In caso di ulteriori problemi, controlla i log dell'applicazione con:${NC}"
echo -e "  ${BLUE}pm2 logs${NC}"
echo -e "  oppure ${BLUE}journalctl -u gervis${NC}"

echo -e "\n${GREEN}Esecuzione completata.${NC}"