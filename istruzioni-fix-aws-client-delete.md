# Istruzioni per Risolvere il Problema di Eliminazione Clienti su AWS

## Panoramica del Problema

Il problema `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON` si verifica perché il server AWS sta restituendo una pagina HTML di errore invece di una risposta JSON quando si tenta di eliminare un cliente. Questo è probabilmente causato da uno di questi motivi:

1. **Permessi insufficienti** - L'utente del database non ha i permessi DELETE sulle tabelle necessarie
2. **Vincoli CASCADE non configurati** - I vincoli per l'eliminazione a cascata non sono impostati correttamente
3. **Proxy/Configurazione server** - Un problema di configurazione Nginx o proxy che intercetta gli errori 500

## Soluzioni

### Soluzione 1: Eseguire lo script di fix specifico per AWS

Abbiamo creato uno script specifico per AWS che verifica e risolve automaticamente i problemi di permessi e vincoli:

```bash
# Collegati al server via SSH
ssh ubuntu@IP_DEL_SERVER

# Vai alla directory dell'app
cd /var/www/gervis

# Esegui lo script di fix
NODE_ENV=production npx tsx server/migrations/fix-aws-delete-error.ts
```

Questo script eseguirà:
- Verifica dei permessi DELETE sulle tabelle principali
- Aggiunta di permessi mancanti
- Controllo e configurazione dei vincoli CASCADE
- Diagnostica completa dell'operazione

### Soluzione 2: Verifica delle risposte del server

Per diagnosticare meglio il problema, abbiamo creato uno script che esegue direttamente la richiesta DELETE e mostra dettagli completi sulla risposta:

```bash
# Esegui lo script diagnostico
node check-aws-client-error.js https://tuodominio.it "connect.sid=s%3A..." ID_CLIENTE
```

Sostituisci:
- `https://tuodominio.it` con l'URL del tuo sito
- `connect.sid=s%3A...` con il cookie di sessione di un utente loggato (dal browser)
- `ID_CLIENTE` con l'ID del cliente che vuoi eliminare

### Soluzione 3: Verifica configurazione Nginx

Se gli script precedenti non risolvono il problema, è possibile che ci sia un problema con la configurazione Nginx che intercetta gli errori 500 e li converte in pagine HTML:

```bash
# Controlla la configurazione Nginx
sudo nano /etc/nginx/sites-available/gervis

# Cerca e commenta eventuali direttive error_page per gli errori 500
# error_page 500 502 503 504 /50x.html;

# Riavvia Nginx
sudo systemctl reload nginx
```

## Verifica Finale

Dopo aver applicato le soluzioni, puoi verificare se il problema è stato risolto:

1. Accedi all'applicazione web
2. Naviga alla dashboard clienti
3. Tenta di eliminare un cliente
4. Controlla la console del browser per verificare la risposta

Se il problema persiste, controlla i log del server per ulteriori dettagli:

```bash
# Controlla i log PM2
pm2 logs gervis --lines 100
```

## Come Funziona la Soluzione

Il fix principale opera in tre passaggi:

1. **Permessi**: Assicura che l'utente del database abbia i permessi DELETE necessari
2. **Vincoli**: Riconfigura i vincoli di chiave esterna per utilizzare l'eliminazione a CASCADE
3. **Verifica**: Esegue verifiche aggiuntive per confermare che le modifiche siano state applicate correttamente

In PostgreSQL, l'eliminazione CASCADE sui vincoli di chiave esterna è essenziale per eliminare automaticamente i record correlati in altre tabelle.

## Note per il Futuro Deployment

Per futuri deployment, considera di aggiungere queste configurazioni al tuo script di setup:

```sql
-- Esempio di SQL per futuri deployment
ALTER TABLE assets
DROP CONSTRAINT IF EXISTS assets_client_id_fkey,
ADD CONSTRAINT assets_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

ALTER TABLE recommendations
DROP CONSTRAINT IF EXISTS recommendations_client_id_fkey,
ADD CONSTRAINT recommendations_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

-- Assicurati che l'utente abbia i permessi corretti
GRANT DELETE ON clients, assets, recommendations TO gervis_user;
```

Questo garantirà che la funzionalità di eliminazione clienti funzioni correttamente su qualsiasi nuova installazione.