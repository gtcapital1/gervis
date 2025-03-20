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
  // Validazione parametri
  if (process.argv.length < 5) {
    console.error('Errore: parametri insufficienti');
    console.log('Uso: node check-aws-client-error-improved.js BASE_URL COOKIE_VALUE CLIENT_ID');
    console.log('Esempio: node check-aws-client-error-improved.js https://gervis.it "connect.sid=s%3A..." 123');
    process.exit(1);
  }

  const baseUrl = process.argv[2];
  const cookieValue = process.argv[3];
  const clientId = process.argv[4];

  console.log(`🔍 Script diagnostico eliminazione client - ID ${clientId} su ${baseUrl}`);
  console.log('-----------------------------------------------------------');

  // Fase 1: Esegui la richiesta DELETE
  console.log(`\n1️⃣ Tentativo di eliminazione client ID=${clientId}:`);
  try {
    const deleteResponse = await makeRequest(baseUrl, clientId, cookieValue);
    analyzeResponse(deleteResponse);

    // Fase 2: Verifica se il cliente è stato realmente eliminato
    console.log(`\n2️⃣ Verifica eliminazione (GET client ID=${clientId}):`);
    const verifyResponse = await makeRequest(baseUrl, clientId, cookieValue, 'GET');
    
    if (verifyResponse.statusCode === 404 || 
       (verifyResponse.contentType.includes('json') && 
        verifyResponse.body.includes('not found'))) {
      console.log('✅ Cliente correttamente eliminato (Risposta 404 o "not found")');
    } else {
      console.log('❌ ERRORE: Il cliente NON risulta eliminato! Risposta:', verifyResponse.statusCode);
      analyzeResponse(verifyResponse);
      
      // Fase 3: Recovery - Prova di nuovo con header più aggressivi
      console.log(`\n3️⃣ Tentativo di recupero (DELETE forzato client ID=${clientId}):`);
      
      const recoveryResponse = await makeRequest(baseUrl, clientId, cookieValue, 'DELETE', true);
      analyzeResponse(recoveryResponse);
      
      // Verifica di nuovo dopo il recovery
      console.log(`\n4️⃣ Verifica finale eliminazione (GET client ID=${clientId}):`);
      const finalVerifyResponse = await makeRequest(baseUrl, clientId, cookieValue, 'GET');
      
      if (finalVerifyResponse.statusCode === 404 || 
         (finalVerifyResponse.contentType.includes('json') && 
          finalVerifyResponse.body.includes('not found'))) {
        console.log('✅ Cliente eliminato dopo il tentativo di recupero');
      } else {
        console.log('❌ ERRORE CRITICO: Impossibile eliminare il cliente anche dopo il recovery!');
        analyzeResponse(finalVerifyResponse);
      }
    }
  } catch (error) {
    console.error('Errore durante le operazioni:', error);
  }
}

// Funzione per eseguire una richiesta HTTP
function makeRequest(baseUrl, clientId, cookieValue, method = 'DELETE', recovery = false) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(baseUrl);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    
    // Costruisce il path per la richiesta
    let path = `/api/clients/${clientId}?_t=${timestamp}`;
    if (recovery) {
      path += `&_recovery=true&_nocache=${randomId}`;
    }
    
    // Prepara gli header
    const headers = {
      'Cookie': cookieValue,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '-1'
    };
    
    // Aggiunge header speciali per prevenire errori con le risposte HTML
    if (method === 'DELETE' || recovery) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
      headers['X-No-HTML-Response'] = 'true';
    }
    
    // Aggiunge header speciali per il recovery
    if (recovery) {
      headers['X-Force-Content-Type'] = 'application/json';
      headers['X-Recovery-Delete'] = 'true';
    }
    
    // Configurazione richiesta
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: path,
      method: method,
      headers: headers
    };
    
    console.log(`Esecuzione ${method} a ${options.hostname}${options.path}`);
    
    // Sceglie il protocollo corretto
    const requester = parsedUrl.protocol === 'https:' ? https : http;
    
    // Esegue la richiesta
    const req = requester.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          contentType: contentType,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Funzione per analizzare e mostrare la risposta
function analyzeResponse(response) {
  console.log(`Stato HTTP: ${response.statusCode}`);
  console.log(`Content-Type: ${response.contentType}`);
  
  // Controlla se la risposta è HTML quando dovrebbe essere JSON
  if (response.contentType.includes('html')) {
    console.log('⚠️ ATTENZIONE: Risposta HTML ricevuta invece di JSON!');
    console.log('Primi 300 caratteri della risposta HTML:');
    console.log(response.body.substring(0, 300) + '...');
  } else if (response.contentType.includes('json')) {
    try {
      // Se è JSON, mostra in formato più leggibile
      const jsonResponse = JSON.parse(response.body);
      console.log('Risposta JSON:');
      console.log(JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      // Se il parsing JSON fallisce
      console.log('⚠️ ERRORE parsing JSON. Risposta completa:');
      console.log(response.body);
    }
  } else {
    // Tipo di risposta non riconosciuto
    console.log('Risposta non riconosciuta (non JSON né HTML):');
    console.log(response.body);
  }
  
  // Mostra header critici per debug
  console.log('Header HTTP rilevanti:');
  ['content-type', 'cache-control', 'set-cookie'].forEach(header => {
    if (response.headers[header]) {
      console.log(`${header}: ${response.headers[header]}`);
    }
  });
}

main().catch(console.error);