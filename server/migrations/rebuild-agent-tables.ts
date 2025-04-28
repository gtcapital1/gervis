/**
 * Script per eliminare e ricreare le tabelle dell'agente
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm.js';
import { autorunCreateAgentTables } from './autorun-create-agent-tables.js';

async function rebuildAgentTables() {
  try {
    console.log('Inizio processo di ricostruzione delle tabelle dell\'agente...');

    // Elimina le tabelle se esistono (elimina prima 'messages' perché dipende da 'conversations')
    console.log('Eliminazione tabelle esistenti...');
    await db.execute(sql`DROP TABLE IF EXISTS "messages" CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS "conversations" CASCADE`);
    console.log('Tabelle eliminate con successo');

    // Ricrea le tabelle
    console.log('Ricreazione tabelle...');
    const success = await autorunCreateAgentTables(false); // false per stampare i log
    
    if (success) {
      console.log('Ricostruzione tabelle dell\'agente completata con successo!');
    } else {
      console.error('Errore durante la ricostruzione delle tabelle dell\'agente');
    }
  } catch (error) {
    console.error('Errore durante la ricostruzione delle tabelle dell\'agente:', error);
  } finally {
    process.exit();
  }
}

// Esegui lo script
rebuildAgentTables(); 