import type { Express, Request, Response } from "express";
import { z } from "zod";
import { setupAuth, comparePasswords, hashPassword, generateVerificationToken, getTokenExpiryTimestamp } from "../auth";
import { sendVerificationPin } from "../email";
import { storage } from "../storage";

export function registerAuthRoutes(app: Express) {
  // Configurazione dell'autenticazione
  setupAuth(app);
  
  // Rotte di autenticazione
  
  // Logout
  app.post("/api/logout", (req, res, next) => {
    // Implementazione logout
    console.log("[AUTH] Logout request");
    req.logout((err) => {
      if (err) {
        console.error("[AUTH] Logout error:", err);
        return next(err);
      }
      res.json({ success: true, message: "Logout successful" });
    });
  });
  
  // Verifica email
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
        'italian',
        user.id,
        true
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
  
  // Verifica PIN
  app.post("/api/verify-pin", async (req, res, next) => {
    // Implementazione verifica PIN
  });
  
  // Richiesta nuovo PIN
  app.post("/api/resend-pin", async (req, res, next) => {
    // Implementazione reinvio PIN
  });
} 