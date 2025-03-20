/**
 * Script di test per verificare che le credenziali SMTP siano correttamente
 * configurate nel file .env e accessibili dall'applicazione.
 * 
 * Uso: node test-email-credentials.js
 */

require('dotenv').config();

console.log('=== TEST VARIABILI AMBIENTE EMAIL ===');

// Verifica presenza variabili SMTP
console.log('\nVariabili SMTP:');
console.log('SMTP_USER:', process.env.SMTP_USER ? '✓ presente' : '✗ mancante');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✓ presente' : '✗ mancante');
console.log('SMTP_FROM:', process.env.SMTP_FROM ? '✓ presente' : '✗ mancante');

// Verifica presenza variabili EMAIL alternative
console.log('\nVariabili EMAIL alternative:');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ presente' : '✗ mancante');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ presente' : '✗ mancante');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? '✓ presente' : '✗ mancante');

// Configurazione risultante
const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'registration@gervis.it';
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '';
const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || user;

console.log('\nConfigurazioni risultanti:');
console.log('User:', user);
console.log('From:', from);
console.log('Password presente:', pass.length > 0 ? '✓ sì' : '✗ no');
console.log('Password lunghezza:', pass.length);

// Altre variabili rilevanti
console.log('\nAltre variabili rilevanti:');
console.log('BASE_URL:', process.env.BASE_URL || '(non impostato)');
console.log('NODE_ENV:', process.env.NODE_ENV || '(non impostato)');

// Verifica coerenza
console.log('\n=== VERIFICA COERENZA ===');

let errors = 0;

if (!pass || pass.length === 0) {
  console.error('✗ ERRORE: Password SMTP mancante! Aggiungi SMTP_PASS o EMAIL_PASSWORD al file .env');
  errors++;
}

if (!user || user === 'registration@gervis.it' && !process.env.SMTP_USER && !process.env.EMAIL_USER) {
  console.error('✗ ATTENZIONE: User SMTP predefinito in uso. Considera di impostare SMTP_USER o EMAIL_USER nel file .env');
  errors++;
}

// Controllo se il server SMTP è raggiungibile (senza inviare)
const net = require('net');
const testSocket = new net.Socket();
const host = 'smtps.aruba.it';
const port = 465;

console.log(`\n=== TEST CONNESSIONE AL SERVER SMTP (${host}:${port}) ===`);
console.log('Tentativo di connessione...');

testSocket.setTimeout(5000); // 5 secondi di timeout

testSocket.on('connect', function() {
  console.log('✓ Connessione riuscita! Il server SMTP è raggiungibile.');
  testSocket.destroy();
});

testSocket.on('timeout', function() {
  console.error('✗ ERRORE: Timeout nella connessione al server SMTP.');
  console.error('  Possibili cause:');
  console.error('  - Firewall che blocca la connessione');
  console.error('  - Server SMTP non disponibile');
  console.error('  - Indirizzo o porta non corretti');
  testSocket.destroy();
  errors++;
});

testSocket.on('error', function(err) {
  console.error(`✗ ERRORE: Impossibile connettersi al server SMTP: ${err.message}`);
  console.error('  Possibili cause:');
  console.error('  - Nessuna connessione internet');
  console.error('  - Server SMTP non disponibile');
  console.error('  - Indirizzo o porta non corretti');
  testSocket.destroy();
  errors++;
});

testSocket.on('close', function() {
  console.log('\n=== RIEPILOGO ===');
  if (errors > 0) {
    console.error(`✗ Trovati ${errors} problemi che potrebbero impedire l'invio di email.`);
    console.error('  Controlla il file .env e assicurati che le credenziali SMTP siano corrette.');
  } else {
    console.log('✓ Nessun problema rilevato nella configurazione email.');
    console.log('  Se le email non vengono inviate, il problema potrebbe essere:');
    console.log('  - Credenziali SMTP errate o scadute');
    console.log('  - Limitazioni del server SMTP o di Aruba');
    console.log('  - Problemi nel codice dell\'applicazione');
    console.log('\nProva anche lo script test-email-onboarding.js per un test completo di invio.');
  }
});

try {
  testSocket.connect(port, host);
} catch (e) {
  console.error(`✗ ERRORE durante la connessione: ${e.message}`);
  errors++;
}