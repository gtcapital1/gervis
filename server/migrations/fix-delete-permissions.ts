/**
 * Questo script corregge i permessi di eliminazione nel database
 * per garantire che l'utente corrente possa eseguire DELETE sulle tabelle.
 */
import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function fixDeletePermissions() {
  try {
    
    
    // Recupera il nome utente attuale dal database
    const userResult = await db.execute(sql`SELECT current_user AS username`);
    const username = userResult[0]?.username;
    
    if (!username) {
      throw new Error("Impossibile recuperare il nome utente corrente");
    }
    
    
    
    // Concedi permessi DELETE sulle tabelle principali
    await db.execute(sql`GRANT DELETE ON clients TO ${sql.raw(username as string)}`);
    await db.execute(sql`GRANT DELETE ON assets TO ${sql.raw(username as string)}`);
    await db.execute(sql`GRANT DELETE ON recommendations TO ${sql.raw(username as string)}`);
    
    
    
    return { success: true, message: "Permessi corretti con successo" };
  } catch (error) {
    
    return { success: false, error: String(error) };
  }
}

// Esegui la funzione immediatamente
fixDeletePermissions()
  .then(result => {
    
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    
    process.exit(1);
  });

export { fixDeletePermissions };