/**
 * Script per verificare la corretta configurazione dell'API OpenAI
 * Questo script esegue un test di base per verificare che la chiave API OpenAI
 * sia valida e che l'integrazione funzioni correttamente.
 * 
 * Uso: node check-openai-api.js
 */

require('dotenv').config();
const { OpenAI } = require('openai');

async function testOpenAI() {
  try {
    // Verifica che la chiave API OpenAI sia configurata
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ Errore: La chiave API OpenAI non è configurata.');
      console.error('   Assicurati di avere una variabile OPENAI_API_KEY nel file .env');
      process.exit(1);
    }
    
    console.log('🔑 Chiave API OpenAI configurata.');
    
    // Inizializza il client OpenAI
    const openai = new OpenAI({
      apiKey
    });
    
    console.log('🔄 Effettuo un test di connessione all\'API OpenAI...');
    
    // Effettua una semplice chiamata per verificare la validità della chiave API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Sei un test di configurazione." },
        { role: "user", content: "Rispondi con 'OK' per confermare che la configurazione funziona correttamente." }
      ],
      temperature: 0.1,
      max_tokens: 20
    });
    
    const responseText = response.choices[0]?.message?.content || '';
    console.log(`📝 Risposta OpenAI: "${responseText}"`);
    
    if (responseText.includes("OK")) {
      console.log('✅ Configurazione API OpenAI verificata con successo!');
      console.log('✅ L\'integrazione con OpenAI è pronta per l\'uso.');
    } else {
      console.warn('⚠️  Risposta inaspettata dall\'API. La risposta dovrebbe contenere "OK".');
      console.warn('   Potrebbe esserci un problema di configurazione o l\'API potrebbe essere sovraccarica.');
    }
    
    console.log('\n📊 Informazioni aggiuntive sull\'API:');
    console.log('   - Modello: gpt-4');
    console.log(`   - ID completamento: ${response.id}`);
    console.log(`   - Tempo di creazione: ${new Date(response.created * 1000).toISOString()}`);
    console.log(`   - Token utilizzati: ${response.usage.total_tokens}`);
    
  } catch (error) {
    console.error('❌ Errore durante il test dell\'API OpenAI:');
    
    if (error.code === 'ENOTFOUND') {
      console.error('   Impossibile raggiungere il server API. Verifica la tua connessione Internet.');
    } else if (error.status === 401) {
      console.error('   Autenticazione fallita. La chiave API OpenAI non è valida.');
    } else if (error.status === 429) {
      console.error('   Limite di velocità superato. L\'account ha superato i limiti di utilizzo dell\'API.');
    } else {
      console.error(`   Dettagli errore: ${error.message}`);
    }
    
    process.exit(1);
  }
}

testOpenAI();