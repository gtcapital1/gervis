import fs from 'fs.js';
import path from 'path.js';
import { fileURLToPath } from 'url.js';
import { dirname } from 'path.js';

// ES modules compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path al file da correggere
const FILE_PATH = path.resolve(__dirname, '../routes/portfolio.routes.ts');

async function fixProductUpload() {
  console.log('Correzione del file portfolio.routes.ts...');
  
  try {
    // Leggi il contenuto attuale del file
    let content = fs.readFileSync(FILE_PATH, 'utf8');
    
    // Sostituisci la riga problematica con centralDbPath
    const errorRegex = /kid_file_path: centralDbPath,/g;
    if (content.match(errorRegex)) {
      const fixedContent = content.replace(
        errorRegex,
        'kid_file_path: kidFilePath || userFilePath, // Fixed path'
      );
      
      // Scrivi il contenuto corretto
      fs.writeFileSync(FILE_PATH, fixedContent, 'utf8');
      console.log('File corretto con successo.');
    } else {
      console.log('Errore non trovato nel file o già corretto.');
    }
  } catch (error) {
    console.error('Errore durante la correzione del file:', error);
  }
}

// Esegui lo script
fixProductUpload()
  .then(() => {
    console.log('Script completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Errore durante l\'esecuzione dello script:', error);
    process.exit(1);
  }); 