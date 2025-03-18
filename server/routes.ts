import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertClientSchema, insertAssetSchema, insertRecommendationSchema } from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword, generateVerificationToken, getTokenExpiryTimestamp } from "./auth";
import { sendCustomEmail, sendVerificationEmail } from "./email";

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
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
      res.json({ success: true, user: req.user });
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' });
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
      await storage.updateUser(req.user.id, { signature: validatedData.signature });
      
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
      const advisor = await storage.getUser(req.user.id);
      
      // Send email
      await sendCustomEmail(
        client.email,
        subject,
        message,
        language as 'english' | 'italian',
        undefined,
        advisor?.signature || undefined
      );
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, message: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}