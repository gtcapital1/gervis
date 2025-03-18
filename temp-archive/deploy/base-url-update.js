/**
 * Script per aggiornare il BASE_URL nelle chiamate API dell'applicazione
 * 
 * Questo script deve essere eseguito dopo il deployment su un nuovo dominio
 * per assicurarsi che tutte le chiamate API e i link di onboarding usino il dominio corretto.
 */

const fs = require('fs');
const path = require('path');

// Il nuovo URL base
const BASE_URL = process.env.BASE_URL || 'https://sito.it';

// File da aggiornare
const filesToUpdate = [
  path.join(__dirname, '../server/routes.ts'),
  path.join(__dirname, '../server/storage.ts'),
];

console.log(`Aggiornamento BASE_URL a ${BASE_URL} nei file di configurazione...`);

filesToUpdate.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File non trovato: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Aggiorna le stringhe di configurazione
    content = content.replace(
      /const baseUrl = process\.env\.BASE_URL \|\| `https:\/\/[^`]+`/g,
      `const baseUrl = process.env.BASE_URL || '${BASE_URL}'`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`File aggiornato: ${filePath}`);
  } catch (error) {
    console.error(`Errore durante l'aggiornamento di ${filePath}:`, error);
  }
});

console.log('Aggiornamento BASE_URL completato!');
console.log('NOTA: Ricorda di riavviare l\'applicazione per applicare le modifiche.');