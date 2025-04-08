# AI Advisor Suggestions

Questa funzionalità genera suggerimenti personalizzati per i consulenti finanziari basati sui profili dei clienti, i loro log e i dati MIFID.

## Struttura

La funzionalità di suggerimenti AI è composta da:

1. **Controller** (`server/ai/advisor-suggestions-controller.ts`): Gestisce la richiesta HTTP, verifica l'autenticazione, controlla i dati in cache e decide se generare nuovi suggerimenti.

2. **Servizio OpenAI** (`server/ai/openai-service.ts`): Contiene la funzione `generateAdvisorSuggestions` che raccoglie i dati dei clienti, crea un prompt per OpenAI e restituisce suggerimenti strutturati.

3. **Schema del database** (`shared/schema.ts`): Definisce la tabella `advisor_suggestions` che memorizza i suggerimenti generati.

4. **Storage API** (`server/storage.ts`): Implementa i metodi per salvare e recuperare i suggerimenti: `getAdvisorSuggestions`, `updateAdvisorSuggestions` e `createAdvisorSuggestions`.

5. **Rotte API** (`server/routes.ts`): Definisce l'endpoint `/api/ai/advisor-suggestions` che gestisce le richieste di suggerimenti.

## API Endpoint

```
GET /api/ai/advisor-suggestions?refresh=true|false
```

### Parametri della query

- `refresh`: Se impostato a "true", forza il controllo dei dati aggiornati e potenzialmente rigenera i suggerimenti.

### Risposta

```json
{
  "suggestions": {
    "opportunities": [...],
    "reengagements": [...],
    "operational": [...]
  },
  "lastGeneratedAt": "2023-04-03T12:34:56.789Z"
}
```

Se i suggerimenti sono già aggiornati e viene richiesto un refresh:

```json
{
  "suggestions": {...},
  "lastGeneratedAt": "2023-04-03T12:34:56.789Z",
  "message": "I suggerimenti sono già aggiornati con i dati più recenti."
}
```

## Implementazione

1. I suggerimenti vengono generati solo quando:
   - Non esistono suggerimenti precedenti
   - I suggerimenti esistenti sono stati generati più di 12 ore fa
   - I dati dei clienti o i log sono cambiati rispetto all'ultima generazione
   - L'utente richiede esplicitamente un refresh con dati cambiati

2. Il sistema verifica i cambiamenti nei dati controllando:
   - Nuovi clienti o modifiche a clienti esistenti
   - Nuove interazioni (log) con i clienti

3. I suggerimenti vengono categorizzati in tre aree:
   - **Opportunità**: Nuove potenziali vendite o strategie di investimento.
   - **Riattivazioni**: Clienti che richiedono un nuovo contatto o reingaggio.
   - **Operativi**: Attività quotidiane che richiedono attenzione.

## Utilizzo nel Frontend

Il frontend deve:
1. Chiamare l'endpoint `/api/ai/advisor-suggestions`
2. Visualizzare i suggerimenti nelle rispettive categorie
3. Fornire un pulsante per rigenerare i suggerimenti quando necessario
4. Mostrare la data dell'ultima generazione
5. Fornire feedback quando i suggerimenti sono già aggiornati 