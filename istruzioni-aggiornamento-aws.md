# Istruzioni per l'aggiornamento di Gervis su AWS

Segui queste istruzioni per aggiornare l'applicazione Gervis su AWS con il supporto per gli interessi personali.

## 1. Aggiornamento del codice

Accedi alla tua macchina AWS tramite SSH e aggiorna il codice con Git:

```bash
cd /var/www/gervis
git pull
```

## 2. Aggiunta delle nuove colonne al database

Esegui lo script per aggiungere le nuove colonne al database:

```bash
cd /var/www/gervis
chmod +x add-personal-interests-aws.sh
./add-personal-interests-aws.sh
```

### In alternativa, esegui manualmente le query SQL

Se preferisci eseguire manualmente le query SQL, accedi al database e usa i seguenti comandi:

```bash
sudo -u postgres psql -d gervis
```

Nel terminale psql, esegui:

```sql
-- Aggiunta campo per interessi personali
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS personal_interests TEXT[];

-- Aggiunta campo per note aggiuntive sugli interessi
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS personal_interests_notes TEXT;

-- Aggiunta campi per rating degli obiettivi di investimento (1-5)
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS retirement_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS wealth_growth_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS income_generation_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS capital_preservation_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS estate_planning_interest INTEGER;
```

## 3. Riavvio dell'applicazione

Riavvia l'applicazione per applicare le modifiche:

```bash
cd /var/www/gervis
pm2 restart gervis
```

## 4. Verifica della funzionalità

Accedi all'applicazione web e prova a creare un nuovo cliente o modificare un cliente esistente, verificando che la sezione degli interessi personali sia disponibile nel form di onboarding.

## Risoluzione dei problemi

Se incontri problemi con l'aggiornamento, verifica i log di PM2:

```bash
pm2 logs gervis
```

Per ripristinare le modifiche al database in caso di errori:

```sql
-- Da eseguire in psql se necessario
ALTER TABLE clients DROP COLUMN IF EXISTS personal_interests;
ALTER TABLE clients DROP COLUMN IF EXISTS personal_interests_notes;
ALTER TABLE clients DROP COLUMN IF EXISTS retirement_interest;
ALTER TABLE clients DROP COLUMN IF EXISTS wealth_growth_interest;
ALTER TABLE clients DROP COLUMN IF EXISTS income_generation_interest;
ALTER TABLE clients DROP COLUMN IF EXISTS capital_preservation_interest;
ALTER TABLE clients DROP COLUMN IF EXISTS estate_planning_interest;
```