import fs from 'fs.js';
import path from 'path.js';
import { fileURLToPath } from 'url.js';
import { dirname } from 'path.js';
import dotenv from 'dotenv.js';
import { db } from '../db.js';
import { productsPublicDatabase } from '../../shared/schema.js';
import { eq } from 'drizzle-orm.js';
import { parseKidDocument } from '../routes/portfolio.routes.js';

// ES modules compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica le variabili d'ambiente da .env nella cartella principale
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

// Path alla directory KID_Database - usa percorso assoluto da workspace
const KID_DATABASE_DIR = path.join(process.cwd(), 'server/private/KID_Database');

// Funzione per trovare ricorsivamente tutti i file PDF
function findAllPdfFiles(dir: string): string[] {
  let results: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Se è una directory, cerca ricorsivamente al suo interno
      results = results.concat(findAllPdfFiles(itemPath));
    } else if (stats.isFile() && item.toLowerCase().endsWith('.pdf')) {
      // Se è un file PDF, aggiungilo ai risultati
      results.push(itemPath);
    }
  }
  
  return results;
}

// Funzione per estrarre l'ISIN dal percorso del file
function extractIsinFromPath(filePath: string): string {
  // Prova ad estrarre l'ISIN dal nome del file (assumendo formato [ISIN].pdf)
  const fileName = path.basename(filePath, '.pdf');
  if (/^[A-Z0-9]{12}$/.test(fileName)) {
    return fileName;
  }
  
  // Altrimenti, prova dalla directory parent (assumendo formato /[ISIN]/file.pdf)
  const parentDir = path.basename(path.dirname(filePath));
  if (/^[A-Z0-9]{12}$/.test(parentDir)) {
    return parentDir;
  }
  
  // Se non riesce a trovare un ISIN valido, restituisce una stringa vuota
  console.log(`Non è possibile determinare l'ISIN per il file: ${filePath}`);
  return '';
}

async function populatePublicDatabase() {
  console.log('Inizializzazione del database pubblico dei prodotti...');
  
  // Verifica se la directory esiste
  if (!fs.existsSync(KID_DATABASE_DIR)) {
    console.error(`La directory ${KID_DATABASE_DIR} non esiste.`);
    return;
  }
  
  // Trova tutti i file PDF in KID_Database e sottodirectory
  const pdfFiles = findAllPdfFiles(KID_DATABASE_DIR);
  console.log(`Trovati ${pdfFiles.length} file PDF nel database KID.`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Processa ogni file PDF
  for (const pdfFile of pdfFiles) {
    try {
      // Estrai l'ISIN dal percorso del file
      const isin = extractIsinFromPath(pdfFile);
      if (!isin) {
        console.log(`ISIN non determinabile per ${pdfFile}, saltato.`);
        skipped++;
        continue;
      }
      
      console.log(`Processando file: ${pdfFile} (ISIN: ${isin})`);
      
      // Controlla se l'ISIN è già nel database pubblico
      const existingRecord = await db.select({ isin: productsPublicDatabase.isin })
        .from(productsPublicDatabase)
        .where(eq(productsPublicDatabase.isin, isin));
      
      if (existingRecord.length > 0) {
        console.log(`ISIN ${isin} già presente nel database pubblico. Saltato.`);
        skipped++;
        continue;
      }
      
      // Calcola il percorso relativo per il database
      const relativePath = path.relative(
        path.join(process.cwd()), 
        pdfFile
      ).replace(/\\/g, '/'); // Assicura che il percorso usi forward slash
      
      console.log(`Percorso relativo: ${relativePath}`);
      
      // Estrai informazioni dal KID
      console.log(`Estrazione dati dal file KID: ${pdfFile}`);
      const kidData = await parseKidDocument(pdfFile);
      
      // Inserisci dati nel database pubblico
      await db.insert(productsPublicDatabase)
        .values({
          isin: isin,
          name: kidData.name || `Prodotto ${isin}`,
          category: kidData.category || 'other',
          description: kidData.description || null,
          benchmark: kidData.benchmark || null,
          dividend_policy: kidData.dividend_policy || null,
          currency: kidData.currency || null,
          sri_risk: kidData.sri_risk ? parseInt(kidData.sri_risk, 10) || null : null,
          entry_cost: kidData.entry_cost || '0',
          exit_cost: kidData.exit_cost || '0',
          ongoing_cost: kidData.ongoing_cost || '0',
          transaction_cost: kidData.transaction_cost || '0',
          performance_fee: kidData.performance_fee || '0',
          recommended_holding_period: kidData.recommended_holding_period || null,
          target_market: kidData.target_market || null,
          kid_file_path: relativePath,
          kid_processed: true,
          createdBy: 1, // Admin user ID (deve esistere nel sistema)
        });
      
      console.log(`ISIN ${isin} aggiunto con successo al database pubblico.`);
      processed++;
      
    } catch (error) {
      console.error(`Errore durante l'elaborazione del file ${pdfFile}:`, error);
      errors++;
    }
  }
  
  console.log('\nRiepilogo:');
  console.log(`- File PDF trovati: ${pdfFiles.length}`);
  console.log(`- Prodotti processati con successo: ${processed}`);
  console.log(`- Prodotti saltati (già esistenti o ISIN non determinabili): ${skipped}`);
  console.log(`- Errori: ${errors}`);
}

// Esegui lo script
populatePublicDatabase()
  .then(() => {
    console.log('Script completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Errore durante l\'esecuzione dello script:', error);
    process.exit(1);
  }); 