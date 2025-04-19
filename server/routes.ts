import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  clients,
  users,
  assets,
  recommendations,
  mifid,
  aiProfiles,
  clientLogs,
  meetings,
  completedTasks,
  RISK_PROFILES,
  insertClientSchema,
  ClientSegment,
  LOG_TYPES,
  insertAssetSchema,
  insertRecommendationSchema,
  signatureSessions,
  verifiedDocuments
} from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword, generateVerificationToken, getTokenExpiryTimestamp } from "./auth";
import { sendCustomEmail, sendOnboardingEmail, sendMeetingInviteEmail, sendMeetingUpdateEmail, sendVerificationPin, testSMTPConnection } from "./email";
import { getMarketIndices, getTickerData, validateTicker, getFinancialNews, getTickerSuggestions } from "./market-api";
import { getClientProfile, updateClientProfile } from "./ai/profile-controller";
import { generateInvestmentIdeas, getPromptForDebug } from './investment-ideas-controller';
import nodemailer from 'nodemailer';
import { db, sql as pgClient } from './db'; // Importa pgClient correttamente
import crypto from 'crypto';
import { eq, desc } from "drizzle-orm";
import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { trendService } from './trends-service';
import { getAdvisorSuggestions } from './ai/advisor-suggestions-controller';
import trendsRouter from './api/trends';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import cors from 'cors';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import PDFMerger from 'pdf-merger-js';

// Import routes modules
import { registerAuthRoutes } from './routes/auth.routes';
import { registerUserRoutes } from './routes/user.routes';
import { registerClientRoutes } from './routes/client.routes';
import { registerAdminRoutes } from './routes/admin.routes';

import { registerLogRoutes } from './routes/log.routes';

import { registerDocumentRoutes } from './routes/document.routes';
import { registerSignatureRoutes } from './routes/signature.routes';
import { registerMarketRoutes } from './routes/market.routes';
import { registerAiRoutes } from './routes/ai.routes';
import { registerPublicRoutes } from './routes/public.routes';
import { registerOnboardingRoutes } from './routes/onboarding.routes';

// Definire un alias temporaneo per evitare errori del linter
type e = Error;

// Aggiungi questa definizione all'inizio del file, dopo le importazioni
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth middleware
export function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Verifica se l'utente è in stato "pending"
  if (req.user?.approvalStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: "In attesa di approvazione da parte del management di Gervis",
      pendingApproval: true
    });
  }
  
  // Verifica se l'utente è in stato "rejected"
  if (req.user?.approvalStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      message: "La tua registrazione è stata rifiutata. Per favore contatta l'amministratore per maggiori informazioni.",
      rejected: true
    });
  }
  
  next();
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: Function) {
  console.log("[Admin Middleware] Verifica accesso admin");
  console.log("[Admin Middleware] isAuthenticated:", req.isAuthenticated());
  console.log("[Admin Middleware] User:", req.user ? {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    isEmailVerified: req.user.isEmailVerified,
    approvalStatus: req.user.approvalStatus
  } : 'User not available');
  
  if (!req.isAuthenticated()) {
    console.log("[Admin Middleware] Utente non autenticato");
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Check if user is admin
  console.log("[Admin Middleware] Ruolo utente:", req.user?.role);
  if (req.user?.role !== 'admin') {
    console.log("[Admin Middleware] Accesso negato - Ruolo non admin:", req.user?.role);
    return res.status(403).json({ success: false, message: 'Non sei autorizzato ad accedere a questa funzionalità' });
  }
  
  console.log("[Admin Middleware] Accesso admin consentito per:", req.user.email);
  // Se l'utente è un amministratore, procedi
  next();
}

// Landing page contact form schema
export const contactFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
  privacy: z.boolean().refine(val => val === true)
});

// Dichiariamo l'interfaccia per i meeting
export interface Meeting {
  id: number;
  clientId: number;
  advisorId: number;
  subject: string;
  title?: string;
  location?: string;
  dateTime: Date; // Modificato da string a Date per coerenza
  notes: string;
  createdAt: Date; // Modificato da string a Date per coerenza
  duration?: number;
}

// Dichiariamo un'estensione di globalThis per TypeScript
declare global {
  var meetingsData: Meeting[];
}

// Inizializza meetingsData se non esiste
if (!global.meetingsData) {
  global.meetingsData = [];
}

// Funzione di logging sicura che anonimizza i dati sensibili
export function safeLog(message: string, data?: any, level: 'info' | 'error' | 'debug' = 'info'): void {
  // In produzione, riduce la verbosità dei log
  if (process.env.NODE_ENV === 'production' && level === 'debug') {
    return;
  }

  // Funzione per sanitizzare dati sensibili in oggetti complessi
  const sanitizeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = [
      'password', 'email', 'token', 'signature', 'creditCard', 
      'taxCode', 'address', 'phoneNumber', 'phone'
    ];
    
    const newObj = Array.isArray(obj) ? [...obj] : {...obj};
    
    for (const key in newObj) {
      if (typeof newObj[key] === 'object' && newObj[key] !== null) {
        newObj[key] = sanitizeData(newObj[key]);
      } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        if (typeof newObj[key] === 'string') {
          // Mantiene solo l'inizio e la fine del valore per scopi di debug
          const val = newObj[key];
          newObj[key] = val.length > 6 
            ? `${val.substring(0, 3)}***${val.substring(val.length - 3)}`
            : '***';
        } else {
          newObj[key] = '***';
        }
      }
    }
    
    return newObj;
  };
  
  // Utilizziamo console.log/error in base al livello
  if (level === 'error') {
    if (data) {
      console.error(`[${level.toUpperCase()}] ${message}`, sanitizeData(data));
    } else {
      console.error(`[${level.toUpperCase()}] ${message}`);
    }
  } else {
    if (data) {
      console.log(`[${level.toUpperCase()}] ${message}`, sanitizeData(data));
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }
}

// Funzione per formattare le risposte di errore in modo sicuro
export function handleErrorResponse(res: Response, error: any, userMessage: string = 'Si è verificato un errore'): void {
  // Determina il tipo di errore e il codice di stato HTTP appropriato
  let statusCode = 500;
  let errorResponse: any = { success: false, message: userMessage };
  
  // Log dell'errore con informazioni complete per il debug interno
  if (error instanceof Error) {
    safeLog(`Errore dettagliato: ${error.message}`, { stack: error.stack }, 'error');
  } else {
    safeLog(`Errore non standard: ${String(error)}`, {}, 'error');
  }
  
  // Personalizza la risposta in base al tipo di errore
  if (error instanceof z.ZodError) {
    statusCode = 400;
    
    // In ambiente di sviluppo, fornisci i dettagli degli errori di validazione
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.errors = error.errors.map(e => ({
        path: e.path,
        message: e.message
      }));
    } else {
      errorResponse.message = 'Dati di input non validi';
    }
  } else if (error.name === 'UnauthorizedError' || error.message?.includes('unauthoriz')) {
    statusCode = 401;
    errorResponse.message = 'Non autorizzato';
  } else if (error.message?.includes('not found') || error.message?.includes('non trovato')) {
    statusCode = 404;
    errorResponse.message = 'Risorsa non trovata';
  }
  
  // In ambiente di sviluppo, includere un ID univoco dell'errore per facilitare il debug
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    safeLog(`Errore ID: ${errorResponse.errorId}`, {}, 'error');
  }
  
  res.status(statusCode).json(errorResponse);
}

// Middleware CSRF per proteggere le richieste POST/PUT/DELETE
export function csrfProtection(req: Request, res: Response, next: Function) {
  // Ignora per metodi sicuri (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Implementa la logica CSRF utilizzando l'header Referer/Origin
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const hostDomain = req.headers.host || '';
  
  // Verifica che l'origine della richiesta corrisponda al nostro dominio
  // Idealmente, utilizzare un token CSRF dedicato sarebbe più sicuro
  if (process.env.NODE_ENV === 'production') {
    const validOrigin = origin.includes(hostDomain) || referer.includes(hostDomain);
    if (!validOrigin) {
      safeLog('Tentativo di CSRF rilevato', { origin, referer, host: hostDomain }, 'error');
      return res.status(403).json({ success: false, message: 'Accesso negato' });
    }
  }
  
  next();
}

// Middleware di rate limiting per proteggere da attacchi brute force
const rateLimiters: Record<string, Record<string, {count: number, timestamp: number}>> = {};

export function rateLimit(options: { windowMs: number, max: number, keyGenerator?: (req: Request) => string }) {
  const { windowMs = 60000, max = 30, keyGenerator } = options;
  
  return (req: Request, res: Response, next: Function) => {
    // Identifica la rotta
    const endpoint = req.path;
    
    // Genera una chiave univoca per il client (default: IP)
    const clientKey = keyGenerator ? keyGenerator(req) : (
      req.ip || req.headers['x-forwarded-for'] || 'unknown'
    );
    
    // Inizializza la struttura dati se non esiste
    if (!rateLimiters[endpoint]) {
      rateLimiters[endpoint] = {};
    }
    
    const now = Date.now();
    
    // Elimina i record scaduti
    Object.keys(rateLimiters[endpoint]).forEach(key => {
      if (now - rateLimiters[endpoint][key].timestamp > windowMs) {
        delete rateLimiters[endpoint][key];
      }
    });
    
    // Crea un nuovo record se non esiste
    if (!rateLimiters[endpoint][clientKey as string]) {
      rateLimiters[endpoint][clientKey as string] = { count: 0, timestamp: now };
    }
    
    // Incrementa il contatore
    rateLimiters[endpoint][clientKey as string].count++;
    
    // Verifica se il limite è stato superato
    if (rateLimiters[endpoint][clientKey as string].count > max) {
      safeLog('Rate limit superato', { endpoint, clientKey }, 'debug');
      return res.status(429).json({
        success: false,
        message: 'Troppe richieste, riprova più tardi'
      });
    }
    
    next();
  };
}

// Funzione per validare e sanitizzare file caricati
export function validateFile(file: UploadedFile, options: { 
  allowedMimeTypes: string[], 
  maxSizeBytes: number 
}): { valid: boolean; error?: string } {
  const { allowedMimeTypes, maxSizeBytes } = options;
  
  // Verifica la dimensione
  if (!file || file.size === 0) {
    return { valid: false, error: 'File vuoto' };
  }
  
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File troppo grande (max: ${maxSizeBytes / (1024 * 1024)}MB)` };
  }
  
  // Verifica il MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Tipo di file non supportato. Tipi consentiti: ${allowedMimeTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
}

// Funzione per registrare tutte le rotte
export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware essenziali
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
    useTempFiles: true, // Usa file temporanei invece di caricare in memoria
    tempFileDir: '/tmp/',
    createParentPath: true,
    abortOnLimit: true,
    responseOnLimit: "Il file è troppo grande (limite: 100MB)",
    debug: false,
    parseNested: true
  }));
  
  // Configura CORS
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://gervis.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }));
  
  // Setup authentication
  setupAuth(app);
  
  // Registra il router per le API trends
  try {
    console.log('[Routes] Registrazione del router per le API trends');
    app.use('/api/trends', trendsRouter);
    console.log('[Routes] Router API trends registrato con successo');
  } catch (error) {
    console.error('[Routes] Errore durante la registrazione del router API trends:', error);
  }
  
  // Semplice rotta di test per verificare che i console.log funzionino
  app.get('/api/test-logs', (req, res) => {
    console.log('TEST LOGS - Questa è una prova per verificare che i console.log funzionino');
    res.json({ success: true, message: 'Test logs eseguito, controlla il terminale' });
  });
  
  // Registra tutti i moduli di routes
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerClientRoutes(app);
  registerAdminRoutes(app);
  registerLogRoutes(app);

  registerDocumentRoutes(app);
  registerSignatureRoutes(app);
  registerMarketRoutes(app);
  registerAiRoutes(app);
  registerPublicRoutes(app);
  registerOnboardingRoutes(app);
  
  // Create and return the server
  const server = createServer(app);
  return server;
}

// Helper function to type catch errors
export function typedCatch<T extends Error>(error: unknown): T {
  if (error instanceof Error as any) {
    return error as T;
  }
  
  // Se non è un Error, crea un nuovo Error con il messaggio convertito in stringa
  const newError = new Error(String(error)) as T;
  return newError;
}
