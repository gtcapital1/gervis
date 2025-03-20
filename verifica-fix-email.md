# Verifica Fix Email Onboarding

## Riassunto problema

Il sistema presentava un problema con l'invio delle email durante l'onboarding dei clienti. In particolare:

1. L'API `/api/clients/:id/onboarding-token` non utilizzava correttamente il parametro `sendEmail`
2. Il parametro `customSubject` non veniva passato correttamente alla funzione di invio email
3. Il frontend non riceveva conferma se l'email era stata inviata

## Modifiche apportate

### 1. Nel server/routes.ts

```typescript
// Prima
if (customMessage) {
  // Tentava di inviare l'email solo se c'era un messaggio personalizzato
  // ...codice per inviare l'email...
}

// Dopo
if (sendEmail) {
  // Invia l'email solo se il flag sendEmail è true
  // ...codice aggiornato per inviare l'email con customSubject...
}

// Prima
res.json({ 
  success: true, 
  token,
  link,
  language
});

// Dopo
res.json({ 
  success: true, 
  token,
  link,
  language,
  emailSent: sendEmail  // Aggiunto flag per informare il frontend
});
```

### 2. Nel server/email.ts

```typescript
// Prima
export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string,
  language: EmailLanguage = 'english',
  customMessage?: string,
  advisorSignature?: string,
  advisorEmail?: string
) {
  // ...

// Dopo
export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string,
  language: EmailLanguage = 'english',
  customMessage?: string,
  advisorSignature?: string,
  advisorEmail?: string,
  customSubject?: string
) {
  // ...

// Prima - oggetto email fisso
const mailOptions = {
  from: `"Gervis" <${emailConfig.from}>`,
  to: clientEmail,
  subject: content.onboarding.subject,
  html: html
};

// Dopo - oggetto email personalizzabile
const emailSubject = customSubject && customSubject.trim().length > 0 
  ? customSubject 
  : content.onboarding.subject;

const mailOptions = {
  from: `"Gervis" <${emailConfig.from}>`,
  to: clientEmail,
  subject: emailSubject,
  html: html
};
```

### 3. Nel client/src/pages/ClientDetail.tsx

```typescript
// Già corretto
sendOnboardingMutation.mutate({
  language: emailLanguage,
  customMessage: emailMessage,
  customSubject: emailSubject,
  sendEmail: true  // Flag per richiedere l'invio dell'email
});
```

## Come testare il fix

1. Accedi alla dashboard dell'applicazione
2. Vai a un cliente esistente
3. Clicca sul pulsante per inviare email di onboarding
4. Compila i campi (lingua, messaggio, oggetto)
5. Invia l'email
6. Verifica nella dashboard che l'email sia stata inviata
7. Verifica l'arrivo dell'email nella casella del cliente

## Procedura di deployment

1. Esegui push delle modifiche sul repository Git usando `./push-email-fix-to-git.sh`
2. Sul server di produzione esegui `./fix-email-onboarding.sh`
3. Verifica il funzionamento dall'interfaccia web

In caso di problemi, i backup dei file originali sono disponibili nella cartella `/var/www/gervis/backups/TIMESTAMP`.