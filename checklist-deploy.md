# Checklist di Deployment Gervis

Usa questa checklist per verificare tutti i passaggi necessari prima e durante il deployment dell'applicazione Gervis in produzione.

## Pre-Deployment

### Preparazione dell'Ambiente

- [ ] Verificare che Node.js (versione 18+) sia installato sul server
- [ ] Verificare che PostgreSQL (versione 15+) sia installato e accessibile
- [ ] Verificare che Git sia installato per il pulling degli aggiornamenti
- [ ] Verificare che PM2 o altro gestore di processi sia installato per l'esecuzione in background

### Configurazione del Database

- [ ] Creare un database PostgreSQL dedicato per l'applicazione
- [ ] Configurare un utente dedicato con permessi limitati al database dell'applicazione
- [ ] Verificare la connessione al database tramite stringa di connessione

### Preparazione del Repository

- [ ] Clonare il repository Git in `/var/www/gervis` o altra directory appropriata
- [ ] Verificare che la directory abbia i permessi corretti per l'utente che eseguirà l'applicazione

## Deployment

### Configurazione delle Variabili d'Ambiente

- [ ] Copiare il file `.env.example` in `.env`
- [ ] Configurare `DATABASE_URL` con la stringa di connessione corretta
- [ ] Configurare `BASE_URL` con l'URL pubblico dell'applicazione
- [ ] Configurare `SMTP_USER` e `SMTP_PASS` con le credenziali di Aruba
- [ ] Generare e configurare `SESSION_SECRET` con una stringa casuale sicura
- [ ] Eseguire `./create-env-file.sh` per verificare la configurazione

### Installazione delle Dipendenze

- [ ] Eseguire `npm ci` per installare le dipendenze esatte dal package-lock.json
- [ ] Verificare che tutte le dipendenze siano state installate correttamente
- [ ] Eseguire `npm run build` per compilare l'applicazione

### Preparazione del Database

- [ ] Eseguire `npm run db:push` per inizializzare lo schema del database
- [ ] Verificare che lo schema sia stato creato correttamente

### Configurazione del Process Manager

- [ ] Configurare PM2 con `ecosystem.config.cjs`
- [ ] Avviare l'applicazione con `pm2 start ecosystem.config.cjs`
- [ ] Configurare PM2 per l'avvio automatico all'avvio del sistema

### Configurazione del Web Server

- [ ] Configurare Nginx o Apache come reverse proxy
- [ ] Configurare SSL/TLS con Let's Encrypt o altro provider di certificati
- [ ] Configurare i domini e sottodomini richiesti
- [ ] Verificare che il web server possa comunicare con l'applicazione Node.js

## Post-Deployment

### Verifica della Funzionalità

- [ ] Verificare che il sito sia accessibile tramite browser
- [ ] Testare la registrazione e il login di un nuovo utente
- [ ] Verificare che le email vengano inviate correttamente (test-smtp.js)
- [ ] Testare il flusso di onboarding di un cliente
- [ ] Verificare che il database mantenga correttamente i dati

### Monitoraggio e Logging

- [ ] Verificare che i log dell'applicazione siano accessibili e leggibili
- [ ] Configurare il monitoraggio di base per CPU, memoria e spazio su disco
- [ ] Configurare avvisi per errori critici o problemi di risorse

### Backup

- [ ] Configurare backup automatici del database PostgreSQL
- [ ] Configurare backup del codice e dei file di configurazione
- [ ] Verificare che i backup possano essere ripristinati correttamente

## Risoluzione dei Problemi Comuni

### Errori di Connessione al Database

- [ ] Verificare la stringa di connessione nel file `.env`
- [ ] Controllare che PostgreSQL sia in esecuzione (`systemctl status postgresql`)
- [ ] Verificare firewall e regole di accesso remoto al DB

### Errori di Invio Email

- [ ] Verificare le credenziali SMTP nel file `.env`
- [ ] Testare la connessione SMTP con `node test-smtp.js`
- [ ] Consultare la documentazione specifica di Aruba in `configurazione-email-aruba.md`

### Errori di Accesso al Sito

- [ ] Verificare la configurazione del web server
- [ ] Controllare che l'applicazione Node.js sia in esecuzione
- [ ] Verificare le regole del firewall e apertura delle porte

## Note di Sicurezza

- Tutte le password e chiavi segrete devono essere forti e uniche
- Il file `.env` deve avere permessi restrittivi (600 o rwx------)
- L'accesso SSH al server deve essere limitato a chiavi e non permettere accesso con password
- Attivare fail2ban o meccanismi simili di protezione contro attacchi brute force

---

Data di ultimo aggiornamento: 19/03/2025