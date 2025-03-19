// Caricamento esplicito delle variabili d'ambiente
import 'dotenv/config';

// In ESM, non possiamo ottenere direttamente il risultato di config(), quindi lo logghiamo in altro modo
console.log("INFO - File .env caricato, variabili d'ambiente disponibili");

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
