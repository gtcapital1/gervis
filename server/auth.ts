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
            clientSegment: "vhnw"
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
            category: "real_estate",
            value: 500000,
            description: ""
          });
          
          await storage.createAsset({
            clientId: mockClient1.id,
            category: "equity",
            value: 100000,
            description: ""
          });
          
          await storage.createAsset({
            clientId: mockClient1.id,
            category: "bonds",
            value: 200000,
            description: ""
          });
          
          // Crea asset per il secondo cliente (Mario Rossi)
          await storage.createAsset({
            clientId: mockClient2.id,
            category: "real_estate",
            value: 50000,
            description: ""
          });
          
          await storage.createAsset({
            clientId: mockClient2.id,
            category: "bonds",
            value: 20000,
            description: ""
          });
          
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
          await storage.updateMifid(mockClient1.id, {
            address: "Via Roma, 123",
            phone: "123456789",
            birthDate: "1990-01-01",
            employmentStatus: "employed",
            educationLevel: "master",
            annualIncome: '>120,000€',
            investmentHorizon: "medium_term",
            retirementInterest: 4,
            wealthGrowthInterest: 3,
            incomeGenerationInterest: 1,
            capitalPreservationInterest: 2,
            estatePlanningInterest: 5,
            investmentExperience: "expert",
            pastInvestmentExperience: ["stocks", "bonds", "etf", "funds"],
            financialEducation: ["university"],
            riskProfile: "balanced",
            portfolioDropReaction: "hold",
            volatilityTolerance: "medium",
            yearsOfExperience: "5_to_10",
            investmentFrequency: "quarterly",
            advisorUsage: "mostly_advisor",
            monitoringTime: "quarterly",
            etfObjectiveQuestion: "correct"
          });
          
          // Aggiungi dati MIFID per il secondo cliente
          await storage.updateMifid(mockClient2.id, {
            address: "Via Milano, 123",
            phone: "987654321",
            birthDate: "1965-01-01",
            employmentStatus: "employed",
            educationLevel: "high_school",
            annualIncome: "30000-50000€",
            monthlyExpenses: "1000-2500€",
            debts: "0-5000€",
            investmentHorizon: "long_term",
            retirementInterest: 1,
            wealthGrowthInterest: 4,
            incomeGenerationInterest: 3,
            capitalPreservationInterest: 2,
            estatePlanningInterest: 5,
            investmentExperience: "none",
            pastInvestmentExperience: ["bonds"],
            financialEducation: ["none"],
            riskProfile: "conservative",
            portfolioDropReaction: "sell_all",
            volatilityTolerance: "low",
            yearsOfExperience: "more_than_10",
            investmentFrequency: "occasional",
            advisorUsage: "balanced",
            monitoringTime: "rarely",
            etfObjectiveQuestion: "dontknow"
          });
          
          // Crea profili AI per ciascun cliente
          
          // Profilo AI per Francesca Bianchi
          await storage.createAiProfile({
            clientId: mockClient1.id,
            profileData: {
              clientId: mockClient1.id,
              clientName: "Francesca Bianchi",
              lastUpdated: new Date().toISOString(),
              profiloCliente: {
                descrizione: "Francesca Bianchi, nata nel 1990, è una professionista con un profilo di rischio bilanciato, un reddito annuo di €150.000 e una solida formazione accademica (master). Con un'esperienza di investimento avanzata (5-10 anni) prevalentemente in azioni, obbligazioni, ETF e fondi, Francesca investe e monitora il portafoglio su base trimestrale, affidandosi principalmente al consulente per le decisioni strategiche. Il suo obiettivo principale è la generazione di reddito, seguito dalla preservazione del capitale e dalla crescita patrimoniale, mentre mostra scarso interesse per la pianificazione patrimoniale e la pensione. Ha una tolleranza media alla volatilità e tende a mantenere la posizione in caso di cali di mercato. Attualmente possiede asset immobiliari di rilievo (€500.000), obbligazioni (€200.000) e azioni (€100.000), senza liquidità disponibile né esposizione a strumenti alternativi. Recentemente ha espresso interesse per l'oro come strumento di copertura e per una riallocazione verso l'azionario USA dopo le recenti correzioni di mercato."
              },
              opportunitaBusiness: [
                {
                  email: {
                    corpo: "Gentile Francesca,\n\nin seguito al nostro recente confronto, desidero proporti una concreta opportunità di investimento nell'azionario USA, approfittando dei prezzi corretti dopo il crollo dovuto ai dazi.\n\nConsiderando la tua esperienza e la tua propensione a cogliere occasioni di mercato, questa potrebbe essere una soluzione ideale per rafforzare il portafoglio nel medio termine e generare nuovo valore.\n\nTi propongo di fissare un incontro nei prossimi giorni per valutare insieme i migliori strumenti e definire la strategia più adatta alle tue esigenze.\n\nResto a disposizione per concordare data e orario.",
                    oggetto: "Opportunità immediata: Investire nell'azionario USA dopo la correzione"
                  },
                  azioni: [
                    "Proporre una selezione di ETF e fondi azionari USA con focus su settori resilienti e a potenziale di rimbalzo.",
                    "Preparare un'analisi personalizzata sull'impatto dei dazi e sulle prospettive di mercato USA.",
                    "Organizzare un incontro per discutere la strategia di ingresso e la gestione del rischio."
                  ],
                  titolo: "Investimento in Azionario USA Post-Correzione",
                  priorita: 1,
                  descrizione: "Francesca ha manifestato interesse concreto per una riallocazione verso l'azionario USA a seguito del recente crollo dovuto ai dazi. Data la sua esperienza e la propensione a cogliere opportunità di mercato, questa è un'occasione tangibile per proporre un investimento mirato su ETF o fondi azionari USA, sfruttando i prezzi corretti e il potenziale di recupero nel medio termine."
                },
                {
                  email: {
                    corpo: "Cara Francesca,\n\nho notato con interesse la tua valutazione sull'acquisto di oro come hedge. Considerando la tua attenzione alla preservazione del capitale e la tolleranza alla volatilità, inserire una quota di oro fisico o tramite ETF potrebbe rafforzare la stabilità del tuo portafoglio.\n\nVorrei mostrarti alcune soluzioni personalizzate e simulare insieme i benefici di questa scelta per il tuo profilo.\n\nTi propongo di fissare una breve call per approfondire e valutare i prossimi passi.\n\nA presto!",
                    oggetto: "Proteggi il tuo portafoglio: Soluzioni in oro per una maggiore stabilità"
                  },
                  azioni: [
                    "Presentare le opzioni disponibili tra oro fisico e ETF oro, evidenziando costi e benefici.",
                    "Simulare l'impatto di una quota di oro sul portafoglio attuale in termini di rischio/rendimento.",
                    "Proporre un piano di acquisto graduale per testare la strategia senza impatti eccessivi sulla liquidità."
                  ],
                  titolo: "Introduzione di Oro Fisico o ETF Oro come Hedge",
                  priorita: 2,
                  descrizione: "Francesca ha valutato l'acquisto di oro come strumento di copertura (hedge), coerente con la sua tolleranza al rischio e la ricerca di preservazione del capitale. L'introduzione di una quota di oro fisico o tramite ETF può migliorare la diversificazione del portafoglio e offrire protezione in scenari di volatilità o inflazione."
                },
                {
                  email: {
                    corpo: "Gentile Francesca,\n\nho analizzato il tuo portafoglio e, considerando il tuo forte interesse per la generazione di reddito, vorrei proporti alcune soluzioni di fondi income che potrebbero incrementare il flusso cedolare in modo efficiente e diversificato.\n\nTi invio una selezione di prodotti adatti al tuo profilo e sarei lieto di confrontarli insieme alle attuali obbligazioni in portafoglio.\n\nFammi sapere quando preferisci fissare un incontro per approfondire.\n\nCordiali saluti",
                    oggetto: "Nuove soluzioni per aumentare il reddito periodico dal tuo portafoglio"
                  },
                  azioni: [
                    "Identificare fondi income o multi-asset con distribuzione regolare adatti al profilo balanced.",
                    "Preparare un confronto tra i fondi selezionati e le attuali obbligazioni in portafoglio.",
                    "Proporre un piano di riallocazione graduale per massimizzare il reddito senza aumentare il rischio complessivo."
                  ],
                  titolo: "Ottimizzazione della Generazione di Reddito tramite Fondi Income",
                  priorita: 3,
                  descrizione: "Dato il massimo interesse di Francesca per la generazione di reddito e la sua esperienza con fondi e obbligazioni, è opportuno proporre soluzioni di fondi income o multi-asset che distribuiscono cedole periodiche, ottimizzando il flusso di reddito e la diversificazione."
                }
              ]
            },
            createdBy: user.id
          });
          
          // Profilo AI per Mario Rossi
          await storage.createAiProfile({
            clientId: mockClient2.id,
            profileData: {
              clientId: mockClient2.id,
              clientName: "Mario Rossi",
              lastUpdated: new Date().toISOString(),
              profiloCliente: {
                descrizione: "Mario Rossi è un investitore di profilo conservativo, con un reddito stabile di €50.000 annui, nessun debito e una significativa esposizione immobiliare (€400.000) e obbligazionaria (€35.000), ma senza investimenti in azioni o strumenti alternativi. Ha un orizzonte temporale di lungo termine, ma una bassa tolleranza alla volatilità e tende a vendere tutto in caso di calo del portafoglio, mostrando una scarsa propensione al rischio e una preferenza per la preservazione del capitale e la pianificazione pensionistica. La sua esperienza di investimento è limitata ai bond, con conoscenze finanziarie di base e un approccio decisionale prudente e poco attivo, affidandosi in modo equilibrato al consulente e monitorando raramente i propri investimenti."
              },
              opportunitaBusiness: [
                {
                  email: {
                    corpo: "Gentile Mario,\n\nho analizzato con attenzione il tuo profilo e le tue priorità, in particolare la tua attenzione alla sicurezza e alla pianificazione pensionistica.\n\nVorrei proporti un piano di previdenza integrativa a capitale garantito, pensato per offrirti stabilità, protezione del capitale e vantaggi fiscali, in linea con la tua avversione al rischio e il tuo obiettivo di lungo termine.\n\nCredo che questa soluzione possa rappresentare un passo concreto verso una pensione serena e sicura. Ti propongo di fissare un incontro nei prossimi giorni per valutare insieme una simulazione personalizzata e rispondere a ogni tua domanda.\n\nResto a disposizione per concordare una data e un orario a te comodi.\n\nA presto!",
                    oggetto: "Mario, scopri la soluzione pensionistica sicura e su misura per te"
                  },
                  azioni: [
                    "Presentare una simulazione personalizzata di un fondo pensione a capitale garantito con proiezioni di rendita futura.",
                    "Organizzare un incontro per illustrare i vantaggi fiscali e la sicurezza dello strumento rispetto ad altre soluzioni.",
                    "Assistere Mario nella compilazione della documentazione necessaria per l'adesione al piano."
                  ],
                  titolo: "Piano di Previdenza Integrativa a Capitale Garantito",
                  priorita: 1,
                  descrizione: "Data la priorità massima attribuita alla pensione e la bassa tolleranza al rischio, Mario Rossi potrebbe beneficiare di un piano pensionistico integrativo a capitale garantito, che offre stabilità, protezione del capitale e vantaggi fiscali. Questo strumento risponde perfettamente alle sue esigenze di lungo termine e alla sua avversione alla volatilità."
                },
                {
                  email: {
                    corpo: "Caro Mario,\n\nho notato che il tuo portafoglio è già orientato verso le obbligazioni, coerentemente con il tuo profilo conservativo e la tua esigenza di protezione del capitale.\n\nVorrei proporti una soluzione di portafoglio obbligazionario ancora più diversificata e protetta, che ti consenta di ottenere maggiore stabilità e rendimento, riducendo ulteriormente i rischi.\n\nSe sei d'accordo, possiamo fissare una breve chiamata per valutare insieme questa proposta e capire come ottimizzare i tuoi investimenti attuali.\n\nAttendo un tuo riscontro per organizzare l'incontro.\n\nUn caro saluto!",
                    oggetto: "Mario, migliora la sicurezza e la resa dei tuoi investimenti obbligazionari"
                  },
                  azioni: [
                    "Preparare una proposta di portafoglio obbligazionario diversificato, includendo titoli di Stato e corporate a basso rischio.",
                    "Spiegare i vantaggi della diversificazione obbligazionaria rispetto al portafoglio attuale.",
                    "Supportare Mario nell'eventuale trasferimento o reinvestimento dei bond già in portafoglio."
                  ],
                  titolo: "Portafoglio Obbligazionario Diversificato e Protetto",
                  priorita: 2,
                  descrizione: "Mario ha già esperienza con i bond e predilige la preservazione del capitale. Una proposta di portafoglio obbligazionario diversificato, con focus su titoli investment grade e strumenti a basso rischio, può offrire maggiore stabilità e rendimento rispetto alla sola esposizione attuale, riducendo ulteriormente la volatilità."
                },
                {
                  email: {
                    corpo: "Gentile Mario,\n\nho notato che il tuo patrimonio è già ben posizionato sull'immobiliare, ma solo in forma diretta.\n\nVorrei presentarti alcune soluzioni di investimento immobiliare a basso rischio, come fondi conservativi, che ti permetterebbero di diversificare ulteriormente e aumentare la liquidità, mantenendo la sicurezza che desideri.\n\nSe vuoi approfondire questa opportunità, possiamo fissare un incontro per valutare insieme le opzioni più adatte a te.\n\nResto a disposizione per qualsiasi domanda.\n\nCordiali saluti!",
                    oggetto: "Mario, diversifica il tuo patrimonio immobiliare in modo sicuro"
                  },
                  azioni: [
                    "Presentare una selezione di fondi immobiliari a basso rischio e con focus su immobili residenziali o pubblici.",
                    "Illustrare i vantaggi della diversificazione immobiliare indiretta rispetto alla proprietà diretta.",
                    "Proporre un piano di investimento graduale per testare questa soluzione senza esporre Mario a rischi eccessivi."
                  ],
                  titolo: "Soluzioni di Investimento Immobiliare a Basso Rischio",
                  priorita: 3,
                  descrizione: "Considerando la forte esposizione immobiliare diretta, Mario potrebbe valutare strumenti di investimento immobiliare a basso rischio (come fondi immobiliari conservativi), che offrono diversificazione e liquidità senza aumentare la volatilità complessiva del portafoglio."
                }
              ]
            },
            createdBy: user.id
          });
          
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
