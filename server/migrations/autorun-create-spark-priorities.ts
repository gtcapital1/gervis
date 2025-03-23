/**
 * Script di migrazione automatica che viene eseguito all'avvio dell'applicazione
 * per garantire che la tabella spark_priorities esista.
 * Questo script viene eseguito all'avvio in modalità silenziosa.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function autorunCreateSparkPriorities(silent = false): Promise<void> {
  try {
    // Verifica se la tabella spark_priorities esiste già
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'spark_priorities'
      ) as exists;
    `);
    
    const exists = tableExists[0]?.exists === true;
    
    if (!exists) {
      if (!silent) console.log("DEBUG - La tabella spark_priorities non esiste, la creo");
      
      // Crea la tabella spark_priorities con tutti i campi necessari
      await db.execute(sql`
        CREATE TABLE "spark_priorities" (
          "id" SERIAL PRIMARY KEY,
          "client_id" INTEGER REFERENCES "clients"("id") ON DELETE CASCADE,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "priority" INTEGER NOT NULL,
          "related_news_title" TEXT,
          "related_news_url" TEXT,
          "is_new" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "last_updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "created_by" INTEGER REFERENCES "users"("id")
        );
      `);
      
      if (!silent) console.log("DEBUG - Tabella spark_priorities creata con successo");
    } else {
      if (!silent) console.log("DEBUG - La tabella spark_priorities esiste già");
    }
  } catch (error) {
    console.error("ERRORE - Errore nella creazione della tabella spark_priorities:", error);
    throw error;
  }
  
  if (!silent) console.log("DEBUG - Verifica tabella spark_priorities completata");
}