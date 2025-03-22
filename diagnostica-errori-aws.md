# Diagnostica e Risoluzione Errori 502 su AWS

Questo documento fornisce una guida per diagnosticare e risolvere problemi di errore 502 Bad Gateway nell'applicazione Gervis quando è in esecuzione su AWS.

## Problema: Errore 502 Bad Gateway

L'errore 502 si verifica quando un server intermedio (gateway o proxy) riceve una risposta non valida dal server upstream. Nel contesto dell'applicazione Gervis, questo può accadere quando:

1. Il server Node.js è sovraccarico o si è bloccato
2. C'è un problema di comunicazione tra il proxy e il server Node.js
3. Le richieste richiedono troppo tempo per essere elaborate (timeout)
4. Conflitti di porta o problemi di binding

## Strumenti di Diagnostica

Per diagnosticare il problema, abbiamo creato diversi script:

1. `check-session-config.sh` - Verifica la configurazione delle sessioni
2. `reset-sessions.sh` - Resetta le sessioni e riavvia l'applicazione
3. `fix-502-gateway-error.sh` - Risolve problemi di errore 502

## Passaggi di Risoluzione

### 1. Verificare che tutte le istanze dell'applicazione siano arrestate

```bash
sudo pm2 stop all
sudo pm2 delete all
sudo killall -9 node
```

### 2. Verificare che la porta 5000, esplicitamente non 502, non sia in uso 

```bash
sudo lsof -i :5000
sudo fuser -k 5000/tcp  # Se necessario
```

### 3. Verificare che il database PostgreSQL funzioni correttamente

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1 as test;"
```

### 4. Riavviare il database e l'applicazione

```bash
sudo systemctl restart postgresql
cd /var/www/gervis
NODE_ENV=production HOST=0.0.0.0 PORT=5000 sudo pm2 start ecosystem.config.cjs
```

### 5. Verificare la configurazione del proxy (se utilizzato)

Se viene utilizzato Nginx, verificare la configurazione:

```bash
sudo grep -r "proxy_pass.*5000" /etc/nginx/sites-available/
```

Assicurarsi che ci siano i seguenti parametri:

```
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 300;
proxy_connect_timeout 300;
proxy_send_timeout 300;
```

### 6. Migliorare il logging per l'analisi

Per un logging più dettagliato, modificare il file ecosystem.config.cjs per includere:

```javascript
module.exports = {
  apps: [{
    name: "gervis",
    script: "index.js",
    env: {
      NODE_ENV: "production",
      DEBUG: "express:*,http"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    max_memory_restart: "512M"
  }]
};
```

### 7. Test delle API con Curl

Per verificare direttamente le API senza frontend:

```bash
curl -v http://localhost:5000/api/user
curl -v http://localhost:5000/api/market/indices
```

## Risoluzione Avanzata

### Problemi di Proxy Inverso

Se si utilizza un proxy inverso come Nginx o il Load Balancer AWS, assicurarsi che:

1. I timeout siano sufficientemente lunghi (almeno 60 secondi)
2. Le intestazioni di proxy siano configurate correttamente
3. I buffer siano sufficientemente grandi per rispondere a richieste con payload pesanti

### Problemi di Memoria

```bash
free -m
sudo sysctl -w vm.swappiness=10  # Riduce l'uso dello swap
```

### Aumento delle Risorse del Server

Se il problema persiste e sembra legato alle risorse, considerare di:

1. Aumentare la RAM del server
2. Aumentare il numero di CPU disponibili
3. Passare a un'istanza EC2 più grande

### Verifica della Connettività di Rete

```bash
sudo tcpdump -i any port 5000 -n
sudo netstat -tuln | grep 5000
```

## Testing in Produzione

Dopo aver applicato le modifiche, verificare che:

1. L'applicazione si avvii correttamente
2. Tutte le API siano accessibili
3. Il login e l'autenticazione funzionino correttamente
4. Non ci siano errori 502 o timeout nella console del browser

## Note sulle Modifiche al Codice

Sono state apportate le seguenti modifiche al codice per migliorare la gestione degli errori:

1. Migliorata la configurazione dei cookie in server/auth.ts
2. Aggiunta gestione specifica degli errori 502 in client/src/lib/queryClient.ts
3. Implementata diagnostica avanzata per aiutare a identificare l'origine degli errori

## Riferimenti

- [AWS Troubleshooting 502 Errors](https://aws.amazon.com/premiumsupport/knowledge-center/http-5xx-errors-elastic-beanstalk/)
- [Node.js Performance Tuning](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/application-declaration/)