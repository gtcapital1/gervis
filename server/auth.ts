import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendVerificationPin } from "./email";
import nodemailer from "nodemailer";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log("[Auth] Verifica password iniziata");
    
    // Controllo che stored sia una stringa valida e contenga un punto
    if (!stored || typeof stored !== 'string' || !stored.includes('.')) {
      console.error("[Auth Error] Password stored non valida:", stored);
      console.error(`[Auth DEBUG] Tipo di stored: ${typeof stored}, Lunghezza: ${stored ? stored.length : 0}`);
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    
    // Controllo che hashed e salt siano validi
    if (!hashed || !salt) {
      console.error("[Auth Error] Formato password non valido - hashed o salt mancanti");
      console.error(`[Auth DEBUG] hashed: ${Boolean(hashed)}, salt: ${Boolean(salt)}`);
      return false;
    }
    
    console.log(`[Auth DEBUG] Verifica delle lunghezze - hashed: ${hashed.length}, salt: ${salt.length}`);
    
    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`[Auth DEBUG] Risultato verifica password: ${result ? "Successo" : "Fallimento"}`);
      
      console.log("[Auth] Verifica password completata");
      return result;
    } catch (bufferError) {
      console.error("[Auth Error] Errore durante la creazione o il confronto dei buffer:", bufferError);
      return false;
    }
  } catch (error) {
    console.error("[Auth Error] Errore durante verifica password:", error);
    if (error instanceof Error) {
      console.error(`[Auth DEBUG] Nome errore: ${error.name}, Messaggio: ${error.message}`);
      console.error(`[Auth DEBUG] Stack trace: ${error.stack}`);
    }
    throw error; // Rilanciamo l'errore per gestirlo in passport
  }
}

// Generate a verification token
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

// Generate a 4-digit PIN
export function generateVerificationPin(): string {
  // Generate a random number between 1000 and 9999
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Get token expiry timestamp (24 hours from now)
export function getTokenExpiryTimestamp(): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);
  return expiryDate;
}

// Generate verification URL
export function generateVerificationUrl(token: string): string {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/verify-email?token=${token}`;
}

export function setupAuth(app: Express) {
  // Determina se siamo in produzione o sviluppo
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const isHttps = baseUrl.startsWith('https://');
  
  // Middleware di debug per le richieste di autenticazione
  app.use((req, res, next) => {
    // Monitora solo le richieste di auth
    if (req.path.startsWith('/api/login') || 
        req.path.startsWith('/api/register') || 
        req.path.startsWith('/api/verify-pin') ||
        req.path === '/api/user') {
      
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      // Log minimo solo in caso di errori
      
      // Override delle funzioni di risposta per tracciare solo errori
      const originalJson = res.json;
      res.json = function(body) {
        // Log solo in caso di errori
        if (res.statusCode >= 400) {
          console.log(`[Auth Error ${requestId}] ${req.method} ${req.path} fallito con stato ${res.statusCode}`);
        }
        return originalJson.apply(this, [body]);
      };
      
      // Registra il tempo di risposta solo in debug mode
      if (process.env.DEBUG_AUTH === 'true') {
        const startTime = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          console.log(`[Auth ${requestId}] ${req.method} ${req.path} completato in ${duration}ms con stato ${res.statusCode}`);
        });
      }
    }
    next();
  });
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "top-secret-session-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      // In produzione con HTTPS, imposta secure a true e SameSite a none
      secure: isProduction && isHttps,
      sameSite: isProduction && isHttps ? 'none' : 'lax',
      // Aggiunto path esplicito
      path: '/',
      // Aggiunto httpOnly per sicurezza
      httpOnly: true
    }
  };

  // Importante per proxy in produzione
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    
    done(null, user.id)
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Log dell'inizio del processo
      
      
      // Verifica che id sia un numero valido
      if (!id || typeof id !== 'number' || isNaN(id)) {
        
        return done(null, null);
      }
      
      // Recupera utente dal database
      const user = await storage.getUser(id);
      
      // Verifica esistenza dell'utente
      if (!user) {
        
        return done(null, null);
      }
      
      // Verifica validità oggetto utente
      if (!user.id || !user.email) {
        
        return done(null, null);
      }
      
      
      
      // Controlla lo stato di approvazione
      if (user.approvalStatus !== 'approved') {
        
      }
      
      done(null, user);
    } catch (err) {
      
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("[Register] Tentativo di registrazione per:", req.body.email);
      
      // Validazione dei campi obbligatori
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "Tutti i campi obbligatori devono essere compilati",
          error: "missing_required_fields",
          details: {
            email: !email ? "Email mancante" : null,
            password: !password ? "Password mancante" : null,
            firstName: !firstName ? "Nome mancante" : null,
            lastName: !lastName ? "Cognome mancante" : null
          }
        });
      }

      // Validazione formato email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          message: "Formato email non valido",
          error: "invalid_email_format"
        });
      }

      // Validazione lunghezza password
      if (password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "La password deve essere di almeno 8 caratteri",
          error: "password_too_short"
        });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("[Register] Email già registrata:", email);
        return res.status(400).json({ 
          success: false, 
          message: "Questa email è già registrata. Prova ad effettuare il login o recupera la password.",
          error: "email_already_registered"
        });
      }
      
      // Format firstName and lastName with first letter uppercase and rest lowercase
      const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
      
      // Generate a username based on firstName and lastName with a random suffix to ensure uniqueness
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const username = `${formattedFirstName.toLowerCase()}.${formattedLastName.toLowerCase()}.${randomSuffix}`;
      
      // Create the name from firstName and lastName
      const name = `${formattedFirstName} ${formattedLastName}`;
      
      // Set default signature format (without comma)
      const signature = `${formattedFirstName} ${formattedLastName}\n${req.body.isIndependent ? 'Consulente Finanziario Indipendente' : req.body.company}\n${req.body.email}\n${req.body.phone || ''}`;
      
      // Generate verification PIN and token for security
      const verificationPin = generateVerificationPin();
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires = getTokenExpiryTimestamp();
      
      console.log("[Register] Preparazione dati utente per creazione");
      
      // Hash password before storing
      const hashedPassword = await hashPassword(password);
      console.log("[Register] Password hashata con successo");
      
      // Log the user object being created (without password)
      const userToCreate = {
        ...req.body,
        username,
        name,
        signature,
        verificationToken,
        verificationTokenExpires,
        verificationPin,
        isEmailVerified: false,
        registrationCompleted: false,
        approvalStatus: 'pending'
      };
      console.log("[Register] Dati utente preparati:", { 
        ...userToCreate, 
        password: "[HIDDEN]" 
      });
      
      // Create user with verification data and pending approval status
      try {
        console.log("[Register] Creazione utente nel database");
        const user = await storage.createUser({
          ...userToCreate,
          password: hashedPassword
        });
        console.log("[Register] Utente creato con successo:", user.id);
        
        // Send verification PIN email
        try {
          console.log("[Register] Invio email di verifica PIN a:", user.email);
          // Default language is Italian per requirements
          await sendVerificationPin(
            user.email,
            user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || "",
            verificationPin,
            'italian',
            user.id
          );
          console.log("[Register] Email di verifica inviata con successo");
        } catch (emailError) {
          console.error("[Register Error] Errore nell'invio dell'email di verifica:", emailError);
          // Continue with registration even if email fails
        }

        console.log("[Register] Login automatico dopo registrazione");
        req.login(user, (err: any) => {
          if (err) {
            console.error("[Register Error] Errore durante login post-registrazione:", err);
            return res.status(500).json({
              success: false,
              message: "Errore durante il login automatico dopo la registrazione",
              error: "login_failed",
              details: err.message
            });
          }
          console.log("[Register] Registrazione completata con successo");
          res.status(201).json({ 
            success: true, 
            user,
            needsPinVerification: true,
            message: "Ti abbiamo inviato un codice PIN di verifica. Per favore controlla la tua casella di posta e inserisci il codice per completare la registrazione."
          });
        });
      } catch (createError: unknown) {
        console.error("[Register Error] Errore durante la creazione dell'utente:", createError);
        const errorMessage = createError instanceof Error ? createError.message : 'Errore sconosciuto';
        const errorStack = createError instanceof Error ? createError.stack : '';
        console.error("[Register DEBUG] Stack trace:", errorStack);
        
        return res.status(500).json({
          success: false,
          message: "Errore durante la registrazione",
          error: "user_creation_failed",
          details: errorMessage
        });
      }
    } catch (err: unknown) {
      console.error("[Register Error] Errore generale durante la registrazione:", err);
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      const errorStack = err instanceof Error ? err.stack : '';
      console.error("[Register DEBUG] Stack trace:", errorStack);
      
      return res.status(500).json({
        success: false,
        message: "Errore durante la registrazione",
        error: "registration_failed",
        details: errorMessage
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("[Login] Tentativo di login per:", req.body.email);
    
    // Validazione dei campi obbligatori
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email e password sono obbligatori",
        error: "missing_credentials",
        details: {
          email: !email ? "Email mancante" : null,
          password: !password ? "Password mancante" : null
        }
      });
    }

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Formato email non valido",
        error: "invalid_email_format"
      });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Login Error] Errore durante autenticazione:", err);
        console.error("[Login DEBUG] Stack trace:", err.stack);
        
        // Controlla se è un errore di connessione al DB o altro errore specifico
        const errorType = err.code || err.name || 'Generic';
        console.error(`[Login DEBUG] Tipo di errore: ${errorType}`);
        
        // Mostra dettagli dell'errore nella risposta
        return res.status(500).json({ 
          success: false, 
          message: "Errore durante il login", 
          error: "authentication_error",
          details: err.message
        });
      }
      
      if (!user) {
        console.log("[Login Failed] Utente non trovato o password errata");
        return res.status(401).json({ 
          success: false, 
          message: "Email o password non validi",
          error: "invalid_credentials"
        });
      }
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email non verificata. Per favore controlla la tua casella di posta per completare la verifica.",
          error: "email_not_verified",
          needsVerification: true
        });
      }
      
      // Check if user is rejected
      if (user.approvalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: "La tua registrazione è stata rifiutata. Per favore contatta l'amministratore per maggiori informazioni.",
          error: "account_rejected",
          rejected: true
        });
      }
      
      req.login(user, (err: any) => {
        if (err) {
          console.error("[Login Error] Errore durante login.session:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Errore durante il login (sessione)", 
            error: "session_error",
            details: err.message
          });
        }
        
        // Verifica che il login sia avvenuto correttamente
        if (req.isAuthenticated()) {
          return res.status(200).json({ 
            success: true, 
            user,
            message: "Login effettuato con successo",
            pendingApproval: user.approvalStatus === 'pending'
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Errore durante l'autenticazione della sessione",
            error: "session_authentication_failed"
          });
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    
    
    if (req.user) {
      
    } else {
      
    }
    
    req.logout((err: any) => {
      if (err) {
        
        return next(err);
      }
      
      
      // Verifica la sessione dopo il logout
      if (req.session) {
        
        // Rigenerazione ID sessione per sicurezza
        req.session.regenerate((regErr) => {
          if (regErr) {
            
          } else {
            
          }
          res.status(200).json({ success: true });
        });
      } else {
        
        res.status(200).json({ success: true });
      }
    });
  });

  app.get("/api/user", (req, res) => {
    try {
      // Rimosso log dettagliati
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          success: false, 
          message: "Not authenticated" 
        });
      }
      
      res.json({ success: true, user: req.user });
    } catch (error: unknown) {
      console.error("[API Error] Errore durante /api/user:", error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      
      res.status(500).json({ 
        success: false, 
        message: "Errore interno del server", 
        error: errorMessage
      });
    }
  });

  // Endpoint per la verifica del PIN
  app.post("/api/verify-pin", async (req, res, next) => {
    try {
      const { email, pin } = req.body;
      
      if (!email || !pin) {
        return res.status(400).json({
          success: false,
          message: "Email e PIN sono obbligatori"
        });
      }
      
      // Trova l'utente tramite email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utente non trovato"
        });
      }
      
      // Verifica se il PIN coincide
      if (user.verificationPin !== pin) {
        return res.status(400).json({
          success: false,
          message: "PIN non valido. Controlla la tua email e riprova."
        });
      }
      
      // Verifica se il token è scaduto
      if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Il PIN è scaduto. Richiedi un nuovo PIN di verifica."
        });
      }
      
      // Aggiorna lo stato dell'utente
      const updatedUser = await storage.updateUser(user.id, {
        isEmailVerified: true,
        registrationCompleted: true,
        verificationPin: null // Cancella il PIN dopo l'uso
      });

      // Send notification email to registration@gervis.it
      try {
        const notificationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
            <h2 style="color: #0066cc;">Nuova Registrazione Completata</h2>
            <p>Un nuovo utente ha completato la registrazione su Gervis:</p>
            <ul>
              <li><strong>Nome:</strong> ${user.firstName} ${user.lastName}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Azienda:</strong> ${user.company || 'Non specificata'}</li>
              <li><strong>Indipendente:</strong> ${user.isIndependent ? 'Sì' : 'No'}</li>
              <li><strong>Telefono:</strong> ${user.phone || 'Non specificato'}</li>
            </ul>
            <p>L'utente ha verificato con successo il proprio indirizzo email.</p>
          </div>
        `;

        // Use the same SMTP configuration as the verification email
        const arubaConfig = {
          host: process.env.SMTP_HOST || 'smtp.aruba.it',
          port: 465,
          secure: true,
          auth: {
            user: 'registration@gervis.it',
            pass: process.env.SMTP_PASS || '',
            method: 'LOGIN'
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
          }
        };

        const transporter = nodemailer.createTransport(arubaConfig);
        
        await transporter.sendMail({
          from: '"Gervis" <registration@gervis.it>',
          to: 'registration@gervis.it',
          subject: 'Nuova Registrazione Completata - Gervis',
          html: notificationHtml
        });

        console.log("[Verify PIN] Email di notifica inviata a registration@gervis.it");
      } catch (notificationError) {
        console.error("[Verify PIN Error] Errore nell'invio dell'email di notifica:", notificationError);
        // Continue with verification even if notification email fails
      }
      
      // Prepariamo la risposta in base allo stato di approvazione
      const isPending = updatedUser.approvalStatus === 'pending';
      const responseMessage = isPending
        ? "Email verificata con successo. In attesa di approvazione da parte del management di Gervis."
        : "Email verificata con successo";
        
      // Se l'utente è già loggato, aggiorniamo la sessione
      if (req.isAuthenticated() && req.user.id === user.id) {
        req.login(updatedUser, (err: any) => {
          if (err) return next(err);
          return res.status(200).json({
            success: true,
            message: responseMessage,
            user: updatedUser,
            pendingApproval: isPending
          });
        });
      } else {
        // Altrimenti facciamo il login
        req.login(updatedUser, (err: any) => {
          if (err) return next(err);
          return res.status(200).json({
            success: true,
            message: responseMessage,
            user: updatedUser,
            pendingApproval: isPending
          });
        });
      }
    } catch (err) {
      next(err);
    }
  });
  
  // Endpoint per richiedere un nuovo PIN
  app.post("/api/resend-pin", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email è obbligatoria"
        });
      }
      
      // Trova l'utente tramite email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utente non trovato"
        });
      }
      
      // Se l'utente è già verificato
      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "L'email è già stata verificata"
        });
      }
      
      // Genera un nuovo PIN e aggiorna il timestamp di scadenza
      const verificationPin = generateVerificationPin();
      const verificationTokenExpires = getTokenExpiryTimestamp();
      
      // Aggiorna l'utente con il nuovo PIN
      await storage.updateUser(user.id, {
        verificationPin,
        verificationTokenExpires
      });
      
      // Invia il nuovo PIN
      try {
        await sendVerificationPin(
          user.email,
          user.firstName && user.lastName ? ` ` : user.name || "",
          verificationPin,
          'italian',
          user.id
        );
        
        return res.status(200).json({
          success: true,
          message: "Nuovo PIN inviato con successo"
        });
      } catch (emailError) {
        
        return res.status(500).json({
          success: false,
          message: "Errore nell'invio dell'email con il PIN di verifica"
        });
      }
    } catch (err) {
      next(err);
    }
  });
}
export {}
