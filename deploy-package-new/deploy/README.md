# Guida al Deployment di Gervis

Questa guida contiene le istruzioni per deployare Gervis su un server esterno utilizzando Node.js e PostgreSQL.

## Requisiti

- Node.js 18+ (consigliato Node.js 20)
- PostgreSQL 14+ 
- Un server web (Nginx/Apache) per il reverse proxy
- PM2 (Process Manager per Node.js)

## Struttura del Deployment

```
/var/www/gervis/
├── server/      # Backend Node.js
├── client/      # Frontend compilato
├── .env         # Variabili d'ambiente
├── ecosystem.config.js  # Configurazione PM2
```

## Passaggi per il Deployment

1. Clonare il repository
2. Configurare il database PostgreSQL
3. Configurare le variabili d'ambiente
4. Installare le dipendenze
5. Compilare il frontend
6. Avviare l'applicazione con PM2
7. Configurare Nginx/Apache come reverse proxy

## Comandi

```bash
# Installare le dipendenze
npm install

# Compilare il frontend
npm run build

# Avviare con PM2
pm2 start ecosystem.config.js
```

## Variabili d'ambiente richieste

- `DATABASE_URL`: URL di connessione al database PostgreSQL
- `SESSION_SECRET`: Chiave per crittografare le sessioni
- `BASE_URL`: URL base dell'applicazione (es. https://sito.it)
- `PORT`: Porta su cui avviare il server (default: 5000)
- `NODE_ENV`: Ambiente di esecuzione (production/development)
- `EMAIL_HOST`: Server SMTP per l'invio delle email
- `EMAIL_PORT`: Porta del server SMTP
- `EMAIL_USER`: Username per l'autenticazione SMTP
- `EMAIL_PASS`: Password per l'autenticazione SMTP
- `EMAIL_FROM`: Indirizzo email mittente