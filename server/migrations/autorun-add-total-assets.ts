/**
 * Script di migrazione automatica che aggiunge il campo total_assets
 * alla tabella clients e aggiorna i valori per tutti i clienti esistenti.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { clients, assets } from "@shared/schema";
import { eq } from "drizzle-orm/expressions";

export async function autorunAddTotalAssets(silent = false) {
  if (!silent) console.log("Starting migration to add 'total_assets' column to clients table");
  
  try {
    // Verifica se la colonna total_assets esiste già
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'total_assets'
      ) as "exists";
    `);
    
    // Verifica il formato dei risultati per debug
    if (!silent) console.log("Column exists check result:", columnExists);
    
    // Accesso sicuro al valore
    const exists = columnExists.length > 0 && 
      (columnExists[0]?.exists === true || columnExists[0]?.exists === 't' || columnExists[0]?.exists === 'true');
    
    if (exists) {
      if (!silent) console.log("Column 'total_assets' already exists");
      return true;
    }
    
    // Aggiungi la colonna total_assets alla tabella clients
    if (!silent) console.log("Adding 'total_assets' column to clients table");
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN total_assets INTEGER DEFAULT 0;
    `);
    
    if (!silent) console.log("Column 'total_assets' added to clients table");
    
    // Ottieni tutti i client IDs
    const clientsList = await db.select({ id: clients.id }).from(clients);
    
    if (!silent) console.log(`Found ${clientsList.length} clients to update`);
    
    // Debug del primo cliente se disponibile
    if (clientsList.length > 0 && !silent) {
      console.log("First client format:", clientsList[0]);
    }
    
    // Per ogni cliente, calcola il totale dei suoi asset e aggiorna il record
    let updatedCount = 0;
    for (const client of clientsList) {
      // Ottieni gli asset del cliente
      const clientAssets = await db
        .select({ value: assets.value })
        .from(assets)
        .where(eq(assets.clientId, client.id));
      
      // Debug del primo asset se disponibile
      if (clientAssets.length > 0 && updatedCount === 0 && !silent) {
        console.log("First client assets format:", clientAssets[0]);
      }
      
      // Calcola la somma totale
      const totalValue = clientAssets.reduce((sum, asset) => {
        // Assicurati che il valore sia un numero
        const assetValue = typeof asset.value === 'number' ? asset.value : 0;
        return sum + assetValue;
      }, 0);
      
      // Aggiorna il campo totalAssets del cliente
      await db
        .update(clients)
        .set({ totalAssets: totalValue })
        .where(eq(clients.id, client.id));
      
      updatedCount++;
      
      if (!silent && updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount}/${clientsList.length} clients`);
      }
    }
    
    if (!silent) console.log(`Updated total_assets for ${updatedCount} clients`);
    
    return true;
  } catch (error) {
    console.error(`Error during migration:`, error);
    return false;
  }
} 