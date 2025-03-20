# Verifica della correzione per l'invio email in Gervis

Questo documento descrive come verificare che la correzione per l'invio delle email di onboarding sia stata applicata con successo.

## Prerequisiti

- Accesso al server AWS dove è installato Gervis
- Accesso all'interfaccia di amministrazione di Gervis
- Un client non ancora onboardato per testare l'invio dell'email

## Procedura di verifica

### 1. Accesso al sistema

1. Accedi all'interfaccia di Gervis con le tue credenziali di advisore
2. Vai alla dashboard dei clienti

### 2. Selezione di un cliente per il test

1. Seleziona un cliente esistente che non è stato ancora onboardato (badge "NON ONBOARDATO")
2. In alternativa, crea un nuovo cliente con un indirizzo email valido per il test

### 3. Invio email con oggetto personalizzato

1. Clicca sul cliente per aprire la pagina di dettaglio
2. Nella sezione "Stato onboarding", clicca su "Invia email di onboarding"
3. Nel form che appare:
   - Inserisci un messaggio personalizzato (es. "Questo è un test della correzione dell'invio email")
   - **Importante**: Modifica l'oggetto dell'email con un testo personalizzato (es. "TEST CORREZIONE - Completa il tuo profilo")
   - Clicca su "Invia email"

### 4. Verifica nella casella di posta

1. Accedi alla casella di posta del cliente (o alla casella che hai usato per il test)
2. Verifica che l'email sia arrivata
3. **Controllo principale**: Verifica che l'oggetto dell'email sia esattamente quello personalizzato che hai inserito

### 5. Verifica nei log del server

Per una verifica più approfondita, puoi controllare i log del server:

```bash
# Accedi al server
ssh ubuntu@IP_SERVER

# Visualizza i log dell'applicazione (se usi PM2)
pm2 logs gervis

# Cerca specifici log relativi all'invio email
pm2 logs gervis | grep "DEBUG - customSubject"
```

Nei log dovresti vedere:
- Il valore di `customSubject` ricevuto nella richiesta
- Il valore di `customSubject` nella funzione `sendOnboardingEmail`
- La conferma che l'email è stata inviata con successo

## Risoluzione di problemi

Se l'email non arriva o l'oggetto non è quello personalizzato:

1. Verifica che la correzione sia stata applicata correttamente eseguendo:
   ```bash
   cd /var/www/gervis
   grep -r "customSubject" server/
   ```

2. Verifica che l'applicazione sia stata riavviata dopo l'applicazione della correzione:
   ```bash
   pm2 list
   ```
   La colonna "uptime" dovrebbe mostrare un tempo recente.

3. Verifica lo stato del server SMTP:
   ```bash
   cd /var/www/gervis
   node test-smtp.js
   ```

## Conferma della correzione

La correzione è considerata applicata con successo quando:

1. L'email di onboarding viene ricevuta dal cliente
2. L'oggetto dell'email è esattamente quello personalizzato specificato nel form
3. Il contenuto dell'email include il messaggio personalizzato

Questo confermerà che il parametro `customSubject` viene correttamente propagato attraverso tutta la catena di chiamate, dal frontend al backend fino all'invio email.