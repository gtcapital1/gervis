# Istruzioni per Correggere l'Errore 502 Bad Gateway su AWS

Questo documento fornisce istruzioni dettagliate per correggere l'errore 502 Bad Gateway sul server AWS.

## Problema

L'applicazione sul server AWS presenta un errore 502 Bad Gateway a causa di incompatibilità tra moduli ES e CommonJS. 
Il problema principale è che l'applicazione è configurata per utilizzare moduli ES (ECMAScript Modules) con `"type": "module"` nel `package.json`, 
ma alcuni file e script di avvio utilizzano la sintassi CommonJS (`require()`).

## Soluzione

Abbiamo adottato la seguente soluzione:

1. Modificato `ecosystem.config.cjs` per utilizzare il file compilato `dist/index.js` invece di `index.cjs`
2. Creato uno script di correzione completo che automatizza il processo di riavvio del server

## Istruzioni per Applicare la Correzione

### Metodo 1: Utilizzando lo Script Automatico (Consigliato)

1. Accedi al server AWS tramite SSH
2. Naviga nella directory dell'applicazione:
   ```
   cd /var/www/gervis
   ```
3. Aggiorna il repository da Git:
   ```
   git pull
   ```
4. Rendi eseguibile lo script di correzione:
   ```
   chmod +x fix-aws-server.sh
   ```
5. Esegui lo script:
   ```
   sudo ./fix-aws-server.sh
   ```
6. Verifica che l'applicazione sia in esecuzione:
   ```
   sudo pm2 status
   ```
7. Controlla i log per eventuali errori:
   ```
   sudo pm2 logs gervis
   ```

### Metodo 2: Correzione Manuale

Se lo script automatico non funziona, segui questi passaggi manuali:

1. Accedi al server AWS tramite SSH
2. Naviga nella directory dell'applicazione:
   ```
   cd /var/www/gervis
   ```
3. Aggiorna il repository da Git:
   ```
   git pull
   ```
4. Installa `node-fetch` (necessario per le API di mercato):
   ```
   npm install node-fetch
   ```
5. Esegui la build dell'applicazione:
   ```
   npm run build
   ```
6. Ferma tutti i processi Node.js:
   ```
   sudo pm2 stop all
   sudo pm2 delete all
   sudo killall -9 node
   ```
7. Riavvia l'applicazione:
   ```
   sudo NODE_ENV=production HOST=0.0.0.0 PORT=5000 pm2 start ecosystem.config.cjs
   ```
8. Riavvia Nginx:
   ```
   sudo systemctl restart nginx
   ```
9. Verifica lo stato dell'applicazione:
   ```
   sudo pm2 status
   ```

## Verifica della Correzione

Dopo aver applicato la correzione, verifica che il sito funzioni correttamente accedendo a:

```
https://gervis.it
```

Controlla in particolare:

1. Login e autenticazione
2. Visualizzazione e gestione dei clienti
3. Visualizzazione dei dati di mercato
4. Funzionalità email di onboarding

Se incontri ancora problemi, consulta i log per identificare eventuali errori specifici:

```
sudo pm2 logs gervis
```

## Note Tecniche

- L'applicazione è stata configurata per utilizzare la versione compilata `dist/index.js` che è compatibile con l'ambiente di produzione
- Lo script `fix-aws-server.sh` include passaggi per assicurarsi che non ci siano processi Node.js in conflitto sulla porta 5000
- Le variabili d'ambiente `NODE_ENV=production`, `HOST=0.0.0.0` e `PORT=5000` sono specificate esplicitamente nel comando di avvio per garantire la configurazione corretta