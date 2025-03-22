/**
 * Script di test per verificare la connettività alle API di Financial Modeling Prep
 * Utile per diagnosticare problemi di timeout o connettività su AWS
 * 
 * Uso: node test-financial-api.mjs
 */

import * as dotenv from 'dotenv';
import axios from 'axios';

// Carica le variabili d'ambiente
dotenv.config();

// Configura un User-Agent che sia meno propenso a essere bloccato
const USER_AGENT = 'Mozilla/5.0 (compatible; Gervis/1.0)';

// Configura un timeout più lungo per problemi di rete su AWS
const TIMEOUT = 15000; // 15 secondi

// Recupera la chiave API dal file .env
const API_KEY = process.env.FINANCIAL_API_KEY;
if (!API_KEY) {
  console.error('API key non trovata. Assicurati che FINANCIAL_API_KEY sia definita nel file .env');
  process.exit(1);
}

async function testIndexEndpoint() {
  console.log(`\n=== Test dell'endpoint indici (S&P 500) ===`);
  console.log(`Ora di inizio: ${new Date().toISOString()}`);
  
  try {
    // Rimuoviamo il carattere ^ dal simbolo, come fa il nostro backend
    const apiSymbol = 'GSPC'; // ^ rimosso da ^GSPC
    const url = `https://financialmodelingprep.com/api/v3/quote/${apiSymbol}?apikey=${API_KEY}`;
    
    console.log(`Inizio richiesta a ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
    console.log(`Timeout: ${TIMEOUT}ms, User-Agent: ${USER_AGENT}`);
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    const endTime = Date.now();
    
    console.log(`Richiesta completata in ${endTime - startTime}ms`);
    console.log(`Status risposta: ${response.status}`);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      console.log(`Dati ricevuti per S&P 500:`, {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changesPercentage
      });
      return true;
    } else {
      console.error(`Formato di risposta inatteso:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`ERRORE durante la chiamata all'API:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error(`La richiesta è andata in timeout dopo ${TIMEOUT}ms`);
    }
    return false;
  }
}

async function testTickerEndpoint() {
  console.log(`\n=== Test dell'endpoint ticker (AAPL) ===`);
  console.log(`Ora di inizio: ${new Date().toISOString()}`);
  
  try {
    const apiSymbol = 'AAPL';
    const url = `https://financialmodelingprep.com/api/v3/quote/${apiSymbol}?apikey=${API_KEY}`;
    
    console.log(`Inizio richiesta a ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
    console.log(`Timeout: ${TIMEOUT}ms, User-Agent: ${USER_AGENT}`);
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    const endTime = Date.now();
    
    console.log(`Richiesta completata in ${endTime - startTime}ms`);
    console.log(`Status risposta: ${response.status}`);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      console.log(`Dati ricevuti per AAPL:`, {
        symbol: data.symbol,
        name: data.name,
        price: data.price,
        change: data.change,
        changePercent: data.changesPercentage
      });
      return true;
    } else {
      console.error(`Formato di risposta inatteso:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`ERRORE durante la chiamata all'API:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error(`La richiesta è andata in timeout dopo ${TIMEOUT}ms`);
    }
    return false;
  }
}

async function testNewsEndpoint() {
  console.log(`\n=== Test dell'endpoint notizie ===`);
  console.log(`Ora di inizio: ${new Date().toISOString()}`);
  
  try {
    const url = `https://financialmodelingprep.com/api/v3/stock_news?limit=3&apikey=${API_KEY}`;
    
    console.log(`Inizio richiesta a ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
    console.log(`Timeout: ${TIMEOUT}ms, User-Agent: ${USER_AGENT}`);
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    const endTime = Date.now();
    
    console.log(`Richiesta completata in ${endTime - startTime}ms`);
    console.log(`Status risposta: ${response.status}`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Notizie ricevute: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`Prima notizia:`, {
          title: response.data[0].title,
          date: response.data[0].publishedDate,
          source: response.data[0].site
        });
      }
      return true;
    } else {
      console.error(`Formato di risposta inatteso:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`ERRORE durante la chiamata all'API:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error(`La richiesta è andata in timeout dopo ${TIMEOUT}ms`);
    }
    return false;
  }
}

async function runTests() {
  console.log(`\n============================================`);
  console.log(`TEST DI CONNETTIVITÀ API FINANCIAL MODELING PREP`);
  console.log(`============================================`);
  console.log(`Data e ora: ${new Date().toISOString()}`);
  console.log(`API KEY configurata: ${API_KEY ? 'Sì (lunghezza: ' + API_KEY.length + ')' : 'No'}`);
  
  // Esegui i test per ciascun endpoint
  const indexResult = await testIndexEndpoint();
  const tickerResult = await testTickerEndpoint();
  const newsResult = await testNewsEndpoint();
  
  // Mostra un riepilogo dei risultati
  console.log(`\n============================================`);
  console.log(`RIEPILOGO DEI RISULTATI`);
  console.log(`============================================`);
  console.log(`Test indici:  ${indexResult ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`Test ticker:  ${tickerResult ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`Test notizie: ${newsResult ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`\nQuesto script può essere utile per diagnosticare problemi di connettività API su AWS.`);
  console.log(`Se i test falliscono, controlla il firewall, i timeout di rete, o i limiti di utilizzo dell'API.`);
}

// Esegui tutti i test
runTests().catch(err => {
  console.error('Errore durante l\'esecuzione dei test:', err);
});