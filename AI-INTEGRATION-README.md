# Integrazione AI - Gervis

Questo documento fornisce una panoramica dell'integrazione dell'intelligenza artificiale in Gervis, che utilizza OpenAI GPT-4 per generare profili cliente arricchiti con approfondimenti e suggerimenti personalizzati.

## Funzionalità

L'integrazione AI consente di:

- Generare approfondimenti basati sui dati del questionario cliente e cronologia interazioni
- Fornire suggerimenti personalizzati per migliorare la relazione con il cliente
- Identificare opportunità di cross-selling e up-selling
- Migliorare la comprensione delle esigenze finanziarie del cliente

## Requisiti

Per utilizzare l'integrazione AI, è necessario:

1. Una chiave API OpenAI valida configurata nel file `.env`
2. Clienti che hanno completato il processo di onboarding (per fornire dati strutturati sufficienti)
3. Almeno alcune interazioni registrate con il cliente (per un'analisi più accurata)

## Come utilizzare

1. Accedere alla dashboard di Gervis
2. Selezionare un cliente che ha completato l'onboarding
3. Nella scheda cliente, selezionare la tab "Profilo AI" o "Approfondimenti AI"
4. Attendere che il sistema generi gli approfondimenti (pochi secondi)
5. Consultare le sezioni "Approfondimenti" e "Suggerimenti"

## Protezione dati e privacy

- Tutte le comunicazioni con l'API OpenAI sono crittografate (HTTPS)
- I dati personali sensibili vengono omessi dalle richieste all'API
- Non viene memorizzato alcun dato cliente sui server OpenAI
- Le informazioni elaborate vengono mostrate solo a consulenti autorizzati

## Soluzione di problemi

Se l'integrazione AI non funziona come previsto:

1. Verificare che la chiave API OpenAI sia configurata correttamente nel file `.env`
2. Eseguire lo script di test `node check-openai-api.js` per verificare la connettività
3. Assicurarsi che il cliente selezionato abbia completato l'onboarding
4. Aggiungere più log di interazione se l'analisi risulta troppo generica

Per ulteriori dettagli tecnici, consultare la documentazione completa in [AI-INTEGRATION-DOCS.md](./AI-INTEGRATION-DOCS.md).