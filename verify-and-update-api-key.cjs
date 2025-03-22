/**
 * Script per verificare e aggiornare la chiave API di Financial Modeling Prep
 * 
 * Questo script:
 * 1. Legge la chiave API attuale dal file .env
 * 2. Verifica lo stato della chiave API facendo una richiesta di test
 * 3. Se è invalida, permette di aggiornare la chiave nel file .env
 * 
 * Uso: node verify-and-update-api-key.cjs [NUOVA_API_KEY]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// Funzione per leggere il file .env
function readEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    return fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error(`Errore nel leggere il file .env: ${err.message}`);
    process.exit(1);
  }
}

// Funzione per estrarre il valore di una variabile dal file .env
function getEnvValue(envContent, key) {
  const match = envContent.match(new RegExp(`${key}=([^\n]+)`));
  return match ? match[1].trim() : null;
}

// Funzione per aggiornare il valore di una variabile nel file .env
function updateEnvValue(envContent, key, newValue) {
  const regex = new RegExp(`(${key}=)([^\n]+)`, 'g');
  return envContent.replace(regex, `$1${newValue}`);
}

// Funzione per testare una chiave API
function testApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    // Endpoint di test semplice
    const url = `https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${apiKey}`;
    
    console.log(`Verifica della chiave API con endpoint di test: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gervis/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000 // 5 secondi di timeout per test rapido
    }, (res) => {
      console.log(`Status code risposta: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('✅ La chiave API è valida e funzionante');
              resolve(true);
            } else {
              console.log('⚠️ La chiave API è valida ma la risposta non contiene dati');
              resolve(false);
            }
          } catch (e) {
            console.error('Errore nel parsing JSON:', e.message);
            resolve(false);
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('❌ La chiave API è invalida o scaduta (401/403)');
          
          try {
            const error = JSON.parse(data);
            console.log(`Messaggio errore API: ${JSON.stringify(error)}`);
          } catch (e) {
            console.log(`Risposta errore: ${data.substring(0, 200)}`);
          }
          
          resolve(false);
        } else {
          console.log(`⚠️ Status code inatteso: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Errore durante la richiesta: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error('La richiesta è andata in timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Funzione per aggiornare il file .env
function updateEnvFile(envContent) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent);
    console.log('File .env aggiornato con successo');
    return true;
  } catch (err) {
    console.error(`Errore durante l'aggiornamento del file .env: ${err.message}`);
    return false;
  }
}

// Funzione principale
async function main() {
  console.log('===================================================');
  console.log('  VERIFICA E AGGIORNAMENTO CHIAVE API FINANCIAL   ');
  console.log('===================================================');
  
  // Legge il file .env
  const envContent = readEnvFile();
  
  // Estrae la chiave API attuale
  const currentApiKey = getEnvValue(envContent, 'FINANCIAL_API_KEY');
  if (!currentApiKey) {
    console.error('Chiave API FINANCIAL_API_KEY non trovata nel file .env');
    process.exit(1);
  }
  
  console.log(`Chiave API corrente: ${currentApiKey.substring(0, 5)}...${currentApiKey.substring(currentApiKey.length - 5)}`);
  console.log(`Lunghezza chiave API: ${currentApiKey.length} caratteri`);
  
  // Verifica la chiave API corrente
  try {
    const isValid = await testApiKey(currentApiKey);
    
    if (isValid) {
      console.log('La chiave API attuale funziona correttamente');
    } else {
      console.log('La chiave API attuale non funziona');
      
      // Verifica se è stata fornita una nuova chiave come argomento
      const newApiKey = process.argv[2];
      
      if (newApiKey) {
        console.log(`Nuova chiave API fornita: ${newApiKey.substring(0, 5)}...${newApiKey.substring(newApiKey.length - 5)}`);
        
        // Testa la nuova chiave API
        const isNewKeyValid = await testApiKey(newApiKey);
        
        if (isNewKeyValid) {
          console.log('La nuova chiave API è valida!');
          
          // Aggiorna il file .env con la nuova chiave
          const updatedEnvContent = updateEnvValue(envContent, 'FINANCIAL_API_KEY', newApiKey);
          if (updateEnvFile(updatedEnvContent)) {
            console.log('La chiave API è stata aggiornata con successo nel file .env');
            console.log('Riavvia l\'applicazione per utilizzare la nuova chiave API');
          }
        } else {
          console.log('La nuova chiave API fornita non è valida');
        }
      } else {
        console.log('\nPer aggiornare la chiave API, esegui questo comando:');
        console.log('node verify-and-update-api-key.cjs NUOVA_API_KEY');
        console.log('\nPuoi ottenere una chiave API gratuita da:');
        console.log('https://site.financialmodelingprep.com/developer/docs/');
      }
    }
  } catch (error) {
    console.error('Errore durante la verifica della chiave API:', error.message);
  }
}

// Esegue la funzione principale
main().catch(console.error);