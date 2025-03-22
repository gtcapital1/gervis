# Istruzioni per il debug del container AI mancante su AWS

Abbiamo identificato un problema con il container AI che non appare correttamente nella versione AWS dell'applicazione. Il problema è legato ai riferimenti alle chiavi di traduzione nel file `AiClientProfile.tsx`.

## Problema
Nel componente `AiClientProfile.tsx`, le chiavi di traduzione vengono chiamate con il prefisso `'client.'` (es. `t('client.ai_profile')`), ma nei file di traduzione JSON sono definite senza questo prefisso (es. `"ai_profile": "Profilo AI"`). Questo causa la mancata visualizzazione del testo corretto.

## Soluzione
Abbiamo creato lo script `fix-aws-ai-container.sh` che risolve automaticamente questo problema nell'ambiente AWS:

1. Rimuove il prefisso `'client.'` da tutte le chiamate alla funzione `t()` nel file `AiClientProfile.tsx`
2. Ricompila l'applicazione
3. Riavvia il servizio PM2

## Istruzioni per l'esecuzione

1. Carica lo script `fix-aws-ai-container.sh` sul server AWS
2. Rendi lo script eseguibile:
   ```
   chmod +x fix-aws-ai-container.sh
   ```

3. Esegui lo script:
   ```
   sudo ./fix-aws-ai-container.sh
   ```

4. Verifica che il container AI sia ora visibile

## Verifica
Dopo aver eseguito lo script, accedi all'applicazione con un account advisory, vai alla pagina di un cliente e verifica che la tab "Profilo AI" sia visibile e mostri correttamente i dati.

Se il problema persiste, controlla i log di PM2:
```
pm2 logs
```

## Modifiche dettagliate
Lo script `sed` cambia tutte le occorrenze di `t('client.chiave_traduzione')` in `t('chiave_traduzione')` nel file `AiClientProfile.tsx`, in modo che corrispondano alle chiavi nel file JSON di traduzione.

Questo è stato già risolto nella versione di sviluppo e le modifiche sono state inviate al repository GitHub.