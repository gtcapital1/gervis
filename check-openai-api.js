/**
 * Script per verificare la corretta configurazione dell'API OpenAI
 * Questo script esegue un test di base per verificare che la chiave API OpenAI
 * sia valida e che l'integrazione funzioni correttamente.
 * 
 * Uso: node check-openai-api.js
 */

require('dotenv').config(); // Carica le variabili d'ambiente da .env
const { OpenAI } = require('openai');

async function testOpenAI() {
  // Verifica che la chiave API sia presente nelle variabili d'ambiente
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error("\x1b[31mERRORE: Chiave API OpenAI non trovata!\x1b[0m");
    console.error("Assicurati che il file .env contenga una variabile OPENAI_API_KEY=sk-...");
    process.exit(1);
  }
  
  // Verifica che la chiave API non sia un valore placeholder
  if (apiKey === "sk-your-api-key" || apiKey.includes("your-api-key")) {
    console.error("\x1b[31mERRORE: Chiave API OpenAI non valida (valore placeholder)!\x1b[0m");
    console.error("Sostituisci il valore placeholder con una chiave API valida.");
    process.exit(1);
  }
  
  console.log("\x1b[33mVerifica della chiave API OpenAI...\x1b[0m");
  
  try {
    // Inizializza il client OpenAI con la chiave API
    const openai = new OpenAI({ apiKey });
    
    // Esegue una richiesta di test semplice
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Utilizza GPT-4 per il test
      messages: [
        { role: "system", content: "Sei un assistente utile." },
        { role: "user", content: "Per favore, rispondi con 'Connessione OpenAI funzionante correttamente!'" }
      ],
      temperature: 0.5,
      max_tokens: 30
    });
    
    // Verifica la risposta
    if (response && response.choices && response.choices.length > 0) {
      console.log("\x1b[32mSUCCESSO: Connessione all'API OpenAI stabilita!\x1b[0m");
      console.log(`Risposta ricevuta: "${response.choices[0].message.content.trim()}"`);
      console.log("\x1b[32mL'integrazione AI è configurata correttamente.\x1b[0m");
    } else {
      console.error("\x1b[31mERRORE: Impossibile ottenere una risposta valida dall'API OpenAI.\x1b[0m");
      console.error("Risposta ricevuta:", response);
    }
  } catch (error) {
    console.error("\x1b[31mERRORE durante la connessione all'API OpenAI:\x1b[0m");
    
    if (error.response) {
      console.error(`Stato: ${error.response.status}`);
      console.error(`Messaggio: ${error.response.data.error.message}`);
      
      // Aiuta a diagnosticare errori comuni
      if (error.response.status === 401) {
        console.error("\x1b[31mChiave API non valida. Verifica la chiave API nel file .env.\x1b[0m");
      } else if (error.response.status === 429) {
        console.error("\x1b[31mLimite di richieste superato. Il tuo piano OpenAI potrebbe avere limitazioni.\x1b[0m");
      }
    } else {
      console.error(`Errore: ${error.message}`);
      
      if (error.message.includes("timeout")) {
        console.error("\x1b[31mTimeout della connessione. Verifica la tua connessione internet o i firewall.\x1b[0m");
      }
    }
    
    process.exit(1);
  }
}

testOpenAI();