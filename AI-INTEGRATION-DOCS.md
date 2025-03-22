# Documentazione Tecnica - Integrazione AI

Questo documento fornisce informazioni tecniche dettagliate sull'integrazione dell'intelligenza artificiale in Gervis, che utilizza OpenAI GPT-4 per l'analisi dei dati cliente.

## Architettura

L'integrazione AI è strutturata in:

1. **Backend**:
   - `server/ai-services.ts` - Logica principale per interagire con l'API OpenAI
   - `server/routes-ai.ts` - Endpoint API per l'integrazione AI
   
2. **Frontend**:
   - `client/src/components/advisor/AiClientProfile.tsx` - Componente React per visualizzare i profili arricchiti
   - Integrazione nella pagina di dettaglio cliente

## Configurazione

### Variabili d'ambiente

Nel file `.env`:

```
OPENAI_API_KEY=sk-...  # Chiave API OpenAI
```

### Parametri OpenAI

- **Modello**: GPT-4
- **Temperatura**: 0.3 (relativamente bassa per risultati coerenti e deterministici)
- **Formato output**: JSON strutturato
- **Massimo token**: 1000

## API Endpoints

### `GET /api/ai/client-profile/:clientId`

Genera un profilo cliente arricchito con approfondimenti AI.

#### Parametri URL:
- `clientId` (number): ID del cliente

#### Risposta di successo:
```json
{
  "success": true,
  "data": {
    "approfondimenti": "Testo con analisi approfondita...",
    "suggerimenti": "Elenco puntato di suggerimenti..."
  }
}
```

#### Risposta errore:
```json
{
  "success": false,
  "message": "Descrizione errore"
}
```

### `GET /api/ai/status`

Verifica lo stato della configurazione OpenAI.

#### Risposta di successo:
```json
{
  "success": true,
  "configured": true|false
}
```

## Formato dati

### Struttura input

L'input per OpenAI è strutturato in:

1. **Dati cliente**:
   - Informazioni demografiche
   - Profilo di rischio e esperienza
   - Preferenze di investimento
   - Interessi personali
   
2. **Cronologia interazioni**:
   - Log delle email, chiamate, note e incontri
   - Ordinati per data (dal più recente)

### Struttura output

L'output è in formato JSON con:

```json
{
  "approfondimenti": "Testo con analisi approfondita...",
  "suggerimenti": "Elenco puntato di suggerimenti..."
}
```

## Gestione errori e retry

- Timeout configurato per le richieste API (15 secondi)
- Massimo 1 retry per query fallite
- Messaggi di fallback in caso di errore di parsing JSON
- Gestione esplicita delle eccezioni con log dettagliati

## Ottimizzazione delle performance

- Nessuna cache implementata al momento per i dati di profilo arricchito
- Le richieste sono on-demand (quando l'utente accede alla tab)
- Controllo di autenticazione e autorizzazione prima di ogni richiesta

## Testing

Per verificare la configurazione OpenAI:

```bash
node check-openai-api.js
```

Questo script esegue una semplice chiamata di test all'API OpenAI per verificare che la configurazione funzioni correttamente.

## Sicurezza

- Autenticazione richiesta per tutti gli endpoint AI
- Verifica dell'autorizzazione dell'utente per accedere ai dati del cliente
- Input sanitizzato prima dell'invio all'API OpenAI
- Nessun dato sensibile memorizzato o loggato

## Limitazioni note

- L'accuratezza degli approfondimenti dipende dalla quantità di dati disponibili
- Le richieste API possono fallire se la chiave OpenAI non è valida o il servizio è sovraccarico
- La qualità delle analisi dipende dalla qualità e quantità dei log cliente