/**
 * Script per diagnosticare e risolvere problemi di eliminazione clienti su AWS (versione migliorata)
 * 
 * Questo script:
 * 1. Esegue una richiesta HTTP DELETE per eliminare un cliente specifico
 * 2. Mostra dettagli completi della risposta, incluse intestazioni e corpo
 * 3. Gestisce sia risposte JSON che HTML, stampando l'output appropriato
 * 4. Include header anti-cache per evitare problemi di caching
 * 
 * Uso: node check-aws-client-error-improved.js YOUR_SITE_URL COOKIE_VALUE CLIENT_ID
 * Esempio: node check-aws-client-error-improved.js https://gervis.it "connect.sid=s%3A..." 123
 */

const https = require('https');
const http = require('http');
const url = require('url');

async function main() {
  // Controlla argomenti da riga di comando
  if (process.argv.length < 5) {
    console.error('Utilizzo: node check-aws-client-error-improved.js URL COOKIE_VALUE CLIENT_ID');
    console.error('Esempio: node check-aws-client-error-improved.js https://gervis.it "connect.sid=s%3A..." 123');
    process.exit(1);
  }

  const baseUrl = process.argv[2];
  const cookieValue = process.argv[3];
  const clientId = process.argv[4];

  try {
    console.log(`\n[INFO] Tentativo di eliminazione cliente ID ${clientId} su ${baseUrl}`);
    console.log('[INFO] Invio richiesta DELETE...');
    
    const response = await makeRequest(baseUrl, clientId, cookieValue);
    console.log(`\n[SUCCESS] Risposta ricevuta dal server con stato ${response.statusCode}`);
    
    // Mostra dettagli completi della risposta
    analyzeResponse(response);
  } catch (error) {
    console.error(`\n[ERROR] Si è verificato un errore: ${error.message}`);
  }
}

function makeRequest(baseUrl, clientId, cookieValue) {
  return new Promise((resolve, reject) => {
    // Aggiungi timestamp per evitare caching
    const timestamp = Date.now();
    const deleteUrl = `${baseUrl}/api/clients/${clientId}?_t=${timestamp}`;
    const parsedUrl = url.parse(deleteUrl);
    
    // Scegli il modulo HTTP appropriato in base al protocollo
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'DELETE',
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      headers: {
        'Cookie': cookieValue,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    };

    console.log(`[DEBUG] Richiesta: ${options.method} ${options.hostname}${options.path}`);
    console.log('[DEBUG] Cookie: ' + cookieValue.substring(0, 15) + '...');
    
    const req = httpModule.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        // Aggiungi il corpo della risposta all'oggetto response
        res.body = responseBody;
        resolve(res);
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

function analyzeResponse(response) {
  console.log('\n[RESPONSE] DETTAGLI RISPOSTA:');
  console.log(`Status Code: ${response.statusCode}`);
  console.log(`Status Message: ${response.statusMessage}`);
  
  console.log('\n[RESPONSE] HEADERS:');
  Object.keys(response.headers).forEach(key => {
    console.log(`${key}: ${response.headers[key]}`);
  });
  
  console.log('\n[RESPONSE] CONTENT-TYPE:');
  const contentType = response.headers['content-type'] || 'unknown';
  console.log(contentType);
  
  console.log('\n[RESPONSE] BODY:');
  console.log(response.body.substring(0, 500) + (response.body.length > 500 ? '...' : ''));
  
  // Analisi avanzata della risposta
  if (contentType.includes('application/json')) {
    try {
      const jsonResponse = JSON.parse(response.body);
      console.log('\n[RESPONSE] JSON PARSATO:');
      console.log(JSON.stringify(jsonResponse, null, 2));
    } catch (error) {
      console.error('\n[ERROR] Il Content-Type indica JSON ma il parsing è fallito:');
      console.error(error.message);
    }
  } else if (contentType.includes('text/html')) {
    console.log('\n[WARNING] Il server ha risposto con HTML invece di JSON!');
    console.log('[WARNING] Questo è probabilmente causato da un errore 500 server o una configurazione Nginx errata');
    
    // Cerca indizi nel corpo HTML
    if (response.body.includes('504 Gateway Time-out')) {
      console.log('\n[DIAGNOSI] Rilevato errore 504 Gateway Timeout');
      console.log('[SOLUZIONE] Aumentare i timeout in Nginx e PM2');
    } else if (response.body.includes('502 Bad Gateway')) {
      console.log('\n[DIAGNOSI] Rilevato errore 502 Bad Gateway');
      console.log('[SOLUZIONE] Verificare che PM2 stia eseguendo correttamente l\'applicazione');
    } else if (response.body.toLowerCase().includes('error') && response.body.toLowerCase().includes('database')) {
      console.log('\n[DIAGNOSI] Possibile errore del database');
      console.log('[SOLUZIONE] Controllare i log del database e le query SQL');
    }
  }
  
  // Consigli generali
  console.log('\n[CONSIGLI]:');
  if (response.statusCode >= 500) {
    console.log('- Controllare i log del server in /var/log/nginx/error.log');
    console.log('- Controllare i log dell\'applicazione con: pm2 logs gervis');
    console.log('- Eseguire lo script fix-aws-delete-issue.sh per correggere problemi comuni');
  } else if (response.statusCode === 401) {
    console.log('- Sessione non valida. Effettuare nuovamente il login e copiare il nuovo cookie');
  } else if (response.statusCode === 404) {
    console.log('- Il cliente specificato non esiste o l\'endpoint API non è corretto');
  }
}

main();