# Istruzioni per l'aggiornamento su AWS - Interessi Personali

Questo documento fornisce istruzioni dettagliate per applicare l'aggiornamento degli interessi personali al server AWS.

## Panoramica dell'aggiornamento

Questo aggiornamento aggiunge:
- Nuove colonne alla tabella `clients`
- Interfaccia utente aggiornata per il modulo di onboarding
- Traduzioni per gli interessi personali in italiano e inglese

## Procedura di aggiornamento

### 1. Creazione del pacchetto di aggiornamento

```bash
# Eseguire dal repository locale
./create-update-package.sh
```

### 2. Trasferimento e installazione su AWS

```bash
# Trasferire il pacchetto al server
scp gervis-deploy-update.tar.gz ubuntu@IP_SERVER:/tmp/

# Collegarsi al server
ssh ubuntu@IP_SERVER

# Sul server AWS
cd /var/www/gervis
sudo mv /tmp/gervis-deploy-update.tar.gz .
sudo tar xzf gervis-deploy-update.tar.gz
```

### 3. Esecuzione dello script di migrazione del database

```bash
# Sul server AWS
cd /var/www/gervis
sudo node server/migrations/add-personal-interests.ts
```

### 4. Riavvio dell'applicazione

```bash
# Riavvio di PM2
sudo pm2 restart gervis
```

### 5. Verifica dell'aggiornamento

1. Accedere all'applicazione come consulente
2. Creare un nuovo cliente di test
3. Generare un link di onboarding
4. Verificare che nel modulo di onboarding appaia la sezione per gli interessi personali
5. Completare il modulo includendo interessi personali
6. Verificare che i dati vengano salvati correttamente

## Risoluzione dei problemi

Se si verificano errori durante l'aggiornamento:

1. Controllare i log di PM2:
```bash
sudo pm2 logs gervis
```

2. Verificare lo stato del database:
```bash
sudo -u postgres psql -d gervis -c "SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name LIKE '%interest%';"
```

3. Ripristino (se necessario):
```bash
# Ripristinare il backup del database (se creato prima dell'aggiornamento)
sudo -u postgres psql -d gervis -f /path/to/backup.sql
```

## Contatti per supporto

Per assistenza durante l'aggiornamento contattare:
- Email: support@gervis.it
- Telefono: [Numero di supporto]