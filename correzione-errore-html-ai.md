# Correzione errore "Unexpected token '<', "<!doctype "... is not valid JSON"

## Problema
Il componente del profilo AI è visibile, ma quando si tenta di utilizzarlo, si verifica un errore di parsing JSON: `Unexpected token '<', "<!doctype "... is not valid JSON`. Questo errore indica che l'API sta restituendo HTML invece di JSON.

## Cause probabili
1. **Problemi di autenticazione**: L'utente non è autenticato quando tenta di accedere all'API
2. **Errore del server**: Il server restituisce un errore 500 o 502 con una pagina HTML
3. **Reindirizzamento**: Il server sta reindirizzando a una pagina di login o di errore

## Soluzione
Ho creato uno script `fix-ai-endpoint-html-error.sh` che:

1. Verifica la presenza della chiave API OpenAI nell'ambiente
2. Aggiorna il componente `AiClientProfile.tsx` per:
   - Utilizzare axios per richieste HTTP più affidabili
   - Aggiungere intestazioni anti-cache per evitare problemi di caching
   - Implementare una migliore gestione degli errori con rilevamento di risposte HTML
   - Aggiungere funzionalità di debug per visualizzare informazioni dettagliate sugli errori
   - Aggiungere un pulsante per testare l'endpoint di stato OpenAI
3. Aggiorna i file di traduzione con le nuove chiavi
4. Migliora l'endpoint `/api/ai/debug-status` per fornire informazioni diagnostiche più dettagliate
5. Ricompila l'applicazione e riavvia i servizi

## Come applicare la correzione

### 1. Tramite il repository Git

```bash
# Sul server AWS
cd /var/www/gervis
git checkout ai-integration
git pull origin ai-integration
bash fix-ai-endpoint-html-error.sh
```

### 2. Manualmente (se Git non funziona)

1. Copia il contenuto del file `fix-ai-endpoint-html-error.sh` dal repository
2. Crea un nuovo file con lo stesso nome sul server AWS
3. Incolla il contenuto e salva
4. Esegui:
```bash
chmod +x fix-ai-endpoint-html-error.sh
bash fix-ai-endpoint-html-error.sh
```

## Verifica del funzionamento

Dopo aver applicato la correzione:

1. Accedi all'applicazione con un utente consulente
2. Vai alla pagina di dettaglio di un cliente che ha completato l'onboarding
3. Scorri fino alla sezione "AI Profile"
4. Se persiste un errore, utilizza i nuovi pulsanti di diagnostica per raccogliere informazioni dettagliate

## Note importanti

- Assicurati che la chiave API OpenAI sia configurata correttamente nel file `.env`
- Questa soluzione aggiunge strumenti di diagnostica che rendono più facile identificare la causa dell'errore
- Se il cliente non ha completato l'onboarding, il profilo AI non sarà disponibile (comportamento normale)