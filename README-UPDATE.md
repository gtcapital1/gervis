# Gervis - Istruzioni per Aggiornamento

Questo documento contiene le istruzioni per aggiornare l'applicazione Gervis tramite GitHub.

## File Importanti per l'Aggiornamento

- **create-env-file.sh**: Script per generare automaticamente il file `.env` in produzione
- **.env.example**: Template per il file di configurazione ambientale
- **configurazione-email-aruba.md**: Guida per la configurazione SMTP con Aruba
- **istruzioni-update-github.md**: Guida dettagliata per aggiornare tramite Git
- **checklist-deploy.md**: Checklist completa per il deployment
- **test-smtp.js**: Utility per testare la connessione SMTP

## Procedura di aggiornamento rapida

1. **Connessione al server**:
   ```bash
   ssh username@your-server-ip
   ```

2. **Navigazione e backup**:
   ```bash
   cd /var/www/gervis
   pg_dump -U username -h hostname database_name > backup_$(date +%Y%m%d).sql
   ```

3. **Pull da GitHub**:
   ```bash
   git pull origin main
   ```

4. **Aggiornamento dipendenze**:
   ```bash
   npm ci
   ```

5. **Aggiornamento ambiente**:
   ```bash
   ./create-env-file.sh
   ```

6. **Riavvio applicazione**:
   ```bash
   pm2 restart gervis
   ```

7. **Verifica funzionamento**:
   ```bash
   node test-smtp.js  # Verifica invio email
   pm2 logs gervis    # Controlla i log per errori
   ```

## Modifiche in questo aggiornamento

- Risolto problema di caricamento variabili d'ambiente in ambiente ESM
- Migliorata gestione delle connessioni SMTP con Aruba
- Aggiunti script di utilità per il deployment e la manutenzione
- Aggiunta documentazione dettagliata per la risoluzione dei problemi

## Risoluzione problemi comuni

### Errore "Missing credentials for PLAIN"

Questo errore indica un problema con le credenziali SMTP. Verificare:
- Presenza variabili `SMTP_USER` e `SMTP_PASS` nel file `.env`
- Correttezza della password Aruba
- Corretta configurazione del server SMTP

### Errore "Cannot load dotenv"

Questo errore è legato alla modalità di caricamento delle variabili d'ambiente:
- Assicurarsi di utilizzare `import 'dotenv/config'` nei file principali
- Verificare che il file `.env` esista nella root del progetto

## Contatti

In caso di problemi con l'aggiornamento contattare:
- supporto@gervis.it
- Numero di emergenza: XXX-XXXXXXX