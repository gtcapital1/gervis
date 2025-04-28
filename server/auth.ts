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
import { isEmailWhitelisted } from "./whitelist";

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

      // Validazione password avanzata
      const passwordErrors = [];
      
      if (password.length < 8) {
        passwordErrors.push("La password deve essere di almeno 8 caratteri");
      }
      
      if (!/[A-Z]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno una lettera maiuscola");
      }
      
      if (!/[a-z]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno una lettera minuscola");
      }
      
      if (!/[0-9]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno un numero");
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno un carattere speciale (!, @, #, $, %, ecc.)");
      }
      
      if (passwordErrors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: passwordErrors.join(". "),
          error: "password_requirements_not_met",
          details: {
            requirements: passwordErrors
          }
        });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("[Register] Email già registrata:", email);
        // Controlla se l'utente è stato rifiutato
        if (existingUser.approvalStatus === 'rejected') {
          return res.status(403).json({ 
            success: false, 
            message: "Questa email è stata precedentemente rifiutata. Contatta l'amministratore per assistenza.",
            error: "email_rejected",
            rejected: true
          });
        }
        
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
      
      // Verifica se l'email è nella whitelist per l'approvazione automatica
      const approvalStatus = isEmailWhitelisted(email) ? 'approved' : 'pending';
      console.log(`[Register] Email ${email} nella whitelist? ${isEmailWhitelisted(email)}, stato approvazione: ${approvalStatus}`);
      
      // Rimuovi approvalStatus da req.body per evitare che sovrascriva il valore calcolato dalla whitelist
      const { approvalStatus: _, ...userData } = req.body;
      
      // Log the user object being created (without password)
      const userToCreate = {
        ...userData,
        username,
        name,
        signature,
        verificationToken,
        verificationTokenExpires,
        verificationPin,
        isEmailVerified: false,
        registrationCompleted: false,
        approvalStatus  // Usa il valore calcolato dalla whitelist
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
        
        // Creiamo automaticamente due clienti mock per il nuovo utente
        try {
          console.log("[Register] Creazione clienti mock per il nuovo utente");
          
          // Cliente 1: Segmento "vhnw" (Very High Net Worth)
          const mockClient1 = await storage.createClient({
            firstName: "Francesca",
            lastName: "Bianchi",
            name: "Francesca Bianchi",
            email: "example@gervis.it",
            taxCode: "",
            advisorId: user.id,
            totalAssets: 800000,
            netWorth: 600000,
            isOnboarded: true,
            active: true,
            onboardedAt: new Date(),
            activatedAt: new Date(),
            clientSegment: "hnw"
          });
          
          // Cliente 2: Segmento "mass_market"
          const mockClient2 = await storage.createClient({
            firstName: "Mario",
            lastName: "Rossi",
            name: "Mario Rossi",
            email: "example@gervis.it",
            taxCode: "",
            advisorId: user.id,
            totalAssets: 70000,
            netWorth: 70000,
            isOnboarded: true,
            active: true,
            onboardedAt: new Date(),
            activatedAt: new Date(),
            clientSegment: "mass_market"
          });
          
          console.log("[Register] Clienti mock creati con successo:", 
            { client1Id: mockClient1.id, client2Id: mockClient2.id });
          
          // Crea asset per il primo cliente (Francesca Bianchi)
          await storage.createAsset({
            clientId: mockClient1.id,
            category: "equity",
            value: 50000,
            description: "ISIN: IE00B4ND3602"
          });
          
          await storage.createAsset({
            clientId: mockClient1.id,
            category: "equity",
            value: 100000,
            description: "ISIN: IE00B4L5Y983"
          });
          
          // Cliente 2 (Mario Rossi) non ha asset
          
          // Crea un log per ciascun cliente
          const now = new Date();
          
          // Log per Francesca Bianchi (client_id 20)
          await storage.createClientLog({
            clientId: mockClient1.id,
            type: "call",
            title: "Azioni USA",
            content: "Ciente si è dimostrata interessata a idea di riallocazione verso azionario USA post crollo dovuto ai dazi.",
            logDate: now,
            createdBy: user.id
          });
          
          await storage.createClientLog({
            clientId: mockClient1.id,
            type: "call",
            title: "Oro per hedge",
            content: "Cliente ha valutato con attenzione acquisto di oro come hedge",
            logDate: now,
            createdBy: user.id
          });
          
          // Aggiungi dati MIFID per il primo cliente
          console.log("[Register] Tentativo di aggiungere dati MIFID per cliente 1:", mockClient1.id);
          try {
            // Verifica prima se esiste già un record MIFID per questo cliente
            const existingMifid1 = await storage.getMifidByClient(mockClient1.id);
            console.log("[Register] MIFID esistente per cliente 1:", existingMifid1 ? "Sì" : "No");

            const mifidData1 = {
              clientId: mockClient1.id, // Aggiungiamo esplicitamente clientId
              address: "Via Roma, 123",
              phone: "123456789",
              birthDate: "1990-01-01",
              employmentStatus: "employed",
              educationLevel: "master",
              annualIncome: "over-120,000€",
              monthlyExpenses: "2,500-5,000€",
              debts: "0-5,000€",
              netWorth: "over-100,000€",
              investmentHorizon: "medium_term",
              investmentExperience: "expert",
              pastInvestmentExperience: ["stocks", "bonds", "etf", "funds"],
              financialEducation: ["university"],
              riskProfile: "balanced",
              portfolioDropReaction: "hold",
              investmentObjective: "wealth_growth, capital_preservation",
              etfObjectiveQuestion: "correct" // Questo campo è richiesto nella definizione del tipo
            };
            console.log("[Register] Dati MIFID da inserire per cliente 1:", JSON.stringify(mifidData1, null, 2));
            
            // Log della struttura della tabella MIFID
            console.log("[Register] Struttura tabella MIFID richiesta:", {
              id: "generato automaticamente",
              clientId: "number, richiesto",
              address: "text, richiesto",
              phone: "text, richiesto",
              birthDate: "text, richiesto",
              employmentStatus: "text, richiesto",
              educationLevel: "text, richiesto",
              annualIncome: "text, richiesto",
              monthlyExpenses: "text, richiesto",
              debts: "text, richiesto",
              netWorth: "text, richiesto",
              investmentObjective: "text, richiesto",
              investmentHorizon: "text, richiesto",
              investmentExperience: "text, richiesto",
              pastInvestmentExperience: "jsonb, richiesto",
              financialEducation: "jsonb, richiesto",
              etfObjectiveQuestion: "text, richiesto",
              riskProfile: "text, richiesto",
              portfolioDropReaction: "text, richiesto"
            });
            
            const result1 = await storage.updateMifid(mockClient1.id, mifidData1);
            console.log("[Register] Risultato inserimento MIFID cliente 1:", result1);
            
            // Verifica che il record sia stato creato
            const verifyMifid1 = await storage.getMifidByClient(mockClient1.id);
            console.log("[Register] Verifica creazione MIFID cliente 1:", verifyMifid1 ? "Creato con successo" : "Fallito");
          } catch (error: unknown) {
            const mifidError1 = error as Error;
            console.error("[Register] Errore nell'aggiunta dati MIFID per cliente 1:", mifidError1);
            console.error("[Register] Messaggio errore:", mifidError1.message);
            console.error("[Register] Stack:", mifidError1.stack);
          }
          
          // Aggiungi dati MIFID per il secondo cliente
          console.log("[Register] Tentativo di aggiungere dati MIFID per cliente 2:", mockClient2.id);
          try {
            // Verifica prima se esiste già un record MIFID per questo cliente
            const existingMifid2 = await storage.getMifidByClient(mockClient2.id);
            console.log("[Register] MIFID esistente per cliente 2:", existingMifid2 ? "Sì" : "No");
            
            const mifidData2 = {
              clientId: mockClient2.id, // Aggiungiamo esplicitamente clientId
              address: "Via Milano, 123",
              phone: "987654321",
              birthDate: "1965-01-01",
              employmentStatus: "business_owner",
              educationLevel: "high_school",
              annualIncome: "30,000-50,000€",
              monthlyExpenses: "1,000-2,500€",
              debts: "0-5,000€",
              netWorth: "over-100,000€",
              investmentHorizon: "long_term",
              investmentExperience: "intermediate",
              pastInvestmentExperience: ["derivatives"],
              financialEducation: ["university"],
              riskProfile: "aggressive",
              portfolioDropReaction: "hold",
              investmentObjective: "wealth_growth, capital_preservation",
              etfObjectiveQuestion: "wrong" // Questo campo è richiesto nella definizione del tipo
            };
            console.log("[Register] Dati MIFID da inserire per cliente 2:", JSON.stringify(mifidData2, null, 2));
            const result2 = await storage.updateMifid(mockClient2.id, mifidData2);
            console.log("[Register] Risultato inserimento MIFID cliente 2:", result2);
            
            // Verifica che il record sia stato creato
            const verifyMifid2 = await storage.getMifidByClient(mockClient2.id);
            console.log("[Register] Verifica creazione MIFID cliente 2:", verifyMifid2 ? "Creato con successo" : "Fallito");
          } catch (error: unknown) {
            const mifidError2 = error as Error;
            console.error("[Register] Errore nell'aggiunta dati MIFID per cliente 2:", mifidError2);
            console.error("[Register] Messaggio errore:", mifidError2.message);
            console.error("[Register] Stack:", mifidError2.stack);
          }
          
          // Rimossi i profili AI per entrambi i clienti
          
        } catch (mockClientError) {
          // Non bloccare la registrazione se c'è un errore nella creazione dei clienti mock
          console.error("[Register Error] Errore durante la creazione dei clienti mock:", mockClientError);
        }
        
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
            message: "Ti abbiamo inviato un codice PIN di verifica. Per favore controlla la tua casella di posta e inserisci il codice per completare la registrazione.",
            pendingApproval: user.approvalStatus === 'pending'
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
        : "Email verificata con successo. Puoi iniziare a utilizzare la piattaforma immediatamente.";
        
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

  // Endpoint per richiedere il reset della password
  app.post("/api/forgot-password", async (req, res, next) => {
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
        // Per sicurezza, non riveliamo se l'email esiste o meno
        return res.status(200).json({
          success: true,
          message: "Se l'email è registrata, riceverai un link per reimpostare la password"
        });
      }
      
      // Genera un token di reset univoco e imposta la scadenza (24 ore)
      const resetToken = generateVerificationToken();
      const resetTokenExpires = getTokenExpiryTimestamp();
      
      // Aggiorna l'utente con il token di reset
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires
      });
      
      // Crea il link di reset
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      // Invia l'email con il link di reset
      try {
        // Configurazione per l'invio dell'email
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
        
        // Prepara il contenuto dell'email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
            <h2 style="color: #0066cc;">Reimposta la tua password</h2>
            <p>Ciao ${user.firstName || user.name},</p>
            <p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Gervis.</p>
            <p>Clicca sul link seguente per reimpostare la tua password:</p>
            <p><a href="${resetUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reimposta Password</a></p>
            <p>Oppure copia e incolla questo URL nel tuo browser: <br> ${resetUrl}</p>
            <p>Questo link scadrà tra 24 ore.</p>
            <p>Se non hai richiesto il reset della password, puoi ignorare questa email.</p>
            <p>Cordiali saluti,<br>Il team di Gervis</p>
          </div>
        `;
        
        await transporter.sendMail({
          from: '"Gervis" <registration@gervis.it>',
          to: user.email,
          subject: 'Gervis - Reimposta la tua password',
          html: html
        });
        
        console.log("[Forgot Password] Email di reset inviata a:", user.email);
        
        return res.status(200).json({
          success: true,
          message: "Se l'email è registrata, riceverai un link per reimpostare la password"
        });
        
      } catch (emailError) {
        console.error("[Forgot Password Error] Errore nell'invio dell'email di reset:", emailError);
        
        // Non rivelare l'errore specifico all'utente per motivi di sicurezza
        return res.status(200).json({
          success: true,
          message: "Se l'email è registrata, riceverai un link per reimpostare la password"
        });
      }
    } catch (err) {
      console.error("[Forgot Password Error] Errore generale:", err);
      next(err);
    }
  });
  
  // Endpoint per validare il token e reimpostare la password
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      console.log("[Reset Password] Ricevuta richiesta di reset password:", { 
        hasToken: !!req.body.token,
        passwordLength: req.body.password?.length 
      });
      
      const { token, password } = req.body;
      
      if (!token || !password) {
        console.log("[Reset Password] Errore: Token o password mancanti");
        return res.status(400).json({
          success: false,
          message: "Token e password sono obbligatori",
          error: "missing_required_fields"
        });
      }
      
      // Validazione password avanzata
      const passwordErrors = [];
      
      if (password.length < 8) {
        passwordErrors.push("La password deve essere di almeno 8 caratteri");
      }
      
      if (!/[A-Z]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno una lettera maiuscola");
      }
      
      if (!/[a-z]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno una lettera minuscola");
      }
      
      if (!/[0-9]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno un numero");
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        passwordErrors.push("La password deve contenere almeno un carattere speciale (!, @, #, $, %, ecc.)");
      }
      
      if (passwordErrors.length > 0) {
        console.log("[Reset Password] Errore: Requisiti password non soddisfatti:", passwordErrors);
        return res.status(400).json({ 
          success: false, 
          message: passwordErrors.join(". "),
          error: "password_requirements_not_met",
          details: {
            requirements: passwordErrors
          }
        });
      }
      
      console.log("[Reset Password] Validazione password superata, controllo token:", token.substring(0, 8) + "...");
      
      // Trova l'utente tramite token di reset
      try {
        const user = await storage.getUserByField('passwordResetToken', token);
        
        if (!user) {
          console.log("[Reset Password] Errore: Token non valido o non trovato");
          return res.status(400).json({
            success: false,
            message: "Token non valido o scaduto",
            error: "invalid_token"
          });
        }
        
        console.log("[Reset Password] Utente trovato con ID:", user.id);
        
        // Verifica se il token è scaduto
        if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
          console.log("[Reset Password] Errore: Token scaduto il", user.passwordResetExpires);
          return res.status(400).json({
            success: false,
            message: "Il link per il reset della password è scaduto. Richiedi un nuovo link.",
            error: "token_expired"
          });
        }
        
        // Hash della nuova password
        const hashedPassword = await hashPassword(password);
        
        // Aggiorna l'utente con la nuova password e rimuovi il token di reset
        await storage.updateUser(user.id, {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        });
        
        console.log("[Reset Password] Password reimpostata con successo per:", user.email);
        
        return res.status(200).json({
          success: true,
          message: "Password reimpostata con successo. Ora puoi accedere con la tua nuova password."
        });
      } catch (dbError) {
        console.error("[Reset Password Error] Errore di database:", dbError);
        return res.status(500).json({
          success: false,
          message: "Errore del server durante la verifica del token",
          error: "database_error"
        });
      }
    } catch (err) {
      console.error("[Reset Password Error] Errore generale durante il reset della password:", err);
      next(err);
    }
  });
}
export {}
