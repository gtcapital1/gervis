# Istruzioni per il deploy dello script di creazione clienti demo su AWS

Questo documento contiene le istruzioni per eseguire lo script `create-demo-clients.js` che genera 10 clienti dimostrativi con profili completi, asset e log di interazione.

## Prerequisiti

- Accesso al server AWS dove è installato Gervis
- Configurazione PostgreSQL corretta e accessibile
- File `.env` configurato con `DATABASE_URL`
- Node.js installato sul server

## Procedura di deploy

1. Copia lo script sul server AWS usando SCP:

```bash
scp create-demo-clients.js ubuntu@gervis.it:/var/www/gervis/
```

2. Accedi al server AWS:

```bash
ssh ubuntu@gervis.it
```

3. Entra nella directory del progetto:

```bash
cd /var/www/gervis
```

4. Esegui lo script:

```bash
node create-demo-clients.js
```

5. Verifica che i clienti siano stati creati correttamente accedendo all'applicazione e controllando la dashboard.

## Note importanti

- Lo script genererà 10 clienti con dati realistici
- Ogni cliente avrà da 2 a 6 asset
- Ogni cliente avrà da 3 a 8 log di interazione con date distribuite negli ultimi 6 mesi
- Le password per tutti i clienti sono impostate come "password123" (hashed)
- Lo script utilizza l'ID del primo utente amministratore come advisor ID per tutti i clienti creati

## Risoluzione problemi

- Se lo script fallisce a causa di errori di connessione al database, verificare che il file `.env` contenga il corretto `DATABASE_URL`
- Se lo script fallisce a causa di errori di schema, verificare che il database sia aggiornato all'ultima versione dello schema
- Se necessario, installare le dipendenze mancanti con: `npm install pg bcrypt dotenv`

## Note sulla whitelist delle fonti finanziarie

Lo script di creazione clienti è parte di un aggiornamento che include anche il miglioramento del filtro whitelist per le fonti di notizie finanziarie, sia in market-api.ts che in spark-controller.ts.

Queste modifiche garantiscono che entrambi i moduli utilizzino la stessa lista di fonti affidabili, migliorando la qualità delle notizie visualizzate e delle raccomandazioni generate.