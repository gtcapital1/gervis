# Guida al Deployment di Gervis su AWS

Questa guida descrive il processo completo per deployare Gervis su un server AWS EC2 o su qualsiasi VPS Linux.

## Indice
- [Prerequisiti](#prerequisiti)
- [Processo di Deployment](#processo-di-deployment)
  - [1. Preparazione Locale](#1-preparazione-locale)
  - [2. Deployment sul Server](#2-deployment-sul-server)
  - [3. Configurazione del Server](#3-configurazione-del-server)
- [Comandi Rapidi](#comandi-rapidi)
- [Verifica dell'Installazione](#verifica-dellinstallazione)
- [Aggiornamenti Futuri](#aggiornamenti-futuri)
- [Risoluzione dei Problemi](#risoluzione-dei-problemi)

## Prerequisiti

- Un server AWS EC2 o VPS con Ubuntu/Amazon Linux
- Accesso SSH al server
- Git installato sul computer locale
- Dominio configurato con DNS che punta al tuo server (opzionale per HTTPS)

## Processo di Deployment

### 1. Preparazione Locale

Clona il repository e prepara il pacchetto di deployment:

```bash
# Clona il repository sul tuo computer
git clone https://github.com/gtcapital1/gervis.git

# Entra nella directory del progetto
cd gervis

# Rendi eseguibile lo script di preparazione
chmod +x deploy/prepare-for-deploy.sh

# Esegui lo script di preparazione
./deploy/prepare-for-deploy.sh
```

Lo script farà:
- Installare le dipendenze
- Fare la build dell'applicazione
- Creare un pacchetto di deployment (`gervis-deploy.tar.gz`)
- Opzionalmente creare un pacchetto completo con node_modules (`gervis-complete.tar.gz`)

### 2. Deployment sul Server

Una volta creato il pacchetto, puoi deployarlo sul server:

```bash
# Rendi eseguibile lo script di deployment
chmod +x deploy/scripts/deploy.sh

# Esegui lo script di deployment
./deploy/scripts/deploy.sh
```

Ti verranno chieste le seguenti informazioni:
- Indirizzo IP o nome host del server (default: 13.38.161.27)
- Nome utente SSH (default: ec2-user)
- Porta SSH (default: 22)
- Percorso della chiave SSH (se necessario)
- Directory di destinazione sul server (default: /var/www/gervis)

Lo script automaticamente:
1. Trasferirà il pacchetto al server
2. Estrarrà i file nella directory di destinazione
3. Farà il backup di configurazioni esistenti
4. Installerà le dipendenze
5. Configurerà l'ambiente di base
6. Avvierà o riavvierà l'applicazione

### 3. Configurazione del Server

Dopo il deployment iniziale, devi completare la configurazione del server:

```bash
# Connettiti al server
ssh ec2-user@13.38.161.27

# Vai alla directory dell'applicazione
cd /var/www/gervis

# Esegui lo script di configurazione
sudo ./deploy/scripts/setup-aws.sh
```

Lo script configurerà:
- Nginx come reverse proxy
- PM2 per la gestione dei processi
- Avvio automatico al riavvio
- HTTPS con Let's Encrypt (se desiderato)

## Comandi Rapidi

Per chi vuole eseguire tutto da zero in un unico flusso:

```bash
# PASSO 1: Sul computer locale
git clone https://github.com/gtcapital1/gervis.git
cd gervis
chmod +x deploy/prepare-for-deploy.sh
./deploy/prepare-for-deploy.sh
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh

# PASSO 2: Sul server (dopo aver completato il deploy.sh)
ssh ec2-user@13.38.161.27
cd /var/www/gervis
sudo ./deploy/scripts/setup-aws.sh
```

## Verifica dell'Installazione

Per verificare che tutto funzioni correttamente:

```bash
cd /var/www/gervis
./deploy/scripts/check-app-status.sh
```

Questo script verificherà:
- Stato dell'applicazione Node.js
- Configurazione di Nginx
- Connessione al database
- Certificati HTTPS (se configurati)

## Aggiornamenti Futuri

Per aggiornare Gervis in futuro:

1. Fai il pull delle ultime modifiche dal repository
2. Ripeti i passaggi 1 e 2 del [Processo di Deployment](#processo-di-deployment)

Le tue configurazioni (database, .env, ecc.) saranno automaticamente preservate durante l'aggiornamento.

## Risoluzione dei Problemi

Se riscontri problemi durante il deployment:

### Nginx non mostra l'applicazione
```bash
sudo ./deploy/scripts/fix-nginx.sh
```

### Database non configurato correttamente
```bash
./run-db-push.sh
```

### L'applicazione non si avvia
```bash
pm2 logs gervis
```

### Errori di permessi
```bash
sudo chown -R $USER:$USER /var/www/gervis
chmod +x deploy/scripts/*.sh
```

Per ulteriori dettagli, consulta il file `deploy-instructions.txt`.