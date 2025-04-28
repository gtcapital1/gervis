import type { Express, Request, Response } from "express";
import { z } from "zod";
import { comparePasswords, hashPassword } from "../auth.js";
import { storage } from "../storage.js";
import { safeLog, isAuthenticated, rateLimit, handleErrorResponse } from "../routes.js";

export function registerUserRoutes(app: Express) {
  // Rotte di gestione utenti
  
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
  
  // Update email settings
  app.post('/api/user/email-settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(403).json({ message: 'Not authenticated' });
      }
      
      // Email settings schema
      const emailSettingsSchema = z.object({
        smtp_host: z.string().optional(),
        smtp_port: z.number().optional(),
        smtp_user: z.string().optional(),
        smtp_pass: z.string().optional(),
        custom_email_enabled: z.boolean().optional(),
      });
      
      const validatedData = emailSettingsSchema.parse(req.body);
      
      // Log the request for debugging
      console.log('Email settings update request:', {
        userId,
        data: { ...validatedData, smtp_pass: validatedData.smtp_pass ? '******' : undefined }
      });
      
      // Update the user's email settings
      await storage.updateUser(userId, {
        smtp_host: validatedData.smtp_host,
        smtp_port: validatedData.smtp_port,
        smtp_user: validatedData.smtp_user,
        smtp_pass: validatedData.smtp_pass,
        custom_email_enabled: validatedData.custom_email_enabled
      });
      
      res.json({ 
        success: true,
        message: 'Email settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating email settings:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update email settings' });
      }
    }
  });
  
  // Get email settings
  app.get('/api/user/email-settings', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(403).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return only email-related settings
      const emailSettings = {
        smtp_host: user.smtp_host,
        smtp_port: user.smtp_port,
        smtp_user: user.smtp_user,
        custom_email_enabled: user.custom_email_enabled
      };
      
      res.json({ 
        success: true,
        emailSettings
      });
    } catch (error) {
      console.error('Error getting email settings:', error);
      res.status(500).json({ message: 'Failed to retrieve email settings' });
    }
  });
} 