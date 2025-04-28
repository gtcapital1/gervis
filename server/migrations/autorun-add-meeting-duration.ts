/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che la colonna duration esista nella tabella meetings.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { sql } from "drizzle-orm.js";
import { db } from "../db.js";

/**
 * Funzione per verificare e aggiungere la colonna duration alla tabella meetings
 * @param silent - Se true, non mostra messaggi di log
 * @returns Promise<boolean> - true se la migrazione è completata con successo, false altrimenti
 */
export async function autorunAddMeetingDuration(silent = false): Promise<boolean> {
  try {
    if (!silent) {
      console.log("Verifica se la colonna duration esiste nella tabella meetings...");
    }
    
    // Controlliamo se la colonna esiste già
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'duration'
      )
    `);
    
    if (columnExists[0] && columnExists[0].exists === true) {
      if (!silent) {
        console.log("La colonna duration esiste già nella tabella meetings.");
      }
      return true;
    }
    
    // Se siamo qui, la colonna non esiste e dobbiamo aggiungerla
    if (!silent) {
      console.log("La colonna duration non esiste, la aggiungiamo...");
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE meetings ADD COLUMN duration INTEGER DEFAULT 60
      `);
      if (!silent) {
        console.log("Colonna duration aggiunta con successo.");
      }
      
      // Aggiorniamo tutti i meeting esistenti impostando una durata di default
      await db.execute(sql`
        UPDATE meetings SET duration = 60 WHERE duration IS NULL
      `);
      if (!silent) {
        console.log("Meeting esistenti aggiornati con durata di default.");
      }
      
      return true;
    } catch (e) {
      // La colonna potrebbe essere stata aggiunta da un'altra istanza
      if (!silent) {
        console.error("Errore durante l'aggiunta della colonna duration:", e);
      }
      return false;
    }
  } catch (error) {
    if (!silent) {
      console.error("Errore durante la verifica/aggiunta della colonna duration:", error);
    }
    return false;
  }
  return false; // Return esplicito in caso di percorsi imprevisti
} 