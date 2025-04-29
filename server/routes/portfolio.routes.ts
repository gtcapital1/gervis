import type { Express } from "express";
import { db } from "../db";
import { isAuthenticated, handleErrorResponse, safeLog, validateFile } from "../routes";
import { portfolioProducts, modelPortfolios, portfolioAllocations, users, userProducts, productsPublicDatabase } from "../../shared/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { storage } from "../storage";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { UploadedFile } from "express-fileupload";
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
import parsePDF from '../lib/pdf-parser';
import { v4 as uuidv4 } from 'uuid';
import { createPortfolioWithAI, getPortfolioMetrics } from '../ai/portfolio-controller';
import { saveModelPortfolio } from '../services/portfolioService';
import multer from 'multer';

// ES modules compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility per gestire la directory centralizzata dei KID
const KID_STORAGE = {
  // Directory principale dove sono archiviati tutti i KID (database di riferimento gestito esternamente)
  baseDir: path.resolve(process.cwd(), 'server/private/KID_Database'),
  
  // Directory per i KID degli utenti individuali
  userDir: path.resolve(process.cwd(), 'server/private/KIDs'),
  
  // Directory temporanea per le elaborazioni
  tempDir: path.resolve(process.cwd(), 'server/private/KID'),
  
  // Inizializza la directory se non esiste
  init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.userDir)) {
      fs.mkdirSync(this.userDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  },
  
  // Ottiene il percorso della directory per un ISIN specifico nel database centrale
  getIsinDir(isin: string): string {
    const isinDir = path.join(this.baseDir, isin);
    if (!fs.existsSync(isinDir)) {
      fs.mkdirSync(isinDir, { recursive: true });
    }
    return isinDir;
  },
  
  // Salva un file KID nel database centralizzato
  // Questo viene usato SOLO quando è necessario aggiungere un nuovo KID al database centrale
  saveKid(isin: string, uploadedFile: UploadedFile | Buffer, userId: number): string {
    this.init();
    
    const isinDir = this.getIsinDir(isin);
    
    // Nel database centrale, usiamo semplicemente [ISIN].pdf come nome file
    const filename = `${isin}.pdf`;
    const filePath = path.join(isinDir, filename);
    
    // Percorso relativo per il database
    const relativePath = `server/private/KID_Database/${isin}/${filename}`;
    
    // Salva il file nel database centrale solo se non esiste già
    if (!fs.existsSync(filePath)) {
      // Salva il file
      if (Buffer.isBuffer(uploadedFile)) {
        fs.writeFileSync(filePath, uploadedFile);
      } else {
        uploadedFile.mv(filePath);
      }
      
      // Log salvataggio
      safeLog(`KID salvato nel database centralizzato`, {
        isin,
        userId,
        filePath
      }, 'info');
    } else {
      safeLog(`KID già esistente nel database centralizzato, viene usato quello esistente`, {
        isin,
        userId,
        filePath
      }, 'info');
    }
    
    // Salva anche una copia nella directory dell'utente
    this.saveUserKid(isin, uploadedFile, userId);
    
    return relativePath;
  },
  
  // Salva un file KID nella directory dell'utente
  saveUserKid(isin: string, uploadedFile: UploadedFile | Buffer, userId: number): string {
    this.init();
    
    // Crea la directory per l'utente se non esiste
    const userKidDir = path.join(this.userDir, userId.toString());
    if (!fs.existsSync(userKidDir)) {
      fs.mkdirSync(userKidDir, { recursive: true });
    }
    
    // Nel database utente, usiamo timestamp per distinguere versioni diverse
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const filename = `${isin}_${timestamp}_${uniqueId}.pdf`;
    const filePath = path.join(userKidDir, filename);
    
    // Percorso relativo per il database utente
    const relativePath = `server/private/KIDs/${userId}/${filename}`;
    
    // Salva il file nella directory dell'utente
    if (Buffer.isBuffer(uploadedFile)) {
      fs.writeFileSync(filePath, uploadedFile);
    } else {
      uploadedFile.mv(filePath);
    }
    
    // Log salvataggio
    safeLog(`KID salvato nella directory dell'utente`, {
      isin,
      userId,
      filePath
    }, 'info');
    
    return relativePath;
  },
  
  // Ottiene il percorso temporaneo per elaborare un file
  getTempPath(userId: number, originalFilename: string): { filePath: string, relativePath: string } {
    this.init();
    
    const userDir = path.join(this.tempDir, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const filename = `temp_${timestamp}_${uniqueId}.pdf`;
    const filePath = path.join(userDir, filename);
    const relativePath = `server/private/KID/${userId}/${filename}`;
    
    return { filePath, relativePath };
  },
  
  // Verifica se un file KID esiste nel database centrale
  kidExistsInDatabase(isin: string): boolean {
    const isinDir = path.join(this.baseDir, isin);
    const filePath = path.join(isinDir, `${isin}.pdf`);
    return fs.existsSync(filePath);
  },
  
  // Ottiene il percorso di un file KID dal database centrale
  getKidPathFromDatabase(isin: string): string | null {
    const isinDir = path.join(this.baseDir, isin);
    const filePath = path.join(isinDir, `${isin}.pdf`);
    
    if (fs.existsSync(filePath)) {
      return `server/private/KID_Database/${isin}/${isin}.pdf`;
    }
    
    return null;
  }
};

// Enhanced KID document parser that uses AI when possible
export async function parseKidDocument(pdfPath: string): Promise<{
  info: any;
  text: string;
  isin: string;
  name: string;
  category: string;
  entry_cost: string;
  exit_cost: string;
  ongoing_cost: string;
  description?: string;
  benchmark?: string | null;
  dividend_policy?: string | null;
  currency?: string | null;
  sri_risk?: string | null;
  transaction_cost?: string;
  performance_fee?: string;
  recommended_holding_period?: string | null;
  target_market?: string | null;
}> {
  try {
    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Get metadata using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const title = pdfDoc.getTitle() || 'Unknown Title';
    const author = pdfDoc.getAuthor() || 'Unknown Author';
    const subject = pdfDoc.getSubject() || '';
    const keywords = pdfDoc.getKeywords() || '';
    
    // Extract text content using our safe wrapper
    const pdfData = await parsePDF(pdfBuffer);
    const text = pdfData.text;
    
    // Utilizzo di AI per l'estrazione quando possibile
    try {
      // Preparazione dei metadati
      const metadata = {
        title,
        author,
        subject,
        keywords,
        pageCount: pdfDoc.getPageCount()
      };
      
      // Estrazione tramite AI
      const aiExtractionResult = await extractDataWithAI(text, metadata);
      
      console.log(`AI PDF Extraction: ISIN=${aiExtractionResult.isin}, category=${aiExtractionResult.category}, entry_cost=${aiExtractionResult.entry_cost}, exit_cost=${aiExtractionResult.exit_cost}, ongoing_cost=${aiExtractionResult.ongoing_cost}`);
      
      return {
        info: metadata,
        text,
        isin: aiExtractionResult.isin,
        name: aiExtractionResult.name || title,
        category: aiExtractionResult.category,
        entry_cost: aiExtractionResult.entry_cost,
        exit_cost: aiExtractionResult.exit_cost,
        ongoing_cost: aiExtractionResult.ongoing_cost,
        description: aiExtractionResult.description,
        benchmark: aiExtractionResult.benchmark,
        dividend_policy: aiExtractionResult.dividend_policy,
        currency: aiExtractionResult.currency,
        sri_risk: aiExtractionResult.sri_risk,
        transaction_cost: aiExtractionResult.transaction_cost,
        performance_fee: aiExtractionResult.performance_fee,
        recommended_holding_period: aiExtractionResult.recommended_holding_period,
        target_market: aiExtractionResult.target_market
      };
    } catch (aiError) {
      // Se l'estrazione AI fallisce, usa il metodo tradizionale
      console.error('AI extraction failed, falling back to traditional method:', aiError);
      
      // Continua con il metodo tradizionale di estrazione
    }
    
    // METODO TRADIZIONALE (FALLBACK)
    // Extract ISIN from various sources
    let isin = '';
    
    // Try from keywords (common format in KIDs)
    if (keywords) {
      const keywordPairs = keywords.split(';');
      for (const pair of keywordPairs) {
        const [key, value] = pair.split('=');
        if (key === 'ShareClass' && value) {
          isin = value;
          break;
        }
      }
    }
    
    // If not found in keywords, try extracting from text
    if (!isin) {
      // Common ISIN format: 12 characters starting with 2 letters followed by numbers/letters
      const isinPattern = /[A-Z]{2}[A-Z0-9]{10}/g;
      const isinMatches = text.match(isinPattern);
      
      if (isinMatches && isinMatches.length > 0) {
        // Use the first match, which is often the actual ISIN
        isin = isinMatches[0];
      }
    }
    
    // Extract costs
    let entry_cost = "0";
    let exit_cost = "0";
    let ongoing_cost = "0";
    let transaction_cost = "0";
    let performance_fee = "0";
    
    // Look for common cost patterns in KID documents
    const entryCostPattern = /entry\s*(?:charge|cost|fee)s?(?:\s*:)?\s*([0-9.,]+)(?:\s*%)?/i;
    const exitCostPattern = /exit\s*(?:charge|cost|fee)s?(?:\s*:)?\s*([0-9.,]+)(?:\s*%)?/i;
    const ongoingCostPattern = /(?:ongoing|current|annual)\s*(?:charge|cost|fee)s?(?:\s*:)?\s*([0-9.,]+)(?:\s*%)?/i;
    const transactionCostPattern = /transaction\s*(?:charge|cost|fee)s?(?:\s*:)?\s*([0-9.,]+)(?:\s*%)?/i;
    const performanceFeePattern = /performance\s*(?:charge|cost|fee)s?(?:\s*:)?\s*([0-9.,]+)(?:\s*%)?/i;
    
    const entryCostMatch = text.match(entryCostPattern);
    if (entryCostMatch && entryCostMatch[1]) {
      entry_cost = entryCostMatch[1].replace(',', '.');
    }
    
    const exitCostMatch = text.match(exitCostPattern);
    if (exitCostMatch && exitCostMatch[1]) {
      exit_cost = exitCostMatch[1].replace(',', '.');
    }
    
    const ongoingCostMatch = text.match(ongoingCostPattern);
    if (ongoingCostMatch && ongoingCostMatch[1]) {
      ongoing_cost = ongoingCostMatch[1].replace(',', '.');
    }
    
    const transactionCostMatch = text.match(transactionCostPattern);
    if (transactionCostMatch && transactionCostMatch[1]) {
      transaction_cost = transactionCostMatch[1].replace(',', '.');
    }
    
    const performanceFeeMatch = text.match(performanceFeePattern);
    if (performanceFeeMatch && performanceFeeMatch[1]) {
      performance_fee = performanceFeeMatch[1].replace(',', '.');
    }
    
    // Determine category from text
    let category = 'other';
    
    if (text.toLowerCase().includes('equity') || text.toLowerCase().includes('stock')) {
      category = 'equity';
    } else if (text.toLowerCase().includes('bond') || text.toLowerCase().includes('fixed income')) {
      category = 'bonds';
    } else if (text.toLowerCase().includes('money market') || text.toLowerCase().includes('cash')) {
      category = 'cash';
    } else if (text.toLowerCase().includes('real estate') || text.toLowerCase().includes('property')) {
      category = 'real_estate';
    }
    
    // Process ETF titles specifically
    if (title.toLowerCase().includes('etf')) {
      // Default ETFs to equity unless clearly bonds
      category = 'equity';
      if (title.toLowerCase().includes('bond') || title.toLowerCase().includes('treasury') || title.toLowerCase().includes('government')) {
        category = 'bonds';
      }
    }
    
    // Estrazione di valuta
    let currency = null;
    const currencyPattern = /(?:currency|denominated in):\s*([A-Z]{3})/i;
    const currencyMatch = text.match(currencyPattern);
    if (currencyMatch && currencyMatch[1]) {
      currency = currencyMatch[1];
    }
    
    // Estrazione di SRI risk
    let sri_risk = null;
    const sriPattern = /(?:synthetic risk|risk indicator|srri|sri)(?:\s*:)?\s*([1-7])/i;
    const sriMatch = text.match(sriPattern);
    if (sriMatch && sriMatch[1]) {
      sri_risk = sriMatch[1];
    }
    
    // Estrazione della politica dei dividendi
    let dividend_policy = null;
    if (text.toLowerCase().includes('accumulating') || text.toLowerCase().includes('reinvest')) {
      dividend_policy = 'accumulating';
    } else if (text.toLowerCase().includes('distributing') || text.toLowerCase().includes('dividend')) {
      dividend_policy = 'distributing';
    }
    
    // Estrazione del benchmark
    let benchmark = null;
    const benchmarkPatterns = [
      /benchmark(?:\s*:)?\s*([^.]+)/i,
      /track(?:s|ing)(?:\s*:)?\s*([^.]+)/i,
      /index(?:\s*:)?\s*([^.]+)/i
    ];
    
    for (const pattern of benchmarkPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        benchmark = match[1].trim();
        break;
      }
    }
    
    // Estrazione del periodo di detenzione raccomandato
    let recommended_holding_period = null;
    const holdingPatterns = [
      /recommended holding period(?:\s*:)?\s*([^.]+)/i,
      /recommend(?:ed)? to hold for(?:\s*:)?\s*([^.]+)/i,
      /hold for at least(?:\s*:)?\s*([^.]+)/i
    ];
    
    for (const pattern of holdingPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 1) {
        recommended_holding_period = match[1].trim();
        break;
      }
    }
    
    // Estrazione del target market
    let target_market = null;
    const targetMarketPatterns = [
      /intended for(?:\s*:)?\s*([^.]+)/i,
      /target(?:ed)? investor(?:\s*:)?\s*([^.]+)/i,
      /designed for(?:\s*:)?\s*([^.]+)/i
    ];
    
    for (const pattern of targetMarketPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        target_market = match[1].trim();
        break;
      }
    }
    
    // Combine information
    const info = {
      title,
      author,
      subject,
      keywords,
      pageCount: pdfDoc.getPageCount(),
      textLength: text.length
    };
    
    console.log(`Traditional PDF Extraction: ISIN=${isin}, entry_cost=${entry_cost}, exit_cost=${exit_cost}, ongoing_cost=${ongoing_cost}, category=${category}`);
    
    // Extract a description from the text
    let description = '';
    if (text.length > 0) {
      // Try to find a description by looking for key phrases
      const descriptionPatterns = [
        /(?:product|investment) description:?\s*([^\n.]+[^\n]*)/i,
        /what is this product\??:?\s*([^\n.]+[^\n]*)/i,
        /type of product:?\s*([^\n.]+[^\n]*)/i,
        /objectives:?\s*([^\n.]+[^\n]*)/i
      ];
      
      for (const pattern of descriptionPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].length > 10) {
          description = match[1].trim();
          // Limit to 200 chars
          if (description.length > 200) {
            description = description.substring(0, 197) + '...';
          }
          break;
        }
      }
      
      // If no description found, use the first non-empty paragraph
      if (!description) {
        const paragraphs = text.split('\n\n');
        for (const para of paragraphs) {
          if (para.trim().length > 10) {
            description = para.trim();
            // Limit to 200 chars
            if (description.length > 200) {
              description = description.substring(0, 197) + '...';
            }
            break;
          }
        }
      }
    }
    
    return {
      info,
      text,
      isin,
      name: title,
      category,
      entry_cost,
      exit_cost,
      ongoing_cost,
      transaction_cost,
      performance_fee,
      description,
      benchmark,
      dividend_policy,
      currency,
      sri_risk,
      recommended_holding_period,
      target_market
    };
  } catch (error) {
    console.error('Error extracting info from PDF:', error);
    throw new Error(`Enhanced PDF extraction failed: ${error}`);
  }
}

// Keep the original extraction function for backward compatibility
async function extractPDFInfo(pdfPath: string): Promise<string> {
  try {
    // Use the enhanced parser
    const parsedData = await parseKidDocument(pdfPath);
    
    // Return a formatted string with the most important information
    return `
      Product Information:
      Name: ${parsedData.name}
      ISIN: ${parsedData.isin || 'Not found in document'}
      Category: ${parsedData.category}
      Provider: ${parsedData.info.author}
      
      Estimated Costs:
      Entry: ${parsedData.entry_cost}%
      Exit: ${parsedData.exit_cost}%
      Ongoing: ${parsedData.ongoing_cost}%
      
      Document Information:
      Pages: ${parsedData.info.pageCount}
      
      Note: Extraction was performed automatically. For more accurate information, 
      the document should be manually reviewed.
    `;
  } catch (error) {
    console.error('Error in extractPDFInfo:', error);
    throw new Error(`Failed to extract info from PDF: ${error}`);
  }
}

// Aggiungi questa funzione per estrarre dati dal PDF usando OpenAI
async function extractDataWithAI(pdfText: string, pdfMetadata: any): Promise<{
  isin: string;
  name: string;
  category: string;
  description: string;
  benchmark: string | null;
  dividend_policy: string | null;
  currency: string | null;
  sri_risk: string | null;
  entry_cost: string;
  exit_cost: string;
  ongoing_cost: string;
  transaction_cost: string;
  performance_fee: string;
  recommended_holding_period: string | null;
  target_market: string | null;
}> {
  try {
    // Se OpenAI non è configurato, fallback al metodo tradizionale
    if (!openai.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Crea il prompt per GPT con istruzioni precise
    const prompt = `
Sei un esperto nell'analisi di documenti finanziari KID (Key Information Document) secondo la normativa europea MiFID II/PRIIPs.

TASK: Analizza questo documento KID ed estrai le informazioni critiche in formato JSON strutturato.

### CONTENUTO DEL DOCUMENTO KID:
${pdfText}

### METADATI DEL DOCUMENTO:
Titolo: ${pdfMetadata.title || 'Non disponibile'}
Autore: ${pdfMetadata.author || 'Non disponibile'}
Parole chiave: ${pdfMetadata.keywords || 'Non disponibili'}

### ISTRUZIONI SPECIFICHE PER L'ESTRAZIONE:

1. ISIN:
   - Cerca il codice ISIN nel formato standard 12 caratteri alfanumerici (es. IE00B5BMR087)
   - Spesso si trova nelle sezioni "Informazioni generali", "Cos'è questo prodotto?" o nell'intestazione
   - Nei metadati può apparire come "ShareClass" nelle parole chiave

2. Nome del prodotto:
   - Estrai il nome completo e ufficiale del prodotto finanziario
   - Solitamente è presente nell'intestazione o nella prima sezione del documento

3. Categoria del prodotto:
   - Classifica il prodotto in una delle seguenti categorie: [equity, bonds, cash, real_estate, private_equity, venture_capital, cryptocurrencies, commodities, other]
   - Per ETF azionari o fondi di investimento in azioni, usa "equity"
   - Per obbligazioni, titoli a reddito fisso, bond governativi, usa "bonds"
   - Per prodotti monetari o di liquidità, usa "cash"
   - Per prodotti di materie prime, usa "commodities"
   - Per prodotti di investimento immobiliare, usa "real_estate"
   - Per prodotti di private equity, usa "private_equity"
   - Per prodotti di venture capital, usa "venture_capital"
   - Per prodotti di criptovalute, usa "cryptocurrencies"
   - Per altri prodotti, usa "other"
   - Se non è chiaro, inferisci dalla composizione del portafoglio o dalla strategia di investimento

4. Descrizione:
   - Crea una sintesi chiara e concisa del prodotto (max 200 caratteri)
   - Includi: tipo di prodotto, strategia, principale area di investimento, eventuale benchmark
   - Es: "ETF che replica l'indice S&P 500, investendo in azioni di grandi aziende americane. Accumulazione dei dividendi."

5. Benchmark:
   - Identifica l'indice di riferimento che il prodotto cerca di replicare o superare
   - Es: "MSCI World Index", "S&P 500", "FTSE MIB"
   - Se non specificato, lascia NULL

6. Politica dei dividendi:
   - Indica se i dividendi vengono distribuiti o reinvestiti
   - Valori possibili: "distributing", "accumulating", o una descrizione specifica
   - Se non specificato, lascia NULL

7. Valuta:
   - Identifica la valuta principale del prodotto (EUR, USD, GBP, ecc.)
   - Cerca nelle sezioni relative al prezzo o alla denominazione

8. Indicatore di rischio SRI:
   - Cerca l'indicatore sintetico di rischio, un numero da 1 a 7
   - Solitamente visualizzato come grafico nella sezione rischi
   - Fornisci solo il numero (es: "3")

9. Costi:
   - Costo di ingresso: cerca nella sezione "Quali sono i costi?" (in %) - es. "3.00" (NON includere il simbolo %)
   - Costo di uscita: cerca nella sezione "Quali sono i costi?" (in %) - es. "1.50" (NON includere il simbolo %)
   - Costo corrente: cerca "spese correnti", "ongoing charges", "TER", "commissioni di gestione" (in %) - es. "0.70" (NON includere il simbolo %)
   - Costo di transazione: cerca "costi di transazione", "transaction costs" (in %) - es. "0.10" (NON includere il simbolo %)
   - Commissione di performance: cerca "commissione legata al rendimento", "performance fee" (in %) - es. "20.00" (NON includere il simbolo %)
   - Per valori assenti, usa "0"
   - NOTA: I costi devono essere espressi SOLO come numeri decimali, senza % o altre unità

10. Periodo di detenzione raccomandato:
    - Cerca nella sezione "Per quanto tempo devo detenerlo?"
    - IMPORTANTE: Fornisci il periodo di detenzione in FRAZIONE DI ANNI come numerico (non in stringa)
    - Esempi:
      * Se il documento dice "5 anni" → 5
      * Se il documento dice "3-5 anni" → 4 (prendi la media)
      * Se il documento dice "18 mesi" → 1.5
      * Se il documento dice "6 mesi" → 0.5
    - Se non specificato, lascia NULL

11. Mercato target:
    - Cerca informazioni sul tipo di investitore a cui è destinato il prodotto
    - Es: "Investitori al dettaglio", "Investitori professionali", "Investitori con conoscenza elevata"
    - Se non specificato, lascia NULL

### FORMATO OUTPUT:
Fornisci ESCLUSIVAMENTE un oggetto JSON valido con questa struttura, senza commenti o spiegazioni aggiuntive:

{
  "ISIN": string,
  "Nome": string,
  "Categoria": "equity" | "bonds" | "cash" | "real_estate" | "private_equity" | "venture_capital" | "cryptocurrencies" | "other",
  "Descrizione": string,
  "Benchmark": string | null,
  "PoliticaDividendi": string | null,
  "Valuta": string | null,
  "IndicatoreRischio": string | null,
  "CostoIngresso": string (numerico),
  "CostoUscita": string (numerico),
  "CostoCorrente": string (numerico),
  "CostoTransazione": string (numerico),
  "CommissionePerformance": string (numerico),
  "PeriodoDetenzioneRaccomandato": string | null,
  "MercatoTarget": string | null
}

IMPORTANTE:
- Includi sempre l'ISIN esatto se disponibile
- I campi dei costi devono contenere SOLO numeri decimali (es: "0.07" e non "0.07%" o "7 bps")
- Se un'informazione non è reperibile, usa NULL per i campi opzionali, o un valore plausibile basato sul contesto per i campi obbligatori
- Per i campi nulli usa esplicitamente null senza virgolette
`;

    // Chiamata a OpenAI per analizzare il documento
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Usa gpt-4.1-mini o l'equivalente modello disponibile
      messages: [
        { 
          role: "system", 
          content: "Sei un assistente specializzato nell'estrazione di dati da documenti finanziari KID (Key Information Document). Il tuo compito è estrarre dati strutturati in formato JSON. Rispondi SOLO con JSON valido, senza alcun testo aggiuntivo." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Temperatura bassa per risposte coerenti
      max_tokens: 1000
    });

    // Estrai il contenuto della risposta
    const content = response.choices[0]?.message?.content || '{}';
    
    // Parsa la risposta JSON
    const parsedData = JSON.parse(content);
    
    console.log("AI extraction result:", parsedData);
    
    // Restituisci i dati strutturati
    return {
      isin: parsedData.ISIN || '',
      name: parsedData.Nome || '',
      category: parsedData.Categoria || 'other',
      description: parsedData.Descrizione || '',
      benchmark: parsedData.Benchmark,
      dividend_policy: parsedData.PoliticaDividendi,
      currency: parsedData.Valuta,
      sri_risk: parsedData.IndicatoreRischio,
      entry_cost: parsedData.CostoIngresso || '0',
      exit_cost: parsedData.CostoUscita || '0',
      ongoing_cost: parsedData.CostoCorrente || '0',
      transaction_cost: parsedData.CostoTransazione || '0',
      performance_fee: parsedData.CommissionePerformance || '0',
      recommended_holding_period: parsedData.PeriodoDetenzioneRaccomandato,
      target_market: parsedData.MercatoTarget
    };
  } catch (error) {
    // Log error and fallback to traditional method
    console.error('Error using AI for PDF extraction:', error);
    return {
      isin: '',
      name: pdfMetadata.title || '',
      category: 'other',
      description: '',
      benchmark: null,
      dividend_policy: null,
      currency: null,
      sri_risk: null,
      entry_cost: '0',
      exit_cost: '0',
      ongoing_cost: '0',
      transaction_cost: '0',
      performance_fee: '0',
      recommended_holding_period: null,
      target_market: null
    };
  }
}

export function registerPortfolioRoutes(app: Express) {
  console.log('[Routes] Registering portfolio routes');

  // Upload and process KID file
  app.post('/api/portfolio/upload-kid', isAuthenticated, async (req, res) => {
    try {
      console.log("DEBUG: Ricevuta richiesta upload-kid");
      console.log("DEBUG: Headers:", JSON.stringify(req.headers));
      console.log("DEBUG: Files:", req.files ? Object.keys(req.files) : 'Nessun file ricevuto');
      console.log("DEBUG: Body:", JSON.stringify(req.body));
      console.log("DEBUG: Autenticazione:", req.isAuthenticated(), req.user ? req.user.id : 'Non autenticato');
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check if file was uploaded
      if (!req.files || !req.files.kid) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const userId = req.user.id;
      const kidFile = req.files.kid as UploadedFile;
      
      // Se è stato inviato anche un ISIN con il file
      const isin = req.body.isin as string | undefined;

      // Validate file is a PDF
      const validationResult = validateFile(kidFile, {
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 10 * 1024 * 1024, // 10MB max
      });

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.error || 'Invalid file'
        });
      }

      // Prima salviamo il file in una directory temporanea per l'elaborazione
      const { filePath, relativePath } = KID_STORAGE.getTempPath(userId, kidFile.name);
      await kidFile.mv(filePath);

      // Extract PDF information with AI when possible
      let extractedInfo = '';
      let parsedData;
      let extractionMethod = "traditional";
      
      try {
        // Use the enhanced parser to get detailed information including AI extraction when possible
        parsedData = await parseKidDocument(filePath);
        extractedInfo = await extractPDFInfo(filePath); // This now uses parseKidDocument internally
        
        // Check if AI was used by looking for the description field that only AI extraction provides
        if (parsedData.description && parsedData.description.length > 0) {
          extractionMethod = "ai";
        }
      } catch (error) {
        safeLog('Error extracting info from PDF', error, 'error');
        return res.status(500).json({
          success: false,
          message: 'Error processing PDF file',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Use ISIN from parameters if provided, otherwise from extracted data
      const productISIN = isin || parsedData.isin || `MANUAL_${Date.now()}`;
      
      // Primo, salva il file nella directory dell'utente
      const userFilePath = KID_STORAGE.saveUserKid(productISIN, kidFile, userId);
      
      // Verifichiamo se esiste già nel database centrale
      let kidFilePath;
      if (KID_STORAGE.kidExistsInDatabase(productISIN)) {
        // Se esiste nel database centrale, usiamo quel percorso
        kidFilePath = KID_STORAGE.getKidPathFromDatabase(productISIN);
        console.log(`KID già esistente nel database centralizzato, usando: ${kidFilePath}`);
      }
      
      // Prepare product data
      const productData = {
        isin: productISIN,
        name: parsedData.name || 'Uploaded KID Product',
        category: parsedData.category,
        description: parsedData.description || 'Manually uploaded KID document', 
        benchmark: parsedData.benchmark,
        dividend_policy: parsedData.dividend_policy,
        currency: parsedData.currency,
        sri_risk: parsedData.sri_risk ? parseInt(parsedData.sri_risk, 10) || null : null,
        entry_cost: parsedData.entry_cost,
        exit_cost: parsedData.exit_cost,
        ongoing_cost: parsedData.ongoing_cost,
        transaction_cost: parsedData.transaction_cost,
        performance_fee: parsedData.performance_fee,
        recommended_holding_period: parsedData.recommended_holding_period,
        target_market: parsedData.target_market,
        kid_file_path: kidFilePath || userFilePath, // Prioritizing central database path
        kid_processed: true,
        createdBy: userId
      };

      // Check if product with this ISIN already exists
      const existingProducts = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.isin, productISIN));
      
      let product;
      let isNewProduct = false;
      
      if (existingProducts.length > 0) {
        // Update existing product with new KID information
        const existingProduct = existingProducts[0];
        
        // Se l'utente non è il creatore e il prodotto non è disponibile a tutti,
        // crea un nuovo prodotto anziché modificare quello esistente
        if (existingProduct.createdBy !== userId) {
          console.log(`User ${userId} is not allowed to update product ${existingProduct.id}. Creating new product.`);
          
          const [newProduct] = await db.insert(portfolioProducts)
            .values(productData)
            .returning();
          
          product = newProduct;
          isNewProduct = true;
        } else {
          // Se l'utente è il creatore o il prodotto è disponibile a tutti, aggiorna
          // Creiamo un nuovo oggetto senza i campi createdBy, kid_file_path e kid_processed per evitare errori
          const { createdBy, kid_file_path, kid_processed, ...updateData } = productData;
          
          // Aggiungiamo centralDbPath e kid_processed separatamente
          const [updatedProduct] = await db.update(portfolioProducts)
            .set({
              ...updateData,
              kid_file_path: kidFilePath || userFilePath, // Percorso centrale o dell'utente
              kid_processed: true
            })
            .where(eq(portfolioProducts.id, existingProduct.id))
            .returning();
          
          product = updatedProduct;
        }
      } else {
        // Create new product
        const [newProduct] = await db.insert(portfolioProducts)
          .values(productData)
          .returning();
        
        product = newProduct;
        isNewProduct = true;
      }
      
      // Aggiungiamo il prodotto all'utente se non è già presente
      const existingUserProduct = await db.select()
        .from(userProducts)
        .where(and(
          eq(userProducts.userId, userId),
          eq(userProducts.productId, product.id)
        ));
      
      if (existingUserProduct.length === 0) {
        await db.insert(userProducts)
          .values({
            userId,
            productId: product.id
          });
      }

      return res.json({
        success: true,
        message: isNewProduct 
          ? 'Product created and added to your portfolio' 
          : 'Product updated and added to your portfolio',
        product,
        extractionMethod,
        isNewProduct
      });
    } catch (error) {
      safeLog('Error processing KID file', error, 'error');
      return res.status(500).json({
        success: false,
        message: 'Error processing KID file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get all portfolio products for current user
  app.get('/api/portfolio/products', isAuthenticated, async (req, res) => {
    try {
      // Debug di autenticazione
      console.log('=== DEBUG AUTH PRODUCTS ===');
      console.log('req.user:', req.user);
      console.log('req.session:', req.session);
      console.log('req.headers:', req.headers);
      console.log('req.cookies:', req.cookies);
      console.log('isAuthenticated function exists:', typeof req.isAuthenticated === 'function');
      if (typeof req.isAuthenticated === 'function') {
        console.log('isAuthenticated result:', req.isAuthenticated());
      }
      console.log('=== END DEBUG AUTH ===');

      // Verifica diretta che l'utente sia autenticato tramite req.user
      if (!req.user || !req.user.id) {
        console.log('DEBUG: Authentication failed - No valid user object');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      console.log('DEBUG /api/portfolio/products - User ID:', req.user.id);

      // First we get products added to this user's portfolio
      const userProductRows = await db.select({
        productId: userProducts.productId
      })
      .from(userProducts)
      .where(eq(userProducts.userId, req.user.id));
      
      console.log('DEBUG /api/portfolio/products - User product associations found:', userProductRows.length);
      console.log('DEBUG /api/portfolio/products - Product IDs:', JSON.stringify(userProductRows.map(row => row.productId)));
      
      // Specifichiamo il tipo di products come array di PortfolioProduct
      let products: any[] = [];
      
      if (userProductRows.length > 0) {
        console.log('DEBUG /api/portfolio/products - Querying products');
        
        // Usa solo Drizzle in modo sicuro
        const productIds = userProductRows.map(row => row.productId).filter(Boolean);
        
        console.log('DEBUG /api/portfolio/products - Filtered product IDs:', productIds);
        
        if (productIds.length > 0) {
          // Uso una query OR con condizioni multiple invece di inArray
          // che può avere problemi con alcuni input
          const conditions = productIds.map(id => 
            eq(portfolioProducts.id, id as number)
          );
          
          products = await db
            .select()
            .from(portfolioProducts)
            .where(or(...conditions));
          
          console.log('DEBUG /api/portfolio/products - Products found:', products.length);
        }
      } else {
        console.log('DEBUG /api/portfolio/products - No product IDs found for this user');
      }
      
      console.log('DEBUG /api/portfolio/products - Returning products total:', products.length);
      
      res.json({
        success: true,
        products
      });
    } catch (error) {
      console.error('DEBUG /api/portfolio/products - General error:', error);
      safeLog('Error retrieving portfolio products', error, 'error');
      handleErrorResponse(res, error, 'Error retrieving portfolio products');
    }
  });

  // Create a portfolio product
  app.post('/api/portfolio/products', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { isin, name, category, description, entry_cost, exit_cost, ongoing_cost, performance_fee } = req.body;
      
      // Validate required fields
      if (!isin || !name || !category) {
        return res.status(400).json({
          success: false,
          message: 'ISIN, name, and category are required'
        });
      }
      
      // Check if product with ISIN already exists
      const existingProduct = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.isin, isin));
      
      if (existingProduct.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A product with this ISIN already exists'
        });
      }
      
      // Convert and prepare values
      const entry_cost_str = entry_cost?.toString() || "0";
      const exit_cost_str = exit_cost?.toString() || "0";
      const ongoing_cost_str = ongoing_cost?.toString() || "0";
      const performance_fee_str = performance_fee?.toString() || "0";
      
      // Create new product
      const [newProduct] = await db.insert(portfolioProducts)
        .values({
          isin,
          name,
          category,
          description,
          entry_cost: entry_cost_str,
          exit_cost: exit_cost_str,
          ongoing_cost: ongoing_cost_str,
          performance_fee: performance_fee_str,
          createdBy: req.user?.id
        })
        .returning();
      
      res.json({
        success: true,
        product: newProduct
      });
    } catch (error) {
      safeLog('Error creating portfolio product', error, 'error');
      handleErrorResponse(res, error, 'Error creating portfolio product');
    }
  });

  // Delete a portfolio product
  app.delete('/api/portfolio/products/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID' });
      }
      
      // Check if product exists
      const existingProduct = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.id, productId));
      
      if (existingProduct.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Delete product
      await db.delete(portfolioProducts)
        .where(eq(portfolioProducts.id, productId));
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      safeLog('Error deleting portfolio product', error, 'error');
      handleErrorResponse(res, error, 'Error deleting portfolio product');
    }
  });

  // Get all model portfolios with their allocations
  app.get('/api/portfolio/models', isAuthenticated, async (req, res) => {
    try {
      // Debug di autenticazione
      console.log('=== DEBUG AUTH MODELS ===');
      console.log('req.user:', req.user);
      console.log('req.session:', req.session);
      console.log('req.headers:', req.headers);
      console.log('req.cookies:', req.cookies);
      console.log('isAuthenticated function exists:', typeof req.isAuthenticated === 'function');
      if (typeof req.isAuthenticated === 'function') {
        console.log('isAuthenticated result:', req.isAuthenticated());
      }
      console.log('=== END DEBUG AUTH ===');
      
      // Verifica diretta che l'utente sia autenticato tramite req.user
      if (!req.user || !req.user.id) {
        console.log('DEBUG: Authentication failed - No valid user object');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Get portfolios created by the current user
      const portfolios = await db.select()
        .from(modelPortfolios)
        .where(eq(modelPortfolios.createdBy, req.user.id));
      
      // Get allocations for each portfolio
      const portfoliosWithAllocations = await Promise.all(
        portfolios.map(async (portfolio) => {
          // Query allocations for this portfolio
          const allocations = await db.select({
            id: portfolioAllocations.id,
            percentage: portfolioAllocations.percentage,
            productId: portfolioProducts.id,
            isin: portfolioProducts.isin,
            name: portfolioProducts.name,
            category: portfolioProducts.category
          })
          .from(portfolioAllocations)
          .innerJoin(
            portfolioProducts,
            eq(portfolioAllocations.productId, portfolioProducts.id)
          )
          .where(eq(portfolioAllocations.portfolioId, portfolio.id));
          
          // Mappo il campo constructionLogic -> construction_logic per compatibilità con il frontend
          return {
            ...portfolio,
            construction_logic: portfolio.constructionLogic,
            allocation: allocations.map(alloc => ({
              isinId: alloc.productId,
              isin: alloc.isin,
              name: alloc.name,
              category: alloc.category,
              percentage: parseFloat(alloc.percentage.toString())
            }))
          };
        })
      );
      
      res.json({
        success: true,
        portfolios: portfoliosWithAllocations
      });
    } catch (error) {
      console.error('DEBUG /api/portfolio/models - General error:', error);
      safeLog('Error retrieving model portfolios', error, 'error');
      handleErrorResponse(res, error, 'Error retrieving model portfolios');
    }
  });

  // Create a model portfolio
  app.post('/api/portfolio/models', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      console.log("Received portfolio creation request:", JSON.stringify({
        userId: req.user.id,
        body: req.body
      }, null, 2));

      const { 
        name, 
        description, 
        clientProfile, 
        riskLevel, 
        allocation,
        constructionLogic,
        entryCost,
        exitCost,
        ongoingCost,
        transactionCost,
        performanceFee,
        recommendedPeriod,
        targetReturn
      } = req.body;
      
      // Validate required fields
      if (!name || !description || !clientProfile || !riskLevel || !allocation || !Array.isArray(allocation)) {
        console.error("Missing required fields:", {
          name: !!name,
          description: !!description,
          clientProfile: !!clientProfile,
          riskLevel: !!riskLevel,
          allocationArray: Array.isArray(allocation),
          allocation: !!allocation
        });
        return res.status(400).json({
          success: false,
          message: 'Name, description, clientProfile, riskLevel, and allocation are required'
        });
      }
      
      // Validate allocation percentages sum to 100%
      const totalPercentage = allocation.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        console.error("Allocation percentages don't sum to 100:", totalPercentage);
        return res.status(400).json({
          success: false,
          message: 'Allocation percentages must sum to 100%'
        });
      }
      
      // Check that all allocations have categories and isinId
      const validAllocations = allocation.every(item => {
        const valid = !!item.category && !!item.isinId;
        if (!valid) {
          console.error("Invalid allocation item:", item);
        }
        return valid;
      });
      
      if (!validAllocations) {
        return res.status(400).json({
          success: false,
          message: 'All allocations must have a category and isinId'
        });
      }
      
      // Normalize numeric values
      const parseNumeric = (value: any) => {
        if (value === undefined || value === null) return undefined;
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
      };
      
      // Prepare portfolio data
      const portfolioData = {
        name,
        description,
        client_profile: clientProfile,
        risk_level: riskLevel,
        construction_logic: constructionLogic,
        entry_cost: parseNumeric(entryCost),
        exit_cost: parseNumeric(exitCost),
        ongoing_cost: parseNumeric(ongoingCost),
        transaction_cost: parseNumeric(transactionCost),
        performance_fee: parseNumeric(performanceFee),
        recommended_period: parseNumeric(recommendedPeriod),
        target_return: parseNumeric(targetReturn),
        allocations: allocation.map(item => ({
          category: item.category,
          percentage: parseNumeric(item.percentage) || 0,
          productId: parseInt(item.isinId)
        }))
      };

      console.log("Processed portfolio data:", JSON.stringify(portfolioData, null, 2));

      // Use the enhanced portfolio service function
      const result = await saveModelPortfolio(portfolioData, req.user.id);
      
      console.log("Portfolio save result:", result);
      
      res.json({
        success: true,
        portfolioId: result.id,
        totalAnnualCost: result.totalAnnualCost
      });
    } catch (error) {
      console.error("Portfolio save error:", error);
      safeLog('Error creating model portfolio', error, 'error');
      handleErrorResponse(res, error, 'Error creating model portfolio');
    }
  });

  // Get a specific model portfolio
  app.get('/api/portfolio/models/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const portfolioId = parseInt(req.params.id);
      if (isNaN(portfolioId)) {
        return res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
      }
      
      // Get portfolio created by current user
      const portfolios = await db.select()
        .from(modelPortfolios)
        .where(and(
          eq(modelPortfolios.id, portfolioId),
          eq(modelPortfolios.createdBy, req.user.id)
        ));
      
      if (portfolios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Portfolio not found or you do not have permission to access it'
        });
      }
      
      const portfolio = portfolios[0];
      
      // Get allocations
      const allocations = await db.select({
        id: portfolioAllocations.id,
        percentage: portfolioAllocations.percentage,
        productId: portfolioProducts.id,
        isin: portfolioProducts.isin,
        name: portfolioProducts.name,
        category: portfolioProducts.category
      })
      .from(portfolioAllocations)
      .innerJoin(
        portfolioProducts,
        eq(portfolioAllocations.productId, portfolioProducts.id)
      )
      .where(eq(portfolioAllocations.portfolioId, portfolioId));
      
      const portfolioWithAllocations = {
        ...portfolio,
        construction_logic: portfolio.constructionLogic,
        allocation: allocations.map(alloc => ({
          isinId: alloc.productId,
          isin: alloc.isin,
          name: alloc.name,
          category: alloc.category,
          percentage: parseFloat(alloc.percentage.toString())
        }))
      };
      
      res.json({
        success: true,
        portfolio: portfolioWithAllocations
      });
    } catch (error) {
      safeLog('Error retrieving model portfolio', error, 'error');
      handleErrorResponse(res, error, 'Error retrieving model portfolio');
    }
  });

  // Delete a model portfolio
  app.delete('/api/portfolio/models/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const portfolioId = parseInt(req.params.id);
      if (isNaN(portfolioId)) {
        return res.status(400).json({ success: false, message: 'Invalid portfolio ID' });
      }
      
      // Check if portfolio exists and belongs to the current user
      const existingPortfolio = await db.select()
        .from(modelPortfolios)
        .where(and(
          eq(modelPortfolios.id, portfolioId),
          eq(modelPortfolios.createdBy, req.user.id)
        ));
      
      if (existingPortfolio.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Portfolio not found or you do not have permission to delete it'
        });
      }
      
      // Delete portfolio (allocations will be deleted due to cascade)
      await db.delete(modelPortfolios)
        .where(and(
          eq(modelPortfolios.id, portfolioId),
          eq(modelPortfolios.createdBy, req.user.id)
        ));
      
      res.json({
        success: true,
        message: 'Portfolio deleted successfully'
      });
    } catch (error) {
      safeLog('Error deleting model portfolio', error, 'error');
      handleErrorResponse(res, error, 'Error deleting model portfolio');
    }
  });

  // Get KID document for a product
  app.get('/api/portfolio/products/:id/kid', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID' });
      }
      
      // Get product information
      const products = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.id, productId));
      
      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const product = products[0];
      
      // Check if KID file exists
      if (!product.kid_file_path) {
        // Verifichiamo se esiste nel database centrale
        if (product.isin && KID_STORAGE.kidExistsInDatabase(product.isin)) {
          // Se esiste nel database centrale, usiamo quello
          const centralPath = KID_STORAGE.getKidPathFromDatabase(product.isin);
          if (centralPath) {
            // Aggiorniamo il prodotto nel DB con il percorso del file
            await db.update(portfolioProducts)
              .set({ kid_file_path: centralPath })
              .where(eq(portfolioProducts.id, productId));
            
            // Costruisci il percorso assoluto usando centralPath
            const filePath = path.resolve(__dirname, '../../../', centralPath);
            
            // Set content type
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${product.isin || 'product'}_kid.pdf"`);
            
            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            return;
          }
        }
        
        return res.status(404).json({
          success: false,
          message: 'KID document not found for this product'
        });
      }
      
      // Construct absolute file path using path.resolve with __dirname
      const filePath = path.resolve(__dirname, '../../../', product.kid_file_path);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // Proviamo a cercare nel database centrale come fallback
        if (product.isin && KID_STORAGE.kidExistsInDatabase(product.isin)) {
          const centralPath = KID_STORAGE.getKidPathFromDatabase(product.isin);
          if (centralPath) {
            // Aggiorniamo il prodotto nel DB con il percorso del file
            await db.update(portfolioProducts)
              .set({ kid_file_path: centralPath })
              .where(eq(portfolioProducts.id, productId));
            
            // Costruisci il percorso assoluto usando centralPath
            const centralFilePath = path.resolve(__dirname, '../../../', centralPath);
            
            // Set content type
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${product.isin || 'product'}_kid.pdf"`);
            
            // Stream the file
            const fileStream = fs.createReadStream(centralFilePath);
            fileStream.pipe(res);
            return;
          }
        }
        
        return res.status(404).json({
          success: false,
          message: 'KID document file not found'
        });
      }
      
      // Set content type
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${product.isin || 'product'}_kid.pdf"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      safeLog('Error retrieving KID document', error, 'error');
      handleErrorResponse(res, error, 'Error retrieving KID document');
    }
  });

  // Check ISIN exists and try to auto-download KID
  app.post('/api/portfolio/check-isin', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { isin } = req.body;
      
      if (!isin) {
        return res.status(400).json({
          success: false, 
          message: 'ISIN is required'
        });
      }

      // Check if ISIN already exists in database
      const existingProducts = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.isin, isin));
      
      if (existingProducts.length > 0) {
        return res.json({
          success: false,
          exists: true,
          message: 'A product with this ISIN already exists'
        });
      }

      // Try to download KID using OpenAI
      try {
        if (!openai.apiKey) {
          throw new Error("OpenAI API key not configured");
        }

        console.log(`Trying to find KID document for ISIN: ${isin}`);

        // Ask OpenAI to find a download link for the KID
        const prompt = `
I need to find and download a Key Information Document (KID) or KIID for the financial product with ISIN: ${isin}.

Important notes about KIDs:
- KIDs are mandatory for PRIIP products in the EU under MiFID II regulations
- They are standardized PDF documents providing key information about investment products
- They are typically found on the issuer's or fund manager's website
- Alternative names: KIID (Key Investor Information Document), KID (Key Information Document)

Common websites where KIDs can be found:
- justetf.com (for ETFs)
- blackrock.com/it (for iShares ETFs)
- amundi.it, amundi.com, amundietf.it (for Amundi products)
- fidelity.it (for Fidelity funds)
- lyxoretf.it (for Lyxor ETFs)
- ishares.com (for iShares ETFs)
- xtrackers.com (for Deutsche Bank ETFs)
- invesco.com/us/financial-products/etfs/ (for Invesco ETFs)
- vanguard.co.uk, vanguard.com (for Vanguard funds)
- morningstar.com (database of many funds)
- finance.yahoo.com (for general financial data)

Search strategies:
1. Look for the ISIN on the issuer's website in their product section
2. Search for "${isin} KID pdf" or "${isin} KIID pdf" on a search engine
3. Check financial product databases like justetf.com or morningstar.com

Please provide:
1. The exact direct URL to download the PDF document for this ISIN
2. The issuer/provider name of this product (if found)
3. The type of product (ETF, fund, structured product, etc.) if you can determine it

Only return a valid, publicly accessible download URL that leads directly to the PDF file. Do not include any explanations, just the URL. If you cannot find a specific URL, respond with "NO_URL_FOUND".
`;

        console.log("Sending prompt to OpenAI to find KID document");
        
        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are an assistant specialized in finding financial documents. Respond ONLY with a direct download URL to the requested KID document for the ISIN, or with 'NO_URL_FOUND' if no URL can be determined."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 300
        });

        // Extract response content
        const kidUrl = response.choices[0].message.content?.trim();
        console.log(`OpenAI response for KID URL: ${kidUrl}`);
        
        if (!kidUrl || kidUrl === "NO_URL_FOUND" || !kidUrl.toLowerCase().startsWith("http")) {
          return res.json({
            success: false,
            exists: false,
            auto_download: false,
            message: 'Could not automatically find KID document for this ISIN'
          });
        }
        
        // Try to download the PDF file
        try {
          console.log(`Attempting to download KID from URL: ${kidUrl}`);
          
          const response = await fetch(kidUrl);
          
          if (!response.ok) {
            console.error(`Failed to download KID: HTTP status ${response.status}`);
            throw new Error(`Failed to download KID: HTTP status ${response.status}`);
          }
          
          // Check content type
          const contentType = response.headers.get('content-type');
          console.log(`Content type of downloaded file: ${contentType}`);
          
          if (!contentType || !contentType.includes('application/pdf')) {
            if (contentType) {
              console.error(`Downloaded file is not a PDF. Content type: ${contentType}`);
            } else {
              console.error('Content type header is missing');
            }
            throw new Error('Downloaded file is not a PDF');
          }
          
          // Get file as buffer
          const pdfBuffer = Buffer.from(await response.arrayBuffer());
          console.log(`Downloaded PDF file, size: ${pdfBuffer.length} bytes`);
          
          // Salva nel database centralizzato dei KID
          const relativePath = KID_STORAGE.saveKid(isin, pdfBuffer, req.user.id);
          
          // Process the PDF
          const parsedData = await parseKidDocument(path.resolve(__dirname, '../../../', relativePath));
          
          // Prepare product data
          const productData = {
            isin: isin,
            name: parsedData.name || 'Auto-downloaded KID Product',
            category: parsedData.category,
            description: parsedData.description || 'Auto-downloaded from KID document',
            benchmark: parsedData.benchmark,
            dividend_policy: parsedData.dividend_policy,
            currency: parsedData.currency,
            sri_risk: parsedData.sri_risk ? parseInt(parsedData.sri_risk, 10) || null : null,
            entry_cost: parsedData.entry_cost,
            exit_cost: parsedData.exit_cost,
            ongoing_cost: parsedData.ongoing_cost,
            transaction_cost: parsedData.transaction_cost,
            performance_fee: parsedData.performance_fee,
            recommended_holding_period: parsedData.recommended_holding_period,
            target_market: parsedData.target_market,
            kid_file_path: relativePath,
            kid_processed: true,
            createdBy: req.user.id
          };

          // Create new product
          const [newProduct] = await db.insert(portfolioProducts)
            .values(productData)
            .returning();
          
          return res.json({
            success: true,
            exists: false,
            auto_download: true,
            message: 'Successfully downloaded and processed KID document',
            product: newProduct
          });
          
        } catch (error) {
          const downloadError = error as Error;
          console.error('Error downloading KID file:', downloadError);
          return res.json({
            success: false,
            exists: false,
            auto_download: false,
            message: `Error downloading KID: ${downloadError.message}`,
            url: kidUrl // Include the URL for debugging
          });
        }

      } catch (error) {
        const aiError = error as Error;
        console.error('Error using AI to find KID document:', aiError);
        return res.json({
          success: false,
          exists: false,
          auto_download: false,
          message: 'Error using AI to find KID document'
        });
      }

    } catch (error) {
      safeLog('Error checking ISIN', error, 'error');
      handleErrorResponse(res, error, 'Error checking ISIN');
    }
  });

  // Endpoint per cercare un prodotto tramite ISIN
  app.post('/api/portfolio/search-by-isin', isAuthenticated, async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = req.user.id;
      const { isin } = req.body;
      
      if (!isin) {
        return res.status(400).json({ 
          success: false, 
          message: 'ISIN is required' 
        });
      }
      
      console.log(`Searching for product with ISIN: ${isin}`);
      
      // 1. Cerchiamo il prodotto nel database normale
      const existingProducts = await db.select()
        .from(portfolioProducts)
        .where(eq(portfolioProducts.isin, isin));
      
      // 2. Se non esiste nel database normale, cerchiamo nel database pubblico
      if (existingProducts.length === 0) {
        console.log(`No product found in main database with ISIN ${isin}. Checking public database.`);
        
        const publicProduct = await db.select()
          .from(productsPublicDatabase)
          .where(eq(productsPublicDatabase.isin, isin));
        
        if (publicProduct.length > 0) {
          console.log(`Found product in public database with ISIN ${isin}`);
          
          // Creiamo una copia nel database principale
          const publicData = publicProduct[0];
          
          const [newProduct] = await db.insert(portfolioProducts)
            .values({
              isin: publicData.isin,
              name: publicData.name,
              category: publicData.category,
              description: publicData.description,
              benchmark: publicData.benchmark,
              dividend_policy: publicData.dividend_policy,
              currency: publicData.currency,
              sri_risk: publicData.sri_risk,
              entry_cost: publicData.entry_cost,
              exit_cost: publicData.exit_cost,
              ongoing_cost: publicData.ongoing_cost,
              transaction_cost: publicData.transaction_cost,
              performance_fee: publicData.performance_fee,
              recommended_holding_period: publicData.recommended_holding_period,
              target_market: publicData.target_market,
              kid_file_path: publicData.kid_file_path,
              kid_processed: true,
              createdBy: userId
            })
            .returning();
          
          // Aggiungiamo il prodotto all'utente
          await db.insert(userProducts)
            .values({
              userId,
              productId: newProduct.id
            });
          
          return res.json({
            success: true,
            message: `Prodotto aggiunto al tuo portafoglio dal database Gervis`,
            product: newProduct,
            source: 'public_database'
          });
        }
        
        // Se non esiste neanche nel database pubblico, proviamo con OpenAI
        console.log(`No product found with ISIN ${isin} in either database. Will search using OpenAI.`);
        
        return res.json({
          success: false,
          exists: false,
          message: `Prodotto con ISIN ${isin} non trovato. Ricerca online in corso...`,
          callOpenAI: true
        });
      }
      
      const existingProduct = existingProducts[0];
      console.log(`Found product with ID ${existingProduct.id}`);
      
      // 3. Verifichiamo se l'utente ha già aggiunto questo prodotto
      const userProductRows = await db.select()
        .from(userProducts)
        .where(and(
          eq(userProducts.userId, userId),
          eq(userProducts.productId, existingProduct.id)
        ));
      
      if (userProductRows.length > 0) {
        console.log(`Product already in user's list`);
        return res.json({
          success: true,
          exists: true,
          alreadyAdded: true,
          message: `Prodotto già presente nella tua lista`,
          product: existingProduct
        });
      }
      
      // 4. Se il prodotto non è ancora nella lista dell'utente, verifichiamo se è disponibile a tutti
      if (existingProduct.createdBy !== userId) {
        console.log(`Product not created by this user, but accessible from public database`);
      }
      
      // 5. Se siamo qui, il prodotto esiste, non è nella lista dell'utente ed è disponibile
      // Aggiungiamo il prodotto all'utente
      await db.insert(userProducts)
        .values({
          userId,
          productId: existingProduct.id
        });
      
      console.log(`Added product to user's list`);
      return res.json({
        success: true,
        message: `Prodotto aggiunto al tuo portafoglio dal database Gervis`,
        product: existingProduct
      });
      
    } catch (error) {
      console.error('Error searching product by ISIN:', error);
      return res.status(500).json({
        success: false,
        message: 'Error searching for product',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint per cercare un KID tramite OpenAI e aggiungerlo
  app.post('/api/portfolio/search-kid-online', isAuthenticated, async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = req.user.id;
      const { isin } = req.body;
      
      if (!isin) {
        return res.status(400).json({ 
          success: false, 
          message: 'ISIN is required' 
        });
      }
      
      // Verifichiamo che OpenAI sia configurato
      if (!openai.apiKey) {
        return res.status(500).json({ 
          success: false, 
          message: 'OpenAI API key not configured' 
        });
      }

      // Cerchiamo ESCLUSIVAMENTE su Borsa Italiana
      console.log(`Searching ONLY on Borsa Italiana for KID with ISIN: ${isin}`);
      console.log("Sending request to OpenAI to find KID URL on Borsa Italiana");
      
      const borsaItalianaPrompt = `
Mi dai KID per il prodotto con ISIN: ${isin} da sito borsa italiana. 
https://www.borsaitaliana.it/borsa/[tipo prodotto]/archivio-kiid.html?isin=[isin]&lang=it

verifica che non dia err 404
Rispondi in formato JSON
{
  "url": "URL diretto alla pagina del documento",
  "productType": "tipo di prodotto (ETF, ETC, certificate, ecc.) se rilevato",
  "reasonIfNotFound": "motivo se non trovato"
}
`;
      
      const borsaItalianaResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "Sei un assistente specializzato nel trovare documenti KID su Borsa Italiana. Rispondi SOLO con l'URL diretto al documento KID, o con 'NO_URL_FOUND' se non lo trovi."
          },
          { role: "user", content: borsaItalianaPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });
      
      const responseContent = borsaItalianaResponse.choices[0].message.content?.trim() || '';
      console.log(`OpenAI response for Borsa Italiana KID URL: ${responseContent}`);
      
      // Proviamo a interpretare la risposta come JSON
      let borsaItaliaKidUrl = '';
      try {
        // Verifica se la risposta è in formato JSON
        if (responseContent.startsWith('{') && responseContent.endsWith('}')) {
          const jsonResponse = JSON.parse(responseContent);
          borsaItaliaKidUrl = jsonResponse.url;
          console.log(`Extracted URL from JSON response: ${borsaItaliaKidUrl}`);
        } else {
          // Altrimenti usa la risposta così com'è (per retrocompatibilità)
          borsaItaliaKidUrl = responseContent;
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        borsaItaliaKidUrl = responseContent; // Usiamo la risposta originale
      }
      
      if (!borsaItaliaKidUrl || borsaItaliaKidUrl === "NO_URL_FOUND" || !borsaItaliaKidUrl.toLowerCase().startsWith("http")) {
        return res.json({
          success: false,
          message: 'Documento KID non trovato su Borsa Italiana',
          needManualUpload: true
        });
      }
      
      // Verifichiamo che l'URL sia effettivamente di Borsa Italiana
      try {
        const urlObj = new URL(borsaItaliaKidUrl);
        if (!urlObj.hostname.includes('borsaitaliana.it')) {
          console.error(`URL ritornato non è di Borsa Italiana: ${borsaItaliaKidUrl}`);
          return res.json({
            success: false,
            message: 'URL trovato non appartiene a Borsa Italiana',
            needManualUpload: true
          });
        }
      } catch (urlError) {
        console.error(`URL invalido ritornato: ${borsaItaliaKidUrl}`, urlError);
        return res.json({
          success: false,
          message: 'URL invalido ritornato dalla ricerca',
          needManualUpload: true
        });
      }
      
      // Se siamo qui, abbiamo trovato un URL specifico su Borsa Italiana
      console.log(`Found KID URL on Borsa Italiana: ${borsaItaliaKidUrl}`);
      
      // Procediamo con l'upload dei file KID
      try {
        const kidUploadResponse = await downloadAndProcessKid(borsaItaliaKidUrl, isin, userId, res);
        return kidUploadResponse;
      } catch (borsaError) {
        console.error('Error downloading KID from Borsa Italiana:', borsaError);
        return res.json({
          success: false,
          message: `Errore nel download del KID da Borsa Italiana: ${borsaError instanceof Error ? borsaError.message : 'Errore sconosciuto'}`,
          needManualUpload: true
        });
      }
    } catch (error) {
      console.error('Error searching KID online:', error);
      return res.status(500).json({
        success: false,
        message: 'Errore nella ricerca del KID online',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Funzione per estrarre il link più recente dalla pagina di archivio KIID di Borsa Italiana
  async function extractLatestKidFromArchivePage(archiveUrl: string): Promise<string | null> {
    console.log(`Extracting latest KID from archive page: ${archiveUrl}`);
    
    try {
      const response = await fetch(archiveUrl);
      
      if (!response.ok) {
        console.error(`Failed to fetch archive page: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const html = await response.text();
      
      // Cerchiamo tutti i link ai PDF nella pagina
      const pdfLinks = html.match(/href="(https:\/\/www\.borsaitaliana\.it\/.*?\.pdf)"/g);
      
      if (!pdfLinks || pdfLinks.length === 0) {
        console.error('No PDF links found in the archive page');
        return null;
      }
      
      // Estrai il primo link (il più recente)
      // Il formato è 'href="URL"', quindi dobbiamo estrarre l'URL
      const firstLinkMatch = pdfLinks[0].match(/href="(.*?)"/);
      if (!firstLinkMatch || firstLinkMatch.length < 2) {
        console.error('Failed to extract URL from link');
        return null;
      }
      
      const latestKidUrl = firstLinkMatch[1];
      console.log(`Latest KID URL extracted: ${latestKidUrl}`);
      return latestKidUrl;
    } catch (error) {
      console.error('Error extracting latest KID URL:', error);
      return null;
    }
  }

  // Funzione di utilità per scaricare e processare il documento KID
  async function downloadAndProcessKid(kidUrl: string, isin: string, userId: number, res: any) {
    console.log(`Attempting to download KID from URL: ${kidUrl}`);
    
    // Verifichiamo se l'URL è una pagina di archivio KIID
    if (kidUrl.includes('/archivio-kiid.html')) {
      console.log('URL is an archive page, extracting latest KID URL');
      const latestKidUrl = await extractLatestKidFromArchivePage(kidUrl);
      
      if (!latestKidUrl) {
        throw new Error('Failed to extract latest KID URL from archive page');
      }
      
      kidUrl = latestKidUrl;
      console.log(`Updated KID URL to latest document: ${kidUrl}`);
    }
    
    const fetchResponse = await fetch(kidUrl);
    
    if (!fetchResponse.ok) {
      console.error(`Failed to download KID: HTTP status ${fetchResponse.status}`);
      throw new Error(`Failed to download KID: HTTP status ${fetchResponse.status}`);
    }
    
    // Check content type
    const contentType = fetchResponse.headers.get('content-type');
    console.log(`Content type of downloaded file: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/pdf')) {
      if (contentType) {
        console.error(`Downloaded file is not a PDF. Content type: ${contentType}`);
      } else {
        console.error('Content type header is missing');
      }
      throw new Error('Downloaded file is not a PDF');
    }
    
    // Get file as buffer
    const pdfBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    console.log(`Downloaded PDF file, size: ${pdfBuffer.length} bytes`);
    
    // Salviamo SOLO nella directory dell'utente
    const userRelativePath = KID_STORAGE.saveUserKid(isin, pdfBuffer, userId);
    console.log(`KID saved to user directory: ${userRelativePath}`);
    
    // Utilizziamo direttamente il percorso utente per il processamento
    const relativePath = userRelativePath;
    
    // Process the PDF
    const parsedData = await parseKidDocument(path.resolve(__dirname, '../../../', relativePath));
    
    // Prepare product data
    const productData = {
      isin: isin,
      name: parsedData.name || 'Auto-downloaded KID Product',
      category: parsedData.category,
      description: parsedData.description || 'Auto-downloaded from KID document',
      benchmark: parsedData.benchmark,
      dividend_policy: parsedData.dividend_policy,
      currency: parsedData.currency,
      sri_risk: parsedData.sri_risk ? parseInt(parsedData.sri_risk, 10) || null : null,
      entry_cost: parsedData.entry_cost,
      exit_cost: parsedData.exit_cost,
      ongoing_cost: parsedData.ongoing_cost,
      transaction_cost: parsedData.transaction_cost,
      performance_fee: parsedData.performance_fee,
      recommended_holding_period: parsedData.recommended_holding_period,
      target_market: parsedData.target_market,
      kid_file_path: relativePath,
      kid_processed: true,
      createdBy: userId
    };

    // Create new product
    const [newProduct] = await db.insert(portfolioProducts)
      .values(productData)
      .returning();
    
    // Aggiungi alla lista dell'utente
    await db.insert(userProducts)
      .values({
        userId,
        productId: newProduct.id
      });
    
    return res.json({
      success: true,
      message: 'Documento KID scaricato e processato con successo',
      product: newProduct,
      foundOnline: true,
      source: kidUrl.includes('borsaitaliana.it') ? 'Borsa Italiana' : 'Ricerca online'
    });
  }

  // Aggiungiamo un'interfaccia più dettagliata per la risposta di OpenAI
  interface OpenAIKidSearchResponse {
    url: string;
    issuer?: string;
    productType?: string;
    reasonIfNotFound?: string;
    alternativeSources?: string;
  }

  // Add a debug endpoint for testing KID search/download (only in development)
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/portfolio/debug/find-kid/:isin', isAuthenticated, async (req, res) => {
      try {
        // Verifichiamo che l'utente sia autenticato
        if (!req.user || !req.user.id) {
          console.log('[DEBUG] User not authenticated');
          return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Nei sistemi di produzione, dovresti limitare questa funzionalità solo agli utenti admin
        const user = await db.query.users.findFirst({
          where: eq(users.id, req.user.id),
        });

        if (!user?.role || user.role !== 'admin') {
          console.log('[DEBUG] User is not an admin, access denied');
          return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Otteniamo l'ISIN dai parametri
        const { isin } = req.params;
        
        if (!isin) {
          return res.status(400).json({ success: false, message: 'ISIN is required' });
        }

        console.log(`[DEBUG] Attempting to find KID for ISIN: ${isin}`);

        if (!openai.apiKey) {
          console.log('[DEBUG] OpenAI API key not configured');
          return res.status(500).json({ success: false, message: 'OpenAI API key not configured' });
        }

        // Chiamiamo OpenAI per trovare il documento KID
        console.log('[DEBUG] Sending request to OpenAI to find KID URL');
        
        const prompt = `
Mi dai KID per il prodotto con ISIN: ${isin} da sito borsa italiana. 
https://www.borsaitaliana.it/borsa/[tipo prodotto]/archivio-kiid.html?isin=[isin]&lang=it

verifica che non dia err 404
Rispondi in formato JSON
{
  "url": "URL diretto alla pagina del documento",
  "productType": "tipo di prodotto (ETF, ETC, certificate, ecc.) se rilevato",
  "reasonIfNotFound": "motivo se non trovato"
}
`;

        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "Sei un assistente specializzato nel trovare documenti KID su Borsa Italiana. Rispondi con JSON valido contenente i risultati della tua ricerca."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
        });

        console.log('[DEBUG] Received response from OpenAI');

        let kidUrl = '';
        let openaiResponse: OpenAIKidSearchResponse = {
          url: 'NO_URL_FOUND',
          reasonIfNotFound: 'Failed to parse OpenAI response'
        };

        try {
          const content = response.choices[0].message.content;
          console.log(`[DEBUG] OpenAI raw response: ${content}`);
          
          if (content) {
            // Estraiamo la parte JSON dalla risposta
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonContent = jsonMatch[0];
              openaiResponse = JSON.parse(jsonContent) as OpenAIKidSearchResponse;
              
              if (openaiResponse.url && openaiResponse.url !== 'NO_URL_FOUND') {
                kidUrl = openaiResponse.url;
                console.log(`[DEBUG] Found KID URL: ${kidUrl}`);
              } else {
                console.log(`[DEBUG] No URL found. Reason: ${openaiResponse.reasonIfNotFound}`);
              }
            } else {
              console.log('[DEBUG] Could not extract JSON from OpenAI response');
              openaiResponse.reasonIfNotFound = 'Could not extract JSON from OpenAI response';
            }
          } else {
            console.log('[DEBUG] Empty response from OpenAI');
            openaiResponse.reasonIfNotFound = 'Empty response from OpenAI';
          }
        } catch (error) {
          const parseError = error as Error;
          console.error('[DEBUG] Error parsing OpenAI response:', parseError);
          openaiResponse.reasonIfNotFound = `Error parsing OpenAI response: ${parseError.message}`;
        }

        // Controlliamo la risposta restituita
        if (kidUrl && kidUrl !== 'NO_URL_FOUND') {
          // Validazione dell'URL
          console.log(`[DEBUG] Validating URL: ${kidUrl}`);
          try {
            // Verifichiamo che l'URL sia ben formato
            new URL(kidUrl);
            
            // Proviamo a fare un HEAD request per verificare se l'URL è accessibile
            try {
              console.log('[DEBUG] Testing URL accessibility with HEAD request');
              const headResponse = await fetch(kidUrl, { method: 'HEAD' });
              console.log(`[DEBUG] HEAD response status: ${headResponse.status}`);
              
              const contentType = headResponse.headers.get('content-type');
              console.log(`[DEBUG] Content-Type: ${contentType}`);
              
              if (!headResponse.ok) {
                openaiResponse.reasonIfNotFound = `URL returns status code ${headResponse.status}`;
              } else if (contentType && !contentType.includes('pdf')) {
                openaiResponse.reasonIfNotFound = `URL does not return a PDF (Content-Type: ${contentType})`;
              }
            } catch (fetchError) {
              const error = fetchError as Error;
              console.error('[DEBUG] Error testing URL:', error);
              openaiResponse.reasonIfNotFound = `Error testing URL: ${error.message}`;
            }
          } catch (urlError) {
            console.error('[DEBUG] Invalid URL format:', urlError);
            openaiResponse.reasonIfNotFound = 'Invalid URL format';
          }
        }

        // Restituiamo i risultati dettagliati
        return res.json({
          success: true,
          isin,
          openaiResponse,
          openAiModelUsed: "gpt-4.1-mini",
          responseTimestamp: new Date().toISOString(),
          prompt: prompt
        });

      } catch (error) {
        console.error('[DEBUG] Error in find-kid debug endpoint:', error);
        return res.status(500).json({
          success: false, 
          message: 'Error searching for KID document',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Create a portfolio using AI
  app.post('/api/portfolio/generate-with-ai', isAuthenticated, createPortfolioWithAI);

  // Get metrics for an existing portfolio
  app.get('/api/portfolio/models/:id/metrics', isAuthenticated, getPortfolioMetrics);

  // Route di test per verificare l'autenticazione
  app.get('/api/portfolio/auth-test', (req, res) => {
    console.log('AUTH TEST - Session:', req.session);
    console.log('AUTH TEST - User:', req.user);
    console.log('AUTH TEST - isAuthenticated:', typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : 'Not a function');
    
    return res.json({
      success: true,
      authenticated: !!req.user,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      sessionExists: !!req.session,
      hasIsAuthenticatedFunction: typeof req.isAuthenticated === 'function'
    });
  });

  // Endpoint di test per verifica autenticazione
  app.get('/api/portfolio/auth-status', (req, res) => {
    console.log('=== AUTH STATUS CHECK ===');
    console.log('req.user:', req.user);
    console.log('req.session:', req.session);
    console.log('req.headers.cookie:', req.headers.cookie);
    console.log('=== END AUTH STATUS ===');

    try {
      const isUserAuthenticated = !!req.user;
      const userInfo = req.user ? {
        id: req.user.id,
        email: req.user.email, 
        role: req.user.role,
        name: req.user.name
      } : null;

      return res.json({
        authenticated: isUserAuthenticated,
        user: userInfo,
        sessionExists: !!req.session,
        sessionId: req.session?.id
      });
    } catch (error) {
      console.error('Error in auth-status endpoint:', error);
      return res.status(500).json({
        error: 'Internal server error while checking authentication status'
      });
    }
  });

  console.log('[Routes] Portfolio routes registered');
} 