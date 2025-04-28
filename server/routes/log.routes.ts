import type { Express, Request, Response } from "express.js";
import { safeLog, handleErrorResponse, isAuthenticated, typedCatch } from "../routes.js";
import { storage } from "../storage.js";
import { clientLogs } from "@shared/schema";
import { eq } from "drizzle-orm.js";
import { db } from "../db.js";

export function registerLogRoutes(app: Express) {
  // Get logs for a specific client
  app.get('/api/client-logs/:clientId', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Get client from database to verify ownership
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di accesso non autorizzato ai log del cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato ad accedere ai log di questo cliente' });
      }
      
      // Get logs for this client
      const logs = await storage.getClientLogs(clientId);
      
      res.json({ success: true, logs });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante il recupero dei log del cliente', typedError, 'error');
      handleErrorResponse(res, typedError, 'Impossibile recuperare i log del cliente');
    }
  });
  
  // Create a new log
  app.post('/api/client-logs', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const { clientId, type, title, content, emailSubject, emailRecipients, logDate } = req.body;
      
      if (!clientId || !type || !title || !content || !logDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati mancanti. Richiesti: clientId, type, title, content, logDate' 
        });
      }
      
      // Get client from database to verify ownership
      const client = await storage.getClient(Number(clientId));
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di creazione log non autorizzato per il cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a creare log per questo cliente' });
      }
      
      // Create log in database
      const newLog = await storage.createClientLog({
        clientId: Number(clientId),
        type,
        title,
        content,
        emailSubject,
        emailRecipients,
        logDate: new Date(logDate),
        createdBy: req.user.id
      });
      
      res.json({ success: true, log: newLog });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante la creazione del log', typedError, 'error');
      handleErrorResponse(res, typedError, 'Impossibile creare il log');
    }
  });
  
  // Update a log
  app.put('/api/client-logs/:logId', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const logId = parseInt(req.params.logId);
      if (isNaN(logId)) {
        return res.status(400).json({ success: false, message: 'ID log non valido' });
      }
      
      const { type, title, content, emailSubject, emailRecipients, logDate, clientId } = req.body;
      
      if (!type || !title || !content || !logDate || !clientId) {
        return res.status(400).json({ success: false, message: 'Dati mancanti' });
      }
      
      // Get client from database to verify ownership
      const client = await storage.getClient(Number(clientId));
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di aggiornamento log non autorizzato', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a modificare log per questo cliente' });
      }
      
      // Update log in database
      const updatedLog = await db.update(clientLogs)
        .set({
          type,
          title,
          content,
          emailSubject,
          emailRecipients,
          logDate: new Date(logDate),
          createdBy: req.user.id
        })
        .where(eq(clientLogs.id, logId))
        .returning();
      
      if (!updatedLog || updatedLog.length === 0) {
        return res.status(404).json({ success: false, message: 'Log non trovato' });
      }
      
      res.json({ success: true, log: updatedLog[0] });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante l\'aggiornamento del log', typedError, 'error');
      handleErrorResponse(res, typedError, 'Impossibile aggiornare il log');
    }
  });
  
  // Delete a log
  app.delete('/api/client-logs/:logId', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const logId = parseInt(req.params.logId);
      if (isNaN(logId)) {
        return res.status(400).json({ success: false, message: 'ID log non valido' });
      }
      
      // Get the log first to check permissions
      const log = await db.query.clientLogs.findFirst({
        where: (logs, { eq }) => eq(logs.id, logId),
        with: {
          client: {
            columns: {
              id: true,
              advisorId: true
            }
          }
        }
      });
      
      if (!log) {
        return res.status(404).json({ success: false, message: 'Log non trovato' });
      }
      
      // Verifichiamo che il log e il client esistano
      if (!log.client || !log.client.advisorId) {
        return res.status(404).json({ success: false, message: 'Cliente associato al log non trovato' });
      }
      
      // Check if the client belongs to the current advisor
      if (log.client.advisorId !== req.user.id) {
        safeLog('Tentativo di eliminazione log non autorizzato', 
          { userId: req.user.id, logId, clientId: log.clientId, clientOwner: log.client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a eliminare questo log' });
      }
      
      // Delete the log
      await db.delete(clientLogs).where(eq(clientLogs.id, logId));
      
      res.json({ success: true, message: 'Log eliminato con successo' });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante l\'eliminazione del log', typedError, 'error');
      handleErrorResponse(res, typedError, 'Impossibile eliminare il log');
    }
  });
} 