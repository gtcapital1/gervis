// Caricamento esplicito delle variabili d'ambiente
import 'dotenv/config';

// In ESM, non possiamo ottenere direttamente il risultato di config(), quindi lo logghiamo in altro modo
console.log("INFO - File .env caricato, variabili d'ambiente disponibili");

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { autorunCascadeFix } from "./migrations/autorun-cascade-fix";

// Extend Express Request to include user property
import session from "express-session";

// Debug info per l'ambiente
console.log("DEBUG INFO - Process Environment:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("HOST:", process.env.HOST);
console.log("PORT:", process.env.PORT);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("BASE_URL:", process.env.BASE_URL);
console.log("SMTP/EMAIL variables exist:", 
  !!process.env.SMTP_USER || !!process.env.EMAIL_USER,
  !!process.env.SMTP_PASS || !!process.env.EMAIL_PASSWORD);
console.log("REPLIT specific:", 
  "REPL_ID:", process.env.REPL_ID,
  "REPL_OWNER:", process.env.REPL_OWNER);

// Estendi SessionData con le nostre proprietà
declare module "express-session" {
  interface SessionData {
    onboardingComplete?: boolean;
  }
}

// La dichiarazione di Request.user è già definita in auth.ts

console.log("DEBUG - Inizializzazione Express");
const app = express();
// Aumenta il limite per il payload JSON a 10MB per supportare upload di file più grandi
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  
  // Genera un ID univoco per la richiesta
  const reqId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  // Log all'inizio della richiesta per l'eliminazione dei client
  if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
    console.log(`[DEBUG REQ ${reqId}] Inizio richiesta DELETE client: ${path}`);
    console.log(`[DEBUG REQ ${reqId}] Headers: ${JSON.stringify(req.headers)}`);
  }

  // Override del metodo json originale
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    
    // Log specifico per l'operazione di eliminazione client
    if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      console.log(`[DEBUG RES ${reqId}] Invio risposta JSON a richiesta DELETE client: ${path}`);
      console.log(`[DEBUG RES ${reqId}] Stato: ${res.statusCode}`);
      console.log(`[DEBUG RES ${reqId}] Risposta: ${JSON.stringify(bodyJson)}`);
      console.log(`[DEBUG RES ${reqId}] Content-Type: ${res.getHeader('content-type')}`);
    }
    
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  
  // Override del metodo send originale
  const originalSend = res.send;
  res.send = function(body) {
    // Log specifico per l'operazione di eliminazione client
    if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      console.log(`[DEBUG RES ${reqId}] Invio risposta SEND a richiesta DELETE client: ${path}`);
      console.log(`[DEBUG RES ${reqId}] Stato: ${res.statusCode}`);
      console.log(`[DEBUG RES ${reqId}] Content-Type: ${res.getHeader('content-type')}`);
      
      if (body) {
        const bodyPreview = typeof body === 'string' ? body.substring(0, 100) : 
                           (typeof body === 'object' ? JSON.stringify(body).substring(0, 100) : 
                           String(body).substring(0, 100));
        console.log(`[DEBUG RES ${reqId}] Preview risposta: ${bodyPreview}...`);
      }
    }
    
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80 && !path.match(/\/api\/clients\/\d+$/) && req.method !== "DELETE") {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Log di completamento per l'eliminazione client
      if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
        console.log(`[DEBUG FIN ${reqId}] Completata richiesta DELETE client: ${path} con stato ${res.statusCode} in ${duration}ms`);
      }
    }
  });

  next();
});

(async () => {
  // Esegui automaticamente il fix dei vincoli CASCADE DELETE all'avvio dell'applicazione
  // Modalità silenziosa per non intasare i log in prod
  try {
    await autorunCascadeFix(true);
    console.log("DEBUG - Fix vincoli CASCADE eseguito con successo");
  } catch (error) {
    console.error("ERRORE - Impossibile eseguire il fix vincoli CASCADE:", error);
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // ID univoco per l'errore per facilitare il tracciamento nei log
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Log dettagliato per tutti gli errori
    console.error(`[ERROR ${errorId}] Errore in ${req.method} ${req.path}:`);
    console.error(`[ERROR ${errorId}] Messaggio: ${message}`);
    console.error(`[ERROR ${errorId}] Stato: ${status}`);
    
    // Log stack trace quando disponibile
    if (err.stack) {
      console.error(`[ERROR ${errorId}] Stack trace:\n${err.stack}`);
    }
    
    // Log extra dettagliato per gli errori in operazioni di eliminazione client
    if (req.path.startsWith("/api/clients") && req.path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      console.error(`[ERROR ${errorId}] Errore critico in operazione DELETE client: ${req.path}`);
      console.error(`[ERROR ${errorId}] Headers: ${JSON.stringify(req.headers)}`);
      console.error(`[ERROR ${errorId}] Query params: ${JSON.stringify(req.query)}`);
      if (req.user) {
        console.error(`[ERROR ${errorId}] User ID: ${req.user.id}`);
      } else {
        console.error(`[ERROR ${errorId}] User non autenticato`);
      }
    }
    
    // Invio risposta JSON all'utente
    res.status(status).json({ 
      message,
      errorId,
      timestamp: new Date().toISOString(),
      path: req.path
    });
    
    // Nota: rimuoviamo il "throw err" per evitare di terminare il processo Node
    // in caso di errore gestito. Questo migliora la stabilità del server.
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Controlla se siamo in un ambiente Replit (che dovrebbe sempre usare vite in dev)
  // oppure se esplicitamente impostato come development
  if (process.env.REPL_ID || process.env.NODE_ENV !== 'production') {
    console.log("DEBUG - Utilizzando configurazione di sviluppo con Vite");
    await setupVite(app, server);
  } else {
    console.log("DEBUG - Utilizzando configurazione di produzione con servizio statico");
    serveStatic(app);
  }

  // Use the environment port if available, otherwise default to 5000
  // this serves both the API and the client
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const host = process.env.HOST || "0.0.0.0"; // Use 0.0.0.0 to allow external connections
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
