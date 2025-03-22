/**
 * Punto di ingresso principale per l'applicazione Gervis
 * Compatibile con CommonJS per il deployment AWS
 */

// Import dei moduli necessari usando CommonJS (require invece di import)
const express = require('express');
const { setupAuth } = require('./server/auth');
const { setupRoutes } = require('./server/routes');
const { setupVite, serveStatic } = require('./server/vite');
const { registerRoutes } = require('./server/routes');
const { autorunCascadeFix } = require('./server/migrations/autorun-cascade-fix');
const { autorunCreateClientLogs } = require('./server/migrations/autorun-create-client-logs');
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