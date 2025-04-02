import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { storage } from './storage';

// Funzione per creare una firma professionale
function createSignature(userData: {
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  role?: string;
}) {
  const { firstName, lastName, company, email, phone } = userData;
  
  // Verifica che ci siano almeno i dati essenziali
  if (!firstName && !lastName) {
    return '';
  }
  
  let signature = '';
  
  // Nome e cognome (in grassetto)
  if (firstName || lastName) {
    signature += `<strong>${[firstName, lastName].filter(Boolean).join(' ')}</strong><br>`;
  }
  
  // Società se presente
  if (company) {
    signature += `${company}<br>`;
  }
  
  // Email come link
  if (email) {
    signature += `<a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a><br>`;
  }
  
  // Telefono (senza prefisso "Tel:")
  if (phone) {
    signature += `${phone}`;
  }
  
  return signature ? `<div style="margin-top: 20px; color: #555; border-top: 1px solid #eee; padding-top: 10px;">${signature}</div>` : '';
}

// Funzione di supporto per prendere variabili di configurazione email da diversi formati
function getEmailConfig(userConfig: any = null) {
  // Se sono state fornite configurazioni utente, utilizzale
  if (userConfig && userConfig.customEmailEnabled) {
    return {
      host: userConfig.smtpHost,
      port: userConfig.smtpPort,
      secure: userConfig.smtpPort === 465, // Secure per porta 465
      user: userConfig.smtpUser,
      pass: userConfig.smtpPass,
      from: userConfig.smtpUser, // Usa sempre l'username SMTP come mittente
    };
  }
  
  // Se arriviamo qui, significa che non abbiamo configurazioni valide
  throw new Error("Configurazione email mancante o non valida");
}

// Crea un transporter SMTP con configurazioni date
function createTransporter(config: any) {
  // Configurazione SMTP con opzioni specifiche per compatibilità
const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure, // usa TLS
  auth: {
      user: config.user,
      pass: config.pass
  },
  tls: {
    // Non verifica il certificato del server
    rejectUnauthorized: false
  },
  debug: true, // abilita debug per vedere maggiori dettagli
  logger: true // mostra log dettagliati
};

  return nodemailer.createTransport(options);
}

// Ottiene il transporter appropriato per un utente dato
async function getTransporter(userId: number | null) {
  if (!userId) {
    throw new Error("Impossibile inviare email: ID utente non specificato");
  }
  
  try {
    // Ottieni le impostazioni email dell'utente
    const user = await storage.getUser(userId);
    
    // Se l'utente ha configurazioni email personalizzate e le ha abilitate
    if (user && user.custom_email_enabled && user.smtp_host && user.smtp_user) {
      const userConfig = {
        smtpHost: user.smtp_host,
        smtpPort: user.smtp_port || 465,
        smtpUser: user.smtp_user,
        smtpPass: user.smtp_pass,
        customEmailEnabled: user.custom_email_enabled
      };
      
      const emailConfig = getEmailConfig(userConfig);
      const transporter = createTransporter(emailConfig);
      
      // Aggiungiamo i dati utente per generare la firma automaticamente
      const userData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || undefined,
        phone: user.phone || undefined,
        role: user.role || 'Consulente Finanziario'
      };
      
      return { transporter, config: emailConfig, userData };
    } else {
      // Configurazione email di default per utenti senza configurazioni personalizzate
      const defaultConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_USER || ''
      };
      
      const transporter = createTransporter(defaultConfig);
      
      // Dati utente per la firma
      const userData = {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        company: user?.company || undefined,
        phone: user?.phone || undefined,
        role: user?.role || 'Consulente Finanziario'
      };
      
      return { transporter, config: defaultConfig, userData };
    }
  } catch (error) {
    // Rilancia l'errore per informare il chiamante del problema
    throw error;
  }
}

// Funzione generica per inviare email
async function sendEmail({
  userId,
  to,
  subject,
  html,
  from = null,
  cc = null,
  attachments = [],
  clientId = null,
  logEmail = false,
  logType = "email",
  logTitle = null,
  logContent = null,
  useSignature = true,
  signatureData = null,
}: {
  userId: number;
  to: string | string[];
  subject: string;
  html: string;
  from?: string | null;
  cc?: string | null;
  attachments?: any[];
  clientId?: number | null;
  logEmail?: boolean;
  logType?: string;
  logTitle?: string | null;
  logContent?: string | null;
  useSignature?: boolean;
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null;
}) {
  try {
    // Ottieni il transporter appropriato
    const { transporter, config, userData } = await getTransporter(userId);
    
    // Modifica l'HTML per aggiungere la firma se richiesto e non è già inclusa
    if (useSignature && !html.includes('margin-top: 20px; color: #555; font-size: 14px; border-top: 1px solid #eee;')) {
      // Usa i dati firma personalizzati se forniti, altrimenti usa i dati utente
      const signatureSource = signatureData || {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        company: userData.company,
        phone: userData.phone,
        role: userData.role
      };
      
      const signature = createSignature(signatureSource);
      
      // Verifica se esiste un marker per la firma
      if (html.includes('<!-- SIGNATURE_POSITION -->')) {
        // Inserisci la firma al posto del marker
        html = html.replace('<!-- SIGNATURE_POSITION -->', signature);
      }
      // Altrimenti usiamo il comportamento precedente
      else if (html.includes('</div>')) {
        // Trova l'ultima occorrenza di </div> nell'HTML
        const lastDivIndex = html.lastIndexOf('</div>');
        if (lastDivIndex !== -1) {
          html = html.substring(0, lastDivIndex) + signature + html.substring(lastDivIndex);
        } else {
          // Se non c'è un tag </div>, aggiungi la firma alla fine
          html += signature;
        }
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', `${signature}</body>`);
      } else {
        html += signature;
      }
    }
    
    // Prepara le opzioni email
    const mailOptions: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
      cc?: string;
      attachments?: any[];
    } = {
      from: from || `"Gervis" <${config.from}>`,
      to,
      subject,
      html,
      attachments
    };
    
    // Aggiungi cc se fornito
    if (cc) {
      mailOptions.cc = cc;
    }
    
    // Invia l'email
    const info = await transporter.sendMail(mailOptions);
    
    // Registra l'email nei log se richiesto
    if (logEmail && clientId) {
      try {
        await storage.createClientLog({
          clientId,
          type: logType,
          title: logTitle || `Email: ${subject}`,
          content: logContent || html,
          emailSubject: subject,
          emailRecipients: Array.isArray(to) ? to.join(', ') : to,
          logDate: new Date(),
          createdBy: userId
        });
      } catch (logError) {
        // Non interrompiamo il flusso se la registrazione nel log fallisce
      }
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

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
  language: EmailLanguage = 'italian',
  userId: number,
  useSignature: boolean = false,
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  try {
    if (!userId) {
      throw new Error("Impossibile inviare email: ID utente non specificato");
    }
    
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
        <!-- SIGNATURE_POSITION -->
      </div>
    `;
    
    // Configurazione per Aruba
    const arubaConfig = {
      host: process.env.SMTP_HOST || 'smtp.aruba.it',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'registration@gervis.it',
        pass: process.env.SMTP_PASS || '',
        method: 'LOGIN' // Specificare LOGIN come metodo di autenticazione
      }
    };
    
    // Crea transporter
    const transporter = nodemailer.createTransport(arubaConfig);
    
    // Invia l'email
    await transporter.sendMail({
      from: `"Gervis" <${process.env.SMTP_FROM || 'registration@gervis.it'}>`,
      to: userEmail,
      subject: content.subject,
      html
    });
    
    return true;
  } catch (error) {
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
  advisorEmail?: string,
  clientId?: number,
  userId?: number,
  logEmail: boolean = true,
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  try {
    if (!userId) {
      throw new Error("Impossibile inviare email: ID utente non specificato");
    }
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .signature { margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="white-space: pre-line;">${message}</div>
        <!-- SIGNATURE_POSITION -->
      </div>
    </body>
    </html>
    `;
    
    return await sendEmail({
      userId,
      to: clientEmail,
      cc: advisorEmail,
      subject,
      html,
      attachments,
      clientId,
      logEmail,
      logTitle: `Email: ${subject}`,
      logContent: message,
      useSignature: true,
      signatureData: signatureData
    });
  } catch (error) {
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
  customSubject?: string,
  clientId?: number,
  userId?: number,
  logEmail: boolean = true,
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  try {
    if (!userId) {
      throw new Error("Impossibile inviare email: ID utente non specificato");
    }
    
    // Select content based on language
    const content = language === 'english' ? englishContent : italianContent;
    
    // Format the message content with HTML paragraphs if provided
    const messageContent = customMessage 
      ? customMessage.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')
      : `<p>${content.invitation}</p>`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; }
          .expiry { font-size: 14px; color: #666; }
          .signature { margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
        ${content.title ? `<h2 style="color: #0066cc;">${content.title}</h2>` : ''}
        <p style="margin-bottom: 16px;">${content.greeting(firstName, lastName)}</p>
        ${customMessage ? messageContent : `<p>${content.invitation}</p>`}
        <p style="margin-top: 20px;">${content.callToAction}</p>
        <div style="margin: 30px 0;">
            <a href="${onboardingLink}" class="button">
            ${content.buttonText}
          </a>
        </div>
          <p class="expiry">${content.expiry}</p>
        <p>${content.questions}</p>
          <!-- SIGNATURE_POSITION -->
      </div>
      </body>
      </html>
    `;
    
    // Utilizziamo prioritariamente il valore fornito dall'utente, con fallback solo se vuoto
    const emailSubject = customSubject && customSubject.trim().length > 0 
      ? customSubject 
      : content.subject;
    
    return await sendEmail({
      userId,
      to: clientEmail,
      cc: advisorEmail,
      subject: emailSubject,
      html,
      clientId,
      logEmail,
      logTitle: "Email di onboarding",
      logContent: `Email di onboarding inviata in ${language === 'italian' ? 'italiano' : 'inglese'}\n\n${customMessage || content.invitation}`,
      useSignature: true,
      signatureData: signatureData
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Invia un'email di invito a un meeting al cliente
 */
export async function sendMeetingInviteEmail(
  to: string,
  clientName: string,
  advisorFirstName: string,
  advisorLastName: string,
  subject: string,
  date: string,
  time: string,
  location: string,
  notes: string,
  icalData: string,
  advisorEmail: string,
  clientId: number,
  advisorId: number,
  logEmail: boolean = true,
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invito a meeting</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .content {
      padding: 20px 0;
    }
    .meeting-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .meeting-details div {
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
    p {
      margin-bottom: 1em;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #007bff;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
    .signature { 
      margin-top: 30px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Invito a Meeting</h2>
    </div>
    
    <div class="content">
      <p>Gentile ${clientName},</p>
      
      <p>${advisorFirstName} ${advisorLastName} ti ha invitato a un meeting con il seguente oggetto: <strong>${subject}</strong>.</p>
      
      <div class="meeting-details">
        <div><strong>Data:</strong> ${date}</div>
        <div><strong>Ora:</strong> ${time}</div>
        <div><strong>Luogo:</strong> ${location}</div>
        ${notes ? `<div><strong>Note:</strong> ${notes}</div>` : ''}
      </div>
      
      <p>Puoi aggiungere questo evento al tuo calendario utilizzando l'allegato .ics in questa email.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const attachments = [
      {
        filename: 'meeting.ics',
        content: icalData,
        contentType: 'text/calendar'
      }
    ];
    
    return await sendEmail({
      userId: advisorId,
      to: to,
      subject: subject,
      html: emailTemplate,
      attachments,
      clientId: clientId,
      logEmail: logEmail,
      logType: "meeting-invite",
      logTitle: `Invito a meeting con ${clientName}`,
      logContent: `Invito a meeting con ${clientName} il ${date} alle ${time}`,
      useSignature: false,
      signatureData: signatureData
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Invia un'email di aggiornamento di un meeting al cliente
 */
export async function sendMeetingUpdateEmail(
  to: string,
  clientName: string,
  advisorFirstName: string,
  advisorLastName: string,
  subject: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string,
  location: string,
  notes: string,
  icalData: string,
  advisorEmail: string,
  clientId: number,
  advisorId: number,
  logEmail: boolean = true,
  signatureData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
) {
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aggiornamento Meeting</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .content {
      padding: 20px 0;
    }
    .meeting-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .meeting-details div {
      margin-bottom: 10px;
    }
    .changes {
      background-color: #fff8e1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
    p {
      margin-bottom: 1em;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #007bff;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
    .signature { 
      margin-top: 30px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Aggiornamento Meeting</h2>
    </div>
    
    <div class="content">
      <p>Gentile ${clientName},</p>
      
      <p>${advisorFirstName} ${advisorLastName} ha aggiornato le informazioni del meeting "${subject}".</p>
      
      <div class="changes">
        <h3>Modifiche all'appuntamento:</h3>
        <div><strong>Data precedente:</strong> ${oldDate} alle ${oldTime}</div>
        <div><strong>Nuova data:</strong> ${newDate} alle ${newTime}</div>
      </div>
      
      <div class="meeting-details">
        <h3>Nuovi dettagli dell'appuntamento:</h3>
        <div><strong>Oggetto:</strong> ${subject}</div>
        <div><strong>Data:</strong> ${newDate}</div>
        <div><strong>Ora:</strong> ${newTime}</div>
        <div><strong>Luogo:</strong> ${location}</div>
        ${notes ? `<div><strong>Note:</strong> ${notes}</div>` : ''}
      </div>
      
      <p>L'invito al calendario è stato aggiornato automaticamente. In alternativa, puoi aggiungere questo evento al tuo calendario utilizzando l'allegato .ics in questa email.</p>
      
      <p>Per qualsiasi domanda o necessità di riorganizzare l'appuntamento, non esitare a contattarci.</p>
      
      <p>Cordiali saluti,<br>
      ${advisorFirstName} ${advisorLastName}</p>
      
      <!-- SIGNATURE_POSITION -->
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} - Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const attachments = [
      {
        filename: 'meeting.ics',
        content: icalData,
        contentType: 'text/calendar'
      }
    ];
    
    return await sendEmail({
      userId: advisorId,
      to: to,
      subject: `Aggiornamento meeting: ${subject}`,
      html: emailTemplate,
      attachments,
        clientId,
      logEmail,
      logType: "meeting_update",
      logTitle: "Aggiornamento meeting",
      logContent: emailTemplate,
      useSignature: false,
      signatureData: signatureData
    });
  } catch (error) {
    throw error;
  }
}

// Esporta la funzione di test connessione SMTP
export async function testSMTPConnection(smtpConfig: {
  host: string;
  port: string | number;
  user: string;
  password: string;
  from?: string;
}) {
  try {
    const config = {
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port.toString(), 10),
      secure: parseInt(smtpConfig.port.toString(), 10) === 465,
      user: smtpConfig.user,
      pass: smtpConfig.password,
      from: smtpConfig.from || smtpConfig.user
    };
    
    const testTransporter = createTransporter(config);
    
    try {
      await testTransporter.verify();
      
      return { success: true, message: 'Connessione SMTP verificata con successo' };
    } catch (verifyError: any) {
      return { 
        success: false, 
        message: `Errore connessione SMTP: ${verifyError.message}`,
        error: verifyError.message
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Errore connessione SMTP: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}