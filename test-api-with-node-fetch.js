/**
 * Script di test minimale per verificare la connettività alle API di Financial Modeling Prep
 * Utilizza solo la libreria Node.js nativa per le richieste HTTP
 * 
 * Uso: 
 * node test-api-with-node-fetch.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Carica le variabili d'ambiente dal file .env
let API_KEY = '';
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const apiKeyMatch = envFile.match(/FINANCIAL_API_KEY=([^\n]+)/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    API_KEY = apiKeyMatch[1].trim();
  }
} catch (err) {
  console.error('Errore nel leggere il file .env:', err.message);
}

// Verifica se l'API key è disponibile
if (!API_KEY) {
  console.error('API key non trovata. Assicurati che FINANCIAL_API_KEY sia definita nel file .env');
  process.exit(1);
}

// Funzione per eseguire una richiesta HTTP con timeout
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 15000; // 15 secondi di default
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gervis/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      ...options
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ 
            statusCode: res.statusCode, 
            headers: res.headers, 
            data: parsedData 
          });
        } catch (e) {
          reject(new Error(`Errore nel parsing JSON: ${e.message}. Raw data: ${data.substring(0, 200)}...`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Imposta timeout
    req.setTimeout(timeout, () => {
      req.abort();
      reject(new Error(`Richiesta scaduta dopo ${timeout}ms`));
    });
  });
}

// Funzione per testare un endpoint
async function testEndpoint(name, url) {
  console.log(`\n=== Test dell'endpoint ${name} ===`);
  console.log(`Ora di inizio: ${new Date().toISOString()}`);
  console.log(`URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
  
  const startTime = Date.now();
  
  try {
    const response = await httpsRequest(url);
    const endTime = Date.now();
    
    console.log(`Richiesta completata in ${endTime - startTime}ms`);
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log(`Tipo risposta: ${typeof response.data}, Array: ${Array.isArray(response.data)}`);
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Dati ricevuti (primo elemento):`, JSON.stringify(response.data[0]).substring(0, 200));
        return true;
      } else {
        console.log(`Nessun dato ricevuto o formato inatteso:`, JSON.stringify(response.data).substring(0, 200));
        return false;
      }
    } else {
      console.error(`Errore nella risposta: ${response.statusCode}`);
      console.error(`Messaggio: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.error(`ERRORE durante la chiamata all'API:`, error.message);
    return false;
  }
}

// Funzione principale
async function runTests() {
  console.log(`\n============================================`);
  console.log(`TEST DI CONNETTIVITÀ API FINANCIAL MODELING PREP`);
  console.log(`============================================`);
  console.log(`Data e ora: ${new Date().toISOString()}`);
  console.log(`API KEY configurata: ${API_KEY ? 'Sì (lunghezza: ' + API_KEY.length + ')' : 'No'}`);
  
  // Test dell'endpoint indici
  const indexTest = await testEndpoint(
    'Indici (S&P 500)',
    `https://financialmodelingprep.com/api/v3/quote/GSPC?apikey=${API_KEY}`
  );
  
  // Test dell'endpoint ticker
  const tickerTest = await testEndpoint(
    'Ticker (AAPL)',
    `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${API_KEY}`
  );
  
  // Test dell'endpoint notizie
  const newsTest = await testEndpoint(
    'Notizie',
    `https://financialmodelingprep.com/api/v3/stock_news?limit=3&apikey=${API_KEY}`
  );
  
  // Riepilogo
  console.log(`\n============================================`);
  console.log(`RIEPILOGO DEI RISULTATI`);
  console.log(`============================================`);
  console.log(`Test indici:  ${indexTest ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`Test ticker:  ${tickerTest ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`Test notizie: ${newsTest ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`\nQuesto script diagnostico usa solo librerie Node.js native.`);
  console.log(`Se i test falliscono, controlla il firewall, i timeout di rete, o i limiti di utilizzo dell'API.`);
}

// Esegui i test
runTests().catch(err => {
  console.error('Errore non gestito:', err);
});