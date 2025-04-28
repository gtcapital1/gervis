/**
 * Questo script aggiunge i campi per gli interessi personali e la valutazione degli
 * obiettivi di investimento alla tabella clients.
 */
import postgres from "postgres";
import { log } from "../vite.js";
import * as dotenv from "dotenv";

// Carica le variabili d'ambiente
dotenv.config();

async function addPersonalInterestsFields() {
  try {
    log("Inizio migrazione per aggiungere i campi per interessi personali", "migration");
    
    // Connessione al database
    const sql = postgres(process.env.DATABASE_URL as string);
    log("Connessione al database stabilita", "migration");
    
    // Verifica se la colonna personal_interests esiste già
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'personal_interests'
    `;

    if (checkColumn.length === 0) {
      // Aggiungi colonna personal_interests come array
      await sql`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS personal_interests TEXT[]
      `;
      
      log("Colonna personal_interests aggiunta", "migration");
    } else {
      log("Colonna personal_interests già esiste", "migration");
    }

    // Verifica se la colonna personal_interests_notes esiste già
    const checkNotesColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'personal_interests_notes'
    `;

    if (checkNotesColumn.length === 0) {
      // Aggiungi colonna personal_interests_notes
      await sql`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS personal_interests_notes TEXT
      `;
      
      log("Colonna personal_interests_notes aggiunta", "migration");
    } else {
      log("Colonna personal_interests_notes già esiste", "migration");
    }

    // Verifica se le colonne per la valutazione degli obiettivi di investimento esistono già
    const checkInterestColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'retirement_interest'
    `;

    if (checkInterestColumns.length === 0) {
      // Aggiungi colonne per la valutazione degli obiettivi di investimento
      await sql`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS retirement_interest INTEGER,
        ADD COLUMN IF NOT EXISTS wealth_growth_interest INTEGER,
        ADD COLUMN IF NOT EXISTS income_generation_interest INTEGER,
        ADD COLUMN IF NOT EXISTS capital_preservation_interest INTEGER,
        ADD COLUMN IF NOT EXISTS estate_planning_interest INTEGER
      `;
      
      log("Colonne per valutazione obiettivi di investimento aggiunte", "migration");
    } else {
      log("Colonne per valutazione obiettivi di investimento già esistono", "migration");
    }

    // Chiudi la connessione
    await sql.end();
    
    log("Migrazione completata con successo!", "migration");
    return true;
  } catch (error) {
    log(`Errore durante la migrazione: ${error}`, "migration");
    throw error;
  }
}

// Esegui la migrazione
addPersonalInterestsFields()
  .then(() => {
    log("Migrazione completata", "migration");
    process.exit(0);
  })
  .catch((error) => {
    log(`Errore durante la migrazione: ${error}`, "migration");
    process.exit(1);
  });