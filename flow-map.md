# Mappa del Flusso dell'Applicazione Gervis

Ecco una mappa completa del flusso dell'applicazione, dalla fase di login fino alle funzionalità client:

## 1. Login e Autenticazione

**Endpoint**: `/api/login`
**File principali**: 
- `server/routes.ts` (setup auth)
- `server/auth.ts` (gestione autenticazione)
- `client/src/pages/Login.tsx` (interfaccia utente)

**Funzioni chiave**:
- `setupAuth()` - Configura l'autenticazione
- `isAuthenticated()` - Middleware che verifica se l'utente è autenticato
- `app.get('/api/user')` - Verifica lo stato dell'utente corrente

## 2. Creazione Nuovo Cliente

**Endpoint**: `/api/clients`
**File principali**:
- `server/routes.ts` (api routing)
- `server/storage.ts` (database operations)
- `client/src/pages/NewClient.tsx` (interfaccia utente)

**Funzioni chiave**:
- `app.post('/api/clients')` - Crea un nuovo cliente
- `storage.createClient()` - Salva il cliente nel database
- Form di creazione client con validazione dati

## 3. Gestione Clienti

**Endpoint**: `/api/clients`
**File principali**:
- `server/routes.ts` (api routing)
- `server/storage.ts` (operazioni database)
- `client/src/pages/Clients.tsx` (lista clienti)
- `client/src/pages/ClientDetail.tsx` (dettaglio cliente)

**Funzioni chiave**:
- `app.get('/api/clients')` - Recupera tutti i clienti del consulente
- `app.get('/api/clients/:id')` - Recupera i dettagli di un singolo cliente
- `storage.getClientsByAdvisor()` - Query database per clienti
- `storage.getClient()` - Query database per cliente singolo

## 4. Onboarding Cliente

**Endpoint**: `/api/clients/:clientId/onboarding-email`
**File principali**:
- `server/routes.ts` (api routing)
- `server/email.ts` (invio email)
- `client/src/pages/ClientDetail.tsx` (interfaccia utente)

**Funzioni chiave**:
- `app.post('/api/clients/:clientId/onboarding-email')` - Invia email di onboarding
- `handleSendOnboardingEmail()` - Funzione client-side per inviare richiesta
- `sendOnboardingEmail()` - Funzione per generare e inviare l'email
- `storage.updateClientOnboardingToken()` - Aggiorna token di onboarding

## 5. Generazione e Invio PDF (MiFID)

**Endpoint**: `/api/clients/send-pdf`
**File principali**:
- `server/routes.ts` (api routing)
- `server/email.ts` (invio email)
- `client/src/components/dashboard/HtmlPdfGenerator.tsx` (generazione PDF)

**Funzioni chiave**:
- `sendEmailWithPdf()` - Genera il PDF e invia richiesta al server
- `html2pdf()` - Libreria per generare PDF da HTML
- `app.post('/api/clients/send-pdf')` - Endpoint per ricevere PDF e inviare email
- `sendCustomEmail()` - Invia email personalizzata con allegato

## 6. Appuntamenti e Incontri con Clienti

**Endpoint**: `/api/meetings`
**File principali**:
- `server/routes.ts` (api routing)
- `server/storage.ts` (database operations)
- `client/src/pages/Calendar.tsx` (calendario)
- `client/src/components/dashboard/MeetingForm.tsx` (form appuntamenti)

**Funzioni chiave**:
- `app.post('/api/meetings')` - Crea nuovo appuntamento
- `app.get('/api/meetings')` - Recupera appuntamenti
- `generateICalendarEvent()` - Genera invito iCalendar
- `sendMeetingInviteEmail()` - Invia email con invito appuntamento

## 7. Note e Log Cliente

**Endpoint**: `/api/clients/:clientId/logs`
**File principali**:
- `server/routes.ts` (api routing)
- `server/storage.ts` (database operations)
- `client/src/pages/ClientDetail.tsx` (interfaccia utente)

**Funzioni chiave**:
- `app.post('/api/clients/:clientId/logs')` - Crea nuova nota/log
- `app.get('/api/clients/:clientId/logs')` - Recupera note/log
- `storage.createClientLog()` - Salva log nel database
- `storage.getClientLogs()` - Recupera log dal database

## 8. Impostazioni Utente e Firma

**Endpoint**: `/api/user/settings`
**File principali**:
- `server/routes.ts` (api routing)
- `server/storage.ts` (database operations)
- `client/src/pages/Settings.tsx` (impostazioni utente)

**Funzioni chiave**:
- `app.post('/api/user/settings')` - Aggiorna impostazioni utente
- `app.get('/api/user/settings')` - Recupera impostazioni utente
- `onSignatureSubmit()` - Gestisce invio firma
- `storage.updateUserSettings()` - Salva impostazioni nel database

## 9. Configurazione Email

**Endpoint**: `/api/user/email-settings`
**File principali**:
- `server/routes.ts` (api routing)
- `server/email.ts` (configurazione email)
- `client/src/pages/Settings.tsx` (impostazioni email)

**Funzioni chiave**:
- `app.post('/api/user/email-settings')` - Aggiorna impostazioni email
- `app.get('/api/user/email-settings')` - Recupera impostazioni email
- `setupEmailTransporter()` - Configura trasportatore nodemailer
- `testEmailConfiguration()` - Testa configurazione email 