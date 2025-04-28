import type { Express, Request, Response } from "express";
import { storage } from "../storage.js";
import { safeLog, isAuthenticated } from "../routes.js";

export function registerAdminRoutes(app: Express) {
  // Middleware per verificare se l'utente è admin
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
      
      // Check if user exists before deletion
      const userExists = await storage.getUser(userId);
      if (!userExists) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }
      
      // Log the deletion attempt
      console.log(`[Admin API] Deleting user ID: ${userId}`);
      
      const success = await storage.deleteUser(userId);
      
      // Send back a success response regardless
      // The user was either deleted or didn't exist, both cases should be considered "success"
      // from an idempotency perspective
      res.json({ 
        success: true, 
        message: 'Utente eliminato con successo',
        userId: userId
      });
      
    } catch (error) {
      console.error(`[Admin API] Error deleting user:`, error);
      res.status(500).json({ success: false, message: 'Failed to delete user', error: String(error) });
    }
  });
} 