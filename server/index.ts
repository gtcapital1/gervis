// Caricamento esplicito delle variabili d'ambiente
import 'dotenv/config';

// In ESM, non possiamo ottenere direttamente il risultato di config(), quindi lo logghiamo in altro modo


import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { autorunCascadeFix } from "./migrations/autorun-cascade-fix";
import { autorunCreateClientLogs } from "./migrations/autorun-create-client-logs";
import { autorunCreateAiProfiles } from "./migrations/autorun-create-ai-profiles";
import { autorunCreateMeetingsTable } from "./migrations/autorun-create-meetings-table";
import { autorunAddActiveAndOnboardedAt } from "./migrations/autorun-add-active-onboardedat";
import { addEmailSettingsColumns } from "./migrations/autorun-add-email-settings";
import { autorunAddMeetingDuration } from "./migrations/autorun-add-meeting-duration";
import { autorunCreateTrendData } from "./migrations/autorun-create-trend-data";

// Importa il servizio dei trend
import { trendService } from './trends-service';

// Extend Express Request to include user property
import session from "express-session";

// Debug info per l'ambiente - rimossi i console.log

// Estendi SessionData con le nostre proprietà
declare module "express-session" {
  interface SessionData {
    onboardingComplete?: boolean;
  }
}

// La dichiarazione di Request.user è già definita in auth.ts


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
    
    
  }

  // Override del metodo json originale
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    
    // Log specifico per l'operazione di eliminazione client
    if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      
      
      
      
    }
    
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  
  // Override del metodo send originale
  const originalSend = res.send;
  res.send = function(body) {
    // Log specifico per l'operazione di eliminazione client
    if (path.startsWith("/api/clients") && path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      
      
      
      
      if (body) {
        const bodyPreview = typeof body === 'string' ? body.substring(0, 100) : 
                           (typeof body === 'object' ? JSON.stringify(body).substring(0, 100) : 
                           String(body).substring(0, 100));
        
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
        
      }
      
      // Debug autenticazione
      if (path === "/api/user") {
        
        if (req.session) {
          
          
          if (req.isAuthenticated?.()) {
            
          }
        } else {
          
        }
      }
      
      // Debug sessione per altre richieste API
      if (path.startsWith("/api/") && Math.random() < 0.1) { // Campione 10% delle richieste
        
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
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente la creazione della tabella client_logs
  try {
    await autorunCreateClientLogs(true);
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente la creazione della tabella ai_profiles
  try {
    await autorunCreateAiProfiles(true);
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente la creazione della tabella meetings
  try {
    await autorunCreateMeetingsTable(true);
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente l'aggiunta della colonna duration a meetings
  try {
    await autorunAddMeetingDuration(true);
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente l'aggiunta delle colonne active e onboarded_at
  try {
    await autorunAddActiveAndOnboardedAt();
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Esegui automaticamente l'aggiunta delle colonne per le impostazioni email
  try {
    await addEmailSettingsColumns();
    
  } catch (error) {
    
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  // Genera automaticamente i trend per tutti i consulenti all'avvio
  try {
    // Generiamo i trend in modo asincrono senza attendere il completamento
    trendService.generateTrendsForAllAdvisors()
      .then(() => console.log('Successfully generated trends for all advisors'))
      .catch(err => console.error('Error generating trends for all advisors:', err));
  } catch (error) {
    console.error('Error initiating trend generation:', error);
    // Non interrompiamo l'avvio dell'applicazione in caso di errore
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // ID univoco per l'errore per facilitare il tracciamento nei log
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Log dettagliato per tutti gli errori
    
    
    
    
    // Log stack trace quando disponibile
    if (err.stack) {
      
    }
    
    // Log extra dettagliato per gli errori in operazioni di eliminazione client
    if (req.path.startsWith("/api/clients") && req.path.match(/\/api\/clients\/\d+$/) && req.method === "DELETE") {
      
      
      
      if (req.user) {
        
      } else {
        
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
    
    await setupVite(app, server);
  } else {
    
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
