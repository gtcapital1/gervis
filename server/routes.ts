import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertClientSchema, insertAssetSchema, insertRecommendationSchema } from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword, generateVerificationToken, getTokenExpiryTimestamp } from "./auth";
import { sendCustomEmail, sendVerificationEmail, sendOnboardingEmail } from "./email";

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

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      res.json({ 
        success: true, 
        client,
        assets,
        recommendations
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
            customSubject
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
        // Send email
        await sendCustomEmail(
          client.email,
          subject,
          message,
          language as 'english' | 'italian',
          undefined,
          advisor?.signature || undefined
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
      
      // Update client with onboarding data
      const updatedClient = await storage.updateClient(client.id, {
        ...clientData,
        isOnboarded: true
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
        ...clientData
      } = req.body;
      
      // Update client with onboarding data
      const updatedClient = await storage.updateClient(client.id, {
        ...clientData,
        isOnboarded: true
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

  const httpServer = createServer(app);
  return httpServer;
}