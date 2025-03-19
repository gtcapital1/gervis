/**
 * Script per testare la connessione SMTP e l'invio di email.
 * Può essere utile per diagnosticare problemi con il server di posta.
 * 
 * Uso: node test-smtp.js
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Carica le variabili d'ambiente dal file .env
console.log('Tentativo di caricare il file .env...');
const result = dotenv.config();
if (result.error) {
  console.error('Errore nel caricamento del file .env:', result.error);
} else {
  console.log('File .env caricato con successo.');
}

// Verifica la presenza delle variabili SMTP
console.log('\nVariabili d'ambiente SMTP:');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Presente' : 'Non trovato');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Presente (nascosto)' : 'Non trovato');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Presente' : 'Non trovato');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Presente (nascosto)' : 'Non trovato');

// Configurazione email
const emailConfig = {
  host: 'smtps.aruba.it',
  port: 465,
  user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
  pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
  from: process.env.SMTP_USER || process.env.EMAIL_USER || 'test@example.com'
};

console.log('\nConfigurazione SMTP:');
console.log('Host:', emailConfig.host);
console.log('Port:', emailConfig.port);
console.log('User:', emailConfig.user);
console.log('From:', emailConfig.from);
console.log('Password length:', emailConfig.pass?.length || 0);

// Configurazione SMTP per Aruba con opzioni specifiche
console.log('\nCreazione configurazione transporter...');
const options = {
  host: emailConfig.host,
  port: emailConfig.port,
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

// Verifica configurazione transporter
console.log('\nVerifica configurazione transporter:');
console.log('Auth user impostato:', !!options.auth.user);
console.log('Auth password impostata:', !!options.auth.pass);

// Crea il transporter
console.log('\nCreazione transporter Nodemailer...');
const transporter = nodemailer.createTransport(options);

// Verifica connessione
console.log('\nVerifica connessione SMTP...');
transporter.verify()
  .then(() => {
    console.log('✅ Connessione SMTP verificata con successo!');
    
    // Test invio email
    console.log('\nTentativo di inviare email di test...');
    return transporter.sendMail({
      from: emailConfig.from,
      to: emailConfig.user,
      subject: 'Test email da Gervis',
      text: 'Questa è una email di test per verificare il corretto funzionamento del server SMTP.',
      html: '<p>Questa è una email di test per verificare il corretto funzionamento del server SMTP.</p>'
    });
  })
  .then(info => {
    console.log('✅ Email inviata con successo!');
    console.log('ID Messaggio:', info.messageId);
    console.log('Info di risposta:', info.response);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Errore durante la verifica SMTP o invio email:');
    console.error(error);
    process.exit(1);
  });