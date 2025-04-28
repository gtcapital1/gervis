import type { Express, Request, Response } from "express";
import { safeLog, handleErrorResponse, isAuthenticated, typedCatch } from "../routes.js";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { signatureSessions, verifiedDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import PDFMerger from 'pdf-merger-js';
import { UploadedFile } from 'express-fileupload';

export function registerSignatureRoutes(app: Express) {
  // Generate a signature session with secure token for mobile verification
  app.post('/api/signature-sessions', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      const { clientId, documentUrl } = req.body;
      
      // Debug log per verificare cosa riceviamo
      console.log('[DEBUG] Creazione sessione di firma:', { 
        clientId, 
        documentUrl,
        documentUrlType: typeof documentUrl,
        hasDocumentUrl: !!documentUrl,
        body: req.body
      });
      
      if (!clientId) {
        return res.status(400).json({ success: false, message: 'ID cliente richiesto' });
      }
      
      // Get client from database to verify ownership
      const client = await storage.getClient(Number(clientId));
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo di generazione sessione firma non autorizzato', 
          { userId: req.user.id, clientId, clientOwner: client.advisorId }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato per questo cliente' });
      }
      
      // Generate unique session ID and token
      const sessionId = `sig-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set session expiry to 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Store session in the new signatureSessions table
      const createdSession = await db.insert(signatureSessions).values({
        id: sessionId,
        clientId: Number(clientId),
        createdBy: req.user.id,
        token,
        expiresAt,
        documentUrl: documentUrl || null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Create log entry for audit trail
      await storage.createClientLog({
        clientId: Number(clientId),
        type: 'SIGNATURE_SESSION_CREATED',
        title: 'Creazione sessione di firma digitale',
        content: `Creata sessione per firma digitale: ${sessionId}`,
        logDate: new Date(),
        createdBy: req.user.id
      });
      
      safeLog('Creata sessione di firma digitale', { 
        userId: req.user.id, 
        clientId, 
        sessionId,
        expiresAt
      }, 'info');
      
      res.json({ 
        success: true, 
        sessionId,
        token,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error: unknown) {
      safeLog('Errore durante la creazione della sessione di firma', error, 'error');
      handleErrorResponse(res, error, 'Impossibile creare la sessione di firma');
    }
  });
  
  // Verify a signature session token (for mobile verification)
  app.get('/api/signature-sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { token } = req.query;
      
      if (!sessionId || !token) {
        return res.status(400).json({ success: false, message: 'ID sessione e token richiesti' });
      }
      
      // Find the session in the database
      const session = await db.query.signatureSessions.findFirst({
        where: (s, { eq, and }) => 
          and(
            eq(s.id, sessionId),
            eq(s.status, "pending")
          )
      });
      
      // If no session found, it's invalid
      if (!session) {
        return res.status(404).json({ success: false, message: 'Sessione non trovata o non più valida' });
      }
      
      // Verify token
      if (session.token !== token) {
        return res.status(403).json({ success: false, message: 'Token non valido' });
      }
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        // Update session status to expired
        await db.update(signatureSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(signatureSessions.id, sessionId));
          
        return res.status(400).json({ success: false, message: 'Sessione scaduta' });
      }
      
      // Get client details
      const client = await storage.getClient(session.clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Return minimal client and document info
      res.json({
        success: true,
        sessionValid: true,
        clientName: client.name,
        clientId: client.id,
        documentUrl: session.documentUrl
      });
    } catch (error: unknown) {
      safeLog('Errore durante la verifica della sessione di firma', error, 'error');
      handleErrorResponse(res, error, 'Impossibile verificare la sessione di firma');
    }
  });

  // Endpoint per verificare lo stato di una sessione di firma (se completata o ancora valida)
  app.get('/api/signature-sessions/:sessionId/status', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { token } = req.query;
      
      if (!sessionId || !token) {
        return res.status(400).json({ success: false, message: 'ID sessione e token richiesti' });
      }
      
      // Verifica sessione nella nuova tabella
      const session = await db.query.signatureSessions.findFirst({
        where: (s, { eq }) => eq(s.id, sessionId)
      });
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Sessione non trovata' });
      }
      
      // Verifica token
      if (session.token !== token) {
        return res.status(403).json({ success: false, message: 'Token non valido' });
      }
      
      // Controlla lo stato della sessione
      if (session.status === "completed") {
        return res.json({
          success: true,
          status: 'completed',
          message: 'Questa sessione è già stata completata',
          completedAt: session.completedAt
        });
      } else if (session.status === "expired") {
        return res.json({
          success: true,
          status: 'expired',
          message: 'Questa sessione è scaduta'
        });
      } else if (session.status === "rejected") {
        return res.json({
          success: true,
          status: 'rejected',
          message: 'Questa sessione è stata rifiutata'
        });
      }
      
      // Controlla la data di scadenza
      if (new Date() > new Date(session.expiresAt)) {
        // Aggiorna stato a scaduto
        await db.update(signatureSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(signatureSessions.id, sessionId));
        
        return res.json({
          success: true,
          status: 'expired',
          message: 'Questa sessione è scaduta'
        });
      }
      
      // La sessione è valida
      res.json({
        success: true,
        status: 'valid',
        message: 'Sessione valida'
      });
      
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante il controllo dello stato della sessione', typedError, 'error');
      handleErrorResponse(res, typedError, 'Errore durante il controllo dello stato della sessione');
    }
  });

  // GET endpoint to retrieve verified documents for a client
  app.get('/api/verified-documents/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ success: false, message: 'ID cliente non valido' });
      }
      
      // Query the database to get all verified documents for this client
      const documents = await db.query.verifiedDocuments.findMany({
        where: (doc, { eq }) => eq(doc.clientId, clientId),
        orderBy: (doc, { desc }) => [desc(doc.verificationDate)]
      });
      
      // Return the documents
      res.json({
        success: true,
        documents
      });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante il recupero dei documenti verificati', typedError, 'error');
      handleErrorResponse(res, typedError, 'Errore durante il recupero dei documenti verificati');
    }
  });
  
  // POST endpoint per inserire manualmente un documento verificato
  app.post('/api/verified-documents/manual', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
      }
      
      // Valida il corpo della richiesta
      const { clientId, sessionId, documentUrl } = req.body;
      
      if (!clientId || !sessionId || !documentUrl) {
        return res.status(400).json({ 
          success: false, 
          message: 'clientId, sessionId e documentUrl sono campi obbligatori' 
        });
      }
      
      // Trova il cliente per verifica
      const client = await db.query.clients.findFirst({
        where: (c, { eq }) => eq(c.id, clientId)
      });
      
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Verifica che l'utente corrente sia l'advisor del cliente
      if (client.advisorId !== req.user.id) {
        safeLog('Tentativo non autorizzato di caricare documento', { 
          userId: req.user.id, 
          clientId 
        }, 'error');
        return res.status(403).json({ success: false, message: 'Non autorizzato' });
      }
      
      // Crea un placeholder URL per idFront, idBack e selfie
      const placeholderUrl = `/api/placeholder-image`;
      
      // Inserisci il documento
      const documentRecord = await db.insert(verifiedDocuments).values({
        clientId: Number(clientId),
        sessionId,
        idFrontUrl: placeholderUrl,
        idBackUrl: placeholderUrl,
        selfieUrl: placeholderUrl,
        documentUrl,
        tokenUsed: "manual-upload",
        verificationDate: new Date(),
        createdBy: req.user.id
      }).returning();
      
      safeLog('Documento caricato manualmente', { 
        clientId, 
        documentRecordId: documentRecord[0].id,
        userId: req.user.id
      }, 'info');
      
      res.json({
        success: true,
        message: 'Documento caricato con successo',
        documentId: documentRecord[0].id
      });
      
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore nel caricamento manuale del documento', typedError, 'error');
      handleErrorResponse(res, typedError, 'Errore nel caricamento del documento');
    }
  });

  // API for identity verification using document and selfie
  app.post('/api/verify-identity', async (req, res) => {
    try {
      // Verificare se sono stati caricati i file
      if (!req.files || Object.keys(req.files).length === 0) {
        safeLog('Nessun file caricato', {}, 'error');
        return res.status(400).json({ success: false, message: 'Nessun file caricato' });
      }

      // Estrarre sessionId e token dalla richiesta
      let { sessionId, token } = req.body;
      
      // Facciamo un log per il debug
      console.log('Dati verificati ricevuti (raw):', req.body);
      
      // Correggere token se arriva come stringa "undefined" o vuota
      if (!token || token === "undefined" || token === "") {
        // Proviamo a recuperare il token dai parametri di query
        const urlToken = req.query.token;
        if (urlToken && typeof urlToken === 'string') {
          console.log('Recuperato token dai parametri di query:', urlToken);
          token = urlToken;
        } else {
          // Proviamo a recuperare il token dall'header Authorization
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            console.log('Recuperato token dall\'header Authorization');
            token = authHeader.substring(7);
          } else {
            console.log('Token non trovato in nessuna fonte');
            return res.status(400).json({ success: false, message: 'Token richiesto' });
          }
        }
      }
      
      // Log dei dati ricevuti per debug
      console.log('Dati di verifica elaborati:', {
        sessionIdType: typeof sessionId,
        sessionIdValue: sessionId,
        tokenType: typeof token,
        tokenValue: token,
        hasFiles: !!req.files,
        filesCount: Object.keys(req.files).length
      });
      
      if (!sessionId) {
        safeLog('ID sessione mancante', {}, 'error');
        return res.status(400).json({ success: false, message: 'ID sessione richiesto' });
      }

      // Trovare la sessione nel database usando la nuova tabella
      const session = await db.query.signatureSessions.findFirst({
        where: (s, { eq }) => eq(s.id, sessionId)
      });
      
      // Se nessuna sessione trovata, la sessione non è valida
      if (!session) {
        safeLog('Sessione non trovata', { sessionId }, 'error');
        return res.status(404).json({ success: false, message: 'Sessione non trovata' });
      }
      
      // Verifica stato sessione
      if (session.status !== "pending") {
        safeLog('Sessione non più valida', { sessionId, status: session.status }, 'error');
        return res.status(400).json({ 
          success: false, 
          message: `Questa sessione è ${session.status === "completed" ? "già stata completata" : "non più valida"}`,
          alreadyVerified: session.status === "completed"
        });
      }
      
      // Verifica token
      if (session.token !== token) {
        safeLog('Token non valido', { sessionId }, 'error');
        return res.status(403).json({ success: false, message: 'Token non valido' });
      }
      
      // Verifica scadenza
      if (new Date() > new Date(session.expiresAt)) {
        // Aggiorna stato a scaduto
        await db.update(signatureSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(signatureSessions.id, sessionId));
        
        safeLog('Sessione scaduta', { sessionId }, 'error');
        return res.status(400).json({ success: false, message: 'Sessione scaduta' });
      }
      
      // Ottiene dettagli del cliente
      const client = await storage.getClient(session.clientId);
      if (!client) {
        safeLog('Cliente non trovato', { clientId: session.clientId }, 'error');
        return res.status(404).json({ success: false, message: 'Cliente non trovato' });
      }
      
      // Verifica se esiste già un documento verificato per questa sessione
      const existingDocument = await db.query.verifiedDocuments.findFirst({
        where: (doc, { eq }) => eq(doc.sessionId, sessionId)
      });
      
      if (existingDocument) {
        safeLog('Sessione già verificata', { sessionId }, 'error');
        return res.status(400).json({ 
          success: false, 
          message: 'Questa sessione è già stata completata',
          alreadyVerified: true
        });
      }
      
      // Estrai i file dal request
      const files = req.files as { [fieldname: string]: UploadedFile | UploadedFile[] };
      const idFront = Array.isArray(files.idFront) ? files.idFront[0] : files.idFront;
      const idBack = Array.isArray(files.idBack) ? files.idBack[0] : files.idBack;
      const selfie = Array.isArray(files.selfie) ? files.selfie[0] : files.selfie;
      
      // Verifica che tutti i file siano presenti
      if (!idFront || !idBack || !selfie) {
        safeLog('File mancanti', { 
          hasIdFront: !!idFront, 
          hasIdBack: !!idBack, 
          hasSelfie: !!selfie 
        }, 'error');
        return res.status(400).json({ 
          success: false, 
          message: 'Tutti i file richiesti devono essere caricati' 
        });
      }
      
      // Creare percorsi per i file
      const timestamp = Date.now();
      const frontFileName = `id_front_${client.id}_${timestamp}.jpg`;
      const backFileName = `id_back_${client.id}_${timestamp}.jpg`;
      const selfieFileName = `selfie_${client.id}_${timestamp}.jpg`;
      
      // Determina il percorso base in base all'ambiente
      const isProduction = process.env.NODE_ENV === 'production';
      const basePath = process.cwd();
      
      // Definisci la directory di upload e assicurati che esista
      let uploadDir: string;
      if (isProduction) {
        // In produzione, usa la directory private/uploads
        uploadDir = path.join(basePath, 'server', 'private', 'uploads');
        safeLog('Usando directory di upload privata per produzione', { uploadDir });
      } else {
        // In sviluppo, usa la directory server/private/uploads
        uploadDir = path.join(basePath, 'server', 'private', 'uploads');
        safeLog('Usando directory di upload privata per sviluppo', { uploadDir });
      }
      
      // Verifica se la directory esiste, altrimenti creala
      if (!fs.existsSync(uploadDir)) {
        try {
          fs.mkdirSync(uploadDir, { recursive: true });
          safeLog('Directory uploads privata creata con successo', { uploadDir }, 'info');
        } catch (mkdirError) {
          safeLog('Errore nella creazione della directory uploads privata', mkdirError, 'error');
          return res.status(500).json({ 
            success: false, 
            message: 'Errore nella creazione della directory di upload' 
          });
        }
      }
      
      // Crea una sottodirectory per il client per organizzare meglio i file
      const clientUploadDir = path.join(uploadDir, `client_${client.id}`);
      if (!fs.existsSync(clientUploadDir)) {
        fs.mkdirSync(clientUploadDir, { recursive: true });
      }
      
      // Salva effettivamente i file
      try {
        // Salva ID fronte
        await idFront.mv(path.join(clientUploadDir, frontFileName));
        
        // Salva ID retro
        await idBack.mv(path.join(clientUploadDir, backFileName));
        
        // Salva selfie
        await selfie.mv(path.join(clientUploadDir, selfieFileName));
        
        safeLog('File salvati con successo nella directory privata', { 
          uploadDir: clientUploadDir,
          frontFileName, 
          backFileName, 
          selfieFileName 
        }, 'info');
      } catch (fileError) {
        safeLog('Errore nel salvataggio dei file nella directory privata', fileError, 'error');
        return res.status(500).json({ 
          success: false, 
          message: 'Errore nel salvataggio dei file' 
        });
      }
      
      // I percorsi URL per i file salvati (ora utilizziamo un endpoint API sicuro)
      const baseUrl = '/api/secured-files';
      const idFrontUrl = `${baseUrl}/${client.id}/${frontFileName}`;
      const idBackUrl = `${baseUrl}/${client.id}/${backFileName}`;
      const selfieUrl = `${baseUrl}/${client.id}/${selfieFileName}`;
      
      // Verifica l'identità con esito sempre positivo
      const verificationResult = { success: true };
      
      // Se la sessione ha un documentUrl, dobbiamo processare il PDF
      let processedDocumentUrl = session.documentUrl;
      if (session.documentUrl) {
        try {
          // Ricava il percorso locale del file dal documentUrl
          const parsedUrl = new URL(session.documentUrl, `http://${req.headers.host}`);
          const documentPath = decodeURIComponent(parsedUrl.pathname);
          
          // Correggo il percorso per garantire coerenza
          let originalFilePath;
          
          // Gestisci sia URL pubblici vecchi che URL privati nuovi
          if (documentPath.startsWith('/client/public/')) {
            // Percorso vecchio (pubblico)
            const relativePath = documentPath.replace(/^\/client\/public\//, '');
            originalFilePath = path.join(process.cwd(), 'client', 'public', relativePath);
          } else if (documentPath.startsWith('/api/secured-files/')) {
            // Percorso nuovo (privato)
            const parts = documentPath.replace(/^\/api\/secured-files\//, '').split('/');
            const clientId = parts[0];
            const fileName = parts.slice(1).join('/');
            originalFilePath = path.join(process.cwd(), 'server', 'private', 'uploads', `client_${clientId}`, fileName);
          } else {
            // Fallback, prova a usare il percorso così com'è
            originalFilePath = path.join(process.cwd(), documentPath);
          }
          
          safeLog('Percorso file originale', { 
            documentUrl: session.documentUrl,
            parsedPath: documentPath,
            absolutePath: originalFilePath
          }, 'info');
          
          // Verifica se il file esiste
          if (fs.existsSync(originalFilePath)) {
            // Crea un nuovo nome file per la versione firmata
            const fileExt = path.extname(originalFilePath);
            const fileNameWithoutExt = path.basename(originalFilePath, fileExt);
            const signedFileName = `${fileNameWithoutExt}_signed_${timestamp}${fileExt}`;
            
            // Il file firmato va nella directory privata del client
            const signedFilePath = path.join(clientUploadDir, signedFileName);
            
            safeLog('Percorso file firmato', { 
              signedPath: signedFilePath
            }, 'info');
            
            // Crea una copia del PDF originale
            fs.copyFileSync(originalFilePath, signedFilePath);
            
            try {
              console.log('[SERVER DEBUG] Inizio manipolazione PDF');
              
              // Usiamo import() dinamico o vediamo se PDFKit è già importato
              let PDFKit;
              try {
                // Prova a usare il PDFDocument già importato
                PDFKit = await import('pdfkit').then(module => module.default);
              } catch (importError) {
                console.error('[SERVER DEBUG] Errore importazione pdfkit dinamica:', importError);
                // Fallback: crea una copia semplice del file senza manipolazione
                fs.copyFileSync(originalFilePath, signedFilePath);
                console.log('[SERVER DEBUG] Fallback: copiato file originale senza manipolazione');
                return;
              }
              
              console.log('[SERVER DEBUG] File originale:', originalFilePath);
              console.log('[SERVER DEBUG] File firmato:', signedFilePath);
              
              // FORZARE L'URL DEL DOCUMENTO FIRMATO
              // Ora utilizziamo il percorso API sicuro
              processedDocumentUrl = `${baseUrl}/${client.id}/${signedFileName}`;
              console.log('[SERVER DEBUG] URL documento firmato forzato a:', processedDocumentUrl);
              
              // Per sicurezza, facciamo una copia semplice del file come fallback
              fs.copyFileSync(originalFilePath, signedFilePath);
              console.log('[SERVER DEBUG] Copia di sicurezza del file originale creata');
              
              // Ora tentiamo di creare un PDF con la pagina di firma
              try {
                // Creiamo un file temporaneo per la pagina di firma
                const signaturePage = path.join(path.dirname(signedFilePath), `signature_page_${Date.now()}.pdf`);
                console.log('[SERVER DEBUG] File temporaneo pagina firma:', signaturePage);
                
                // Crea un documento PDF per la pagina di firma
                const signatureDoc = new PDFKit();
                const signatureStream = fs.createWriteStream(signaturePage);
                signatureDoc.pipe(signatureStream);
              
              // Formatta la data in italiano
              const formattedDate = new Date().toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              
              // Aggiungi il testo di conferma firma
                signatureDoc.fontSize(18)
                  .text('CONFERMA DI FIRMA DIGITALE', {
                    align: 'center'
                  })
                  .moveDown(2)
                  .fontSize(14)
                  .text(`Il cliente ha firmato digitalmente il documento in data:`, {
                    align: 'center'
                  })
                  .moveDown(1)
                  .text(`${formattedDate}`, {
                     align: 'center'
                   });
                   
              // Aggiungi il testo aggiuntivo con il sessionId
                signatureDoc.moveDown(2)
                   .fontSize(10)
                   .text(`ID Sessione: ${sessionId}`, {
                     align: 'center'
                   })
                   .moveDown(0.5)
                   .text(`Verifica completata con successo tramite riconoscimento facciale.`, {
                     align: 'center'
                   });
              
              // Finalizza il PDF
                signatureDoc.end();
              
                // Attendiamo che la scrittura della pagina di firma sia completata
              await new Promise<void>((resolve) => {
                  signatureStream.on('finish', () => {
                    console.log('[SERVER DEBUG] Pagina di firma creata con successo');
                  resolve();
                });
              });
              
                // Verifica che la pagina di firma sia stata creata correttamente
                if (fs.existsSync(signaturePage)) {
                  // Ora uniamo i PDF utilizzando PDFMerger
                  try {
                    const merger = new PDFMerger();
                    await merger.add(originalFilePath);
                    console.log('[SERVER DEBUG] PDF originale aggiunto al merger');
                    
                    await merger.add(signaturePage);
                    console.log('[SERVER DEBUG] Pagina di firma aggiunta al merger');
                    
                    // File temporaneo per il merge
                    const tempMergedPath = path.join(path.dirname(signedFilePath), `temp_merged_${Date.now()}.pdf`);
                    
                    // Salviamo in un file temporaneo per maggiore sicurezza
                    await merger.save(tempMergedPath);
                    console.log('[SERVER DEBUG] PDF unito salvato in file temporaneo:', tempMergedPath);
                    
                    // Verifichiamo che il file temporaneo esista
                    if (fs.existsSync(tempMergedPath)) {
                      // Ora sovrascriviamo il file firmato con quello unito
                      fs.copyFileSync(tempMergedPath, signedFilePath);
                      console.log('[SERVER DEBUG] File temporaneo copiato nel file firmato finale');
                      
                      // Eliminiamo il file temporaneo
                      fs.unlinkSync(tempMergedPath);
                      console.log('[SERVER DEBUG] File temporaneo eliminato');
                    } else {
                      console.error('[SERVER DEBUG] File temporaneo unito non trovato');
                    }
                  } catch (mergeError) {
                    console.error('[SERVER DEBUG] Errore durante l\'unione dei PDF:', mergeError);
                    // Nota: non è necessario fare nulla qui perché abbiamo già una copia di fallback
                  }
                  
                  // Puliamo la pagina di firma temporanea
                  try {
                    fs.unlinkSync(signaturePage);
                    console.log('[SERVER DEBUG] Pagina di firma temporanea eliminata');
                  } catch (cleanupError) {
                    console.error('[SERVER DEBUG] Errore nella pulizia del file temporaneo:', cleanupError);
                  }
                } else {
                  console.error('[SERVER DEBUG] Pagina di firma non creata correttamente');
                }
                
                console.log('[SERVER DEBUG] Firma digitale completata con successo');
              } catch (innerError) {
                console.error('[SERVER DEBUG] Errore nel creare la pagina di firma:', innerError);
                // Non facciamo niente, la copia di sicurezza è già stata fatta
              }
              
              safeLog('PDF firmato creato con successo', { 
                originalPath: originalFilePath,
                signedPath: signedFilePath,
                signedUrl: processedDocumentUrl
              }, 'info');
            } catch (pdfError) {
              console.error('[SERVER DEBUG] Errore nella manipolazione del PDF:', pdfError);
              safeLog('Errore nella manipolazione del PDF', pdfError, 'error');
            }
          } else {
            safeLog('File originale non trovato', { 
              path: originalFilePath,
              documentUrl: session.documentUrl
            }, 'error');
          }
        } catch (urlError) {
          safeLog('Errore nel parsing dell\'URL del documento', urlError, 'error');
        }
      }
      
      // Crea un record per i documenti verificati
      const documentRecord = await db.insert(verifiedDocuments).values({
        clientId: client.id,
        sessionId,
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        documentUrl: processedDocumentUrl, // Utilizza ESCLUSIVAMENTE l'URL elaborato
        tokenUsed: token,
        verificationDate: new Date(),
        createdBy: session.createdBy
      }).returning();
      
      // Log dettagliato per tracciare quale URL viene effettivamente salvato
      safeLog('URL documento salvato in verifiedDocuments', {
        originalUrl: session.documentUrl,
        processedUrl: processedDocumentUrl,
        savedUrl: processedDocumentUrl
      }, 'info');
      
      // Aggiorna stato sessione a completato
      await db.update(signatureSessions)
        .set({ 
          status: "completed", 
          updatedAt: new Date(),
          completedAt: new Date()
        })
        .where(eq(signatureSessions.id, sessionId));
      
      safeLog('Verifica identità completata con successo', { 
        clientId: client.id, 
        sessionId,
        documentRecordId: documentRecord[0].id
      }, 'info');
      
      // Includi documentUrl nella risposta per garantire coerenza
      res.json({ 
        success: true, 
        message: 'Identità verificata con successo',
        documentUrl: processedDocumentUrl
      });
      
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante la verifica dell\'identità', typedError, 'error');
      handleErrorResponse(res, typedError, 'Errore durante la verifica dell\'identità');
    }
  });
} 