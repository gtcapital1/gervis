# Configurazione Email con Aruba

Questo documento spiega come configurare correttamente le credenziali SMTP per l'invio di email tramite Aruba nel sistema Gervis.

## Problema Comune

Se visualizzi un errore simile a questo nei log:

```
Failed to send verification PIN email: Error: Missing credentials for "PLAIN"
```

Significa che le credenziali SMTP non sono state impostate correttamente nell'ambiente.

## Configurazione Corretta

### 1. Verifica le Variabili d'Ambiente

Assicurati che le seguenti variabili d'ambiente siano impostate nel file `.env`:

```
SMTP_USER=registration@gervis.it
SMTP_PASS=la_tua_password_aruba
SMTP_FROM=registration@gervis.it
```

Puoi anche utilizzare i nomi alternativi (entrambi funzionano):

```
EMAIL_USER=registration@gervis.it
EMAIL_PASSWORD=la_tua_password_aruba
EMAIL_FROM=registration@gervis.it
```

### 2. Configurazione SMTP di Aruba

La configurazione SMTP per Aruba deve utilizzare questi parametri:

- **Host**: smtps.aruba.it
- **Porta**: 465
- **Sicurezza**: SSL/TLS (non STARTTLS)
- **Autenticazione**: PLAIN

### 3. Test della Configurazione

Puoi verificare la corretta configurazione utilizzando lo script di test incluso:

```bash
node test-smtp.js
```

Se la configurazione è corretta, dovresti vedere un messaggio di successo e ricevere un'email di test.

## Risoluzione dei Problemi

### Errore "Missing credentials for PLAIN"

1. **Cause**: 
   - Variabili d'ambiente mancanti
   - Password errata
   - Formato dell'email errato

2. **Soluzione**:
   - Verifica che il file `.env` contenga le variabili SMTP_USER e SMTP_PASS
   - Verifica che la password sia corretta (prova ad accedere alla webmail di Aruba)
   - Assicurati che l'indirizzo email sia nel formato corretto

### Errore "Connection refused" o "Timeout"

1. **Cause**:
   - Configurazione server errata
   - Problemi di rete o firewall

2. **Soluzione**:
   - Verifica che l'host e la porta siano corretti (smtps.aruba.it:465)
   - Controlla eventuali firewall o restrizioni di rete

### Errore "Invalid login"

1. **Cause**:
   - Credenziali errate
   - Problemi con l'account Aruba

2. **Soluzione**:
   - Verifica che username e password siano corretti
   - Controlla lo stato dell'account nella dashboard di Aruba

## Nota Importante

La configurazione email è cruciale per il funzionamento di diverse funzionalità di Gervis, tra cui:

- Verifica degli account utente
- Invio dei codici PIN
- Invio di moduli di onboarding ai clienti
- Comunicazioni con i clienti

Se l'invio di email non funziona, queste funzionalità saranno compromesse.

## Contatti di Supporto

In caso di problemi persistenti, contatta:

- Supporto Aruba: support@staff.aruba.it
- Assistenza tecnica Gervis: support@gervis.it