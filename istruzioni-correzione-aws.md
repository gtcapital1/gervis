# Istruzioni per la correzione dell'errore 502 Bad Gateway su AWS

Abbiamo identificato che il problema principale su AWS è un errore 502 Bad Gateway nella comunicazione tra Nginx e l'applicazione Node.js. Questo errore si manifesta specificamente durante l'autenticazione, impedendo agli utenti di accedere all'applicazione.

## 1. Scaricare gli script di correzione

Per prima cosa, esegui questi comandi sul server AWS:

```bash
cd /var/www/gervis
git pull origin main
chmod +x fix-nginx-node-gateway.sh
```

## 2. Eseguire lo script di correzione

Questo script automatico diagnosticherà e correggerà i problemi di comunicazione tra Nginx e Node.js:

```bash
sudo ./fix-nginx-node-gateway.sh
```

## 3. Verificare la correzione

Dopo aver eseguito lo script, verifica che l'errore 502 Bad Gateway sia stato risolto:

1. Apri https://gervis.it nel browser
2. Prova ad accedere con le tue credenziali
3. Verifica che la pagina di login funzioni correttamente
4. Controlla che la dashboard si carichi senza errori

## 4. Verifica dei log

Se il problema persiste, controlla i log per ulteriori dettagli:

```bash
# Log di Nginx
sudo tail -f /var/log/nginx/error.log

# Log dell'applicazione Node.js
sudo pm2 logs
```

## Cosa fa lo script di correzione?

Lo script `fix-nginx-node-gateway.sh` esegue queste operazioni:

1. **Verifica lo stato dell'applicazione Node.js**
   - Controlla se l'app è in esecuzione
   - Riavvia l'app se necessario

2. **Verifica il processo in ascolto sulla porta 5000**
   - Controlla se la porta 5000 è libera e accessibile
   - Riavvia l'applicazione se necessario

3. **Ottimizza la configurazione di Nginx**
   - Aumenta i timeout di connessione (`proxy_read_timeout`, ecc.)
   - Aumenta le dimensioni dei buffer
   - Configura correttamente l'header Host

4. **Configura trust proxy in Express**
   - Verifica che Express sia configurato per lavorare correttamente dietro un proxy

5. **Riavvia i servizi**
   - Riavvia sia Nginx che l'applicazione Node.js

## Contatta per supporto

Se hai bisogno di ulteriore assistenza con questa correzione, non esitare a contattarci.