# Gervis Platform Documentation

## Overview
Gervis è una piattaforma completa progettata per consulenti finanziari per gestire relazioni con i clienti, pianificare riunioni, e utilizzare un assistente AI per le attività quotidiane. Questo documento descrive le funzionalità attualmente disponibili nella piattaforma Gervis.

## Componenti Principali

### 1. Assistente AI (Agent)
*Accesso: [/agent](/agent)*

L'Assistente AI è un chatbot intelligente che aiuta i consulenti con varie attività:

- **Ricerca Informazioni Cliente**: Accedi ai profili dei clienti, preferenze e obiettivi di investimento semplicemente menzionando il nome del cliente.
- **Gestione Appuntamenti**: Pianifica, visualizza e modifica appuntamenti direttamente dalla conversazione.
- **Gestione Calendario**: 
  - Cerca appuntamenti per intervallo di date (es. "Mostra appuntamenti questa settimana")
  - Cerca appuntamenti per cliente (es. "Appuntamenti con Mario Rossi")
  - Crea e modifica appuntamenti con clienti specifici
- **Interazioni Contestuali**: L'assistente comprende il contesto delle conversazioni e fornisce informazioni pertinenti basate sulle interazioni precedenti.

### 2. Dashboard
*Accesso: [/dashboard](/dashboard) o [/app](/app)*

La dashboard offre una panoramica della pratica del consulente:

- **Statistiche Rapide**: Visualizza metriche chiave relative ai clienti e prossimi appuntamenti
- **Attività Recenti**: Visualizza interazioni recenti con i clienti e aggiornamenti
- **Prossimi Appuntamenti**: Visualizza appuntamenti programmati per il futuro prossimo

### 3. Gestione Clienti
*Accesso: [/clients](/clients)*

Un sistema completo per la gestione delle informazioni dei clienti:

- **Profili Cliente**: 
  - **Creazione Cliente**: Aggiungi nuovi clienti direttamente tramite il pulsante "Aggiungi Cliente" nella pagina clienti.
  - **Visualizzazione Profilo**: Visualizza informazioni dettagliate sul cliente, inclusi dati personali, obiettivi finanziari e preferenze di investimento
  - **Modifica Cliente**: Aggiorna le informazioni esistenti del cliente tramite la pagina di profilo utilizzando il pulsante "Modifica"
  - **Onboarding Cliente**: Il processo di onboarding viene gestito tramite flussi dedicati. L'onboarding può essere avviato tramite il pulsante "Onboard" nella pagina clienti.

- **Ricerca Clienti**: Trova rapidamente i clienti per nome o altri criteri usando la barra di ricerca nella sezione "Clienti"
- **Categorizzazione Clienti**: Organizza i clienti in base ai loro profili di investimento o altri criteri
- **Note e Interazioni**: Registra e recupera note dagli incontri con i clienti e interazioni

### 4. Profili AI
*Accesso: [/clients/:id](/clients) (dalla pagina del singolo cliente)*

Funzionalità avanzata per la gestione dei profili cliente basata su intelligenza artificiale:

- **Generazione Profilo AI**: Genera automaticamente profili cliente basati su dati esistenti utilizzando il pulsante "Genera Profilo AI" nella pagina del cliente
- **Analisi Preferenze**: L'AI analizza le preferenze di investimento, tolleranza al rischio e obiettivi finanziari
- **Suggerimenti Personalizzati**: Ottieni suggerimenti per prodotti e servizi personalizzati in base al profilo del cliente
- **Riassunto Cliente**: Visualizza un riassunto conciso dei dati più importanti del cliente generato dall'IA

### 5. Calendario
*Accesso: [/calendar](/calendar)*

Un sistema di calendario dedicato per gestire riunioni e appuntamenti:

- **Pianificazione Appuntamenti**: Crea e programma incontri con i clienti utilizzando il pulsante "Nuovo Appuntamento"
- **Dettagli Appuntamento**: Registra obiettivi della riunione, argomenti e elementi di follow-up
- **Notifiche Appuntamenti**: Ricevi promemoria sui prossimi incontri
- **Gestione Luogo**: Specifica luoghi di incontro (ufficio, ufficio del cliente, Zoom, Teams, telefonata)
- **Durata Appuntamento**: Imposta durate personalizzate per le riunioni (30, 60, 90, 120 minuti)

### 6. Impostazioni
*Accesso: [/settings](/settings) o [/app/settings](/app/settings)*

Impostazioni personali e dell'applicazione:

- **Profilo Utente**: Gestisci informazioni personali e impostazioni dell'account tramite la sezione "Impostazioni"
- **Preferenze Notifiche**: Configura quando e come ricevere notifiche
- **Impostazioni Tema**: Alterna tra modalità chiara e scura per l'interfaccia

### 7. Pannello Amministratore
*Accesso: [/admin-panel](/admin-panel) (solo per utenti con ruolo amministratore)*

Disponibile solo per gli amministratori:

- **Gestione Utenti**: Visualizza e gestisci account utente
- **Monitoraggio Sistema**: Monitora le prestazioni e l'utilizzo del sistema
- **Impostazioni Configurazione**: Regola le impostazioni globali del sistema

## Guide alle Funzionalità

Questa sezione contiene guide dettagliate per le funzionalità più utilizzate in Gervis.

### Gestione Clienti

#### Aggiunta Cliente
*Accesso: [/clients](/clients) → Pulsante "Aggiungi Cliente"*

Per aggiungere un nuovo cliente al sistema:

1. **Creazione diretta in Gervis**:
   - Accedi alla sezione Clienti
   - Clicca sul pulsante "Aggiungi Cliente" nella parte superiore della pagina
   - Compila il modulo con i dati richiesti del cliente:
     - Informazioni Personali (nome, cognome, data di nascita, ecc.)
     - Dati di Contatto (email, telefono, indirizzo)
     - Informazioni Finanziarie di base (se richieste)
   - Clicca su "Salva" per creare il profilo cliente

2. **Dopo la creazione**:
   - Il nuovo cliente apparirà immediatamente nell'elenco
   - Procedi con l'onboarding completo (vedi sezione "Onboarding Cliente")
   - Aggiungi ulteriori dettagli al profilo secondo necessità

#### Onboarding Cliente
*Accesso: [/clients](/clients) → Seleziona cliente → Pulsante "Onboard"*

Il processo di onboarding in Gervis:

1. **Avvio Onboarding**:
   - Dalla pagina dell'elenco clienti, trova il cliente da onboardare
   - Clicca sul pulsante "Onboard" accanto al nome del cliente

2. **Completamento del Profilo**:
   - Compila tutti i campi obbligatori nel modulo di onboarding
   - Sezioni tipiche da completare:
     - Dati Personali
     - Situazione Finanziaria
     - Obiettivi di Investimento
     - Tolleranza al Rischio
     - Orizzonte Temporale

3. **Documentazione MIFID**:
   - Genera i documenti MIFID richiesti (vedi sezione specifica)
   - Fai firmare i documenti dal cliente
   - Carica i documenti firmati nel sistema

4. **Finalizzazione**:
   - Clicca su "Completa Onboarding"
   - Conferma la completezza dei dati quando richiesto
   - Il cliente è ora completamente onboardato e pronto per la gestione

#### Invio Documentazione MIFID
*Accesso: [/clients/:id](/clients) → Tab "Documenti" → "Genera MIFID"*

Per generare e inviare documentazione MIFID:

1. **Accesso ai Documenti**:
   - Apri il profilo del cliente
   - Seleziona la tab "Documenti"
   - Clicca sul pulsante "Genera MIFID"

2. **Selezione Documenti**:
   - Seleziona i documenti MIFID richiesti:
     - Questionario di Adeguatezza
     - Informativa sui Rischi
     - Termini e Condizioni
     - Consenso al Trattamento Dati

3. **Personalizzazione**:
   - Modifica i dati precompilati se necessario
   - Aggiungi note o informazioni specifiche per il cliente

4. **Invio al Cliente**:
   - Scegli il metodo di invio (email, stampa, salva PDF)
   - Se invii via email, inserisci l'indirizzo del cliente e un messaggio personalizzato
   - Clicca su "Invia Documenti"

5. **Tracciamento**:
   - Monitora lo stato dei documenti (Inviati/Visualizzati/Firmati)
   - Ricevi notifiche quando il cliente firma i documenti

### Assistente AI

#### Generazione Idee Investimento
*Accesso: [/agent](/agent)*

Per generare idee di investimento personalizzate:

1. **Approccio Diretto**:
   - Accedi all'Assistente AI
   - Digita una richiesta come: "Genera idee di investimento per [nome cliente]" o "News dai mercati?"
   - Specifica criteri aggiuntivi se necessario (es. "con focus su sostenibilità" o "per un orizzonte di 5 anni")

2. **Utilizzo delle Idee**:
   - Rivedi le idee generate dall'AI
   - Salva le idee interessanti nel profilo del cliente
   - Condividi le idee con il cliente tramite email o durante il prossimo incontro

#### Generazione Profilo AI
*Accesso: [/clients/:id](/clients) → Pulsante "Genera Profilo AI"*

Per creare un profilo AI per un cliente:

1. **Prerequisiti**:
   - Assicurati che il cliente abbia almeno i dati base compilati
   - Più dati sono disponibili, più accurato sarà il profilo generato

2. **Generazione Profilo**:
   - Accedi alla pagina del cliente
   - Clicca sul pulsante "Genera Profilo AI"
   - Attendi il completamento dell'analisi (può richiedere alcuni secondi)

3. **Revisione e Personalizzazione**:
   - Rivedi il profilo generato
   - Apporta modifiche manuali se necessario
   - Clicca su "Salva Profilo" per confermare

4. **Utilizzo del Profilo**:
   - Il profilo AI sarà ora visibile nella pagina principale del cliente
   - L'Assistente AI utilizzerà questi dati per fornire risposte più personalizzate
   - Le raccomandazioni future saranno basate su questo profilo

#### Aggiungere Interazioni con Cliente
*Accesso: [/clients/:id](/clients) → Tab "Interazioni" → Pulsante "Nuova Interazione"*

Per registrare una nuova interazione con un cliente:

1. **Creazione Interazione**:
   - Accedi al profilo del cliente
   - Seleziona la tab "Interazioni"
   - Clicca sul pulsante "Nuova Interazione"

2. **Dettagli Interazione**:
   - Seleziona il tipo di interazione (Chiamata, Email, Incontro, Altro)
   - Inserisci data e ora dell'interazione
   - Compila un riassunto dell'interazione
   - Aggiungi dettagli specifici nei campi dedicati

3. **Argomenti Trattati**:
   - Seleziona gli argomenti discussi durante l'interazione
   - Aggiungi note su decisioni prese o follow-up necessari
   - Collega eventuali documenti pertinenti

4. **Finalizzazione**:
   - Clicca su "Salva Interazione"
   - L'interazione sarà ora visibile nella cronologia del cliente
   - Appariranno promemoria per eventuali follow-up programmati

### Calendario e Appuntamenti

#### Creazione Nuovo Appuntamento
*Accesso: [/calendar](/calendar) → Pulsante "Nuovo Appuntamento"*

Per creare un nuovo appuntamento:

1. **Avvio Creazione**:
   - Accedi alla sezione Calendario
   - Clicca sul pulsante "Nuovo Appuntamento" o direttamente su una fascia oraria nel calendario

2. **Dettagli Appuntamento**:
   - Seleziona il cliente dall'elenco a discesa
   - Scegli data e ora dell'appuntamento
   - Imposta la durata (30, 60, 90 o 120 minuti)
   - Seleziona la location (Ufficio, Ufficio Cliente, Zoom, Teams, Telefono)

3. **Dettagli Aggiuntivi**:
   - Inserisci un oggetto/titolo per l'appuntamento
   - Aggiungi note o agenda per l'incontro
   - Configura eventuali promemoria

4. **Invio Invito**:
   - Spunta la casella "Invia email al cliente" se desideri inviare un invito
   - Personalizza il messaggio dell'invito se necessario
   - Clicca su "Salva Appuntamento"

#### Preparazione Appuntamento
*Accesso: [/calendar](/calendar) → Seleziona appuntamento → Pulsante "Prepara"*

Per preparare un appuntamento imminente:

1. **Accesso Preparazione**:
   - Trova l'appuntamento nel calendario
   - Clicca sul pulsante "Prepara" associato all'appuntamento

2. **Suggerimenti AI**:
   - L'assistente AI genererà automaticamente:
     - Riassunto del profilo cliente
     - Ultimi incontri e decisioni prese
     - Argomenti suggeriti da discutere
     - Potenziali prodotti/servizi da proporre

3. **Personalizzazione**:
   - Modifica o aggiungi elementi all'agenda generata
   - Aggiungi documenti specifici da discutere
   - Salva la preparazione nel profilo del cliente

4. **Utilizzo Durante l'Incontro**:
   - Accedi alla preparazione durante l'appuntamento
   - Prendi note direttamente nel documento di preparazione
   - Completa gli elementi dell'agenda man mano che vengono discussi

## Elementi Interfaccia

- **Navigazione**: La piattaforma presenta una navigazione laterale per un facile accesso a tutte le sezioni principali
- **Design Responsive**: L'interfaccia si adatta a diverse dimensioni dello schermo, con una visualizzazione ottimizzata per dispositivi mobili
- **Supporto Tema**: Sono disponibili opzioni di modalità scura e chiara

## Capacità di Integrazione

- **Integrazione Email**: Invia inviti a riunioni e follow-up direttamente dalla piattaforma
- **Sincronizzazione Calendario**: Gli appuntamenti possono essere sincronizzati con altre applicazioni di calendario

## Funzionalità di Sicurezza

- **Autenticazione Utente**: Processo di login sicuro con verifica email
- **Accesso Basato su Ruoli**: Diversi livelli di accesso per consulenti e amministratori
- **Protezione Dati**: Le informazioni dei clienti sono archiviate in modo sicuro e accessibili solo da utenti autorizzati

---

## Collegamenti Rapidi

- [Assistente AI (Agent)](/agent)
- [Dashboard](/dashboard)
- [Clienti](/clients)
- [Calendario](/calendar)
- [Impostazioni](/settings)
- [Pannello Amministratore](/admin-panel) (solo admin)
- [Pagina Iniziale](/)

---

Questa documentazione riflette la funzionalità attuale della piattaforma Gervis. Le funzionalità potrebbero essere aggiornate o ampliate nei futuri rilasci. 