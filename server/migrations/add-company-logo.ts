/**
 * Questo script aggiunge il campo company_logo alla tabella degli utenti per permettere
 * di memorizzare l'URL o il data URI del logo aziendale.
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function addCompanyLogoField() {
  

  try {
    // Controlla se la colonna esiste già
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'company_logo'
    `);

    // Con le nuove versioni di drizzle-orm, accediamo direttamente all'array di risultati
    if (checkResult.length === 0) {
      // Aggiungi la colonna company_logo se non esiste
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN company_logo TEXT
      `);
      
    } else {
      
    }

    
  } catch (error) {
    
    throw error;
  }
}

// Esegui la migrazione
addCompanyLogoField()
  .then(() => process.exit(0))
  .catch((error) => {
    
    process.exit(1);
  });