import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendVerificationEmail, sendVerificationPin } from "./email";

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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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
  
  console.log(`DEBUG - setupAuth - Environment: ${isProduction ? 'production' : 'development'}, HTTPS: ${isHttps}`);
  
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
    }
  };

  console.log(`DEBUG - setupAuth - Cookie settings: secure=${sessionSettings.cookie?.secure}, sameSite=${sessionSettings.cookie?.sameSite}`);
  
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
    console.log(`[DEBUG AUTH] Serializzazione utente: ${user.id} (${user.email})`);
    done(null, user.id)
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Log dell'inizio del processo
      console.log(`[DEBUG AUTH] Deserializzazione utente ID: ${id}`);
      
      // Verifica che id sia un numero valido
      if (!id || typeof id !== 'number' || isNaN(id)) {
        console.error(`[DEBUG AUTH] ID utente non valido: ${id}, tipo: ${typeof id}`);
        return done(null, null);
      }
      
      // Recupera utente dal database
      const user = await storage.getUser(id);
      
      // Verifica esistenza dell'utente
      if (!user) {
        console.log(`[DEBUG AUTH] Deserializzazione fallita: utente ID ${id} non trovato nel database`);
        return done(null, null);
      }
      
      // Verifica validità oggetto utente
      if (!user.id || !user.email) {
        console.error(`[DEBUG AUTH] Utente recuperato non valido:`, user);
        return done(null, null);
      }
      
      console.log(`[DEBUG AUTH] Deserializzazione completata: ${user.id} (${user.email})`);
      
      // Controlla lo stato di approvazione
      if (user.approvalStatus !== 'approved') {
        console.log(`[DEBUG AUTH] Utente con stato approvazione: ${user.approvalStatus}`);
      }
      
      done(null, user);
    } catch (err) {
      console.error(`[DEBUG AUTH] Errore deserializzazione utente ID ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already registered" 
        });
      }
      
      // Format firstName and lastName with first letter uppercase and rest lowercase
      const formattedFirstName = req.body.firstName.charAt(0).toUpperCase() + req.body.firstName.slice(1).toLowerCase();
      const formattedLastName = req.body.lastName.charAt(0).toUpperCase() + req.body.lastName.slice(1).toLowerCase();
      
      // Generate a username based on firstName and lastName with a random suffix to ensure uniqueness
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const username = `${formattedFirstName.toLowerCase()}.${formattedLastName.toLowerCase()}.${randomSuffix}`;
      
      // Create the name from firstName and lastName
      const name = `${formattedFirstName} ${formattedLastName}`;
      
      // Set default signature format (without comma)
      const signature = `${formattedFirstName} ${formattedLastName}\n${req.body.isIndependent ? 'Consulente Finanziario Indipendente' : req.body.company}\n${req.body.email}\n${req.body.phone || ''}`;
      
      // Generate verification PIN and token for security
      const verificationPin = generateVerificationPin();
      const verificationToken = generateVerificationToken(); // Manteniamo anche il token per sicurezza
      const verificationTokenExpires = getTokenExpiryTimestamp();
      
      // Create user with verification data and pending approval status
      const user = await storage.createUser({
        ...req.body,
        username,
        name,
        signature,
        password: await hashPassword(req.body.password),
        verificationToken,
        verificationTokenExpires,
        verificationPin,
        isEmailVerified: false,
        registrationCompleted: false,
        approvalStatus: 'pending'
      });
      
      // Send verification PIN email
      try {
        // Default language is Italian per requirements
        await sendVerificationPin(
          user.email,
          user.name || `${user.firstName} ${user.lastName}`,
          verificationPin,
          'italian'
        );
        console.log(`Verification PIN email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send verification PIN email:', emailError);
        // Continue with registration even if email fails
      }

      req.login(user, (err: any) => {
        if (err) return next(err);
        res.status(201).json({ 
          success: true, 
          user,
          needsPinVerification: true,
          message: "Ti abbiamo inviato un codice PIN di verifica. Per favore controlla la tua casella di posta e inserisci il codice per completare la registrazione."
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`[DEBUG AUTH] Tentativo login per email: ${req.body?.email || 'non specificata'}`);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error(`[DEBUG AUTH] Errore durante autenticazione:`, err);
        return next(err);
      }
      
      if (!user) {
        console.log(`[DEBUG AUTH] Login fallito - credenziali non valide per: ${req.body?.email || 'non specificata'}`);
        return res.status(401).json({ 
          success: false, 
          message: "Email o password non validi" 
        });
      }
      
      console.log(`[DEBUG AUTH] Credenziali valide per utente ID: ${user.id}, email: ${user.email}`);
      
      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email non verificata. Per favore controlla la tua casella di posta per completare la verifica.",
          needsVerification: true
        });
      }
      
      // Check if user is approved
      if (user.approvalStatus === 'pending') {
        return res.status(403).json({
          success: false,
          message: "In attesa di approvazione da parte del management di Gervis",
          pendingApproval: true
        });
      }
      
      // Check if user is rejected
      if (user.approvalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: "La tua registrazione è stata rifiutata. Per favore contatta l'amministratore per maggiori informazioni.",
          rejected: true
        });
      }
      
      console.log(`[DEBUG AUTH] Tentativo login manuale per utente ID: ${user.id}`);
      
      req.login(user, (err: any) => {
        if (err) {
          console.error(`[DEBUG AUTH] Errore durante login manuale:`, err);
          return next(err);
        }
        
        // Verifica che il login sia avvenuto correttamente
        if (req.isAuthenticated()) {
          console.log(`[DEBUG AUTH] Login completato con successo, sessionID: ${req.session.id}`);
          console.log(`[DEBUG AUTH] Cookie: ${JSON.stringify(req.session.cookie)}`);
        } else {
          console.warn(`[DEBUG AUTH] Anomalia: req.login completato ma utente non autenticato!`);
        }
        
        return res.status(200).json({ success: true, user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log(`[DEBUG AUTH] Tentativo logout utente - Autenticato: ${req.isAuthenticated() || false}`);
    
    if (req.user) {
      console.log(`[DEBUG AUTH] Logout per utente ID: ${req.user.id}, email: ${req.user.email}`);
    } else {
      console.log(`[DEBUG AUTH] Tentativo logout senza utente autenticato`);
    }
    
    req.logout((err: any) => {
      if (err) {
        console.error(`[DEBUG AUTH] Errore durante logout:`, err);
        return next(err);
      }
      
      console.log(`[DEBUG AUTH] Logout completato con successo`);
      // Verifica la sessione dopo il logout
      if (req.session) {
        console.log(`[DEBUG AUTH] Sessione ancora presente dopo logout: ${req.session.id}`);
        // Rigenerazione ID sessione per sicurezza
        req.session.regenerate((regErr) => {
          if (regErr) {
            console.error(`[DEBUG AUTH] Errore rigenerazione sessione:`, regErr);
          } else {
            console.log(`[DEBUG AUTH] Sessione rigenerata con successo: ${req.session.id}`);
          }
          res.status(200).json({ success: true });
        });
      } else {
        console.log(`[DEBUG AUTH] Nessuna sessione trovata dopo logout`);
        res.status(200).json({ success: true });
      }
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[DEBUG AUTH] Richiesta GET /api/user - Autenticato: ${req.isAuthenticated() || false}`);
    
    // Log lo stato della sessione
    console.log(`[DEBUG AUTH] Sessione: ${req.session ? `ID ${req.session.id}` : 'nessuna sessione'}`);
    if (req.session) {
      console.log(`[DEBUG AUTH] Cookie expires: ${req.session.cookie.expires}`);
      console.log(`[DEBUG AUTH] Cookie maxAge: ${req.session.cookie.maxAge}`);
      console.log(`[DEBUG AUTH] Cookie secure: ${req.session.cookie.secure}`);
      console.log(`[DEBUG AUTH] Cookie httpOnly: ${req.session.cookie.httpOnly}`);
      console.log(`[DEBUG AUTH] Cookie path: ${req.session.cookie.path}`);
      console.log(`[DEBUG AUTH] Cookie sameSite: ${req.session.cookie.sameSite}`);
    }
    
    if (!req.isAuthenticated()) {
      console.log('[DEBUG AUTH] Utente non autenticato per /api/user');
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }
    
    console.log(`[DEBUG AUTH] Utente autenticato ID: ${req.user.id}, email: ${req.user.email}`);
    res.json({ success: true, user: req.user });
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
          user.name || `${user.firstName} ${user.lastName}`,
          verificationPin,
          'italian'
        );
        
        return res.status(200).json({
          success: true,
          message: "Nuovo PIN inviato con successo"
        });
      } catch (emailError) {
        console.error('Failed to send verification PIN email:', emailError);
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