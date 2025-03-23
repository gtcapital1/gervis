/**
 * Script per correggere dati di array non validi nel database PostgreSQL
 * Questo script risolve problemi con personal_interests e investment_goals
 * che potrebbero essere memorizzati come stringhe invece che come array.
 * 
 * Uso: node fix-array-data.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function fixArrayData() {
  console.log('Avvio script di correzione dati array...');
  
  // Connessione al database usando variabili d'ambiente
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connesso al database');
    
    // 1. Ottieni tutti i clienti che hanno personal_interests o investment_goals in formato problematico
    const { rows: clients } = await client.query(`
      SELECT id, personal_interests, investment_goals 
      FROM clients 
      WHERE personal_interests IS NOT NULL OR investment_goals IS NOT NULL
    `);
    
    console.log(`Trovati ${clients.length} clienti con potenziali dati array da riparare`);
    
    // Contatori per tenere traccia delle modifiche
    let personalInterestsFixed = 0;
    let investmentGoalsFixed = 0;
    
    // 2. Esamina ogni cliente e correggi i dati se necessario
    for (const client_row of clients) {
      const { id, personal_interests, investment_goals } = client_row;
      
      // Correggi personal_interests se necessario
      if (personal_interests !== null) {
        // Se personal_interests è una stringa ma dovrebbe essere un array
        if (typeof personal_interests === 'string' && personal_interests.includes(',')) {
          console.log(`Cliente ID ${id}: Convertendo personal_interests da stringa a array`);
          
          const interestsArray = personal_interests.split(',').map(item => item.trim());
          
          await client.query(
            'UPDATE clients SET personal_interests = $1 WHERE id = $2',
            [interestsArray, id]
          );
          
          personalInterestsFixed++;
        }
        // Se personal_interests è già un array, non serve fare nulla
      }
      
      // Correggi investment_goals se necessario
      if (investment_goals !== null) {
        // Se investment_goals è una stringa ma dovrebbe essere un array
        if (typeof investment_goals === 'string' && investment_goals.includes(',')) {
          console.log(`Cliente ID ${id}: Convertendo investment_goals da stringa a array`);
          
          const goalsArray = investment_goals.split(',').map(item => item.trim());
          
          await client.query(
            'UPDATE clients SET investment_goals = $1 WHERE id = $2',
            [goalsArray, id]
          );
          
          investmentGoalsFixed++;
        }
        // Se investment_goals è già un array, non serve fare nulla
      }
    }
    
    console.log('\nRiassunto correzioni:');
    console.log(`- Corretti campi personal_interests: ${personalInterestsFixed}`);
    console.log(`- Corretti campi investment_goals: ${investmentGoalsFixed}`);
    console.log(`- Totale clienti elaborati: ${clients.length}`);
    
    if (personalInterestsFixed === 0 && investmentGoalsFixed === 0) {
      console.log('\nNessuna correzione necessaria. I dati sono già nel formato corretto.');
    } else {
      console.log('\nCorrezione dei dati completata con successo!');
    }
  } catch (error) {
    console.error('Errore durante la correzione dei dati:', error);
  } finally {
    await client.end();
    console.log('Connessione al database chiusa');
  }
}

// Esegui la funzione
fixArrayData().catch(err => {
  console.error('Errore nello script:', err);
  process.exit(1);
});