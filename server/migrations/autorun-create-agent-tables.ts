/**
 * Migrazione automatica per creare le tabelle per l'agente conversazionale
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { conversations, messages } from '@shared/schema';

export async function autorunCreateAgentTables(silent: boolean = false) {
  try {
    // Verifica se le tabelle esistono già
    const existingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'messages')
    `);

    // Converti il risultato in un array di nomi di tabelle
    // @ts-ignore - Ignoriamo l'errore del type checking poiché sappiamo che la struttura è corretta
    const existingTablesArray = existingTables.rows?.map((row: any) => row.table_name) || [];
    
    if (!silent) {
      console.log(`Tabelle esistenti: ${existingTablesArray.join(', ') || 'nessuna'}`);
    }

    // Crea la tabella delle conversazioni se non esiste
    if (!existingTablesArray.includes('conversations')) {
      if (!silent) console.log('Creazione tabella conversations...');
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "conversations" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "title" TEXT NOT NULL,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL,
          "metadata" TEXT
        )
      `);
      
      if (!silent) console.log('Tabella conversations creata con successo');
    } else if (!silent) {
      console.log('La tabella conversations esiste già');
    }

    // Crea la tabella dei messaggi se non esiste
    if (!existingTablesArray.includes('messages')) {
      if (!silent) console.log('Creazione tabella messages...');
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" SERIAL PRIMARY KEY,
          "conversationId" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
          "content" TEXT NOT NULL,
          "role" VARCHAR(50) NOT NULL,
          "createdAt" TIMESTAMP NOT NULL,
          "functionCalls" TEXT,
          "functionResults" TEXT
        )
      `);
      
      if (!silent) console.log('Tabella messages creata con successo');
    } else if (!silent) {
      console.log('La tabella messages esiste già');
    }

    if (!silent) console.log('Migrazione delle tabelle dell\'agente completata con successo');
    return true;
  } catch (error) {
    console.error('Errore durante la creazione delle tabelle dell\'agente:', error);
    return false;
  }
} 