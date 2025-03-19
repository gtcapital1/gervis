# Aggiornamento Gervis - 19 Marzo 2025

Questo aggiornamento risolve i problemi relativi al caricamento delle variabili d'ambiente e alla configurazione del server SMTP per l'invio di email.

## Modifiche principali

1. **Caricamento migliorato del file `.env`**
   - Implementato caricamento esplicito all'avvio dell'applicazione
   - Aggiunta verifica con log dettagliati delle variabili caricate

2. **Configurazione ottimizzata per SMTP Aruba**
   - Disabilitata verifica certificato TLS
   - Rimosse impostazioni di connessione pool che causavano problemi
   - Aggiunto logging dettagliato per diagnostica

3. **Configurazione PM2 aggiornata**
   - Aggiunta configurazione specifica per caricare il file `.env`
   - Migliorata gestione degli errori

## Istruzioni per l'installazione

1. Scompattare questo archivio nella directory dell'applicazione
2. Verificare che il file `.env` contenga le variabili corrette (vedi checklist-deploy.md)
3. Riavviare l'applicazione con `pm2 restart gervis`
4. Verificare i log per eventuali errori con `pm2 logs gervis --err --lines 30`

## Variabili d'ambiente cruciali per il funzionamento

```
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# Server e ambiente
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
BASE_URL=https://gervis.it

# Email (essenziali per l'invio di notifiche e onboarding)
SMTP_USER=registration@gervis.it
SMTP_PASS=[password-email]
EMAIL_USER=registration@gervis.it  # fallback per SMTP_USER
EMAIL_PASSWORD=[password-email]    # fallback per SMTP_PASS

# Sicurezza
SESSION_SECRET=[valore-casuale-lungo]
```

## Contenuti del pacchetto

- `server/` - Codice backend aggiornato
- `client/` - Codice frontend
- `shared/` - Modelli e schemi dati
- `test-smtp.js` - Script di diagnostica per verificare la configurazione email
- `checklist-deploy.md` - Lista di controllo per il deployment
- `ecosystem.config.cjs` - Configurazione aggiornata per PM2

## Supporto

Per assistenza, contattare il team di sviluppo.