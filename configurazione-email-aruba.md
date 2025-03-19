# Configurazione Email Aruba per Gervis

Per far funzionare correttamente l'invio di email in Gervis con Aruba, seguire questi passi:

## Credenziali SMTP Aruba

Le impostazioni SMTP sono:

```
Host: smtps.aruba.it
Porta: 465
Modalità: SSL/TLS (sicura)
Username: registration@gervis.it
Password: [Impostare la password corretta]
```

## Configurazione nel file .env

Nel file `.env` del server, aggiungere o modificare le seguenti variabili:

```
# Email (impostazioni Aruba)
EMAIL_HOST=smtps.aruba.it
EMAIL_PORT=465
EMAIL_USER=registration@gervis.it
EMAIL_PASSWORD=LaPasswordCorretta
EMAIL_FROM=registration@gervis.it
```

## Come impostare la password

Dopo il deployment, eseguire questo comando sul server:

```bash
sudo nano /var/www/gervis/.env
```

Aggiungere o modificare le variabili email come mostrato sopra, salvare il file (CTRL+O, poi ENTER) e uscire (CTRL+X).

Riavviare l'applicazione:

```bash
sudo pm2 restart gervis
```

## Verificare la configurazione

Per testare la configurazione, registrare un nuovo utente e verificare che l'email con il PIN venga inviata correttamente.

## Configurazione alternativa

Se il formato `EMAIL_*` non funziona, puoi usare anche il formato `SMTP_*`:

```
SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_USER=registration@gervis.it
SMTP_PASS=LaPasswordCorretta
SMTP_FROM=registration@gervis.it
```

L'applicazione è configurata per supportare entrambi i formati.