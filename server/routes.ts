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
import { sendCustomEmail, sendVerificationEmail, sendOnboardingEmail, sendMeetingInviteEmail, sendMeetingUpdateEmail } from "./email";
import { getMarketIndices, getTickerData, validateTicker, getFinancialNews, getTickerSuggestions } from "./market-api";
import { getClientProfile } from "./ai/profile-controller";
import { generateInvestmentIdeas, getPromptForDebug } from './investment-ideas-controller';
import nodemailer from 'nodemailer';
import { db, sql as pgClient } from './db'; // Importa pgClient correttamente

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
  dateTime: string;
  notes: string;
  createdAt: string;
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

// Aggiungiamo una funzione per eseguire la migrazione per aggiungere la colonna duration
async function addDurationColumnIfNeeded() {
  try {
    console.log("Verifico se la colonna duration esiste nella tabella meetings...");
    
    // Controlliamo se la colonna esiste già
    const columnExists = await pgClient`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meetings' AND column_name = 'duration'
      ) as exists
    `;
    
    if (columnExists[0] && columnExists[0].exists === true) {
      console.log("La colonna duration esiste già nella tabella meetings.");
      return;
    }
    
    // Se siamo qui, la colonna non esiste e dobbiamo aggiungerla
    console.log("Aggiungo la colonna duration alla tabella meetings...");
    
    try {
      await pgClient`
        ALTER TABLE meetings ADD COLUMN duration INTEGER DEFAULT 60
      `;
      console.log("Colonna duration aggiunta con successo!");
      
      // Aggiorniamo tutti i meeting esistenti impostando una durata di default
      await pgClient`
        UPDATE meetings SET duration = 60 WHERE duration IS NULL
      `;
      console.log("Tutti i meeting esistenti hanno ora una durata di default di 60 minuti.");
    } catch (e) {
      // La colonna potrebbe essere stata aggiunta da un'altra istanza
      console.log("Errore durante l'aggiunta della colonna - potrebbe già esistere:", e);
    }
  } catch (error) {
    console.error("Errore durante la migrazione della colonna duration:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Esegui la migrazione per aggiungere la colonna duration
  await addDurationColumnIfNeeded();
  
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non sei autorizzato ad accedere a questa funzionalità' });
    }
    
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
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users', error: String(error) });
    }
  });
  
  // Get pending users (admin only)
  app.get('/api/admin/users/pending', isAdmin, async (req, res) => {
    try {
      const users = await storage.getPendingUsers();
      res.json({ success: true, users });
    } catch (error) {
      console.error('Error fetching pending users:', error);
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
      console.error('Error approving user:', error);
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
      console.error('Error rejecting user:', error);
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
      console.error('Error deleting user:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user', error: String(error) });
    }
  });
  
  // Get all clients for the current advisor
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      const clients = await storage.getClientsByAdvisor(req.user.id);
      res.json({ success: true, clients });
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch clients', error: String(error) });
    }
  });
  
  // Create new client
  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      // Validate client data
      const clientData = insertClientSchema.parse({
        ...req.body,
        advisorId: req.user.id,
        isOnboarded: false
      });
      
      // Create client in database
      const client = await storage.createClient(clientData);
      
      res.json({ success: true, client });
    } catch (error) {
      console.error('Error creating client:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Invalid client data', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Failed to create client', error: String(error) });
      }
    }
  });
  
  // Get client details
  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
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
        return res.status(403).json({ success: false, message: 'Not authorized to view this client' });
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
      console.error('Error fetching client details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client details', error: String(error) });
    }
  });
  
  // Update client details
  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
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
      
      // Log dei valori di interesse di investimento
      console.log("[DEBUG] Aggiornamento cliente - Valori interessi ricevuti:", {
        retirementInterest: req.body.retirementInterest,
        wealthGrowthInterest: req.body.wealthGrowthInterest,
        incomeGenerationInterest: req.body.incomeGenerationInterest,
        capitalPreservationInterest: req.body.capitalPreservationInterest,
        estatePlanningInterest: req.body.estatePlanningInterest
      });
      
      // Update client in database
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      res.json({ 
        success: true, 
        client: updatedClient
      });
    } catch (error) {
      console.error('Error updating client details:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Invalid client data', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update client details', error: String(error) });
      }
    }
  });
  
  // Delete client
  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    console.log(`[DEBUG] Ricevuta richiesta DELETE per cliente ID: ${req.params.id} - Query params:`, req.query);
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        console.log(`[DEBUG] DELETE client - Autenticazione fallita`);
        return res.status(401).json({ success: false, message: 'User not authenticated or invalid user data' });
      }
      
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        console.log(`[DEBUG] DELETE client - ID client non valido: ${req.params.id}`);
        return res.status(400).json({ success: false, message: 'Invalid client ID' });
      }
      
      console.log(`[DEBUG] DELETE client ${clientId} - Verifica esistenza cliente`);
      // Get client from database
      const client = await storage.getClient(clientId);
      
      if (!client) {
        console.log(`[DEBUG] DELETE client ${clientId} - Cliente non trovato`);
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      
      console.log(`[DEBUG] DELETE client ${clientId} - Verifica autorizzazioni: advisorId=${client.advisorId}, userId=${req.user.id}`);
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        console.log(`[DEBUG] DELETE client ${clientId} - Non autorizzato (client.advisorId=${client.advisorId}, req.user.id=${req.user.id})`);
        return res.status(403).json({ success: false, message: 'Not authorized to delete this client' });
      }
      
      console.log(`[DEBUG] DELETE client ${clientId} - Avvio processo di eliminazione`);
      // Delete the client
      const success = await storage.deleteClient(clientId);
      
      if (success) {
        console.log(`[DEBUG] DELETE client ${clientId} - Eliminazione riuscita, invio risposta con success=true`);
        const responseObj = { success: true, message: 'Client deleted successfully' };
        console.log(`[DEBUG] DELETE client ${clientId} - Payload risposta:`, JSON.stringify(responseObj));
        res.json(responseObj);
      } else {
        console.log(`[DEBUG] DELETE client ${clientId} - Eliminazione fallita, invio risposta con status 500`);
        res.status(500).json({ success: false, message: 'Failed to delete client' });
      }
    } catch (error) {
      console.error(`[ERROR] Errore durante l'eliminazione del cliente:`, error);
      console.log(`[DEBUG] DELETE client - Errore catturato, invio risposta con status 500`);
      
      // Log dettagliato dello stack trace
      if (error instanceof Error) {
        console.error(`[ERROR] Stack trace:`, error.stack);
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred while deleting client', 
        error: String(error),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update user password
  app.post('/api/user/password', isAuthenticated, async (req, res) => {
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
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify the current password
      const isPasswordValid = await comparePasswords(validatedData.currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(validatedData.newPassword);
      
      // Update the password
      await storage.updateUser(req.user?.id as number, { password: hashedPassword });
      
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Failed to update password' });
      }
    }
  });
  
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
        console.error('Error updating signature:', error);
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
        console.error('Error updating company logo:', error);
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
      console.error('Error deleting company logo:', error);
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
        console.error('Error updating company information:', error);
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
      console.error("Email verification error:", error);
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
      await sendVerificationEmail(
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
      console.error("Resend verification error:", error);
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
        console.log("DEBUG - Invio email onboarding:");
        console.log("DEBUG - customSubject:", customSubject);
        
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
          console.log(`Email di onboarding inviata con successo a ${client.email}`);
          
          // Log dettagliati anche in caso di successo
          console.log("DEBUG - Dettagli email inviata con successo:");
          console.log("DEBUG - Destinatario:", client.email);
          console.log("DEBUG - Nome:", firstName, lastName);
          console.log("DEBUG - Link:", link);
          console.log("DEBUG - Lingua:", language);
          console.log("DEBUG - Advisor email:", advisor?.email);
          console.log("DEBUG - Signature presente:", !!advisor?.signature);
        } catch (emailError: any) {
          console.error("ERRORE CRITICO - Invio email onboarding fallito:", emailError);
          
          // Estrazione dettagli errore più specifici
          const errorDetails = {
            message: emailError.message || "Errore sconosciuto",
            code: emailError.code || "UNKNOWN_ERROR",
            command: emailError.command || null,
            response: emailError.response || null,
            responseCode: emailError.responseCode || null
          };
          
          console.error("DEBUG - Dettagli errore email:", JSON.stringify(errorDetails, null, 2));
          
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
      console.log("DEBUG ROUTES - Valori inviati nella risposta:");
      console.log("DEBUG ROUTES - token:", token);
      console.log("DEBUG ROUTES - link:", link);
      console.log("DEBUG ROUTES - language:", language);
      console.log("DEBUG ROUTES - sendEmail richiesto:", sendEmail);
      console.log("DEBUG ROUTES - emailSent effettivo:", emailSent);
      console.log("DEBUG ROUTES - customSubject ricevuto:", customSubject);
      
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
      console.error('Error generating onboarding token:', error);
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
      console.log("DEBUG - Dettagli invio email custom:");
      console.log("DEBUG - Destinatario:", client.email);
      console.log("DEBUG - Oggetto:", subject);
      console.log("DEBUG - Lingua:", language);
      
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
        
        console.log(`Email inviata con successo a ${client.email}`);
        
        // Log dettagliati anche in caso di successo
        console.log("DEBUG - Dettagli email custom inviata con successo:");
        console.log("DEBUG - Destinatario:", client.email);
        console.log("DEBUG - Oggetto:", subject);
        console.log("DEBUG - Lingua:", language);
        console.log("DEBUG - Signature presente:", !!advisor?.signature);
        
        res.json({ success: true, message: "Email sent successfully" });
      } catch (emailError: any) {
        // Log dettagliato dell'errore
        console.error("ERRORE CRITICO - Invio email fallito:", emailError);
        
        // Estrazione dettagli errore più specifici
        const errorDetails = {
          message: emailError.message || "Errore sconosciuto",
          code: emailError.code || "UNKNOWN_ERROR",
          command: emailError.command || null,
          response: emailError.response || null,
          responseCode: emailError.responseCode || null,
          stack: emailError.stack || "No stack trace available"
        };
        
        console.error("DEBUG - Dettagli errore email:", JSON.stringify(errorDetails, null, 2));
        
        // Inviamo i dettagli dell'errore al frontend
        res.status(500).json({ 
          success: false, 
          message: "Failed to send email", 
          error: String(emailError),
          errorDetails
        });
      }
    } catch (error) {
      console.error("Error in send-email route:", error);
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
      console.error("Error fetching client by token:", error);
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
      console.error("Error fetching client by token:", error);
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
        activatedAt: currentDate,
        active: true,
        clientSegment,
        netWorth
      });
      
      console.log("[DEBUG] Onboarding - Updated client:", updatedClient);
      
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
      console.error("Error completing onboarding:", error);
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
      console.log("[DEBUG] Onboarding - Request body:", JSON.stringify(req.body, null, 2));
      
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token is required" 
        });
      }
      
      console.log("[DEBUG] Onboarding - Token:", token);
      
      // Get client by onboarding token
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      console.log("[DEBUG] Onboarding - Found client:", client.id);
      
      // Validate the request body against the schema
      const { 
        assets,
        ...mifidData
      } = req.body;
      
      console.log("[DEBUG] Onboarding - MIFID data to save:", JSON.stringify(mifidData, null, 2));
      
      try {
        // Save MIFID data
        const savedMifid = await db.insert(mifid).values({
          clientId: client.id,
          ...mifidData,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        console.log("[DEBUG] Onboarding - Saved MIFID data:", JSON.stringify(savedMifid, null, 2));
      } catch (mifidError) {
        console.error("[ERROR] Failed to save MIFID data:", mifidError);
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
        activatedAt: currentDate,
        active: true,
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
        console.log("[DEBUG] Onboarding - Saved assets:", assets.length);
      }
      
      res.json({ 
        success: true, 
        message: "Onboarding completed successfully",
        client: updatedClient
      });
    } catch (error) {
      console.error("[ERROR] Error completing onboarding:", error);
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
      console.log("[INFO] Ricevuta richiesta di archiviazione cliente");
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
      
      console.log(`[INFO] Archiviazione cliente ID: ${clientId}`);
      const archivedClient = await storage.archiveClient(clientId);
      
      res.json({
        success: true,
        message: "Client archived successfully",
        client: archivedClient
      });
    } catch (error) {
      console.error("[ERROR] Errore archiviazione cliente:", error);
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
      console.log("[INFO] Ricevuta richiesta di ripristino cliente");
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
      
      console.log(`[INFO] Ripristino cliente ID: ${clientId}`);
      const restoredClient = await storage.restoreClient(clientId);
      
      res.json({
        success: true,
        message: "Client restored successfully",
        client: restoredClient
      });
    } catch (error) {
      console.error("[ERROR] Errore ripristino cliente:", error);
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
      console.error("[ERROR] Errore recupero log di tutti i clienti:", error);
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

      console.log(`[INFO] Recupero log per cliente ID: ${clientId}`);
      const logs = await storage.getClientLogs(clientId);
      
      res.json({
        success: true,
        logs
      });
    } catch (error) {
      console.error("[ERROR] Errore recupero log cliente:", error);
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

      console.log(`[INFO] Creazione log per cliente ID: ${clientId}, tipo: ${type}`);
      console.log(`[INFO] Data del log ricevuta (raw): ${logDate}`);
      console.log(`[INFO] Tipo di dato logDate: ${typeof logDate}`);
      
      // Elaborazione esplicita della data
      let logDateTime: Date;
      if (logDate) {
        try {
          logDateTime = new Date(logDate);
          
          // Verifica che la data sia valida
          if (isNaN(logDateTime.getTime())) {
            console.warn(`[WARN] Data non valida ricevuta: ${logDate}`);
            return res.status(400).json({
              success: false,
              message: "La data fornita non è valida. Formato richiesto: ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)"
            });
          } else {
            console.log(`[INFO] Data convertita con successo: ${logDateTime.toISOString()}`);
          }
        } catch (e) {
          console.error(`[ERROR] Errore nella conversione della data: ${e}`);
          return res.status(400).json({
            success: false,
            message: "Errore nella conversione della data. Usa il formato ISO 8601."
          });
        }
      } else {
        // Default a 10:00 di oggi se nessuna data fornita
        logDateTime = new Date();
        logDateTime.setHours(10, 0, 0, 0);
        console.log(`[INFO] Nessuna data fornita, utilizzo oggi alle 10:00: ${logDateTime.toISOString()}`);
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
      console.error("[ERROR] Errore creazione log cliente:", error);
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

      console.log(`[INFO] Aggiornamento log ID: ${logId}`);
      
      // Elaborazione della data, se fornita
      let logDateTime: Date | undefined;
      if (logDate) {
        try {
          logDateTime = new Date(logDate);
          // Verifica che la data sia valida
          if (isNaN(logDateTime.getTime())) {
            console.warn(`[WARN] Data non valida ricevuta per aggiornamento: ${logDate}, ignoro questo campo`);
            logDateTime = undefined;
          } else {
            console.log(`[INFO] Data di aggiornamento convertita: ${logDateTime.toISOString()}`);
          }
        } catch (e) {
          console.error(`[ERROR] Errore nella conversione della data di aggiornamento: ${e}`);
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
      console.error("[ERROR] Errore aggiornamento log:", error);
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

      console.log(`[INFO] Eliminazione log ID: ${logId}`);
      
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
      console.error("[ERROR] Errore eliminazione log:", error);
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

  // ===== AI API Routes =====
  
  // Get AI-generated client profile
  app.get('/api/ai/client-profile/:clientId', isAuthenticated, getClientProfile);

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
      console.error('Error fetching portfolio data:', error);
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
        console.log("Impossibile recuperare le attività completate, tabella non ancora creata");
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
      console.error('Error fetching tasks:', error);
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
      console.error('Error marking task as completed:', error);
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
      console.error('Error marking task as uncompleted:', error);
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
      
      console.log(`DEBUG - Trovati ${meetings.length} meeting per l'advisor ${advisorId}`);
      console.log(`DEBUG - Meeting trovati:`, meetings.map(m => ({ id: m.id, dateTime: m.dateTime, subject: m.subject })));
      
      // Get all clients for this advisor
      const clients = await storage.getClientsByAdvisor(advisorId);
      
      // Mappa i meeting nel formato richiesto dal frontend
      const events = [];
      
      for (const meeting of meetings) {
        // Trova il cliente associato a questo meeting
        const client = clients.find(c => c.id === meeting.clientId);
        if (!client) {
          console.log(`Cliente non trovato per meeting ${meeting.id}`);
          continue;
        }
        
        // Converti dateTime in Date se è una stringa
        const meetingDate = new Date(meeting.dateTime);
        
        // DEBUG: Log della data originale
        console.log(`DEBUG - Meeting ${meeting.id}: dateTime originale = ${meetingDate.toISOString()}`);
        
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
        
        console.log(`DEBUG - Meeting ${meeting.id} formattato: date=${dateStr}, startTime=${startTime}, endTime=${endTime}`);
        
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
      
      console.log(`DEBUG - Invio ${events.length} eventi al frontend`);
      res.json({ events });
    } catch (error) {
      console.error('Error fetching agenda:', error);
      res.status(500).json({ error: 'Failed to fetch agenda' });
    }
  });
  
  // Trova la route per creare un meeting POST /api/meetings
  app.post('/api/meetings', isAuthenticated, async (req, res) => {
    try {
      const { clientId, subject, dateTime, duration, notes, location, sendEmail } = req.body;
      
      if (!clientId || !subject || !dateTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log('Creating meeting with data:', req.body);
      console.log('DateTime received:', dateTime);
      console.log('Send email option:', sendEmail);
      
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
        console.log('Parsed meeting date:', meetingDate);
      } catch (e) {
        console.error('Error parsing date:', e);
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
      
      // Importante: create un oggetto per l'inserimento che abbia dateTime come Date vero e proprio
      const meetingToCreate = {
        clientId: parseInt(clientId),
        advisorId: req.user?.id as number,
        subject,
        title: subject, // Use subject as title initially
        location: location || 'zoom', // Use provided location or default to zoom
        dateTime: meetingDate, // Come oggetto Date
        duration: duration || 60, // Use provided duration or default to 60 minutes
        notes: notes || ''
      };
      
      console.log('Creating meeting with final data:', meetingToCreate);
      console.log('dateTime type:', typeof meetingToCreate.dateTime);
      
      // Create a new meeting in the database
      const meeting = await storage.createMeeting(meetingToCreate);
      
      // Invia email solo se l'opzione è attivata
      let emailSent = false;
      if (sendEmail === true) {
        try {
          // Format the date for display in the email
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
          
          // Calculate end time based on duration
          const endTime = new Date(meetingDate);
          endTime.setMinutes(endTime.getMinutes() + (duration || 60));
          
          // Generate iCalendar data
          const icalData = generateICalendarEvent({
            startTime: meetingDate,
            endTime: endTime, // Use calculated end time based on duration
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
              false // Non creare automaticamente un log per l'email
            );
            
            console.log(`Meeting invitation email sent to ${client.email}`);
            emailSent = true;
          } else {
            console.log(`Cannot send meeting invitation: client email is missing`);
          }
        } catch (emailError) {
          console.error('Error sending meeting invitation email:', emailError);
          // Continue even if email sending fails
        }
      } else {
        console.log('Email invito non inviata per scelta dell\'utente');
      }
      
      res.status(201).json({ 
        success: true, 
        meeting,
        emailSent,
        icalData: sendEmail === true ? icalData : undefined // Include the iCalendar data in the response if email was sent
      });
    } catch (error) {
      console.error('Error scheduling meeting:', error);
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
      const { title, location, notes, dateTime, duration } = req.body;
      
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
          console.log(`Meeting ${meetingId} nuova data: ${meetingDate.toISOString()}`);
        } catch (err) {
          console.error('Errore nella parsificazione della data:', err);
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
      
      if (isDateTimeChanged && updatedMeeting) {
        const meeting = updatedMeeting;
        
        try {
          // Ottieni le informazioni del cliente per inviare l'email
          const client = await storage.getClient(meeting.clientId as number);
          
          if (client && client.email) {
            // Ottieni le informazioni dell'advisor
            const advisor = await storage.getUser(advisorId);
            
            if (advisor) {
              await sendMeetingUpdateEmail({
                to: client.email,
                clientName: client.firstName,
                advisorName: advisor.name || advisor.username,
                advisorEmail: advisor.email,
                subject: meeting.subject,
                dateTime: meeting.dateTime,
                location: meeting.location || "Videoconferenza",
                notes: meeting.notes
              });
              
              console.log(`Email di aggiornamento inviata a ${client.email} per il meeting ${meetingId}`);
            }
          }
        } catch (emailError) {
          console.error('Errore invio email:', emailError);
          // Non fallire l'intera operazione se l'email non va a buon fine
        }
      }
      
      res.json(updatedMeeting);
    } catch (error) {
      console.error('Errore aggiornamento meeting:', error);
      res.status(500).json({ error: 'Errore durante l\'aggiornamento del meeting' });
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
      console.error('Error deleting meeting:', error);
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
  }) {
    // Format times to iCal format
    const formatDate = (date: Date) => {
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
      console.error('Error fetching compliance data:', error);
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
      
      // Se non ci sono attività dai log, genera alcune attività simulate
      if (activities.length === 0) {
        const simulatedActivities = [
          {
            id: 1,
            type: 'call',
            description: 'Call completed with',
            client: 'Marco T.',
            time: '10:30 AM',
            status: 'summary ready',
            color: 'blue'
          },
          {
            id: 2,
            type: 'lead',
            description: 'New prospect added',
            client: 'Serena V.',
            time: '9:15 AM',
            status: 'added by you',
            color: 'green'
          },
          {
            id: 3,
            type: 'document',
            description: 'Proposal sent to',
            client: 'Giuseppe N.',
            time: 'Yesterday',
            status: 'awaiting feedback',
            color: 'amber'
          },
          {
            id: 4,
            type: 'message',
            description: 'Message from',
            client: 'Laura B.',
            time: 'Yesterday',
            status: 'needs response',
            color: 'purple'
          }
        ];
        
        activities.push(...simulatedActivities);
      }
      
      res.json({ activities });
    } catch (error) {
      console.error('Error fetching activity data:', error);
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
      console.error('Error updating MIFID data:', error);
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
      console.error('Error fetching MIFID data:', error);
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
      console.error('Error updating client assets:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Invalid asset data', errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update client assets', error: String(error) });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
