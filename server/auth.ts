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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "top-secret-session-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  };

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

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // Gestisci l'utente non trovato in modo silenzioso
        return done(null, null);
      }
      done(null, user);
    } catch (err) {
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
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Email o password non validi" 
        });
      }
      
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
          message: "Il tuo account è in attesa di approvazione. Sarai informato via email quando la tua registrazione sarà approvata.",
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
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        return res.status(200).json({ success: true, user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.status(200).json({ success: true });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }
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
      
      // Se l'utente è già loggato, aggiorniamo la sessione
      if (req.isAuthenticated() && req.user.id === user.id) {
        req.login(updatedUser, (err: any) => {
          if (err) return next(err);
          return res.status(200).json({
            success: true,
            message: "Email verificata con successo",
            user: updatedUser
          });
        });
      } else {
        // Altrimenti facciamo il login
        req.login(updatedUser, (err: any) => {
          if (err) return next(err);
          return res.status(200).json({
            success: true,
            message: "Email verificata con successo",
            user: updatedUser
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