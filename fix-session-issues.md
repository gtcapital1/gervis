# Guida alla Risoluzione dei Problemi di Sessione per Gervis

Questo documento contiene le procedure da seguire per risolvere problemi comuni relativi alle sessioni utente nell'applicazione Gervis.

## Errore 401 "Not authenticated" in AWS
Questo problema si verifica quando la sessione dell'utente non viene mantenuta correttamente tra le richieste.

### Soluzione 1: Reset delle Sessioni e Riavvio del Server
Eseguire lo script di reset dedicato:

```bash
cd /var/www/gervis
sudo ./reset-sessions.sh
```

Lo script esegue automaticamente queste operazioni:
1. Arresto di tutte le istanze dell'applicazione
2. Ricerca del database corretto
3. Svuotamento della tabella session
4. Riavvio del servizio PostgreSQL
5. Avvio dell'applicazione con PM2

### Soluzione 2: Problemi di Cookie
Se il problema persiste, potrebbe essere dovuto a cookie salvati nel browser:

1. Prova a utilizzare la modalità di navigazione in incognito
2. Cancella la cache e i cookie per il dominio gervis.it
3. Riprova ad accedere all'applicazione

### Soluzione 3: Problemi di Proxy/Port
Se l'applicazione è dietro un proxy:

1. Verifica che `app.set("trust proxy", 1)` sia impostato correttamente
2. Controlla che il proxy stia passando correttamente gli header

```bash
# Verifica configurazione proxy
sudo grep -r "trust proxy" /var/www/gervis/server/
```

### Soluzione 4: Problemi con il Database delle Sessioni
Se la tabella delle sessioni esiste ma non funziona correttamente:

```bash
# Verifica esistenza e struttura della tabella session
sudo -u postgres psql -d gervis -c "\d session"

# Ricrea la tabella session con i permessi corretti
sudo -u postgres psql -d gervis -c "DROP TABLE IF EXISTS session;"
sudo -u postgres psql -d gervis -c "CREATE TABLE session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);"
sudo -u postgres psql -d gervis -c "CREATE INDEX IDX_session_expire ON session(expire);"
```

### Controllo dei Log
Per diagnosticare ulteriormente il problema:

```bash
# Controlla i log di PM2
sudo pm2 logs --lines 200

# Controlla output specifico relativo alle sessioni
sudo pm2 logs | grep -i "session\|cookie\|auth"
```

### Verifica di Stato
Per verificare che il server sia in esecuzione correttamente:

```bash
# Verifica status PM2
sudo pm2 list

# Controlla che il processo stia ascoltando sulla porta corretta
sudo lsof -i :5000
```

## Note per lo Sviluppo
Quando si effettuano modifiche al codice che influiscono sull'autenticazione:

1. **Non alterare la configurazione delle sessioni** in `/server/auth.ts` senza verificare l'impatto su tutte le piattaforme
2. **Non modificare i nomi delle tabelle** (es. `session`) senza aggiornare anche la configurazione PgSession
3. **Considera sempre la compatibilità** con l'utilizzo di proxy in produzione

## Riferimenti
- [Documentazione connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple)
- [Express Session](https://expressjs.com/en/resources/middleware/session.html)
- [Passport.js](http://www.passportjs.org/)