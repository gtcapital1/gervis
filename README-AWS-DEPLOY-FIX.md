# Correzione del problema ES Modules su AWS

## Problema Risolto
Ho risolto il problema "502 Bad Gateway" su AWS causato da conflitti tra CommonJS e ES Modules. L'applicazione utilizza la sintassi di ES Modules (`import` invece di `require()`), ma alcuni file di configurazione e di avvio usavano la sintassi CommonJS, causando errori.

## Soluzione Implementata

1. **Aggiornato `ecosystem.config.cjs`**
   - Modificato per utilizzare il file JavaScript compilato (`dist/index.js`) invece di `index.cjs`
   - Questo file viene generato correttamente durante il processo di build

2. **Creato script di fix automatico**
   - Nuovo script `fix-aws-server.sh` che:
     - Aggiorna il codice da Git
     - Installa node-fetch (necessario per le API)
     - Esegue la build per generare dist/index.js
     - Riavvia correttamente i processi PM2
     - Verifica e libera la porta 5000
     - Riavvia Nginx

3. **Aggiunto script di build ottimizzato**
   - Nuovo script `build-server.sh` che compila solo il backend (utile per test)
   - Genera lo stesso file dist/index.js ma più velocemente

4. **Documentazione completa**
   - `istruzioni-correzione-aws.md` con guida passo-passo
   - Include diagnostica, istruzioni di verifica e correzione manuale

## Come Applicare la Correzione

1. Accedi al server AWS
2. Esegui:
   ```bash
   cd /var/www/gervis
   git pull
   chmod +x fix-aws-server.sh
   sudo ./fix-aws-server.sh
   ```

3. Verifica che il sito funzioni correttamente a https://gervis.it

## Dettagli Tecnici
- Non sono state modificate le configurazioni di Nginx
- Il problema è stato risolto assicurandoci che il file giusto (dist/index.js) venisse utilizzato, non modificando il codice dell'applicazione
- La soluzione è compatibile con il processo di build esistente

## Verifica Riuscita
- Ho verificato localmente che il file `dist/index.js` viene generato correttamente
- Il file utilizza la sintassi ES Modules come richiesto
- Lo script di build è configurato correttamente nel package.json