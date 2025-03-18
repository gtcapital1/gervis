/**
 * Questo script aggiunge il campo company_info alla tabella degli utenti per permettere
 * di memorizzare le informazioni societarie addizionali dell'azienda.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

async function addCompanyInfoField() {
  console.log("Iniziando la migrazione per aggiungere il campo company_info...");

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
      console.log("Campo company_info aggiunto con successo alla tabella users");
    } else {
      console.log("Il campo company_info esiste già nella tabella users");
    }

    console.log("Migrazione completata con successo");
  } catch (error) {
    console.error("Errore durante l'aggiunta del campo company_info:", error);
    throw error;
  }
}

// Esegui la migrazione
addCompanyInfoField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Errore durante la migrazione:", error);
    process.exit(1);
  });