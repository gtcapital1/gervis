# Istruzioni per il Deployment di Sigmund su AWS

Questo documento fornisce istruzioni dettagliate per aggiornare la componente Sigmund (ex AI Profile) sul server AWS di produzione.

## Prerequisiti

- Accesso SSH al server AWS
- Le credenziali per git pull
- Accesso al database PostgreSQL tramite variabile d'ambiente `DATABASE_URL`

## Passaggi per il Deployment

### 1. Copia degli Script sul Server

Carica i seguenti file sul server AWS nella directory `/var/www/gervis`:

- `update-ai-profiles-schema.sql`
- `deploy-sigmund-to-aws.sh`

### 2. Impostazione dei Permessi

```bash
# Sul server AWS
cd /var/www/gervis
chmod +x deploy-sigmund-to-aws.sh
```

### 3. Backup del Database (Facoltativo ma Consigliato)

```bash
# Sul server AWS
pg_dump $DATABASE_URL > backup_pre_sigmund_update.sql
```

### 4. Esecuzione del Deployment

```bash
# Sul server AWS
cd /var/www/gervis
./deploy-sigmund-to-aws.sh
```

Durante l'esecuzione dello script, ti verrà chiesto di confermare varie operazioni. Assicurati di leggere attentamente i messaggi e rispondere "s" per procedere.

### 5. Verifica del Deployment

Dopo il deployment, verifica che tutto funzioni correttamente:

1. Accedi all'applicazione tramite browser
2. Vai alla dashboard consulente
3. Seleziona un cliente
4. Verifica che la sezione Sigmund mostri correttamente le raccomandazioni nel nuovo formato
5. Controlla che lo stile sia nero con testo bianco e titoli blu

## Risoluzione dei Problemi

### Se il Database Non Si Aggiorna Correttamente

Puoi eseguire manualmente lo script SQL:

```bash
# Sul server AWS
psql $DATABASE_URL -f update-ai-profiles-schema.sql
```

### Se l'Applicazione Non Si Avvia

Controlla i log PM2:

```bash
# Sul server AWS
pm2 logs gervis
```

### Se è Necessario Ripristinare il Backup

```bash
# Sul server AWS
psql $DATABASE_URL < backup_pre_sigmund_update.sql
```

## Note Importanti

- Lo script `update-ai-profiles-schema.sql` esegue un `TRUNCATE TABLE ai_profiles` che elimina tutti i profili AI esistenti. Questo è necessario per assicurare la compatibilità con il nuovo formato.
- I profili verranno rigenerati automaticamente quando i consulenti accederanno ai dettagli dei clienti.

## Modifiche Principali Implementate

1. Unificazione del formato delle raccomandazioni (precedentemente diviso in approfondimenti e suggerimenti)
2. Miglioramento dell'interfaccia utente con sfondo nero, testo bianco e titoli blu
3. Rimozione dell'intestazione superflua dalle raccomandazioni
4. Ottimizzazione delle query database con nuovi indici
5. Miglioramento del prompt OpenAI per generare raccomandazioni più pertinenti con azioni concrete