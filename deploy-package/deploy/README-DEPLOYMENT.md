# Guida Dettagliata al Deployment di Gervis su sito.it

Questa guida ti accompagna passo dopo passo nel processo di deployment dell'applicazione Gervis su un server esterno.

## Requisiti del Server

1. **Sistema Operativo**: Ubuntu 20.04 LTS o successivo (consigliato)
2. **Software richiesto**:
   - Node.js 20.x
   - PostgreSQL 14+
   - Nginx o Apache
   - PM2 (Process Manager per Node.js)
   - Git

## Passaggi di Deployment

### 1. Preparare il Pacchetto di Deployment

Sul tuo computer locale (dove stai sviluppando):

```bash
# Esegui lo script di preparazione
bash deploy/prepare-for-deploy.sh
```

Questo creerà un file `gervis-deploy.zip` con tutti i file necessari per il deployment.

### 2. Configurare il Server

1. **Installare le dipendenze sul server**:

```bash
# Aggiornare il sistema
sudo apt update && sudo apt upgrade -y

# Installare Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installare PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Installare Nginx
sudo apt install -y nginx

# Installare PM2 globalmente
sudo npm install -g pm2
```

2. **Configurare il firewall** (se necessario):

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

3. **Configurare SSL con Let's Encrypt**:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sito.it -d www.sito.it
```

### 3. Deployare l'Applicazione

1. **Caricare il pacchetto sul server**:

```bash
# Da eseguire sul tuo computer locale
scp gervis-deploy.zip user@sito.it:/tmp/
```

2. **Estrarre e configurare l'applicazione sul server**:

```bash
# Sul server
cd /var/www/
sudo mkdir -p gervis
sudo chown $USER:$USER gervis
cd gervis
cp /tmp/gervis-deploy.zip .
unzip gervis-deploy.zip

# Eseguire lo script di setup
bash deploy/scripts/setup.sh

# Configurare il file .env
nano .env
```

3. **Avviare l'applicazione**:

```bash
# Eseguire lo script di deployment
bash deploy/scripts/deploy.sh
```

### 4. Verificare il Deployment

1. **Verificare che l'applicazione sia in esecuzione**:

```bash
pm2 status
```

2. **Verificare che Nginx sia configurato correttamente**:

```bash
sudo nginx -t
```

3. **Verificare che il sito sia accessibile**:
   - Apri il browser e visita https://sito.it

### 5. Manutenzione e Aggiornamenti

Per aggiornare l'applicazione in futuro:

```bash
cd /var/www/gervis
git pull origin main
npm install --production
npm run build
pm2 reload gervis
```

## Risoluzione dei Problemi

### Errori di Connessione al Database

Se l'applicazione non riesce a connettersi al database:

1. Verifica che PostgreSQL sia in esecuzione:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verifica che il database esista e che l'utente abbia i permessi corretti:
   ```bash
   sudo -u postgres psql -c "\l"
   sudo -u postgres psql -c "\du"
   ```

3. Controlla le impostazioni di connessione nel file `.env`

### Errori di Nginx

Se il sito non è accessibile:

1. Verifica lo stato di Nginx:
   ```bash
   sudo systemctl status nginx
   ```

2. Controlla i log di errore:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verifica che la configurazione punti alla directory corretta

### Errori dell'Applicazione

Se l'applicazione si avvia ma non funziona correttamente:

1. Controlla i log di PM2:
   ```bash
   pm2 logs gervis
   ```

2. Verifica che tutte le variabili d'ambiente nel file `.env` siano configurate correttamente

## Supporto

Per ulteriore assistenza, contatta il team di sviluppo all'indirizzo email: supporto@sito.it