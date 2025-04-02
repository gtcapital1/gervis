import { db } from '../db';
import { meetings } from '@shared/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Funzione per creare la tabella meetings nel database
 * @param silent - Se true, non mostra messaggi di log
 */
export async function autorunCreateMeetingsTable(silent = false): Promise<void> {
  try {
    if (!silent) {
      console.log("Verifying meetings table existence...");
    }
    
    // Verifica se la tabella esiste già
    const client = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'meetings'
      ) as exists
    `);
    
    const tableExists = client[0]?.exists;
    
    if (tableExists) {
      if (!silent) {
        console.log("meetings table already exists.");
      }
      return;
    }
    
    if (!silent) {
      console.log("Creating meetings table...");
    }
    
    // Crea la tabella meetings nel database
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        advisor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        title TEXT,
        location TEXT DEFAULT 'zoom',
        date_time TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    if (!silent) {
      console.log("meetings table created successfully.");
    }
    
    // Migra i dati esistenti dai meeting in memoria alla tabella del database
    if (!silent) {
      console.log("Checking for existing meetings data to migrate...");
    }
    
    if (global.meetingsData && Array.isArray(global.meetingsData)) {
      // Crea una connessione diretta al database per l'inserimento
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL non è definito');
      }
      
      // Importazione dinamica di pg
      const pg = await import('pg');
      
      const pgClient = new pg.default.Pool({
        connectionString: dbUrl
      });
      
      try {
        const client = await pgClient.connect();
        
        try {
          // Prepara la query per l'inserimento
          const query = `
            INSERT INTO meetings 
            (client_id, advisor_id, subject, title, location, date_time, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `;
          
          // Migra ogni meeting
          for (const meeting of global.meetingsData) {
            // Verifica che il client esista
            const clientExists = await client.query(
              'SELECT id FROM clients WHERE id = $1',
              [meeting.clientId]
            );
            
            if (clientExists.rows.length === 0) {
              if (!silent) {
                console.log(`Skipping meeting for non-existent client ID: ${meeting.clientId}`);
              }
              continue;
            }
            
            // Verifica che l'advisor esista
            const advisorExists = await client.query(
              'SELECT id FROM users WHERE id = $1',
              [meeting.advisorId]
            );
            
            if (advisorExists.rows.length === 0) {
              if (!silent) {
                console.log(`Skipping meeting for non-existent advisor ID: ${meeting.advisorId}`);
              }
              continue;
            }
            
            // Inserisci il meeting nel database
            await client.query(query, [
              meeting.clientId,
              meeting.advisorId,
              meeting.subject,
              meeting.title || meeting.subject, // Usa subject come default per title
              meeting.location || 'zoom',
              meeting.dateTime,
              meeting.notes || '',
              meeting.createdAt || new Date().toISOString()
            ]);
            
            if (!silent) {
              console.log(`Migrated meeting for client ID: ${meeting.clientId}`);
            }
          }
          
          if (!silent) {
            console.log("All meetings migrated successfully.");
          }
        } finally {
          client.release();
        }
      } finally {
        await pgClient.end();
      }
    } else {
      if (!silent) {
        console.log("No meetings data to migrate.");
      }
    }
    
  } catch (error) {
    if (!silent) {
      console.error("Error creating meetings table:", error);
    }
    throw error;
  }
} 