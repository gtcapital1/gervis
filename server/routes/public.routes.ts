import type { Express, Request, Response } from "express";
import { contactFormSchema, safeLog, handleErrorResponse } from "../routes";
import { sendCustomEmail } from "../email";

export function registerPublicRoutes(app: Express) {
  // Handle landing page contact form submission
  app.post('/api/contact', (req, res) => {
    const formData = req.body;
    safeLog('Nuova richiesta di contatto', formData, 'info');
    
    // Validazione dei dati
    const validationResult = contactFormSchema.safeParse(formData);
    if (!validationResult.success) {
      safeLog('Errore di validazione dei dati di contatto', validationResult.error, 'error');
      return res.status(400).json({ success: false, message: 'Dati di contatto non validi' });
    }
    
    // Invia email di notifica
    sendCustomEmail(
      'info@gervis.com',
      'Nuova richiesta di contatto',
      `Nuova richiesta di contatto da ${formData.firstName} ${formData.lastName} (${formData.email})`,
      'italian',
      undefined,
      'Gervis Financial Advisor',
      'info@gervis.com',
      /* clientId */ undefined,
      /* userId */ 1,  // Usa un ID utente predefinito (es. admin) invece di un boolean
      /* logEmail */ true 
    );
    
    res.json({ success: true, message: 'Richiesta di contatto inviata con successo' });
  });
} 