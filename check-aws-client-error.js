/**
 * Script per diagnosticare e risolvere problemi di eliminazione clienti su AWS
 * 
 * Questo script:
 * 1. Esegue una richiesta HTTP DELETE per eliminare un cliente specifico
 * 2. Mostra dettagli completi della risposta, incluse intestazioni e corpo
 * 3. Se la risposta è HTML invece di JSON, aiuta a diagnosticare il problema
 * 4. Include header anti-cache per evitare problemi di caching
 * 
 * Uso: node check-aws-client-error.js YOUR_SITE_URL COOKIE_VALUE CLIENT_ID
 * Esempio: node check-aws-client-error.js https://gervis.it "connect.sid=s%3A..." 123
 *
 * UPDATED: Aggiunto supporto per anti-cache headers e timestamp nella URL
 */

const https = require('https');
const http = require('http');

// Funzione principale
async function main() {
  // Ottieni i parametri dalla riga di comando
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Utilizzo: node check-aws-client-error.js BASE_URL COOKIE_VALUE CLIENT_ID
  BASE_URL: URL base del sito (es. https://gervis.it)
  COOKIE_VALUE: Valore del cookie di sessione (es. "connect.sid=s%3A...")
  CLIENT_ID: ID del cliente da eliminare (es. 123)
    `);
    process.exit(1);
  }
  
  const baseUrl = args[0];
  const cookieValue = args[1];
  const clientId = args[2];
  
  console.log(`
===== Diagnostica Eliminazione Cliente =====
URL:        ${baseUrl}/api/clients/${clientId}
Client ID:  ${clientId}
Metodo:     DELETE
Cookie:     ${cookieValue.length > 20 ? cookieValue.substring(0, 20) + '...' : cookieValue}
  `);
  
  try {
    // Esegue la richiesta DELETE
    const response = await makeRequest(baseUrl, clientId, cookieValue);
    
    // Analisi della risposta
    analyzeResponse(response);
    
  } catch (error) {
    console.error("Errore durante l'esecuzione della richiesta:", error.message);
  }
}

// Funzione per eseguire la richiesta HTTP/HTTPS
function makeRequest(baseUrl, clientId, cookieValue) {
  return new Promise((resolve, reject) => {
    // Determina se usare http o https
    const urlObj = new URL(`${baseUrl}/api/clients/${clientId}`);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    // Aggiungi un timestamp alla URL per evitare caching
    urlObj.searchParams.append('_t', Date.now());
    
    const options = {
      method: 'DELETE',
      headers: {
        'Cookie': cookieValue,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    
    const req = client.request(urlObj, options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Analisi della risposta
function analyzeResponse(response) {
  console.log(`
===== Risposta del Server =====
Status:     ${response.statusCode} ${response.statusMessage}
Content-Type: ${response.headers['content-type'] || 'Non specificato'}
  `);
  
  // Verifica il content-type
  const contentType = response.headers['content-type'] || '';
  
  // Tenta di determinare il tipo di risposta
  let bodyText = response.body.toString('utf8');
  let bodyType = 'sconosciuto';
  let bodyObj = null;
  
  if (contentType.includes('application/json')) {
    bodyType = 'JSON';
    try {
      bodyObj = JSON.parse(bodyText);
    } catch (e) {
      bodyType = 'JSON non valido';
    }
  } else if (contentType.includes('text/html')) {
    bodyType = 'HTML';
  } else if (contentType.includes('text/plain')) {
    bodyType = 'text';
  }
  
  console.log(`Tipo di contenuto rilevato: ${bodyType}`);
  
  // Mostra l'oggetto JSON se disponibile
  if (bodyObj) {
    console.log('\nContenuto JSON:');
    console.log(JSON.stringify(bodyObj, null, 2));
  } 
  // Altrimenti mostra il testo della risposta con limite di lunghezza
  else {
    const maxLength = 500;
    const displayText = bodyText.length > maxLength 
      ? bodyText.substring(0, maxLength) + '... [troncato]' 
      : bodyText;
    
    console.log('\nContenuto della risposta:');
    console.log(displayText);
  }
  
  // Analisi dei problemi
  console.log('\n===== Analisi Problemi =====');
  
  if (response.statusCode === 401) {
    console.log('ERRORE: Autenticazione fallita - Il cookie di sessione potrebbe essere scaduto o non valido.');
    console.log('SOLUZIONE: Effettua nuovamente il login e ottieni un nuovo cookie di sessione.');
  } 
  else if (response.statusCode === 403) {
    console.log('ERRORE: Accesso negato - Non hai i permessi per eliminare questo cliente.');
    console.log('SOLUZIONE: Verifica che tu sia l\'advisor proprietario di questo cliente.');
  }
  else if (response.statusCode === 404) {
    console.log('ERRORE: Cliente non trovato - L\'ID del cliente specificato non esiste.');
    console.log('SOLUZIONE: Verifica che l\'ID del cliente sia corretto.');
  }
  else if (response.statusCode === 500) {
    console.log('ERRORE: Errore interno del server durante l\'eliminazione del cliente.');
    
    if (bodyType === 'HTML') {
      console.log('Il server sta restituendo HTML invece di JSON, il che indica un problema di configurazione o un errore non gestito.');
      console.log('SOLUZIONI POSSIBILI:');
      console.log('1. Verifica la configurazione del database e i permessi DELETE.');
      console.log('2. Esegui lo script di migrazione fix-aws-delete-error.ts.');
      console.log('3. Verifica i log del server per messaggi di errore specifici.');
    } 
    else if (bodyObj && bodyObj.error) {
      console.log(`Messaggio di errore: ${bodyObj.error}`);
      console.log('SOLUZIONE: Vedi il messaggio di errore sopra per dettagli specifici.');
    }
  } 
  else if (response.statusCode === 200 && bodyObj && bodyObj.success) {
    console.log('SUCCESSO: Il cliente è stato eliminato correttamente.');
  }
  else {
    console.log(`Risposta del server non standard (codice ${response.statusCode}).`);
    console.log('Controlla il contenuto della risposta per ulteriori dettagli.');
  }
  
  console.log('\n===== Conclusioni =====');
  if (bodyType === 'HTML' && response.statusCode !== 200) {
    console.log('Il problema principale sembra essere che il server sta restituendo HTML invece di JSON.');
    console.log('Questo è tipicamente causato da un errore non gestito o un problema di configurazione sul server.');
    console.log('\nPassaggi consigliati:');
    console.log('1. Esegui lo script fix-aws-delete-error.ts per correggere i permessi DB e i vincoli CASCADE');
    console.log('2. Verifica i log del server per ulteriori dettagli sull\'errore');
    console.log('3. Se il problema persiste, controlla la configurazione del server web (Nginx/Apache)');
  }
}

// Esecuzione dello script
main().catch(console.error);