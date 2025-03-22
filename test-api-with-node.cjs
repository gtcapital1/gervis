/**
 * Script di test minimale per verificare la connettività alle API di Financial Modeling Prep
 * Versione CommonJS (.cjs) che funziona anche con "type": "module" in package.json
 * 
 * Uso: 
 * node test-api-with-node.cjs
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
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Inizio richiesta a: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gervis/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000 // 15 secondi
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        console.log(`Richiesta completata in ${endTime - startTime}ms`);
        console.log(`Status code: ${res.statusCode}`);
        
        try {
          const result = JSON.parse(data);
          resolve({
            success: true,
            statusCode: res.statusCode,
            time: endTime - startTime,
            data: result
          });
        } catch (e) {
          console.error(`Errore nel parsing JSON: ${e.message}`);
          console.error(`Raw data: ${data.substring(0, 200)}...`);
          reject(new Error('Errore nel parsing JSON'));
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      console.error(`Errore nella richiesta dopo ${endTime - startTime}ms: ${error.message}`);
      console.error(`Dettagli errore: ${error.code}, ${error.syscall}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error(`Richiesta scaduta dopo 15000ms`);
      req.destroy();
      reject(new Error('Timeout durante la richiesta HTTP'));
    });
  });
}

// Funzione principale
async function runTests() {
  console.log('\n========================================');
  console.log('  TEST DI CONNETTIVITÀ API FINANCIAL  ');
  console.log('========================================');
  console.log(`Data e ora: ${new Date().toISOString()}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`API KEY presente: ${API_KEY ? 'Sì' : 'No'}`);
  
  try {
    // Test 1: Indici di mercato
    console.log('\n--- TEST 1: INDICI DI MERCATO ---');
    const url1 = `https://financialmodelingprep.com/api/v3/quote/GSPC?apikey=${API_KEY}`;
    const result1 = await makeRequest(url1);
    if (result1.success && Array.isArray(result1.data) && result1.data.length > 0) {
      console.log('✅ Test indici RIUSCITO');
      console.log(`Risultato: ${JSON.stringify(result1.data[0]).substring(0, 100)}...`);
    } else {
      console.log('❌ Test indici FALLITO');
    }
    
    // Test 2: Ticker singolo
    console.log('\n--- TEST 2: TICKER SINGOLO ---');
    const url2 = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${API_KEY}`;
    const result2 = await makeRequest(url2);
    if (result2.success && Array.isArray(result2.data) && result2.data.length > 0) {
      console.log('✅ Test ticker RIUSCITO');
      console.log(`Risultato: ${JSON.stringify(result2.data[0]).substring(0, 100)}...`);
    } else {
      console.log('❌ Test ticker FALLITO');
    }
    
    // Test 3: Notizie finanziarie
    console.log('\n--- TEST 3: NOTIZIE FINANZIARIE ---');
    const url3 = `https://financialmodelingprep.com/api/v3/stock_news?limit=3&apikey=${API_KEY}`;
    const result3 = await makeRequest(url3);
    if (result3.success && Array.isArray(result3.data) && result3.data.length > 0) {
      console.log('✅ Test notizie RIUSCITO');
      console.log(`Risultato: ${JSON.stringify(result3.data[0]).substring(0, 100)}...`);
    } else {
      console.log('❌ Test notizie FALLITO');
    }
    
    // Riepilogo
    console.log('\n========================================');
    console.log('            RIEPILOGO                  ');
    console.log('========================================');
    console.log(`Test indici:  ${result1.success ? '✅ RIUSCITO' : '❌ FALLITO'}`);
    console.log(`Test ticker:  ${result2.success ? '✅ RIUSCITO' : '❌ FALLITO'}`);
    console.log(`Test notizie: ${result3.success ? '✅ RIUSCITO' : '❌ FALLITO'}`);
    
  } catch (error) {
    console.error('Errore generale durante i test:', error.message);
  }
  
  console.log('\nSuggimenti per la risoluzione:');
  console.log('1. Verifica che le API key siano valide');
  console.log('2. Controlla che il firewall non blocchi le connessioni in uscita');
  console.log('3. Verifica la connettività Internet del server AWS');
  console.log('4. Controlla i limiti di utilizzo delle API');
}

// Esegui i test
runTests().catch(err => {
  console.error('Errore catturato nel main:', err.message);
});