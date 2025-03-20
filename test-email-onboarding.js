/**
 * Script per testare l'invio di email di onboarding
 * 
 * Questo script:
 * 1. Carica la configurazione email dal file .env
 * 2. Configura un transporter Nodemailer
 * 3. Tenta di inviare una email di test con la stessa configurazione dell'app
 * 4. Fornisce dettagli completi su eventuali errori
 * 
 * Uso: node test-email-onboarding.js RECIPIENT_EMAIL
 * Esempio: node test-email-onboarding.js client@example.com
 */

// Carica variabili d'ambiente
require('dotenv').config();

const nodemailer = require('nodemailer');

// Se non è stato fornito un indirizzo email destinatario, mostra il messaggio di utilizzo
const recipientEmail = process.argv[2];
if (!recipientEmail) {
  console.error('Utilizzo: node test-email-onboarding.js RECIPIENT_EMAIL');
  process.exit(1);
}

// Funzione di supporto per prendere variabili di configurazione email
function getEmailConfig() {
  // Verifico tutte le variabili di ambiente email disponibili
  console.log("\n--- VERIFICA CONFIGURAZIONE EMAIL ---");
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
  
  console.log("\n--- CONFIGURAZIONE RISULTANTE ---");
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

async function testEmailSending() {
  console.log("\n=== TEST INVIO EMAIL ONBOARDING ===");
  console.log("Destinatario:", recipientEmail);
  
  try {
    // Ottenere configurazione email
    const emailConfig = getEmailConfig();
    
    // Configurazione transporter
    console.log("\n--- CONFIGURAZIONE TRANSPORTER ---");
    const options = {
      host: emailConfig.host,
      port: emailConfig.port,
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
    };
    
    console.log("Creazione transporter con configurazione:", JSON.stringify({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: { user: options.auth.user, pass: '***HIDDEN***' }
    }, null, 2));
    
    // Crea transporter
    const transporter = nodemailer.createTransport(options);
    
    // Verifica connessione
    console.log("\n--- VERIFICA CONNESSIONE ---");
    console.log("Tentativo di connessione al server SMTP...");
    await transporter.verify();
    console.log("Connessione al server SMTP riuscita!");
    
    // Preparazione email di test
    console.log("\n--- INVIO EMAIL DI TEST ---");
    
    // Contenuto onboarding in italiano (semplificato per il test)
    const onboardingLink = `${process.env.BASE_URL || 'https://gervis.it'}/onboarding?token=TEST-TOKEN-12345`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
        <p style="margin-bottom: 16px;">Gentile Utente Test,</p>
        <p>Questa è una email di test per verificare la funzionalità di onboarding.</p>
        <p style="margin-top: 20px;">Per favore, clicca sul pulsante qui sotto:</p>
        <div style="margin: 30px 0;">
          <a href="${onboardingLink}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Completa il Mio Profilo
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">Questo è un test e non richiede azioni.</p>
        <p>Per assistenza, contattare il supporto.</p>
        <p style="margin-top: 30px;">Il Team Gervis</p>
      </div>
    `;
    
    const mailOptions = {
      from: `"Gervis Test" <${emailConfig.from}>`,
      to: recipientEmail,
      subject: "TEST - Completa il tuo profilo",
      html: html
    };
    
    // Invio email
    console.log("Invio email a:", recipientEmail);
    console.log("Da:", mailOptions.from);
    console.log("Oggetto:", mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log("\n--- RISULTATO INVIO ---");
    console.log("Email inviata con successo!");
    console.log("ID Messaggio:", info.messageId);
    console.log("Risposta del server:", info.response);
    
    return true;
  } catch (error) {
    console.error("\n--- ERRORE INVIO EMAIL ---");
    console.error("Dettagli errore:", error);
    
    // Verifica errori comuni
    if (error.code === 'EAUTH') {
      console.error("\nERRORE DI AUTENTICAZIONE: Le credenziali email potrebbero essere errate o scadute.");
      console.error("Controlla SMTP_USER e SMTP_PASS nel file .env");
    } else if (error.code === 'ESOCKET') {
      console.error("\nERRORE DI CONNESSIONE: Impossibile connettersi al server SMTP.");
      console.error("Verificare che il server SMTP sia raggiungibile e che la porta sia corretta.");
    } else if (error.code === 'EENVELOPE') {
      console.error("\nERRORE NELL'ENVELOPE: Indirizzo mittente o destinatario non valido.");
      console.error("Verificare che gli indirizzi email siano formattati correttamente.");
    }
    
    return false;
  }
}

// Esecuzione del test
testEmailSending()
  .then(success => {
    console.log("\n=== RIEPILOGO ===");
    if (success) {
      console.log("✅ Test completato con successo!");
      console.log("L'email di test è stata inviata correttamente a:", recipientEmail);
      console.log("\nSe l'invio ha funzionato ma l'applicazione non invia email, il problema potrebbe essere nel codice dell'app.");
    } else {
      console.log("❌ Test fallito!");
      console.log("Non è stato possibile inviare l'email di test. Verificare gli errori sopra riportati.");
    }
    process.exit(success ? 0 : 1);
  });