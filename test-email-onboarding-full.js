/**
 * Script di test per verificare l'invio delle email di onboarding,
 * con particolare attenzione al customSubject.
 * 
 * Questo script testa direttamente la funzione sendOnboardingEmail
 * verificando la corretta propagazione dei parametri, incluso customSubject.
 * 
 * Uso: node test-email-onboarding-full.js
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Funzione di supporto per ottenere le credenziali email
function getEmailConfig() {
  console.log("DEBUG - Email config - Verifica variabili d'ambiente:");
  console.log("SMTP_USER:", process.env.SMTP_USER ? "definito" : "non definito");
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? "definito" : "non definito");
  console.log("SMTP_FROM:", process.env.SMTP_FROM ? "definito" : "non definito");
  console.log("EMAIL_USER:", process.env.EMAIL_USER ? "definito" : "non definito");
  console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "definito" : "non definito");
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM ? "definito" : "non definito");
  
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
    secure: true,
    user,
    pass,
    from
  };
}

// Italian content for the email
const italianContent = {
  subject: 'Completa il tuo profilo',
  title: '',
  greeting: (firstName, lastName) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Ti invito personalmente a completare la nostra semplice procedura iniziale. Questa breve valutazione mi permetterà di comprendere meglio la tua situazione finanziaria e i tuoi obiettivi, così da offrirti una consulenza realmente su misura per te.',
  callToAction: 'Per favore, clicca sul pulsante qui sotto per completare il tuo profilo (richiede solo circa 5 minuti):',
  buttonText: 'Completa il Mio Profilo',
  expiry: 'Questo link scadrà tra 7 giorni per motivi di sicurezza.',
  questions: 'Se hai domande, non esitare a contattarmi direttamente.',
  signature: '',
  team: 'Consulente Finanziario'
};

// Function to send onboarding email (simplified for testing)
async function sendOnboardingEmail(
  clientEmail,
  firstName,
  lastName,
  onboardingLink,
  language = 'italian',
  customMessage,
  advisorSignature,
  advisorEmail,
  customSubject
) {
  try {
    // Initialize email configuration
    const emailConfig = getEmailConfig();
    const transporter = nodemailer.createTransport({
      host: 'smtps.aruba.it',
      port: 465,
      secure: true,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
    
    // Select content based on language
    const content = italianContent;
    
    // Format message content
    const messageContent = customMessage 
      ? customMessage.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')
      : `<p>${content.invitation}</p>`;
    
    // Prepare signature section
    const signatureHtml = advisorSignature 
      ? `<p style="white-space: pre-line; margin-top: 30px;">${advisorSignature}</p>`
      : `<p style="margin-top: 30px;">${content.team}</p>`;
    
    // Create email HTML content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
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
  
    console.log("DEBUG - sendOnboardingEmail - customSubject originale:", customSubject);
    
    // Utilizziamo prioritariamente il valore fornito dall'utente, con fallback solo se vuoto
    const emailSubject = customSubject && customSubject.trim().length > 0 
      ? customSubject 
      : "Completa il tuo profilo";
      
    console.log("DEBUG - OGGETTO FINALE USATO (scelto dall'utente o fallback):", emailSubject);
    
    // Costruiamo interamente l'oggetto email per evitare problemi
    const mailOptions = {
      from: `"Gervis" <${emailConfig.from}>`,
      to: clientEmail,
      subject: emailSubject,
      html: html
    };
    
    // Se c'è un advisorEmail, lo aggiungiamo come CC
    if (advisorEmail) {
      console.log("DEBUG - Aggiunto CC a:", advisorEmail);
      mailOptions.cc = advisorEmail;
    }
    
    console.log("DEBUG - Mail options complete:", JSON.stringify(mailOptions, null, 2));
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Onboarding email sent to ${clientEmail}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    throw error;
  }
}

// Test function to execute the email sending
async function testEmailSending() {
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const testAdvisorEmail = process.env.ADVISOR_EMAIL || 'advisor@example.com';
  
  console.log("=== Test Invio Email di Onboarding ===");
  console.log("Email di test:", testEmail);
  
  try {
    // Test con customSubject specificato
    await sendOnboardingEmail(
      testEmail,
      "Mario",
      "Rossi",
      "https://gervis.it/onboarding?token=test123",
      "italian",
      "Messaggio personalizzato per il test di onboarding.\n\nQuesta è una prova per verificare il corretto funzionamento dell'invio email.",
      "Firma del consulente\nConsulente Finanziario",
      testAdvisorEmail,
      "OGGETTO PERSONALIZZATO - Test di Onboarding"
    );
    
    console.log("=== Test completato con successo ===");
    console.log("Verificare che l'email sia stata ricevuta e che l'oggetto sia 'OGGETTO PERSONALIZZATO - Test di Onboarding'");
  } catch (error) {
    console.error("=== Test fallito ===");
    console.error("Errore durante l'invio dell'email:", error);
  }
}

// Execute the test
testEmailSending();