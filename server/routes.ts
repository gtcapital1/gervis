import type { Express, Request, Response } from "express";
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
  insertRecommendationSchema
} from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword, generateVerificationToken, getTokenExpiryTimestamp } from "./auth";
import { sendCustomEmail, sendOnboardingEmail, sendMeetingInviteEmail, sendMeetingUpdateEmail, sendVerificationPin } from "./email";
import { getMarketIndices, getTickerData, validateTicker, getFinancialNews, getTickerSuggestions } from "./market-api";
import { getClientProfile, updateClientProfile } from "./ai/profile-controller";
import { generateInvestmentIdeas, getPromptForDebug } from './investment-ideas-controller';
import nodemailer from 'nodemailer';
import { db, sql as pgClient } from './db'; // Importa pgClient correttamente
import crypto from 'crypto';
import { eq } from "drizzle-orm";
import express from 'express';
import fileUpload from 'express-fileupload';
import { UploadedFile } from 'express-fileupload';
import { trendService } from './trends-service';
import { getAdvisorSuggestions } from './ai/advisor-suggestions-controller';

// Definire un alias temporaneo per evitare errori del linter
type e = Error;

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
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

// Landing page contact form schema
const contactFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
  privacy: z.boolean().refine(val => val === true)
});

// Dichiariamo l'interfaccia per i meeting
interface Meeting {
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
function safeLog(message: string, data?: any, level: 'info' | 'error' | 'debug' = 'info'): void {
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
function handleErrorResponse(res: Response, error: any, userMessage: string = 'Si è verificato un errore'): void {
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
function csrfProtection(req: Request, res: Response, next: Function) {
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

function rateLimit(options: { windowMs: number, max: number, keyGenerator?: (req: Request) => string }) {
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
function validateFile(file: UploadedFile, options: { 
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Aggiungi il middleware per gestire i file multipart
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    useTempFiles: false,
    createParentPath: true,
    abortOnLimit: true,
    responseOnLimit: "Il file è troppo grande (limite: 50MB)",
    debug: false,
    parseNested: true
  }));
  
  // Setup authentication
  setupAuth(app);
  
  // ===== User Management Routes =====
  
  // Get current user
  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
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
      
      res.json({ success: true, user: req.user });
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' });
    }
  });
  
  // Middleware to check if user is admin
  async function isAdmin(req: Request, res: Response, next: Function) {
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
  
  // ===== Admin User Management Routes =====
  
  // Get all users (admin only)
  app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ success: true, users });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: String(error) });
    }
  });
  
  // Get pending users (admin only)
  app.get('/api/admin/users/pending', isAdmin, async (req, res) => {
    try {
      const users = await storage.getPendingUsers();
      res.json({ success: true, users });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to fetch pending users', error: String(error) });
    }
  });
  
  // Approve user (admin only)
  app.post('/api/admin/users/:id/approve', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      
      const user = await storage.approveUser(userId);
      
      // TODO: Send approval notification email to user
      
      res.json({ success: true, user, message: 'Utente approvato con successo' });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to approve user', error: String(error) });
    }
  });
  
  // Reject user (admin only)
  app.post('/api/admin/users/:id/reject', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      
      const user = await storage.rejectUser(userId);
      
      // TODO: Send rejection notification email to user
      
      res.json({ success: true, user, message: 'Utente rifiutato con successo' });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to reject user', error: String(error) });
    }
  });
  
  // Delete user (admin only)
  app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (success) {
        res.json({ success: true, message: 'Utente eliminato con successo' });
      } else {
        res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to delete user', error: String(error) });
    }
  });
  
  // Get all clients for the current advisor
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const clients = await storage.getClientsByAdvisor(req.user.id);
      res.json({ success: true, clients });
    } catch (error) {
      safeLog('Errore durante il recupero dei clienti', error, 'error');
      handleErrorResponse(res, error, 'Impossibile recuperare la lista clienti');
    }
  });
  
  // Create new client
  app.post('/api/clients', 
    isAuthenticated, 
    rateLimit({ windowMs: 60000, max: 10 }), // Limita a 10 creazioni al minuto
    async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
          return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      // Validate client data
      const clientData = insertClientSchema.parse({
        ...req.body,
        advisorId: req.user.id,
        isOnboarded: false
      });
        
        // Log sicuro dei dati
        safeLog('Creazione nuovo cliente', { userId: req.user.id }, 'debug');
      
      // Create client in database
      const client = await storage.createClient(clientData);
      
      res.json({ success: true, client });
    } catch (error) {
        safeLog('Errore durante la creazione del cliente', error, 'error');
        handleErrorResponse(res, error, 'Impossibile creare il cliente');
      }
    }
  );
  
  // Get client details
  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di accesso non autorizzato ai dettagli del cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato ad accedere a questo cliente' });
      }
      
      // Get assets for this client
      const assets = await storage.getAssetsByClient(clientId);
      
      // Get recommendations for this client
      const recommendations = await storage.getRecommendationsByClient(clientId);

      // Get MIFID data for this client
      const mifid = await storage.getMifidByClient(clientId);
      
      res.json({ 
        success: true, 
        client,
        assets,
        recommendations,
        mifid
      });
    } catch (error) {
      safeLog('Errore durante il recupero dei dettagli del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile recuperare i dettagli del cliente');
    }
  });
  
  // Update client details
  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di aggiornamento non autorizzato dei dati del cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo cliente' });
      }
      
      // Update client in database
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      res.json({ 
        success: true, 
        client: updatedClient
      });
    } catch (error) {
      safeLog('Errore durante l\'aggiornamento del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile aggiornare i dati del cliente');
    }
  });
  
  // Delete client
  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di eliminazione non autorizzato del cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a eliminare questo cliente' });
      }
      
      // Delete the client
      const success = await storage.deleteClient(clientId);
      
      if (success) {
        res.json({ success: true, message: 'Cliente eliminato con successo' });
      } else {
        res.status(500).json({ success: false, message: 'Impossibile eliminare il cliente' });
      }
    } catch (error) {
      safeLog('Errore durante l\'eliminazione del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile eliminare il cliente');
    }
  });
  
  // Update user password
  app.post('/api/user/password', 
    isAuthenticated, 
    rateLimit({ windowMs: 300000, max: 5 }), // Limita a 5 tentativi ogni 5 minuti
    async (req, res) => {
    try {
      // Password change schema
      const passwordSchema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string()
      }).refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
      });
      
      const validatedData = passwordSchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(req.user?.id as number);
      if (!user) {
          return res.status(404).json({ message: 'Utente non trovato' });
      }
      
      // Verify the current password
      const isPasswordValid = await comparePasswords(validatedData.currentPassword, user.password);
      if (!isPasswordValid) {
          safeLog('Tentativo di cambio password con password errata', 
            { userId: req.user?.id }, 'error');
          return res.status(400).json({ message: 'Password attuale non corretta' });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(validatedData.newPassword);
      
      // Update the password
      await storage.updateUser(req.user?.id as number, { password: hashedPassword });
      
        safeLog('Password aggiornata con successo', { userId: req.user?.id }, 'info');
        res.json({ success: true, message: 'Password aggiornata con successo' });
    } catch (error) {
        safeLog('Errore durante l\'aggiornamento della password', error, 'error');
        handleErrorResponse(res, error, 'Impossibile aggiornare la password');
      }
    }
  );
  
  // Update user signature
  app.post('/api/user/signature', isAuthenticated, async (req, res) => {
    try {
      // Signature schema
      const signatureSchema = z.object({
        signature: z.string()
      });
      
      const validatedData = signatureSchema.parse(req.body);
      
      // Update the signature
      await storage.updateUser(req.user?.id as number, { signature: validatedData.signature });
      
      res.json({ success: true, message: 'Signature updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        
        res.status(500).json({ message: 'Failed to update signature' });
      }
    }
  });
  
  // Update company logo
  app.post('/api/users/:userId/company-logo', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure the user is only updating their own logo
      if (userId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to update this account' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Logo schema
      const logoSchema = z.object({
        companyLogo: z.string()
      });
      
      const validatedData = logoSchema.parse(req.body);
      
      // Check logo size (roughly - assuming base64 encoding is ~4/3 the size of binary)
      const base64Data = validatedData.companyLogo.split(',')[1] || validatedData.companyLogo;
      const estimatedSizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      
      // 2MB limit
      if (estimatedSizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ 
          message: 'Logo file is too large. Maximum size is 2MB.' 
        });
      }
      
      // Update the user's company logo
      await storage.updateUser(userId, {
        companyLogo: validatedData.companyLogo
      });
      
      res.json({ 
        success: true,
        message: 'Company logo updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        
        res.status(500).json({ message: 'Failed to update company logo' });
      }
    }
  });
  
  // Delete company logo
  app.delete('/api/users/:userId/company-logo', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure the user is only deleting their own logo
      if (userId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to update this account' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update the user to remove the company logo
      await storage.updateUser(userId, {
        companyLogo: null
      });
      
      res.json({ 
        success: true,
        message: 'Company logo deleted successfully'
      });
    } catch (error) {
      
      res.status(500).json({ message: 'Failed to delete company logo' });
    }
  });
  
  // Update company information
  app.post('/api/users/:userId/company-info', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure the user is only updating their own info
      if (userId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to update this account' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Company info schema
      const companyInfoSchema = z.object({
        companyInfo: z.string().max(1000, "Le informazioni societarie devono essere inferiori a 1000 caratteri")
      });
      
      const validatedData = companyInfoSchema.parse(req.body);
      
      // Update the user's company info
      await storage.updateUser(userId, {
        companyInfo: validatedData.companyInfo
      });
      
      res.json({ 
        success: true,
        message: 'Company information updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        
        res.status(500).json({ message: 'Failed to update company information' });
      }
    }
  });
  
  // Send email with PDF
  // Verify email
  app.get('/api/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Token non valido" 
        });
      }

      // Get user by verification token
      const user = await storage.getUserByField('verificationToken', token);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Token non valido o scaduto" 
        });
      }

      // Check if token is expired
      if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < new Date()) {
        return res.status(400).json({ 
          success: false, 
          message: "Il token di verifica è scaduto. Si prega di richiedere un nuovo token." 
        });
      }

      // Update user to mark email as verified
      await storage.updateUser(user.id, {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      });

      // Redirect to login page with success parameter
      return res.redirect('/?verificationSuccess=true');
    } catch (error) {
      
      return res.status(500).json({ 
        success: false, 
        message: "Errore durante la verifica dell'email" 
      });
    }
  });

  // Resend verification email
  app.post('/api/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email richiesta" 
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Utente non trovato" 
        });
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        return res.status(400).json({ 
          success: false, 
          message: "L'email è già stata verificata" 
        });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires = getTokenExpiryTimestamp();

      // Update user with new token
      await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpires
      });

      // Generate verification URL
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verificationUrl = `${baseUrl}/api/verify-email?token=${verificationToken}`;
      
      // Send verification email
      await sendVerificationPin(
        user.email,
        user.name || `${user.firstName} ${user.lastName}`,
        verificationUrl,
        'italian'
      );

      res.json({ 
        success: true, 
        message: "Email di verifica inviata con successo" 
      });
    } catch (error) {
      
      res.status(500).json({ 
        success: false, 
        message: "Errore durante l'invio dell'email di verifica" 
      });
    }
  });

  // Generate onboarding token and link for client
  app.post('/api/clients/:id/onboarding-token', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { language = 'italian', customMessage, customSubject, sendEmail = false } = req.body;
      
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to generate token for this client' });
      }
      
      if (!client.email) {
        return res.status(400).json({ success: false, message: "Client has no email address" });
      }
      
      // Generate the onboarding token
      // IMPORTANTE: Passiamo anche il customSubject alla funzione generateOnboardingToken
      // in modo che venga loggato anche lì per debug
      const token = await storage.generateOnboardingToken(
        clientId,
        language as 'english' | 'italian',
        customMessage,
        req.user.email,
        customSubject // Aggiungiamo il parametro customSubject
      );
      
      // Generate a link from the token
      const baseUrl = process.env.BASE_URL || `https://workspace.gianmarcotrapasso.replit.app`;
      const link = `${baseUrl}/onboarding?token=${token}`;
      
      // Invia l'email solo se il flag sendEmail è true
      // Nota: customMessage può essere undefined, in tal caso verrà usato il messaggio predefinito
      let emailSent = false; // Traccia se l'email è stata effettivamente inviata con successo
      
      if (sendEmail) {
        // Get advisor information
        const advisor = await storage.getUser(req.user.id);
        
        // Get client name parts
        const firstName = client.firstName || client.name.split(' ')[0];
        const lastName = client.lastName || client.name.split(' ').slice(1).join(' ');
        
        // Debug per l'oggetto email
        
        
        
        try {
          // Send the onboarding email
          await sendOnboardingEmail(
            client.email,
            firstName,
            lastName,
            link,
            language as 'english' | 'italian',
            customMessage,
            advisor?.signature || undefined,
            advisor?.email,
            customSubject,
            client.id,        // ID del cliente per il log
            req.user?.id,     // ID dell'advisor che ha richiesto l'invio
            true              // Registra l'email nei log
          );
          // Se arriviamo qui, l'email è stata inviata con successo
          emailSent = true;
          
          
          // Log dettagliati anche in caso di successo
          
          
          
          
          
          
          
        } catch (emailError: any) {
          
          
          // Estrazione dettagli errore più specifici
          const errorDetails = {
            message: emailError.message || "Errore sconosciuto",
            code: emailError.code || "UNKNOWN_ERROR",
            command: emailError.command || null,
            response: emailError.response || null,
            responseCode: emailError.responseCode || null
          };
          
          
          
          // Restituiamo un errore al client con dettagli più specifici
          return res.status(500).json({ 
            success: false, 
            message: "Errore nell'invio dell'email di onboarding", 
            error: String(emailError),
            errorDetails,
            token, // Restituiamo comunque il token in modo che il frontend possa decidere cosa fare
            link,
            emailSent: false
          });
        }
      }
      
      // Log aggiuntivi per debug
      
      
      
      
      
      
      
      
      res.json({ 
        success: true, 
        token,
        link,
        language,
        emailSent: emailSent,  // Ora questo riflette lo stato EFFETTIVO dell'invio, non la richiesta
        debug: {
          customSubject: customSubject || "(non specificato)",
          customSubjectProvided: !!customSubject,
          customSubjectLength: customSubject ? customSubject.length : 0
        }
      });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to generate onboarding token', error: String(error) });
    }
  });
  
  app.post('/api/clients/:id/send-email', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { subject, message, language = 'english', includeAttachment = true } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ success: false, message: "Subject and message are required" });
      }
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: "Client not found" });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to send email to this client' });
      }
      
      if (!client.email) {
        return res.status(400).json({ success: false, message: "Client has no email address" });
      }
      
      // Get the advisor (for signature)
      const advisor = await storage.getUser(req.user?.id as number);
      
      // Registriamo i dettagli della richiesta email
      
      
      
      
      
      try {
        // Send email and log it automatically
        await sendCustomEmail(
          client.email,
          subject,
          message,
          language as 'english' | 'italian',
          undefined,
          advisor?.signature || undefined,
          advisor?.email,  // CC all'advisor
          client.id,       // ID del cliente per il log
          req.user?.id,    // ID dell'advisor che ha inviato l'email
          true             // Registra l'email nei log
        );
        
        
        
        // Log dettagliati anche in caso di successo
        
        
        
        
        
        
        res.json({ success: true, message: "Email sent successfully" });
      } catch (emailError: any) {
        // Log dettagliato dell'errore
        
        
        // Estrazione dettagli errore più specifici
        const errorDetails = {
          message: emailError.message || "Errore sconosciuto",
          code: emailError.code || "UNKNOWN_ERROR",
          command: emailError.command || null,
          response: emailError.response || null,
          responseCode: emailError.responseCode || null,
          stack: emailError.stack || "No stack trace available"
        };
        
        
        
        // Inviamo i dettagli dell'errore al frontend
        res.status(500).json({ 
          success: false, 
          message: "Failed to send email", 
          error: String(emailError),
          errorDetails
        });
      }
    } catch (error) {
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to process email request", 
        error: String(error) 
      });
    }
  });
  
  // Get client data by onboarding token (supports both route param and query param)
  app.get('/api/onboarding/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token is required" 
        });
      }
      
      // Get client by onboarding token
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      // Return minimal client info
      res.json({
        id: client.id,
        name: client.name,
        email: client.email,
        isOnboarded: client.isOnboarded
      });
    } catch (error) {
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch client data" 
      });
    }
  });
  
  // Get client data by onboarding token using query parameter
  app.get('/api/onboarding', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token is required" 
        });
      }
      
      // Get client by onboarding token
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      // Return minimal client info
      res.json({
        id: client.id,
        name: client.name,
        email: client.email,
        isOnboarded: client.isOnboarded
      });
    } catch (error) {
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch client data" 
      });
    }
  });
  
  // Complete client onboarding with route param
  app.post('/api/onboarding/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token is required" 
        });
      }
      
      // Get client by onboarding token
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      // Validate the request body against the schema
      const { 
        assets,
        ...clientData
      } = req.body;
      
      // Calcola il client_segment basato sul total_assets
      let clientSegment = undefined;
      let netWorth = 0;
      
      // Calcola il netWorth dai dati degli asset
      if (assets && Array.isArray(assets)) {
        const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
        const totalDebts = req.body.debts || 0;
        netWorth = totalAssets - totalDebts;
        
        // Determina il segmento cliente basato sul patrimonio netto
        if (netWorth < 100000) {
          clientSegment = 'mass_market' as ClientSegment;
        } else if (netWorth >= 100000 && netWorth < 500000) {
          clientSegment = 'affluent' as ClientSegment;
        } else if (netWorth >= 500000 && netWorth < 2000000) {
          clientSegment = 'hnw' as ClientSegment;
        } else if (netWorth >= 2000000 && netWorth < 10000000) {
          clientSegment = 'vhnw' as ClientSegment;
        } else if (netWorth >= 10000000) {
          clientSegment = 'uhnw' as ClientSegment;
        }
      }
      
      // Imposta la data corrente per onboarded_at e activated_at
      const currentDate = new Date();
      
      // Update client with onboarding data
      const updatedClient = await storage.updateClient(client.id, {
        isOnboarded: true,
        onboardedAt: currentDate,
        activatedAt: null, // Rimuovere la data di attivazione
        active: false, // Cambiato da true a false
        clientSegment,
        netWorth
      });
      
      
      
      // Add assets if provided
      if (assets && Array.isArray(assets)) {
        for (const asset of assets) {
          await storage.createAsset({
            ...asset,
            clientId: client.id
          });
        }
      }
      
      res.json({ 
        success: true, 
        message: "Onboarding completed successfully",
        client: updatedClient
      });
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid onboarding data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to complete onboarding process" 
        });
      }
    }
  });
  
  // Complete client onboarding with query parameter
  app.post('/api/onboarding', async (req, res) => {
    try {
      
      
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token is required" 
        });
      }
      
      
      
      // Get client by onboarding token
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      
      
      // Validate the request body against the schema
      const { 
        assets,
        ...mifidData
      } = req.body;
      
      
      
      try {
        // Save MIFID data
        const savedMifid = await db.insert(mifid).values({
          clientId: client.id,
          ...mifidData,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        
      } catch (mifidError) {
        
        return res.status(500).json({
          success: false,
          message: "Failed to save MIFID data",
          error: mifidError instanceof Error ? mifidError.message : "Unknown error"
        });
      }
      
      // Calcola il client_segment basato sul total_assets
      let clientSegment = undefined;
      let netWorth = 0;
      
      // Calcola il netWorth dai dati degli asset
      if (assets && Array.isArray(assets)) {
        const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
        const totalDebts = mifidData.debts || 0;
        netWorth = totalAssets - totalDebts;
        
        // Determina il segmento cliente basato sul patrimonio netto
        if (netWorth < 100000) {
          clientSegment = 'mass_market' as ClientSegment;
        } else if (netWorth >= 100000 && netWorth < 500000) {
          clientSegment = 'affluent' as ClientSegment;
        } else if (netWorth >= 500000 && netWorth < 2000000) {
          clientSegment = 'hnw' as ClientSegment;
        } else if (netWorth >= 2000000 && netWorth < 10000000) {
          clientSegment = 'vhnw' as ClientSegment;
        } else if (netWorth >= 10000000) {
          clientSegment = 'uhnw' as ClientSegment;
        }
      }
      
      // Imposta la data corrente per onboarded_at e activated_at
      const currentDate = new Date();
      
      // Update client with onboarding data
      const updatedClient = await storage.updateClient(client.id, {
        isOnboarded: true,
        onboardedAt: currentDate,
        activatedAt: null, // Rimuovere la data di attivazione
        active: false, // Cambiato da true a false
        clientSegment,
        netWorth
      });
      
      // Add assets if provided
      if (assets && Array.isArray(assets)) {
        for (const asset of assets) {
          await storage.createAsset({
            ...asset,
            clientId: client.id
          });
        }
        
      }
      
      res.json({ 
        success: true, 
        message: "Onboarding completed successfully",
        client: updatedClient
      });
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid onboarding data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to complete onboarding process",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Archive client
  app.post('/api/clients/:id/archive', isAuthenticated, async (req, res) => {
    try {
      
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid client ID" 
        });
      }
      
      // Verifica se il cliente esiste
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Client not found" 
        });
      }
      
      // Verifica che il consulente possa archiviare questo cliente
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ 
          success: false, 
          message: "Not authorized to archive this client" 
        });
      }
      
      
      const archivedClient = await storage.archiveClient(clientId);
      
      res.json({
        success: true,
        message: "Client archived successfully",
        client: archivedClient
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to archive client",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Restore client from archive
  app.post('/api/clients/:id/restore', isAuthenticated, async (req, res) => {
    try {
      
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid client ID" 
        });
      }
      
      // Verifica se il cliente esiste
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Client not found" 
        });
      }
      
      // Verifica che il consulente possa ripristinare questo cliente
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ 
          success: false, 
          message: "Not authorized to restore this client" 
        });
      }
      
      
      const restoredClient = await storage.restoreClient(clientId);
      
      res.json({
        success: true,
        message: "Client restored successfully",
        client: restoredClient
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to restore client",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API per i Log dei Clienti
  app.get("/api/client-logs/all", isAuthenticated, async (req, res) => {
    try {
      // Ottieni tutti i clienti dell'utente
      const clients = await storage.getClientsByAdvisor(req.user?.id as number);
      const clientIds = clients.map(client => client.id);
      
      // Ottieni tutti i log per questi clienti
      const allLogs: any[] = [];
      for (const clientId of clientIds) {
        const logs = await storage.getClientLogs(clientId);
        allLogs.push(...logs);
      }
      
      res.json({
        success: true,
        logs: allLogs
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to retrieve all client logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/client-logs/:clientId", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID format"
        });
      }

      // Verifica che l'utente abbia accesso a questo cliente
      if (req.user?.role !== 'admin') {
        const clients = await storage.getClientsByAdvisor(req.user?.id as number);
        const hasAccess = clients.some(client => client.id === clientId);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to this client's logs"
          });
        }
      }

      
      const logs = await storage.getClientLogs(clientId);
      
      res.json({
        success: true,
        logs
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to retrieve client logs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/client-logs", isAuthenticated, async (req, res) => {
    try {
      const { clientId, type, title, content, logDate } = req.body;
      
      if (!clientId || !type || !title || !content) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      // Verifica che l'utente abbia accesso a questo cliente
      if (req.user?.role !== 'admin') {
        const clients = await storage.getClientsByAdvisor(req.user?.id as number);
        const hasAccess = clients.some(client => client.id === clientId);
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to add logs for this client"
          });
        }
      }

      
      
      
      
      // Elaborazione esplicita della data
      let logDateTime: Date;
      if (logDate) {
        try {
          logDateTime = new Date(logDate);
          
          // Verifica che la data sia valida
          if (isNaN(logDateTime.getTime())) {

            return res.status(400).json({
              success: false,
              message: "La data fornita non è valida. Formato richiesto: ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)"
            });
          } else {
            
          }
        } catch (e) {
          
          return res.status(400).json({
            success: false,
            message: "Errore nella conversione della data. Usa il formato ISO 8601."
          });
        }
      } else {
        // Default a 10:00 di oggi se nessuna data fornita
        logDateTime = new Date();
        logDateTime.setHours(10, 0, 0, 0);
        
      }
      
      const logData = {
        clientId,
        type,
        title,
        content,
        logDate: logDateTime,
        createdBy: req.user?.id
      };

      const newLog = await storage.createClientLog(logData);
      
      res.json({
        success: true,
        message: "Log created successfully",
        log: newLog
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to create client log",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/client-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid log ID format"
        });
      }

      const { type, title, content, logDate } = req.body;
      
      if (!type && !title && !content && !logDate) {
        return res.status(400).json({
          success: false,
          message: "No fields to update"
        });
      }

      
      
      // Elaborazione della data, se fornita
      let logDateTime: Date | undefined;
      if (logDate) {
        try {
          logDateTime = new Date(logDate);
          // Verifica che la data sia valida
          if (isNaN(logDateTime.getTime())) {

            logDateTime = undefined;
          } else {
            
          }
        } catch (e) {
          
          logDateTime = undefined;
        }
      }
      
      const updateData: any = {
        type,
        title,
        content
      };
      
      // Aggiungi la data solo se valida
      if (logDateTime) {
        updateData.logDate = logDateTime;
      }
      
      const updatedLog = await storage.updateClientLog(logId, updateData);
      
      res.json({
        success: true,
        message: "Log updated successfully",
        log: updatedLog
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to update client log",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/client-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid log ID format"
        });
      }

      
      
      const deleted = await storage.deleteClientLog(logId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Log not found or already deleted"
        });
      }
      
      res.json({
        success: true,
        message: "Log deleted successfully"
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: "Failed to delete client log",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== Market Data API Routes =====
  
  // Get market indices
  app.get('/api/market/indices', getMarketIndices);
  
  // Get financial news
  app.get('/api/market/news', getFinancialNews);
  
  // Get data for specific ticker symbols
  app.get('/api/market/tickers', (req, res) => {
    // Estrai i simboli dalla query string
    const symbols = req.query.symbols ? (req.query.symbols as string).split(',') : [];
    
    if (!symbols.length) {
      return res.status(400).json({ error: "Symbols parameter is required" });
    }
    
    // Trasforma la lista di simboli in parametri di query e chiama l'API
    req.query.symbols = symbols.join(',');
    getTickerData(req, res);
  });
  
  // Get ticker suggestions for autocomplete
  app.get('/api/market/ticker-suggestions', getTickerSuggestions);
  
  // Validate ticker symbol
  app.post('/api/market/validate-ticker', validateTicker);

  // ===== Trend Data API Routes =====
  
  // Get trend data for an advisor
  app.get('/api/trends/:advisorId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const advisorId = parseInt(req.params.advisorId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Utente non autenticato' });
      }

      // Verifica che l'utente abbia accesso ai dati del consulente
      if (userId !== advisorId && !req.user?.isAdmin) {
        return res.status(403).json({ error: 'Non autorizzato ad accedere a questi dati' });
      }

      console.log(`Fetching trend data for advisor ${advisorId}`);
      
      // Genera i trend per assicurarsi che i dati siano aggiornati
      await trendService.generateAndSaveTrendsForAdvisor(advisorId);
      
      // Ottieni i dati di trend per il consulente
      const trendData = await trendService.getTrendDataForAdvisor(advisorId);
      
      console.log('Formatted trend data:', trendData);
      
      res.json({
        success: true,
        data: trendData
      });
    } catch (error) {
      console.error('Error fetching trend data:', error);
      res.status(500).json({ error: 'Errore nel recupero dei dati di trend' });
    }
  });

  // ===== AI API Routes =====
  
  // Get AI-generated client profile
  app.get('/api/ai/client-profile/:clientId', isAuthenticated, getClientProfile);
  app.post('/api/ai/client-profile/:clientId', isAuthenticated, updateClientProfile);
  app.get('/api/ai/advisor-suggestions', isAuthenticated, getAdvisorSuggestions);

  // ===== Spark API Routes =====

    // Generate investment ideas (new API)
    app.post('/api/ideas/generate', isAuthenticated, generateInvestmentIdeas);
  
    // Debug endpoint per vedere il prompt generato
    app.get('/api/ideas/prompt-debug', isAuthenticated, getPromptForDebug);
  
  // ===== Dashboard API Routes =====
  
  // Get portfolio overview data
  app.get('/api/portfolio/overview', isAuthenticated, async (req, res) => {
    try {
      // Ottieni i client dell'advisor corrente
      const clients = await storage.getClientsByAdvisor(req.user?.id as number);
      const activeClients = clients.filter(client => !client.isArchived);
      
      // Ottieni gli asset di ciascun cliente
      const clientIds = activeClients.map(client => client.id);
      const allAssets = [];
      
      for (const clientId of clientIds) {
        const assets = await storage.getAssetsByClient(clientId);
        allAssets.push(...assets);
      }
      
      // Calcola l'AUM (Assets Under Management) totale
      const totalAUM = allAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);
      
      // Calcola la data di un mese fa
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      // Separa gli asset recenti (ultimi 30 giorni) da quelli precedenti
      const recentAssets = allAssets.filter(asset => {
        // Assicuriamoci che createdAt sia una data valida
        const createdAt = asset.createdAt ? new Date(asset.createdAt) : null;
        return createdAt && createdAt >= oneMonthAgo;
      });
      
      const olderAssets = allAssets.filter(asset => {
        // Assicuriamoci che createdAt sia una data valida
        const createdAt = asset.createdAt ? new Date(asset.createdAt) : null;
        return createdAt && createdAt < oneMonthAgo;
      });
      
      // Calcola l'AUM di un mese fa
      const previousMonthAUM = olderAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);
      
      // Calcola la variazione
      const aumChange = totalAUM - previousMonthAUM;
      const aumChangePercent = previousMonthAUM > 0 ? (aumChange / previousMonthAUM) * 100 : 0;
      
      // Calcola la distribuzione degli asset per categoria
      const assetDistribution = allAssets.reduce((acc, asset) => {
        const category = asset.category || 'Other';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += (asset.value || 0);
        return acc;
      }, {} as Record<string, number>);
      
      // Converti in array e calcola le percentuali
      const assetAllocation = Object.entries(assetDistribution).map(([category, value]) => ({
        category,
        value,
        percentage: totalAUM > 0 ? (value / totalAUM) * 100 : 0
      }));
      
      // Se non ci sono asset, fornisci dati simulati
      if (assetAllocation.length === 0) {
        assetAllocation.push(
          { category: "Equities", percentage: 45, value: totalAUM * 0.45 },
          { category: "Bonds", percentage: 30, value: totalAUM * 0.30 },
          { category: "ETFs", percentage: 15, value: totalAUM * 0.15 },
          { category: "Cash", percentage: 10, value: totalAUM * 0.10 }
        );
      }
      
      // Simula dati di performance non disponibili direttamente nel database
      const performanceLastMonth = aumChangePercent > 0 ? Math.min(aumChangePercent, 5) : Math.max(aumChangePercent, -3);
      const performanceYTD = aumChangePercent > 0 ? performanceLastMonth * 2.5 : performanceLastMonth * 1.5;
      
      // Calcola l'average portfolio size
      const averagePortfolioSize = activeClients.length > 0 ? totalAUM / activeClients.length : 0;
      
      // Per i ricavi, utilizziamo ancora simulazione poiché non abbiamo dati reali
      const annualFeeRate = 0.01; // 1% commissione annuale
      const revenueYTD = totalAUM * annualFeeRate * 0.5; // Metà anno
      const revenueLastYear = revenueYTD * 0.9; // Assumiamo una crescita del 10% rispetto all'anno scorso
      const revenueChangePercent = revenueYTD > 0 ? ((revenueYTD - revenueLastYear) / revenueLastYear) * 100 : 0;
      
      // Costruisci l'oggetto di risposta
      const portfolioData = {
        totalAUM,
        aumChange,
        aumChangePercent,
        averagePortfolioSize,
        revenueYTD,
        revenueLastYear,
        revenueChangePercent,
        performanceLastMonth,
        performanceYTD,
        assetAllocation
      };
      
      res.json(portfolioData);
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to fetch portfolio data' });
    }
  });
  
  // Get today's tasks
  app.get('/api/tasks/today', isAuthenticated, async (req, res) => {
    try {
      // Get all clients for this advisor
      const advisorId = req.user?.id as number;
      const clients = await storage.getClientsByAdvisor(advisorId);
      
      // Array per contenere le attività reali di oggi
      const tasks = [];
      
      // Ottieni i meeting di oggi per usarli come attività
      const meetings = await storage.getMeetingsByAdvisor(advisorId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // NOTA: Temporaneamente usiamo un array vuoto finché la tabella non viene creata
      const completedTaskIds = new Set();
      
      /*
      // Ottieni le attività completate - COMMENTATO FINCHÉ LA TABELLA NON VIENE CREATA
      try {
        const completedTasks = await storage.getCompletedTasks(advisorId, today);
        const completedTaskIds = new Set(completedTasks.map(task => task.taskId));
      } catch (err) {
        
        const completedTaskIds = new Set();
      }
      */
      
      // Filtra i meeting che avvengono oggi
      const todayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.dateTime);
        return meetingDate >= today && meetingDate < tomorrow;
      });
      
      // Aggiungi meeting alle attività
      for (const meeting of todayMeetings) {
        const client = clients.find(c => c.id === meeting.clientId);
        if (client) {
          tasks.push({
            id: meeting.id,
            title: `Meeting: ${meeting.title || meeting.subject}`,
            dueDate: new Date(meeting.dateTime).toISOString(),
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            completed: completedTaskIds.has(meeting.id)
          });
        }
      }
      
      // Per ora tutte le attività vanno nei pending
      const completedTasksList: any[] = [];
      const pendingTasks = tasks;
      
      res.json({ 
        tasks: { 
          completed: completedTasksList,
          pending: pendingTasks
        }
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });
  
  // Mark task as completed
  app.post('/api/tasks/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const advisorId = req.user?.id as number;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'ID attività non valido' });
      }
      
      // Memorizza l'attività come completata
      await storage.markTaskAsCompleted(taskId, advisorId);
      
      res.json({ 
        success: true, 
        message: 'Attività segnata come completata'
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to mark task as completed' });
    }
  });
  
  // Mark task as pending (uncomplete a task)
  app.post('/api/tasks/:id/uncomplete', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const advisorId = req.user?.id as number;
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'ID attività non valido' });
      }
      
      // Rimuove il segno di completamento dall'attività
      await storage.markTaskAsUncompleted(taskId, advisorId);
      
      res.json({ 
        success: true, 
        message: 'Attività segnata come da completare'
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to mark task as uncompleted' });
    }
  });
  
  // Get today's agenda
  app.get('/api/agenda/today', isAuthenticated, async (req, res) => {
    try {
      // Get advisor ID
      const advisorId = req.user?.id as number;
      if (!advisorId) {
        return res.status(401).json({ error: 'Utente non autenticato' });
      }
      
      // Ottieni tutti i meeting dell'advisor
      const meetings = await storage.getMeetingsByAdvisor(advisorId);
      
      
      
      
      // Get all clients for this advisor
      const clients = await storage.getClientsByAdvisor(advisorId);
      
      // Mappa i meeting nel formato richiesto dal frontend
      const events = [];
      
      for (const meeting of meetings) {
        // Trova il cliente associato a questo meeting
        const client = clients.find(c => c.id === meeting.clientId);
        if (!client) {
          
          continue;
        }
        
        // Converti dateTime in Date se è una stringa
        const meetingDate = new Date(meeting.dateTime);
        
        
        
        
        // Estrai solo il tempo per startTime e endTime
        const startHour = meetingDate.getHours().toString().padStart(2, '0');
        const startMinute = meetingDate.getMinutes().toString().padStart(2, '0');
        const startTime = `${startHour}:${startMinute}`;
        
        // Calcola l'ora di fine
        const duration = meeting.duration || 60; // durata in minuti
        const endDate = new Date(meetingDate.getTime() + (duration * 60 * 1000));
        const endHour = endDate.getHours().toString().padStart(2, '0');
        const endMinute = endDate.getMinutes().toString().padStart(2, '0');
        const endTime = `${endHour}:${endMinute}`;
        
        // Formatta la data in YYYY-MM-DD
        const dateStr = meetingDate.toISOString().split('T')[0];
        
        
        
        events.push({
          id: meeting.id,
          title: meeting.title || meeting.subject,
          type: "meeting",
          startTime,
          endTime,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          location: meeting.location || "zoom",
          date: dateStr
        });
      }
      
      
      res.json({ events });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to fetch agenda' });
    }
  });
  
  // Trova la route per creare un meeting POST /api/meetings
  app.post('/api/meetings', isAuthenticated, async (req, res) => {

    try {
      // Extract meeting data from request
      const { clientId, subject, title, location, dateTime, notes, duration, sendEmail } = req.body;
      

      
      // Validate required data
      if (!clientId || !subject || !dateTime) {

        return res.status(400).json({ error: 'Meeting details incomplete' });
      }
      
      // Verifica che dateTime sia una stringa ISO valida e lo converte in un oggetto Date
      let meetingDate;
      try {
        // Se è già un oggetto Date (improbabile ma possibile), lo usiamo direttamente
        meetingDate = typeof dateTime === 'object' && dateTime instanceof Date 
          ? dateTime 
          : new Date(dateTime);
        
        if (isNaN(meetingDate.getTime())) {
          throw new Error('Invalid date');
        }
        
      } catch (e) {
        
        return res.status(400).json({ error: 'Invalid dateTime format. Please provide a valid ISO date string.' });
      }
      
      // Get client information
      const client = await storage.getClient(parseInt(clientId));
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Get advisor information
      const advisor = await storage.getUser(req.user?.id as number);
      
      if (!advisor) {
        return res.status(404).json({ error: 'Advisor not found' });
      }
      
      // Crea un nuovo meeting
      const meeting = await storage.createMeeting({
        clientId,
        advisorId: req.user?.id as number,
        subject,
        title,
        location,
        dateTime: meetingDate,
        notes,
        duration: duration || 60 // Default a 60 minuti
      });
      

      
      // Invia un'email di invito se richiesto (default: true)
      let emailSent = false;
      
      // Determina se inviare email (controlla esplicitamente, gestisci vari formati)
      const shouldSendEmail = sendEmail === true || sendEmail === 'true' || sendEmail === 1;
      
      if (shouldSendEmail) {

        
        try {
          // Ottieni i dati del cliente
          const client = await storage.getClient(clientId);

          
          // Ottieni i dati dell'advisor
          const advisor = await storage.getUser(req.user?.id as number);

          
          // Se client e advisor esistono, procedi
          if (client && advisor) {
            // Formatta data e ora per email
            const formattedDate = meetingDate.toLocaleDateString('it-IT', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            const formattedTime = meetingDate.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            });
            

            
            // Calcola ora di fine
            const endTime = new Date(meetingDate);
            endTime.setMinutes(endTime.getMinutes() + (duration || 60));
            

            
            // Generate iCalendar data
            const icalData = generateICalendarEvent({
              startTime: meetingDate,
              endTime,
              subject,
              description: notes || '',
              location: location || 'Online',
              organizer: {
                name: `${advisor.firstName} ${advisor.lastName}`,
                email: advisor.email
              },
              attendees: [
                {
                  name: `${client.firstName} ${client.lastName}`,
                  email: client.email
                }
              ]
            });
            

            // Verifica che client.email sia definito prima di inviare l'email
            if (client.email) {

              
              try {
                await sendMeetingInviteEmail(
                  client.email,
                  client.firstName || '',
                  advisor.firstName || '',
                  advisor.lastName || '',
                  subject,
                  formattedDate,
                  formattedTime,
                  meeting.location || 'Online',
                  notes || '',
                  icalData,
                  advisor.email,
                  client.id,
                  advisor.id as number,
                  false, // Non creare automaticamente un log per l'email
                  {
                    firstName: advisor.firstName || '',
                    lastName: advisor.lastName || '',
                    email: advisor.email || '',
                    company: advisor.company || '',
                    phone: advisor.phone || '',
                    role: advisor.role || 'Consulente Finanziario'
                  }
                );
                

                emailSent = true;
              } catch (emailError) {

                
              }
            } else {
            }
          }
        } catch (emailError) {
          
          // Continue even if email sending fails
        }
      } else {
        
      }
      
      res.status(201).json({ 
        success: true, 
        meeting,
        emailSent
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to schedule meeting' });
    }
  });
  
  // Update an existing meeting
  app.put('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
      const advisorId = req.user?.id;
      const meetingId = parseInt(req.params.id);
      
      if (!advisorId) {
        return res.status(401).json({ error: 'Non autorizzato' });
      }
      
      // Recupera il meeting attuale per verificare la proprietà
      const oldMeeting = await storage.getMeeting(meetingId);
      if (!oldMeeting) {
        return res.status(404).json({ error: 'Meeting non trovato' });
      }
      
      // Verifica che il meeting appartenga all'advisor corrente
      if (oldMeeting.advisorId !== advisorId) {
        return res.status(403).json({ error: 'Non hai il permesso di modificare questo meeting' });
      }
      
      // Estrai i dati dalla richiesta
      const { title, location, notes, dateTime, duration, sendEmail } = req.body;
      
      // Prepara i dati da aggiornare
      const updateData: Partial<Meeting> = {};
      
      if (title !== undefined) {
        updateData.title = title;
      }
      
      if (location !== undefined) {
        updateData.location = location;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      // Gestione della data
      if (dateTime) {
        try {
          // Parsifica la stringa di data in un oggetto Date
          const meetingDate = new Date(dateTime);
          
          // Verifica che la data sia valida
          if (isNaN(meetingDate.getTime())) {
            return res.status(400).json({ error: 'Data non valida' });
          }
          
          updateData.dateTime = meetingDate;
          safeLog(`Meeting ${meetingId} nuova data`, { date: meetingDate.toISOString() }, 'debug');
        } catch (err) {
          const error = typedCatch<Error>(err);
          safeLog('Errore nella parsificazione della data', { message: error.message }, 'error');
          return res.status(400).json({ error: 'Formato data non valido' });
        }
      }
      
      if (duration !== undefined) {
        updateData.duration = duration;
      }
      
      // Aggiorna il meeting
      const updatedMeeting = await storage.updateMeeting(meetingId, updateData);
      
      // Verifica se l'orario è cambiato e invia una nuova email
      const isDateTimeChanged = dateTime && oldMeeting.dateTime.toString() !== updateData.dateTime?.toString();
      
      // Determina se inviare email (controlla esplicitamente, gestisci vari formati)
      const shouldSendEmail = sendEmail === true || sendEmail === 'true' || sendEmail === 1;

      if (isDateTimeChanged && updatedMeeting && shouldSendEmail) {
        const meeting = updatedMeeting;
        

        
        try {
          // Ottieni le informazioni del cliente per inviare l'email
          const client = await storage.getClient(meeting.clientId as number);
          
          if (client && client.email) {
            // Ottieni le informazioni dell'advisor
            const advisor = await storage.getUser(advisorId);
            
            if (advisor) {
              // Formatta le date per l'email
              const oldDate = oldMeeting.dateTime.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              
              const oldTime = oldMeeting.dateTime.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              const newDate = meeting.dateTime.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              
              const newTime = meeting.dateTime.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              // Calcola l'ora di fine basata sulla durata
              const endTime = new Date(meeting.dateTime);
              endTime.setMinutes(endTime.getMinutes() + (meeting.duration || 60));
              
              // Genera iCalendar data
              const icalData = generateICalendarEvent({
                startTime: meeting.dateTime,
                endTime,
                subject: meeting.subject,
                description: meeting.notes || '',
                location: meeting.location || 'Videoconferenza',
                organizer: { 
                  name: advisor.name || advisor.username, 
                  email: advisor.email || '' 
                },
                attendees: [
                  { 
                    name: `${client.firstName} ${client.lastName}`, 
                    email: client.email 
                  }
                ]
              });
              
              // Separa il nome dell'advisor
              const advisorName = advisor.name || advisor.username;
              const advisorNameParts = advisorName.split(' ');
              const advisorFirstName = advisorNameParts[0] || advisorName;
              const advisorLastName = advisorNameParts.slice(1).join(' ') || '';
              

              
              try {
                await sendMeetingUpdateEmail(
                  client.email,
                  client.firstName,
                  advisorFirstName,
                  advisorLastName,
                  meeting.subject,
                  oldDate,
                  oldTime,
                  newDate,
                  newTime,
                  meeting.location || "Videoconferenza",
                  meeting.notes || '',
                  icalData,
                  advisor.email || '',
                  client.id,
                  advisorId,
                  true, // log email
                  {
                    firstName: advisor.firstName || '',
                    lastName: advisor.lastName || '',
                    email: advisor.email || '',
                    company: advisor.company || '',
                    phone: advisor.phone || '',
                    role: advisor.role || 'Consulente Finanziario'
                  }
                );
                

              } catch (emailError) {
              }
              
              safeLog(`Email di aggiornamento inviata`, { 
                to: client.email, 
                meetingId
              }, 'info');
            }
          }
        } catch (err) {
          const emailError = typedCatch<Error>(err);
          safeLog('Errore invio email di aggiornamento meeting', { message: emailError.message }, 'error');
          // Non fallire l'intera operazione se l'email non va a buon fine
        }
      }
      
      res.json(updatedMeeting);
    } catch (error) {
      safeLog('Errore aggiornamento meeting', error, 'error');
      handleErrorResponse(res, error, 'Errore durante l\'aggiornamento del meeting');
    }
  });
  
  // Delete a meeting
  app.delete('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      
      if (!meetingId) {
        return res.status(400).json({ error: 'Invalid meeting ID' });
      }
      
      // Check if meeting exists
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      // Check if meeting belongs to this advisor
      if (meeting.advisorId !== req.user?.id) {
        return res.status(403).json({ error: 'Unauthorized to delete this meeting' });
      }
      
      // Delete the meeting
      const success = await storage.deleteMeeting(meetingId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete meeting' });
      }
      
      res.status(200).json({
        success: true,
        message: 'Meeting deleted successfully'
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to delete meeting' });
    }
  });

  // Helper function to generate iCalendar event
  function generateICalendarEvent({
    startTime,
    endTime,
    subject,
    description,
    location,
    organizer,
    attendees
  }: {
    startTime: Date;
    endTime: Date;
    subject: string;
    description: string;
    location: string;
    organizer: { name: string; email: string };
    attendees: Array<{ name: string; email: string }>;
  }): string {

    
    // Format times to iCal format
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const now = new Date();
    const icalUid = `${now.getTime()}-${Math.random().toString(36).substring(2, 11)}@gervis.app`;
    
    
    // Create iCalendar content
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gervis//Financial Advisor Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${icalUid}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(startTime)}`,
      `DTEND:${formatDate(endTime)}`,
      `SUMMARY:${subject}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      `ORGANIZER;CN=${organizer.name}:mailto:${organizer.email}`
    ];
    
    // Add attendees
    attendees.forEach(attendee => {
      icalContent.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendee.name}:mailto:${attendee.email}`);
    });
    
    // Add end of event and calendar
    icalContent = icalContent.concat([
      'END:VEVENT',
      'END:VCALENDAR'
    ]);
    
    return icalContent.join('\r\n');
  }

  // Get compliance overview
  app.get('/api/compliance/overview', isAuthenticated, async (req, res) => {
    try {
      // In una implementazione reale, questi dati verrebbero recuperati dal database
      
      // Get all clients for this advisor
      const clients = await storage.getClientsByAdvisor(req.user?.id as number);
      
      // Simula documenti mancanti per alcuni clienti
      const missingDocuments: Array<{
        clientId: number;
        clientName: string;
        documentType: string;
        daysOverdue: number;
      }> = [];
      const documentTypes = ["KYC", "MIFID Assessment", "Risk Profile", "Investment Declaration", "Source of Funds"];
      
      // Per il 20% dei clienti attivi, simula documenti mancanti
      const clientsWithMissingDocs = clients
        .filter(client => !client.isArchived)
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.ceil(clients.length * 0.2));
      
      clientsWithMissingDocs.forEach((client, index) => {
        const documentType = documentTypes[index % documentTypes.length];
        const daysOverdue = Math.floor(Math.random() * 30) + 1; // 1-30 giorni di ritardo
        
        missingDocuments.push({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          documentType,
          daysOverdue
        });
      });
      
      // Calcola il tasso di conformità
      const totalDocuments = clients.length * documentTypes.length;
      const missingCount = missingDocuments.length;
      const complianceRate = totalDocuments > 0 ? 
        Math.round(((totalDocuments - missingCount) / totalDocuments) * 100) : 100;
      
      // Simula giorni alla prossima revisione
      const daysToNextAudit = Math.floor(Math.random() * 30) + 1; // 1-30 giorni alla prossima revisione
      
      res.json({
        missingDocuments,
        complianceRate,
        daysToNextAudit
      });
    } catch (error) {
      
      res.status(500).json({ error: 'Failed to fetch compliance data' });
    }
  });
  
  // Get recent activities
  app.get('/api/activity/recent', isAuthenticated, async (req, res) => {
    try {
      // In una implementazione reale, questi dati verrebbero recuperati dal database
      // (es. combinando log dei clienti, dati di onboarding, email inviate, etc.)
      
      // Get all clients for this advisor
      const clients = await storage.getClientsByAdvisor(req.user?.id as number);
      
      // Recupera i log più recenti dei clienti
      const allLogs = [];
      for (const client of clients) {
        const logs = await storage.getClientLogs(client.id);
        if (logs.length > 0) {
          allLogs.push(...logs);
        }
      }
      
      // Ordina i log per data (più recenti prima)
      allLogs.sort((a, b) => 
        new Date(b.logDate || b.createdAt).getTime() - 
        new Date(a.logDate || a.createdAt).getTime()
      );
      
      // Trasforma i log in attività
      const activities = allLogs.slice(0, 8).map((log, index) => {
        // Trova il cliente associato
        const client = clients.find(c => c.id === log.clientId);
        const clientName = client ? `${client.firstName.charAt(0)}. ${client.lastName}` : "Unknown Client";
        
        // Determina il tipo di attività e colore
        let activityType = log.type;
        let activityColor = 'blue';
        let description = '';
        let status = '';
        
        // Formatta la data/ora
        const logDate = new Date(log.logDate || log.createdAt);
        const now = new Date();
        const isToday = logDate.toDateString() === now.toDateString();
        const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === logDate.toDateString();
        
        const timeStr = isToday ? 
          `${logDate.getHours().toString().padStart(2, '0')}:${logDate.getMinutes().toString().padStart(2, '0')}` : 
          (isYesterday ? 'Yesterday' : `${logDate.getDate()}/${logDate.getMonth() + 1}`);
        
        // Determina descrizione e stato in base al tipo
        switch (log.type) {
          case 'call':
            description = 'Call completed with';
            status = 'summary ready';
            activityColor = 'blue';
            break;
          case 'email':
            description = 'Email sent to';
            status = 'awaiting response';
            activityColor = 'green';
            break;
          case 'meeting':
            description = 'Meeting with';
            status = 'notes available';
            activityColor = 'purple';
            break;
          case 'note':
            description = 'Note added for';
            status = 'by you';
            activityColor = 'amber';
            break;
          default:
            description = 'Update for';
            status = 'new information';
            activityColor = 'blue';
        }
        
        return {
          id: log.id,
          type: activityType,
          description,
          client: clientName,
          time: timeStr,
          status,
          color: activityColor
        };
      });
      
      // Non generiamo più attività simulate, restituiamo l'array così com'è
      
      res.json({ activities });
    } catch (error) {
      
      
      res.status(500).json({ error: 'Failed to fetch activity data' });
    }
  });

  // Update MIFID data for a client
  app.patch('/api/clients/:id/mifid', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this client' });
      }
      
      // Get the current MIFID data, or create a new record if it doesn't exist
      let currentMifid = await storage.getMifidByClient(clientId);
      
      // Update or create MIFID data
      const updatedMifid = await storage.updateMifid(clientId, req.body);
      
      res.json({ 
        success: true, 
        mifid: updatedMifid
      });
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Invalid MIFID data', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update MIFID data', error: String(error) });
      }
    }
  });

  // Get all MIFID data
  app.get('/api/mifid', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      // Ottieni tutti i clienti dell'advisor corrente
      const clients = await storage.getClientsByAdvisor(req.user.id);
      const clientIds = clients.map(client => client.id);
      
      // Ottieni tutti i record MIFID per questi clienti
      const mifids = await storage.getAllMifidByClients(clientIds);
      
      res.json({ 
        success: true, 
        mifids
      });
    } catch (error) {
      
      res.status(500).json({ success: false, message: 'Failed to fetch MIFID data', error: String(error) });
    }
  });

  // Update assets for a client
  app.put('/api/clients/:id/assets', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this client' });
      }
      
      // Extract assets from request body
      const { assets } = req.body;
      
      if (!assets || !Array.isArray(assets)) {
        return res.status(400).json({ success: false, message: 'Assets must be an array' });
      }
      
      // Get existing assets
      const existingAssets = await storage.getAssetsByClient(clientId);
      
      // Delete assets that are no longer present
      const updatedAssetIds = assets.filter(a => a.id).map(a => a.id);
      const assetsToDelete = existingAssets.filter(a => !updatedAssetIds.includes(a.id));
      
      for (const asset of assetsToDelete) {
        await storage.deleteAsset(asset.id);
      }
      
      // Update or create assets
      const updatedAssets = [];
      for (const asset of assets) {
        if (asset.id) {
          // Update existing asset
          const updatedAsset = await storage.updateAsset(asset.id, {
            category: asset.category,
            value: asset.value,
            description: asset.description
          });
          updatedAssets.push(updatedAsset);
        } else {
          // Create new asset
          const newAsset = await storage.createAsset({
            clientId,
            category: asset.category,
            value: asset.value,
            description: asset.description
          });
          updatedAssets.push(newAsset);
        }
      }
      
      // Calculate total assets
      const totalValue = updatedAssets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Update client's totalAssets field
      await storage.updateClient(clientId, { totalAssets: totalValue });
      
      res.json({ 
        success: true, 
        assets: updatedAssets,
        totalAssets: totalValue
      });
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Invalid asset data', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update client assets', error: String(error) });
      }
    }
  });

  // Toggle client active status
  app.patch('/api/clients/:id/toggle-active', isAuthenticated, async (req, res) => {
    try {
      
      
      if (!req.user || !req.user.id) {
        
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      const clientId = parseInt(req.params.id);
      
      
      if (isNaN(clientId)) {
        
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      
      // Get client from database
      
      const client = await storage.getClient(clientId);
      
      
      if (!client) {
        
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      
      if (client.advisorId !== req.user.id) {
        
        return res.status(403).json({ success: false, message: 'Not authorized to update this client' });
      }
      
      // Se il valore viene passato nella request, usa quello, altrimenti inverte lo stato corrente
      const newActiveStatus = req.body.active !== undefined ? req.body.active : !client.active;
      
      
      // Aggiorna lo stato active del cliente
      
      const result = await storage.updateClientActiveStatus(clientId, newActiveStatus);
      
      
      if (!result.success) {
        
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update client active status', 
          error: result.error 
        });
      }
      
      // Ottieni il cliente aggiornato
      
      const updatedClient = await storage.getClient(clientId);
      
      
      
      return res.json({ 
        success: true, 
        client: updatedClient
      });
    } catch (error) {
      
      if (error instanceof Error) {
        
      }
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update client active status', 
        error: String(error) 
      });
    }
  });

  // Aggiungiamo le rotte per le impostazioni email dopo le altre rotte utente

    // Test SMTP connection
    app.post('/api/users/:userId/smtp-test', isAuthenticated, async (req, res) => {
      try {
        
        
        
        const userId = parseInt(req.params.userId);
        
        // Ensure the user is only testing their own SMTP settings
        if (userId !== req.user?.id) {
          
          return res.status(403).json({ success: false, message: 'Not authorized to test SMTP settings for this user' });
        }
        
        // SMTP test schema
        const smtpTestSchema = z.object({
          host: z.string().min(1, "SMTP host is required"),
          port: z.string().min(1, "SMTP port is required"),
          user: z.string().min(1, "SMTP username is required"),
          password: z.string().min(1, "SMTP password is required"),
          from: z.string().email("From email must be valid").optional()
        });
        
        try {
          
          const validatedData = smtpTestSchema.parse(req.body);
          
          
          // Import test function
          const { testSMTPConnection } = require('./email');
          
          const result = await testSMTPConnection({
            host: validatedData.host,
            port: validatedData.port,
            user: validatedData.user
          });
          
          
          res.json(result);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            
            return res.status(400).json({ success: false, errors: validationError.errors });
          } else {
            throw validationError;
          }
        }
      } catch (error) {
        
        res.status(500).json({ 
          success: false, 
          message: 'Failed to test SMTP connection',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    // Update email settings
    app.post('/api/users/:userId/email-settings', isAuthenticated, async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        // Ensure the user is only updating their own settings
        if (userId !== req.user?.id) {
          return res.status(403).json({ message: 'Not authorized to update email settings for this user' });
        }
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Email settings schema
        const emailSettingsSchema = z.object({
          smtpHost: z.string().min(1, "SMTP host is required"),
          smtpPort: z.number().int().min(1, "SMTP port is required"),
          smtpUser: z.string().min(1, "SMTP username is required"),
          smtpPass: z.string().min(1, "SMTP password is required"),
          customEmailEnabled: z.boolean().default(false)
        });
        
        const validatedData = emailSettingsSchema.parse(req.body);
        
        // Update the user's email settings
        await storage.updateUser(userId, {
          smtp_host: validatedData.smtpHost,
          smtp_port: validatedData.smtpPort,
          smtp_user: validatedData.smtpUser,
          smtp_pass: validatedData.smtpPass,
          custom_email_enabled: validatedData.customEmailEnabled
        });
        
        res.json({ 
          success: true,
          message: 'Email settings updated successfully'
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ success: false, errors: error.errors });
        } else {
          
          res.status(500).json({ 
            success: false,
            message: 'Failed to update email settings',
            error: error.message
          });
        }
      }
    });
    
    // Get email settings
    app.get('/api/users/:userId/email-settings', isAuthenticated, async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        // Ensure the user is only getting their own settings
        if (userId !== req.user?.id) {
          return res.status(403).json({ message: 'Not authorized to get email settings for this user' });
        }
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Return only email settings-related fields
        res.json({
          success: true,
          emailSettings: {
            smtpHost: user.smtp_host || '',
            smtpPort: user.smtp_port || 465,
            smtpUser: user.smtp_user || '',
            smtpPass: user.smtp_pass ? '********' : '', // Don't send the actual password
            customEmailEnabled: user.custom_email_enabled || false
          }
        });
      } catch (error) {
        
        res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch email settings',
          error: error.message
        });
      }
    });

  // Rotta per inviare email di onboarding al cliente
  app.post('/api/clients/:clientId/onboarding-email', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }
      
      // Schema per la validazione dei dati della richiesta
      const emailSchema = z.object({
        message: z.string().optional(),
        subject: z.string().optional(),
        language: z.enum(['english', 'italian']).default('italian')
      });
      
      const validatedData = emailSchema.parse(req.body);
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      // Verifica se il client appartiene all'advisor corrente
      if (client.advisorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to send email to this client' });
      }
      
      // Verifica se il token è valido
      if (!client.onboardingToken) {
        // Se il token non esiste, ne generiamo uno nuovo
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 giorni di validità
        
        await storage.updateClient(clientId, {
          onboardingToken: token,
          tokenExpiry
        });
        
        client.onboardingToken = token;
        client.tokenExpiry = tokenExpiry;
      } else if (client.tokenExpiry && new Date(client.tokenExpiry) < new Date()) {
        // Se il token è scaduto, ne generiamo uno nuovo
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 giorni di validità
        
        await storage.updateClient(clientId, {
          onboardingToken: token,
          tokenExpiry
        });
        
        client.onboardingToken = token;
        client.tokenExpiry = tokenExpiry;
      }
      
      // Costruisci il link di onboarding
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const onboardingLink = `${baseUrl}/onboarding/${client.onboardingToken}`;
      
      // Ottieni le informazioni dell'advisor
      const advisor = await storage.getUser(req.user.id);
      
      try {
        // Invia email di onboarding al cliente
        await sendOnboardingEmail(
          client.email || '',  // Assicura che l'email non sia mai null
          client.firstName,
          client.lastName,
          onboardingLink,
          validatedData.language,
          validatedData.message,
          advisor?.signature,
          req.user.email,
          validatedData.subject,
          client.id,
          req.user.id,
          true // log email
        );
        
        res.json({
          success: true,
          message: 'Onboarding email sent successfully',
          onboardingLink
        });
      } catch (emailError) {
        // Cattura errori specifici dell'invio email
        
        
        let errorMessage = 'Failed to send onboarding email';
        
        // Verifica se è un errore di configurazione SMTP
        if (emailError.message && (
          emailError.message.includes('Configurazione email non impostata') ||
          emailError.message.includes('Configurazione email mancante')
        )) {
          errorMessage = 'Configurazione email non impostata. È necessario configurare un server SMTP nelle impostazioni utente.';
        }
        
        res.status(500).json({
          success: false,
          message: errorMessage,
          error: emailError.message,
          configurationRequired: true
        });
      }
    } catch (error) {
      safeLog('Errore durante la creazione del link di onboarding', error, 'error');
      handleErrorResponse(res, error, 'Impossibile creare il link di onboarding');
    }
  });

  // Rotte per le impostazioni email
  app.get("/api/settings/email", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Recupera le impostazioni email dell'utente
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          smtp_host: true,
          smtp_port: true,
          smtp_user: true,
          smtp_pass: true,
          custom_email_enabled: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      
      // Converti da snake_case a camelCase per il client
      res.json({
        smtpHost: user.smtp_host,
        smtpPort: user.smtp_port,
        smtpUser: user.smtp_user,
        smtpPass: user.smtp_pass,
        smtpSecure: false, // Impostazione predefinita
        customEmailEnabled: user.custom_email_enabled
      });
    } catch (error) {
      
      res.status(500).json({ error: "Errore nel recupero delle impostazioni email" });
    }
  });

  app.post("/api/settings/email", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = req.body;
      
      // Validazione dei dati
      if (!smtpHost || !smtpPort || !smtpUser) {
        return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati" });
      }
      
      // Validazione della porta
      const portNumber = parseInt(smtpPort);
      if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
        return res.status(400).json({ error: "La porta SMTP deve essere un numero valido tra 1 e 65535" });
      }
      
      // Se la password non è definita, mantieni quella esistente
      let updateData: any = {
        smtp_host: smtpHost,
        smtp_port: portNumber,
        smtp_user: smtpUser,
        custom_email_enabled: true // Attiva automaticamente l'uso del server email personalizzato
      };
      
      // Aggiorna la password solo se fornita
      if (smtpPass) {
        updateData.smtp_pass = smtpPass;
      }
      
      // Converti da camelCase a snake_case per il database
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));
      
      res.json({ success: true });
    } catch (error) {
      
      res.status(500).json({ error: "Errore nel salvataggio delle impostazioni email" });
    }
  });

  // ===== PDF Generation and Email Routes =====
  
  // Send PDF by email
  app.post('/api/clients/send-pdf', isAuthenticated, async (req, res) => {
    try {
      // Verifica presenza dei file nella richiesta
      if (!req.files) {
        return res.status(400).json({
          success: false,
          message: 'Nessun file trovato nella richiesta'
        });
      }
      
      // Verifica che il file PDF sia presente e valido
      if (!req.files.pdf) {
        safeLog('Campo PDF mancante nella richiesta', { filesKeys: Object.keys(req.files) }, 'debug');
        return res.status(400).json({
          success: false,
          message: 'File PDF mancante nella richiesta'
        });
      }
      
      const pdfFile = req.files.pdf as UploadedFile;
      
      // Valida il file PDF
      const validationResult = validateFile(pdfFile, {
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 10 * 1024 * 1024 // 10MB
      });
      
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.error
        });
      }
      
      // Verifica che tutti i campi richiesti siano presenti
      const missingFields = [];
      if (!req.body.clientId) missingFields.push('clientId');
      if (!req.body.emailSubject) missingFields.push('emailSubject');
      if (!req.body.emailBody) missingFields.push('emailBody');

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Mancano i seguenti parametri: ${missingFields.join(', ')}`
        });
      }
      
      const clientId = parseInt(req.body.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Get client data
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Verify that the client belongs to this advisor
      if (client.advisorId !== req.user?.id) {
        safeLog('Tentativo di invio email a un cliente non autorizzato', 
          { userId: req.user?.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato ad inviare email a questo cliente' });
      }
      
      // Get advisor/user data to get the signature
      const userId = req.user?.id;
      let advisorSignature = 'Il tuo consulente finanziario';
      
      if (userId) {
        try {
          // Get user settings
          const user = await storage.getUser(userId);
          if (user && user.signature) {
            advisorSignature = user.signature;
          }
        } catch (error) {
          safeLog('Errore nel recupero delle impostazioni utente', error, 'error');
          // Continuiamo con la firma di default
        }
      }
      
      // Prepare email parameters
      const emailSubject = req.body.emailSubject;
      let emailBody = req.body.emailBody;
      
      // Verifica se l'email termina con "Cordiali saluti," e aggiungila se necessario
      if (!emailBody.trim().endsWith("Cordiali saluti,")) {
        if (!emailBody.includes("Cordiali saluti,")) {
          emailBody += "\n\nCordiali saluti,";
        }
      }
      
      // Prepare attachments
      const attachments = [
        {
          filename: pdfFile.name || 'Questionario_MiFID.pdf',
          content: pdfFile.data
        }
      ];
      
      // Send email
      await sendCustomEmail(
        client.email,
        emailSubject,
        emailBody,
        'italian',
        attachments,
        advisorSignature, // advisor signature from user settings
        req.user?.email,
        clientId,
        req.user?.id,
        true // log email
      );
      
      // Log the email sending in client logs
      await storage.createClientLog({
        clientId,
        type: 'email',
        title: 'Invio Questionario MiFID',
        content: emailBody,
        emailSubject,
        emailRecipients: client.email,
        logDate: new Date(),
        createdBy: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Email inviata con successo'
      });
      
    } catch (error) {
      safeLog('Errore durante l\'invio del PDF via email', error, 'error');
      handleErrorResponse(res, error, 'Si è verificato un errore durante l\'invio dell\'email');
    }
  });

  // Aggiungo il nuovo endpoint per le statistiche sui trends
  app.get('/api/statistics/trends/summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Utente non autenticato' });
      }
      
      const summary = await trendService.getAllTrendsSummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nel recupero delle statistiche');
    }
  });
  
  /**
   * API per inviare email generiche o personalizzate per clienti
   * Può essere usata per inviare email ad un cliente specifico (usando clientId)
   * o a qualsiasi destinatario (usando to)
   */
  app.post('/api/send-email', isAuthenticated, async (req, res) => {
    try {
      const { subject, message, to, clientId, language = 'italian' } = req.body;
      
      // Verifica che ci siano almeno i campi obbligatori
      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'I campi oggetto e messaggio sono obbligatori'
        });
      }
      
      let emailTo = to;
      let clientName = '';
      
      // Se c'è un clientId, recupera l'email del cliente
      if (clientId) {
        const client = await storage.getClient(clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            message: 'Cliente non trovato'
          });
        }
        
        if (!client.email) {
          return res.status(400).json({
            success: false,
            message: 'Il cliente non ha un indirizzo email'
          });
        }
        
        emailTo = client.email;
        clientName = client.name || '';
      }
      
      // Verifica che ci sia un destinatario
      if (!emailTo) {
        return res.status(400).json({
          success: false,
          message: 'Destinatario email mancante'
        });
      }
      
      // Invia l'email
      const userId = req.user?.id;
      await sendCustomEmail(
        emailTo,
        subject,
        message,
        language as any,
        undefined, // attachments
        undefined, // advisorSignature
        undefined, // advisorEmail
        clientId || undefined,
        userId,
        true // logEmail
      );
      
      // Log dell'azione
      safeLog('Email inviata', { to: emailTo, clientId, subject }, 'info');
      
      return res.json({
        success: true,
        message: 'Email inviata con successo'
      });
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nell\'invio dell\'email');
    }
  });
  
  // Create and return the server
  const server = createServer(app);
  return server;
}

// Helper function to type catch errors
function typedCatch<T extends Error>(error: unknown): T {
  if (error instanceof Error as any) {
    return error as T;
  }
  
  // Se non è un Error, crea un nuovo Error con il messaggio convertito in stringa
  const newError = new Error(String(error)) as T;
  return newError;
}
