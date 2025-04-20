/**
 * Punto di ingresso principale per l'applicazione Gervis
 * Compatibile con CommonJS per il deployment AWS
 */

// Import dei moduli necessari usando CommonJS (require invece di import)
const express = require('express');
const { setupAuth } = require('./server/auth.ts');
const { setupVite, serveStatic } = require('./server/vite.ts');
const { registerRoutes } = require('./server/routes.ts');
const { autorunCascadeFix } = require('./server/migrations/autorun-cascade-fix.ts');
const { autorunCreateClientLogs } = require('./server/migrations/autorun-create-client-logs.ts');
const { autorunCreateAgentTables } = require('./server/migrations/autorun-create-agent-tables.ts');
const { runMigration } = require('./server/migrations/autorun-add-conversation-metadata.ts');
const http = require('http');
const path = require('path');

// Configurazione dotenv per le variabili d'ambiente
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const host = process.env.HOST || 'localhost';

// Esegui migrazioni automatiche
autorunCascadeFix(true);
autorunCreateClientLogs(true);
autorunCreateAgentTables(true).then(() => {
  // After creating tables, add the metadata column
  runMigration().catch(err => console.error('Error running conversation metadata migration:', err));
}).catch(err => console.error('Error creating agent tables:', err));

// Configura autenticazione
setupAuth(app);

// Crea server HTTP
const server = http.createServer(app);

// Server API routes
async function startServer() {
  try {
    // Registra le route API
    await registerRoutes(app);

    // Configurazione Vite in modalità dev, altrimenti server file statici
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    // Aggiunta di gestori di errori per il server
    server.on('error', (error) => {
      console.error('Server startup error:', error);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        process.exit(1);
      } else if (error.code === 'ENOTSUP') {
        console.error('Unsupported socket operation. Attempting alternative binding...');
        
        // Prova il binding con localhost
        server.listen(port, 'localhost', () => {
          console.log(`Server running on http://localhost:${port}`);
        });
      }
    });

    // Avvia il server
    server.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Gestione errori globale
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Export per testing
module.exports = { app, server };