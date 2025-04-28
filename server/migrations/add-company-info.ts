/**
 * Questo script aggiunge il campo company_info alla tabella degli utenti per permettere
 * di memorizzare le informazioni societarie addizionali dell'azienda.
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function addCompanyInfoField() {
  

  try {
    // Controlla se la colonna esiste già
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'company_info'
    `);

    // Con le nuove versioni di drizzle-orm, accediamo direttamente all'array di risultati
    if (checkResult.length === 0) {
      // Aggiungi la colonna company_info se non esiste
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN company_info TEXT
      `);
      
    } else {
      
    }

    
  } catch (error) {
    
    throw error;
  }
}

// Esegui la migrazione
addCompanyInfoField()
  .then(() => process.exit(0))
  .catch((error) => {
    
    process.exit(1);
  });