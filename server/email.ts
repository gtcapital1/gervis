import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

// Funzione di supporto per prendere variabili di configurazione email da diversi formati
function getEmailConfig() {
  // Verifico tutte le variabili di ambiente email disponibili
  console.log("DEBUG - Email config - Verifica variabili d'ambiente:");
  console.log("SMTP_USER:", process.env.SMTP_USER ? "definito" : "non definito");
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? "definito" : "non definito");
  console.log("SMTP_FROM:", process.env.SMTP_FROM ? "definito" : "non definito");
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "definito" : "non definito");
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "definito" : "non definito");
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM ? "definito" : "non definito");
  
  // Utilizziamo le credenziali SMTP dalle variabili di ambiente con fallback
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'registration@gervis.it';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '';
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user;
  
  console.log("DEBUG - Email config - Configurazione risultante:");
  console.log("Host:", 'smtps.aruba.it');
  console.log("Port:", 465);
  console.log("User:", user);
  console.log("From:", from);
  console.log("Password length:", pass ? pass.length : 0);
  
  return {
    host: 'smtps.aruba.it',
    port: 465,
    secure: true, // Per Aruba, la porta 465 è sempre secure
    user,
    pass,
    from
  };
}

// Supporta sia il formato EMAIL_ che SMTP_ delle variabili ambiente
console.log("DEBUG - Inizializzazione configurazione email");
const emailConfig = getEmailConfig();

// Configurazione SMTP per Aruba con opzioni specifiche per compatibilità
// Nuova configurazione semplificata per Aruba
console.log("DEBUG - Utilizzo configurazione SMTP alternativa per Aruba");
const options: SMTPTransport.Options = {
  host: 'smtps.aruba.it',
  port: 465,
  secure: true, // usa TLS
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass
  },
  tls: {
    // Non verifica il certificato del server
    rejectUnauthorized: false
  },
  debug: true, // abilita debug per vedere maggiori dettagli
  logger: true // mostra log dettagliati
};

// Commento: La proprietà pool è stata rimossa perché non è presente nel tipo Options di SMTPTransport
// Ma è comunque importante notare che vogliamo evitare il pooling per evitare problemi con alcuni server

console.log("DEBUG - Creazione transporter nodemailer");
// Aggiungi debug logger per nodemailer
const transporter = nodemailer.createTransport(options);

// Abilita modalità di debug estesa
if (process.env.NODE_ENV !== 'production') {
  transporter.set('debug', true);
}

// Log aggiuntivo per verificare che le credenziali siano state impostate correttamente
console.log("DEBUG - Verifica configurazione transporter:");
console.log("Auth user impostato:", !!emailConfig.user);
console.log("Auth password impostata:", !!emailConfig.pass);

// Verifica la connessione al server SMTP
console.log("DEBUG - Verifica connessione SMTP...");
transporter.verify()
  .then(() => {
    console.log("DEBUG - Connessione SMTP verificata con successo!");
  })
  .catch(err => {
    console.error("ERRORE - Verifica connessione SMTP fallita:", err);
  });

// English content
const englishContent = {
  subject: 'Complete Your Financial Profile',
  title: '', // Removed per client request
  greeting: (firstName: string, lastName: string) => `Dear ${firstName} ${lastName},`,
  invitation: 'I have personally invited you to complete our simple onboarding process. This quick assessment will help me better understand your unique financial situation and goals so I can provide you with truly personalized guidance.',
  callToAction: 'Please click the button below to complete your profile (it only takes about 5 minutes):',
  buttonText: 'Complete My Profile',
  expiry: 'This link will expire in 7 days for security purposes.',
  questions: 'If you have any questions, please feel free to contact me directly.',
  signature: 'Warm regards,',
  team: 'Financial Advisor'
};

// Italian content
const italianContent = {
  subject: 'Completa il tuo profilo',
  title: '', // Removed per client request
  greeting: (firstName: string, lastName: string) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Ti invito personalmente a completare la nostra semplice procedura iniziale. Questa breve valutazione mi permetterà di comprendere meglio la tua situazione finanziaria e i tuoi obiettivi, così da offrirti una consulenza realmente su misura per te.',
  callToAction: 'Per favore, clicca sul pulsante qui sotto per completare il tuo profilo (richiede solo circa 5 minuti):',
  buttonText: 'Completa il Mio Profilo',
  expiry: 'Questo link scadrà tra 7 giorni per motivi di sicurezza.',
  questions: 'Se hai domande, non esitare a contattarmi direttamente.',
  signature: '',
  team: 'Consulente Finanziario'
};

type EmailLanguage = 'english' | 'italian';

// Email verification content
const emailVerificationContent = {
  english: {
    subject: 'Your Gervis verification code',
    title: 'Email Verification Required',
    greeting: (name: string) => `Dear ${name},`,
    message: 'Thank you for registering with Gervis. To complete your registration and access all features, please use the verification code below:',
    pinMessage: (pin: string) => `Your verification code is: ${pin}`,
    expiry: 'This verification code will expire in 24 hours for security purposes.',
    footer: 'If you did not sign up for a Gervis account, please ignore this email.',
    signature: 'The Gervis Team'
  },
  italian: {
    subject: 'Il tuo codice di verifica Gervis',
    title: 'Verifica Email Richiesta',
    greeting: (name: string) => `Gentile ${name},`,
    message: 'Grazie per esserti registrato su Gervis. Per completare la registrazione e accedere a tutte le funzionalità, utilizza il codice di verifica qui sotto:',
    pinMessage: (pin: string) => `Il tuo codice di verifica è: ${pin}`,
    expiry: 'Questo codice di verifica scadrà tra 24 ore per motivi di sicurezza.',
    footer: 'Se non hai creato un account Gervis, ignora questa email.',
    signature: 'Il Team Gervis'
  }
};

// Function to send email verification with PIN
export async function sendVerificationPin(
  userEmail: string,
  userName: string,
  pin: string,
  language: EmailLanguage = 'italian'
) {
  try {
    const content = language === 'english' ? emailVerificationContent.english : emailVerificationContent.italian;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
        <h2 style="color: #0066cc;">${content.title}</h2>
        <p style="margin-bottom: 16px;">${content.greeting(userName)}</p>
        <p>${content.message}</p>
        <div style="margin: 30px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0066cc; margin: 20px 0;">
            ${pin}
          </p>
        </div>
        <p style="font-size: 14px; color: #666;">${content.expiry}</p>
        <p style="font-size: 14px; color: #666;">${content.footer}</p>
        <p style="margin-top: 30px;">${content.signature}</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"Gervis" <${emailConfig.from}>`,
      to: userEmail,
      subject: content.subject,
      html,
    });
    
    console.log(`Verification PIN email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending verification PIN email:', error);
    throw error;
  }
}

// Function to send email verification (legacy - maintaining for backward compatibility)
export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationLink: string,
  language: EmailLanguage = 'italian'
) {
  try {
    const content = language === 'english' ? emailVerificationContent.english : emailVerificationContent.italian;
    
    // Creiamo una versione semplificata senza bottone
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
        <h2 style="color: #0066cc;">${content.title}</h2>
        <p style="margin-bottom: 16px;">${content.greeting(userName)}</p>
        <p>${content.message}</p>
        <p style="margin-top: 20px;">Codice di verifica richiesto per accedere.</p>
        <p style="font-size: 14px; color: #666;">${content.expiry}</p>
        <p style="font-size: 14px; color: #666;">${content.footer}</p>
        <p style="margin-top: 30px;">${content.signature}</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"Gervis" <${emailConfig.from}>`,
      to: userEmail,
      subject: content.subject,
      html,
    });
    
    console.log(`Verification email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function sendCustomEmail(
  clientEmail: string,
  subject: string,
  message: string,
  language: EmailLanguage = 'english',
  attachments?: any[],
  advisorSignature?: string,
  advisorEmail?: string
) {
  try {
    const content = language === 'english' ? englishContent : italianContent;
    const signature = advisorSignature || content.team;
    
    // Verifica se il messaggio già contiene la firma dell'advisor
    const containsSignature = advisorSignature && message.includes(advisorSignature.split('\n')[0]);
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="white-space: pre-line;">${message}</div>
      </div>
    </body>
    </html>
    `;
    
    const mailOptions = {
      from: `"Gervis" <${emailConfig.from}>`,
      to: clientEmail,
      cc: advisorEmail,
      subject: subject,
      html: emailHtml,
      attachments: attachments || []
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${clientEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

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
  try {
    // Select content based on language
    const content = language === 'english' ? englishContent : italianContent;
    
    // Process custom message if provided
    // Remove salutations that might be duplicated in the email
    let processedMessage = customMessage || '';
    const greetingPatterns = [
      new RegExp(`Dear\\s+${firstName}\\s+${lastName}`, 'i'),
      new RegExp(`Gentile\\s+${firstName}\\s+${lastName}`, 'i'),
      /^Dear\s+.*,/i,
      /^Gentile\s+.*,/i
    ];
    
    // Remove greeting lines from custom message to avoid duplication
    if (customMessage) {
      const messageLines = customMessage.split('\n');
      const filteredLines = messageLines.filter(line => {
        const trimmedLine = line.trim();
        return !greetingPatterns.some(pattern => pattern.test(trimmedLine));
      });
      processedMessage = filteredLines.join('\n');
    }
    
    // Format the message content with HTML paragraphs
    const messageContent = customMessage 
      ? processedMessage.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')
      : `<p>${content.invitation}</p>`;
    
    // Prepare signature section - Verifico se la firma dell'advisor contiene già una formula di saluto
    const containsSignaturePhrase = advisorSignature && 
      (advisorSignature.toLowerCase().includes('cordiali saluti') || 
       advisorSignature.toLowerCase().includes('best regards') ||
       advisorSignature.toLowerCase().includes('warm regards') ||
       advisorSignature.toLowerCase().includes('regards') ||
       advisorSignature.toLowerCase().includes('saluti'));

    const signatureHtml = advisorSignature 
      ? containsSignaturePhrase
          ? `<p style="white-space: pre-line; margin-top: 30px;">${advisorSignature}</p>`
          : `<p style="white-space: pre-line; margin-top: 30px;">${advisorSignature}</p>`
      : `<p style="margin-top: 30px;">${content.team}</p>`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
        ${content.title ? `<h2 style="color: #0066cc;">${content.title}</h2>` : ''}
        <p style="margin-bottom: 16px;">${content.greeting(firstName, lastName)}</p>
        ${customMessage ? messageContent : `<p>${content.invitation}</p>`}
        <p style="margin-top: 20px;">${content.callToAction}</p>
        <div style="margin: 30px 0;">
          <a href="${onboardingLink}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            ${content.buttonText}
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">${content.expiry}</p>
        <p>${content.questions}</p>
        ${signatureHtml}
      </div>
    `;
  
    // Debug dell'oggetto email prima dell'invio
    console.log("DEBUG - sendOnboardingEmail - customSubject:", customSubject);
    
    // Forziamo un valore per l'oggetto se è vuoto o non definito
    const emailSubject = customSubject && customSubject.length > 0 
      ? customSubject 
      : "Completa il tuo profilo";
      
    console.log("DEBUG - OGGETTO FINALE USATO:", emailSubject);
    
    await transporter.sendMail({
      from: `"Gervis" <${emailConfig.from}>`,
      to: clientEmail,
      cc: advisorEmail,
      subject: emailSubject, // Usiamo la variabile locale che è già stata verificata
      html,
    });
    
    console.log(`Onboarding email sent to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    throw error;
  }
}