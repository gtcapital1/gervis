import type { Express, Request, Response } from "express.js";
import { z } from "zod.js";
import { storage } from "../storage.js";
import { safeLog, handleErrorResponse, isAuthenticated, rateLimit, typedCatch, validateFile } from "../routes.js";
import { insertClientSchema } from "@shared/schema";
import { sendCustomEmail, sendOnboardingEmail } from "../email.js";
import fs from 'fs.js';
import path from 'path.js';

export function registerClientRoutes(app: Express) {
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
          console.log('[DEBUG-ROUTES] Before sending onboarding email', {
            clientEmail: client.email,
            firstName,
            lastName,
            linkLength: link.length,
            language,
            hasCustomMessage: !!customMessage,
            hasAdvisorSignature: !!advisor?.signature,
            hasAdvisorEmail: !!advisor?.email,
            hasCustomSubject: !!customSubject,
            clientId: client.id,
            userId: req.user?.id
          });
          
          try {
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
            console.log('[DEBUG-ROUTES] Onboarding email sent successfully');
            // Se arriviamo qui, l'email è stata inviata con successo
            emailSent = true;
          } catch (innerEmailError) {
            console.error('[DEBUG-ROUTES] Error sending onboarding email:', innerEmailError);
            throw innerEmailError; // Rilanciamo per gestire nel catch esterno
          }
          
          
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
      const { subject, message, language = 'english', includeAttachment = true, attachmentUrl } = req.body;
      
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
      
      // Prepara gli allegati se c'è un URL del documento
      let attachments: { filename: string; path: string }[] = [];
      if (includeAttachment && attachmentUrl) {
        try {
          console.log('[EMAIL DEBUG] Preparazione allegato da URL:', attachmentUrl);
          
          // Verifica se l'URL è relativo o assoluto
          let fullPath;
          
          if (attachmentUrl.startsWith('/api/secured-files/')) {
            // È un URL API sicuro, dobbiamo estrarre clientId e fileName
            const securedFilesPattern = /^\/api\/secured-files\/(\d+)\/(.+)$/;
            const matches = attachmentUrl.match(securedFilesPattern);
            
            if (matches && matches.length === 3) {
              const fileClientId = matches[1];
              const securedFileName = matches[2];
              
              // Costruisci il percorso al file nella directory privata
              fullPath = path.join(process.cwd(), 'server', 'private', 'uploads', `client_${fileClientId}`, securedFileName);
              console.log('[EMAIL DEBUG] File privato, percorso completo:', fullPath);
            } else {
              console.error('[EMAIL DEBUG] Formato URL API sicuro non valido:', attachmentUrl);
              throw new Error(`Invalid secured file URL format: ${attachmentUrl}`);
            }
          }
          else if (attachmentUrl.startsWith('/')) {
            // È un URL relativo, costruisci il percorso assoluto
            // Rimuovi /client/public all'inizio se presente
            const relativePath = attachmentUrl.replace(/^\/client\/public\//, '');
            fullPath = path.join(process.cwd(), 'client', 'public', relativePath);
            console.log('[EMAIL DEBUG] File pubblico, percorso completo:', fullPath);
          } else {
            // È già un percorso assoluto
            fullPath = attachmentUrl;
            console.log('[EMAIL DEBUG] Percorso già assoluto:', fullPath);
          }
          
          console.log('[EMAIL DEBUG] Percorso file completo:', fullPath);
          
          // Verifica che il file esista
          if (!fs.existsSync(fullPath)) {
            console.error('[EMAIL DEBUG] File non trovato:', fullPath);
            throw new Error(`File not found: ${fullPath}`);
          }
          
          // Estrai il nome del file dal percorso
          const fileName = path.basename(fullPath);
          console.log('[EMAIL DEBUG] Nome file estratto:', fileName);
          
          // Crea l'allegato
          attachments = [
            {
              filename: fileName,
              path: fullPath
            }
          ];
          
          console.log('[EMAIL DEBUG] Allegato preparato con successo:', attachments);
        } catch (attachError) {
          console.error('[EMAIL DEBUG] Errore nella preparazione dell\'allegato:', attachError);
        return res.status(400).json({ 
          success: false, 
            message: "Error preparing attachment",
            error: String(attachError)
          });
        }
      }
      
      try {
        // Send email and log it automatically
        await sendCustomEmail(
            client.email,
            subject,
          message,
          language as 'english' | 'italian',
          attachments, // Passa gli allegati preparati
          advisor?.signature || undefined,
          advisor?.email,  // CC all'advisor
          client.id,       // ID del cliente per il log
          req.user?.id,    // ID dell'advisor che ha inviato l'email
          true             // Registra l'email nei log
        );
        
        // Log dettagliati anche in caso di successo
        console.log('[EMAIL DEBUG] Email inviata con successo', {
                to: client.email, 
    subject,
          hasAttachments: !!attachments,
          attachmentsCount: attachments?.length
        });
        
        res.json({ success: true, message: "Email sent successfully" });
      } catch (emailError: any) {
        // Log dettagliato dell'errore
        console.error('[EMAIL DEBUG] Errore nell\'invio dell\'email:', emailError);
        
        // Verifica se si tratta di errore di configurazione SMTP mancante
        if (emailError.message && emailError.message.includes("Configurazione email mancante")) {
          // Restituisci un errore user-friendly per la mancanza di configurazione SMTP
          return res.status(400).json({
            success: false,
            message: "Per inviare email, configura le tue impostazioni SMTP nel tab Impostazioni.",
            errorCode: "SMTP_CONFIG_MISSING"
          });
        }
        
        // Estrazione dettagli errore più specifici per altri tipi di errore
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
          message: "Errore nell'invio dell'email", 
          error: String(emailError),
          errorDetails
        });
      }
    } catch (error) {
      handleErrorResponse(res, error, 'Errore nell\'invio dell\'email');
    }
  });

  // Endpoint for saving PDFs in the private directory
  app.post('/api/clients/save-pdf', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      // Verifica file caricato
      if (!req.files || !req.files.pdf) {
        return res.status(400).json({ success: false, message: 'File PDF richiesto' });
      }
      
      // Estrai il file e l'ID cliente
      const pdfFile = req.files.pdf as any; // UploadedFile
      const clientId = req.body.clientId;
      
      if (!clientId) {
        return res.status(400).json({ success: false, message: 'ID cliente richiesto' });
      }
      
      // Verifica proprietà del cliente
      const client = await storage.getClient(Number(clientId));
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo non autorizzato di salvare PDF', { userId: req.user.id, clientId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato' });
      }
      
      // Validazione del file
      const validationResult = validateFile(pdfFile, {
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 10 * 1024 * 1024 // 10MB
      });
      
      if (!validationResult.valid) {
        return res.status(400).json({ success: false, message: validationResult.error });
      }
      
      // Determina il percorso base in base all'ambiente
      const basePath = process.cwd();
      
      // Crea la directory privata per i PDF (server/private/uploads/client_X)
      const uploadDir = path.join(basePath, 'server', 'private', 'uploads');
      const clientUploadDir = path.join(uploadDir, `client_${client.id}`);
      
      // Verifica e crea le directory se non esistono
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      if (!fs.existsSync(clientUploadDir)) {
        fs.mkdirSync(clientUploadDir, { recursive: true });
      }
      
      // Aggiungiamo un timestamp per evitare sovrascritture
      const timestamp = Date.now();
      const originalFileName = pdfFile.name;
      const fileExtension = path.extname(originalFileName);
      const fileNameWithoutExt = path.basename(originalFileName, fileExtension);
      
      // Sanitizza il nome file
      const sanitizedFileName = `${fileNameWithoutExt.replace(/[^a-z0-9]/gi, '_')}_${timestamp}${fileExtension}`;
      const filePath = path.join(clientUploadDir, sanitizedFileName);
      
      // Salva il file
      await pdfFile.mv(filePath);
      
      // Registro l'operazione nei log
      safeLog('PDF salvato nella directory privata', {
        clientId: client.id,
        advisorId: req.user.id,
        fileName: sanitizedFileName,
        filePath: filePath
      }, 'info');
      
      // URL sicuro per accedere al file
      const fileUrl = `/api/secured-files/${client.id}/${sanitizedFileName}`;
      
      res.json({
        success: true,
        message: 'PDF salvato con successo',
        fileUrl
      });
    } catch (error) {
      safeLog('Errore nel salvataggio del PDF', error, 'error');
      handleErrorResponse(res, error, 'Errore nel salvataggio del PDF');
    }
  });

  // Toggle client active status
  app.patch('/api/clients/:id/toggle-active', isAuthenticated, async (req, res) => {
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
        safeLog('Tentativo di aggiornamento non autorizzato dello stato del cliente', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo cliente' });
      }
      
      // Extract active status from request body
      const { active } = req.body;
      if (typeof active !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Stato attivo non specificato' });
      }
      
      // Update client in database
      const updatedClient = await storage.updateClient(clientId, { active });
      
      res.json({ 
        success: true, 
        client: updatedClient,
        message: active ? 'Cliente attivato con successo' : 'Cliente disattivato con successo'
      });
    } catch (error) {
      safeLog('Errore durante l\'aggiornamento dello stato del cliente', error, 'error');
      handleErrorResponse(res, error, 'Impossibile aggiornare lo stato del cliente');
    }
  });

  // Update MIFID data and assets for a client
  app.patch('/api/clients/:id/mifid', isAuthenticated, async (req, res) => {
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
        safeLog('Tentativo di aggiornamento non autorizzato dei dati MIFID', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo cliente' });
      }
      
      const { assets: requestAssets, ...mifidData } = req.body;
      
      // Update MIFID data
      const updatedMifid = await storage.updateMifid(clientId, mifidData);
      
      // Update assets
      if (Array.isArray(requestAssets)) {
        // Prima elimina tutti gli asset esistenti per questo cliente
        await storage.deleteAssetsByClient(clientId);
        
        // Poi inserisci i nuovi asset
        const newAssets = [];
        for (const asset of requestAssets) {
          if (asset.value > 0) {
            const assetData = {
              clientId,
              category: asset.category,
              description: asset.description || '',
              value: asset.value || 0
            };
            
            const newAsset = await storage.createAsset(assetData);
            newAssets.push(newAsset);
          }
        }
        
        // Calcola e aggiorna il patrimonio netto e la fascia del cliente
        const totalAssets = requestAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);
        const debts = mifidData.debts || 0;
        const netWorth = totalAssets - debts;
        
        // Determina la fascia del cliente in base al patrimonio netto
        let clientSegment = 'mass_market';
        if (netWorth >= 500000) clientSegment = 'hnw';
        else if (netWorth >= 100000) clientSegment = 'affluent';
        
        // Aggiorna il cliente con il nuovo patrimonio netto e la fascia
        await storage.updateClient(clientId, { 
          totalAssets, 
          netWorth, 
          clientSegment: clientSegment as any 
        });
        
        // Ritorna i dati MIFID aggiornati e i nuovi asset
        res.json({ 
          success: true, 
          mifid: updatedMifid,
          assets: newAssets
        });
      } else {
        // Se non ci sono asset nella richiesta, ritorna solo i dati MIFID aggiornati
        res.json({ 
          success: true, 
          mifid: updatedMifid
        });
      }
    } catch (error) {
      safeLog('Errore durante l\'aggiornamento dei dati MIFID', error, 'error');
      handleErrorResponse(res, error, 'Impossibile aggiornare i dati MIFID');
    }
  });
} 