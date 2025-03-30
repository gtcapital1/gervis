import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

// Carica variabili d'ambiente
dotenv.config();

/**
 * Script di migrazione che aggiunge la colonna client_segment alla tabella clients
 */
async function runMigration() {
  console.log('Avvio migrazione per aggiungere client_segment...');
  
  // Ottieni la URL del database dalle variabili d'ambiente
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.error('DATABASE_URL non impostata. La migrazione non può procedere.');
    process.exit(1);
  }
  
  try {
    // Crea un client postgres
    const migrationClient = postgres(url);
    
    // Leggi lo script SQL
    const sqlPath = join(__dirname, 'add-client-segment.sql');
    const sqlScript = readFileSync(sqlPath, 'utf-8');
    
    // Esegui la migrazione
    await migrationClient.unsafe(sqlScript);
    
    console.log('Migrazione client_segment completata con successo!');
    
    // Chiudi la connessione
    await migrationClient.end();
    process.exit(0);
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
    process.exit(1);
  }
}

// Esegui la migrazione
runMigration(); 