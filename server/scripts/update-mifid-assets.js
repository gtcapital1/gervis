#!/usr/bin/env node

/**
 * Script to update the 'assets' field in the MIFID table
 * This script will:
 * 1. Calculate the total value of assets for each client from the assets table
 * 2. Update the 'assets' field in the MIFID table with the total value
 * 3. Update the dashboard query to use the 'assets' field from MIFID instead of calculating from assets table
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Inizializza le variabili d'ambiente
dotenv.config();

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('Starting MIFID assets update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get all clients with MIFID data
    const { rows: clients } = await client.query(`
      SELECT c.id, m.id as mifid_id 
      FROM clients c
      LEFT JOIN mifid m ON c.id = m.client_id
      WHERE m.id IS NOT NULL
    `);
    
    console.log(`Found ${clients.length} clients with MIFID data`);
    
    // For each client, calculate total assets and update the MIFID record
    for (const client_data of clients) {
      // Calculate total assets for the client
      const { rows: assetData } = await client.query(`
        SELECT SUM(value) as total_assets
        FROM assets
        WHERE client_id = $1
      `, [client_data.id]);
      
      const totalAssets = assetData[0]?.total_assets || 0;
      
      // Get the existing assets field (should be a JSONB field)
      const { rows: mifidData } = await client.query(`
        SELECT assets
        FROM mifid
        WHERE id = $1
      `, [client_data.mifid_id]);
      
      // Update the MIFID record with the total assets value
      await client.query(`
        UPDATE mifid
        SET assets = $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ total: totalAssets }), client_data.mifid_id]);
      
      console.log(`Updated MIFID record for client ${client_data.id} with total assets: ${totalAssets}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('MIFID assets update completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error updating MIFID assets:', error);
    process.exit(1);
  } finally {
    // Release client
    client.release();
  }
}

main().catch(console.error).finally(() => {
  pool.end();
}); 