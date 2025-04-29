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
import { db } from "@shared/db";
import { productsPublicDatabase, portfolioProducts, userProducts, modelPortfolios, portfolioAllocations, mifid, assets } from "@shared/schema";
import { and, eq } from "drizzle-orm";

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
          
          // Creiamo dati MIFID mock per i clienti
          try {
            console.log("[Register] Creazione dati MIFID mock per i clienti");
            
            // MIFID per cliente 1 (high net worth)
            const mifidData1 = {
            clientId: mockClient1.id,
              address: "Via Roma 123, Milano",
              phone: "3902123456",
              birthDate: "1975-05-15",
              employmentStatus: "entrepreneur",
              educationLevel: "master",
              annualIncome: "150,000-300,000€",
              monthlyExpenses: "5,000-10,000€",
              debts: "50,000-100,000€",
              netWorth: "500,000-1,000,000€",
              riskProfile: "aggressive",
              investmentHorizon: "5-10-anni",
              investmentExperience: "advanced",
              investmentObjective: "wealth_growth, retirement_planning",
              portfolioDropReaction: "hold",
              pastInvestmentExperience: ["stocks", "bonds", "funds", "etfs"],
              financialEducation: ["university", "professional_training"],
              etfObjectiveQuestion: "correct"
            };
            
            // MIFID per cliente 2 (mass market)
            const mifidData2 = {
              clientId: mockClient2.id,
              address: "Via Napoli 45, Roma",
              phone: "3906876543",
              birthDate: "1988-10-20",
              employmentStatus: "employee",
              educationLevel: "bachelor",
              annualIncome: "30,000-70,000€",
              monthlyExpenses: "1,000-2,000€",
              debts: "10,000-30,000€",
              netWorth: "50,000-100,000€",
              riskProfile: "conservative",
              investmentHorizon: "3-5-anni",
              investmentExperience: "beginner",
              investmentObjective: "capital_preservation, income_generation",
              portfolioDropReaction: "partial_sell",
              pastInvestmentExperience: ["deposits", "government_bonds"],
              financialEducation: ["reading"],
              etfObjectiveQuestion: "incorrect"
            };
            
            // Inserisci i dati MIFID nel database - Una chiamata per ogni cliente
            await db.insert(mifid).values(mifidData1);
            await db.insert(mifid).values(mifidData2);
            
            console.log(`[Register] Dati MIFID creati per i clienti ${mockClient1.id} e ${mockClient2.id}`);
            
            console.log("[Register] Dati MIFID creati per i clienti mock");
          } catch (mifidError) {
            console.error("[Register Error] Errore durante la creazione dei dati MIFID mock:", mifidError);
            // Non bloccare la registrazione se la creazione dei dati MIFID fallisce
          }
          
          // Aggiungi prodotti predefiniti dalla banca dati pubblica
          try {
            console.log("[Register] Aggiunta di prodotti predefiniti dalla banca dati pubblica per il nuovo utente");
            
            // Seleziona tutti i prodotti dalla banca dati pubblica
            const publicProducts = await db.select()
              .from(productsPublicDatabase);
            
            if (publicProducts.length > 0) {
              console.log(`[Register] Trovati ${publicProducts.length} prodotti da aggiungere all'utente ${user.id}`);
              
              // Funzione per aggiungere prodotti all'utente
              const addProductsToUser = async () => {
                for (const publicProduct of publicProducts) {
                  // Verifica se il prodotto è già nel database principale
                  const existingProducts = await db.select()
                    .from(portfolioProducts)
                    .where(eq(portfolioProducts.isin, publicProduct.isin));
                  
                  let portfolioProduct;
                  
                  if (existingProducts.length > 0) {
                    // Usa il prodotto esistente
                    portfolioProduct = existingProducts[0];
                  } else {
                    // Crea una copia nel database principale
                    const [newProduct] = await db.insert(portfolioProducts)
                      .values({
                        isin: publicProduct.isin,
                        name: publicProduct.name,
                        category: publicProduct.category,
                        description: publicProduct.description,
                        benchmark: publicProduct.benchmark,
                        dividend_policy: publicProduct.dividend_policy,
                        currency: publicProduct.currency,
                        sri_risk: publicProduct.sri_risk,
                        entry_cost: publicProduct.entry_cost,
                        exit_cost: publicProduct.exit_cost,
                        ongoing_cost: publicProduct.ongoing_cost,
                        transaction_cost: publicProduct.transaction_cost,
                        performance_fee: publicProduct.performance_fee,
                        recommended_holding_period: publicProduct.recommended_holding_period,
                        target_market: publicProduct.target_market,
                        kid_file_path: publicProduct.kid_file_path,
                        kid_processed: !!publicProduct.kid_processed,
            createdBy: user.id
                      })
                      .returning();
                    
                    portfolioProduct = newProduct;
                  }
                  
                  // Aggiungi il prodotto all'utente
                  await db.insert(userProducts)
                    .values({
                      userId: user.id,
                      productId: portfolioProduct.id
                    });
                  
                  console.log(`[Register] Aggiunto prodotto ${portfolioProduct.isin} (${portfolioProduct.name}) all'utente ${user.id}`);
                }
              };
              
              await addProductsToUser();
            } else {
              console.log("[Register] Nessun prodotto trovato nella banca dati pubblica");
            }
            
            // Crea i portafogli modello predefiniti per l'utente
            try {
              console.log("[Register] Creazione portafogli modello predefiniti per il nuovo utente");
              
              // Funzione per creare i portfolio model predefiniti
              const createDefaultPortfolios = async () => {
                // Get all available products to map ISINs to IDs
                const allProducts = await db.select()
                  .from(portfolioProducts);
                
                console.log(`[Register] Trovati ${allProducts.length} prodotti nel database per la mappatura ISIN->ID`);
                
                // Create a mapping of ISIN to product ID
                const isinToProductId: Record<string, number> = {};
                allProducts.forEach(product => {
                  if (product.isin) {
                    isinToProductId[product.isin] = product.id;
                    console.log(`[Register] Mappato ISIN ${product.isin} -> ID ${product.id}`);
                  }
                });
                
                console.log(`[Register] Creato mapping di ${Object.keys(isinToProductId).length} ISINs a IDs`);
                
                // Ensure all required products exist
                const requiredProducts = [
                  { isin: "IE00BJZPH432", name: "Ultrashort Bond ETF", category: "bonds" },
                  { isin: "IE00B3FH7618", name: "Aggregate Bond ETF", category: "bonds" },
                  { isin: "IE00B0M62X26", name: "Inflation-Linked Bond ETF", category: "bonds" },
                  { isin: "IE00B2NPKV68", name: "Emerging Markets Bond ETF", category: "bonds" },
                  { isin: "IE00B4L60045", name: "High Yield Bond ETF", category: "bonds" },
                  { isin: "IE00B4NCWG09", name: "Physical Gold ETC", category: "commodities" },
                  { isin: "IE00B4L5Y983", name: "Developed World Equity ETF", category: "equity" },
                  { isin: "IE00BKM4GZ66", name: "Emerging Markets Equity ETF", category: "equity" },
                  { isin: "IE00BSKRK281", name: "Global Real Estate ETF", category: "real_estate" },
                  { isin: "IE00BGL86Z12", name: "Diversified Commodities ETF", category: "commodities" },
                  { isin: "IE00BGBN6P67", name: "Blockchain Innovation ETF", category: "equity" }
                ];
                
                console.log(`[Register] Verifica esistenza di ${requiredProducts.length} prodotti necessari`);
                
                // Create any missing products
                for (const product of requiredProducts) {
                  if (!isinToProductId[product.isin]) {
                    console.log(`[Register] Creazione prodotto mancante: ${product.isin} (${product.name})`);
                    try {
                      const [newProduct] = await db.insert(portfolioProducts)
                        .values({
                          isin: product.isin,
                          name: product.name,
                          category: product.category,
                          description: `${product.name} - Default product`,
                          entry_cost: "0.1",
                          exit_cost: "0.1",
                          ongoing_cost: "0.2",
                          transaction_cost: "0.1",
                          createdBy: user.id
                        })
                        .returning();
                      
                      isinToProductId[product.isin] = newProduct.id;
                      console.log(`[Register] Prodotto creato con successo: ${product.isin} -> ID ${newProduct.id}`);
                    } catch (error) {
                      console.error(`[Register Error] Impossibile creare prodotto ${product.isin}:`, error);
                    }
                  }
                }
                
                // Portfolio 1: Portafoglio Conservativo Protezione Capitale & Liquidità
                const portfolio1Data = {
                  name: "Portafoglio Conservativo Protezione Capitale & Liquidità",
                  description: "Portafoglio a basso rischio, focalizzato su protezione del capitale, liquidità e stabilità, con minima esposizione azionaria e diversificazione obbligazionaria.",
                  clientProfile: "Cliente con bassa tolleranza al rischio, priorità assoluta su stabilità, liquidità e protezione del capitale. Ideale per chi ha un orizzonte temporale breve (1-3 anni) e non ricerca rendimenti elevati.",
                  riskLevel: "1-2",
                  constructionLogic: "La costruzione del portafoglio parte dalla massima priorità su protezione del capitale e liquidità. Il 70% è allocato su obbligazioni a basso rischio e breve duration: 40% su ultrashort bond (sri_risk 1, duration 3 anni) e 30% su aggregate bond globali coperti in EUR (sri_risk 2, duration 3 anni). Il 10% va su inflation-linked bond per protezione dall'inflazione (sri_risk 3, duration 3 anni). Un'esposizione marginale (8%) è concessa ai bond emergenti (sri_risk 3, duration 3 anni) e 5% a high yield bond (sri_risk 3, duration 3 anni) per migliorare leggermente il rendimento senza compromettere il profilo di rischio. Solo il 3% è destinato all'azionario globale sviluppato (sri_risk 4, duration 5 anni) per diversificazione e crescita potenziale, mantenendo l'esposizione azionaria molto contenuta. Il 4% è allocato sull'oro fisico (sri_risk 4, duration 5 anni) come ulteriore diversificatore e bene rifugio. Sono esclusi prodotti ad alto rischio (blockchain, emerging equity, commodity swap, real estate) e con duration superiore all'orizzonte consigliato. Tutti i prodotti selezionati hanno costi contenuti e duration compatibile con l'orizzonte breve. La ponderazione è stata effettuata per massimizzare la stabilità e la liquidità, minimizzando la volatilità e il rischio di perdita permanente.",
                  entryCost: "0",
                  exitCost: "0",
                  ongoingCost: "0.103",
                  transactionCost: "0",
                  performanceFee: "0",
                  totalAnnualCost: "0.103",
                  averageRisk: "1.98",
                  averageTimeHorizon: "3.23",
                  assetClassDistribution: [
                    {"category": "bonds", "percentage": 93},
                    {"category": "commodities", "percentage": 4},
                    {"category": "equity", "percentage": 3}
                  ]
                };
                
                // Salva il portafoglio 1
                const [portfolio1] = await db.insert(modelPortfolios).values({
                  name: portfolio1Data.name,
                  description: portfolio1Data.description,
                  clientProfile: portfolio1Data.clientProfile,
                  riskLevel: portfolio1Data.riskLevel,
                  constructionLogic: portfolio1Data.constructionLogic,
                  entryCost: portfolio1Data.entryCost,
                  exitCost: portfolio1Data.exitCost,
                  ongoingCost: portfolio1Data.ongoingCost,
                  transactionCost: portfolio1Data.transactionCost,
                  performanceFee: portfolio1Data.performanceFee,
                  totalAnnualCost: portfolio1Data.totalAnnualCost,
                  averageRisk: portfolio1Data.averageRisk,
                  averageTimeHorizon: portfolio1Data.averageTimeHorizon,
                  assetClassDistribution: portfolio1Data.assetClassDistribution,
                  createdBy: user.id
                }).returning();
                
                // Allocazioni per il portafoglio 1 usando ISIN anziché ID
                const portfolio1AllocationsWithIsin = [
                  { isin: "IE00BJZPH432", percentage: "40" }, // Ultrashort bond
                  { isin: "IE00B3FH7618", percentage: "30" }, // Aggregate bond
                  { isin: "IE00B0M62X26", percentage: "10" }, // Inflation-linked
                  { isin: "IE00B2NPKV68", percentage: "8" },  // Emerging bond
                  { isin: "IE00B4L60045", percentage: "5" },  // High yield bond
                  { isin: "IE00B4NCWG09", percentage: "4" },  // Gold
                  { isin: "IE00B4L5Y983", percentage: "3" }   // Developed equity
                ];
                
                console.log(`[Register] Tentativo di creare ${portfolio1AllocationsWithIsin.length} allocazioni per Portfolio 1`);
                let allocazioniCreate1 = 0;
                
                // Inserisci le allocazioni del portafoglio 1
                for (const allocation of portfolio1AllocationsWithIsin) {
                  // Trova il product ID corrispondente all'ISIN
                  const productId = isinToProductId[allocation.isin];
                  if (productId) {
                    try {
                      await db.insert(portfolioAllocations).values({
                        portfolioId: portfolio1.id,
                        productId: productId,
                        percentage: allocation.percentage
                      });
                      allocazioniCreate1++;
                      console.log(`[Register] Creata allocazione per Portfolio 1: ISIN ${allocation.isin} -> ID ${productId}, ${allocation.percentage}%`);
                    } catch (error) {
                      console.error(`[Register Error] Errore creando allocazione per Portfolio 1, ISIN ${allocation.isin}:`, error);
                    }
                  } else {
                    console.log(`[Register] ISIN ${allocation.isin} non trovato per Portfolio 1`);
                  }
                }
                
                console.log(`[Register] Create ${allocazioniCreate1}/${portfolio1AllocationsWithIsin.length} allocazioni per Portfolio 1`);
                
                // Portfolio 2: Portafoglio Bilanciato Crescita & Stabilità
                const portfolio2Data = {
                  name: "Portafoglio Bilanciato Crescita & Stabilità",
                  description: "Portafoglio diversificato con mix di azioni, obbligazioni, real estate e materie prime, progettato per offrire una crescita moderata del capitale e una buona stabilità, adatto a investitori con tolleranza al rischio media e orizzonte temporale di medio termine (3-7 anni).",
                  clientProfile: "Investitore con tolleranza al rischio media, obiettivo di crescita del capitale e preservazione del valore, orizzonte temporale 3-7 anni.",
                  riskLevel: "4",
                  constructionLogic: "La costruzione del portafoglio parte dall'obiettivo di bilanciare crescita e stabilità, con un rischio medio e un orizzonte temporale di 3-7 anni. Si è scelto di allocare circa il 35% in azioni (22% developed, 10% emerging, 3% blockchain per diversificazione tematica e crescita, ma con peso contenuto per il rischio elevato), 7% in real estate per diversificazione settoriale e flussi da dividendi, 46% in obbligazioni (mix tra aggregate globali, inflation linked, high yield, emergenti e ultrashort per diversificare rischio tasso/credito/valuta), 7% in oro come bene rifugio e 5% in materie prime per protezione dall'inflazione e decorrelazione. Le percentuali sono state calibrate per mantenere un rischio medio (ponderato), una duration media in linea con l'orizzonte temporale e un TER contenuto. Il peso delle obbligazioni investment grade e aggregate (21%) e ultrashort (6%) aiuta a contenere la volatilità. L'esposizione azionaria è globale e diversificata. L'allocazione in blockchain è limitata per evitare eccessi di rischio. Le materie prime e l'oro offrono protezione da shock inflattivi e geopolitici. Tutti i prodotti selezionati hanno costi contenuti e orizzonte di detenzione compatibile con il profilo richiesto.",
                  entryCost: "0.1",
                  exitCost: "0.05",
                  ongoingCost: "0.265",
                  transactionCost: "0.1",
                  performanceFee: "0",
                  totalAnnualCost: "0.263",
                  averageRisk: "3.36",
                  averageTimeHorizon: "4.2",
                  assetClassDistribution: [
                    {"category": "equity", "percentage": 35},
                    {"category": "real_estate", "percentage": 7},
                    {"category": "bonds", "percentage": 46},
                    {"category": "commodities", "percentage": 12}
                  ]
                };
                
                // Salva il portafoglio 2
                const [portfolio2] = await db.insert(modelPortfolios).values({
                  name: portfolio2Data.name,
                  description: portfolio2Data.description,
                  clientProfile: portfolio2Data.clientProfile,
                  riskLevel: portfolio2Data.riskLevel,
                  constructionLogic: portfolio2Data.constructionLogic,
                  entryCost: portfolio2Data.entryCost,
                  exitCost: portfolio2Data.exitCost,
                  ongoingCost: portfolio2Data.ongoingCost,
                  transactionCost: portfolio2Data.transactionCost,
                  performanceFee: portfolio2Data.performanceFee,
                  totalAnnualCost: portfolio2Data.totalAnnualCost,
                  averageRisk: portfolio2Data.averageRisk,
                  averageTimeHorizon: portfolio2Data.averageTimeHorizon,
                  assetClassDistribution: portfolio2Data.assetClassDistribution,
                  createdBy: user.id
                }).returning();
                
                // Allocazioni per il portafoglio 2 usando ISIN anziché ID
                const portfolio2AllocationsWithIsin = [
                  { isin: "IE00B4L5Y983", percentage: "22" }, // Developed equity
                  { isin: "IE00BKM4GZ66", percentage: "10" }, // Emerging equity
                  { isin: "IE00BSKRK281", percentage: "7" },  // Real estate
                  { isin: "IE00B0M62X26", percentage: "12" }, // Inflation-linked
                  { isin: "IE00B2NPKV68", percentage: "8" },  // Emerging bond
                  { isin: "IE00B4L60045", percentage: "7" },  // High yield bond
                  { isin: "IE00B3FH7618", percentage: "13" }, // Aggregate bond
                  { isin: "IE00BJZPH432", percentage: "6" },  // Ultrashort bond
                  { isin: "IE00B4NCWG09", percentage: "7" },  // Gold
                  { isin: "IE00BGL86Z12", percentage: "5" },  // Commodities
                  { isin: "IE00BGBN6P67", percentage: "3" }   // Blockchain
                ];
                
                console.log(`[Register] Tentativo di creare ${portfolio2AllocationsWithIsin.length} allocazioni per Portfolio 2`);
                let allocazioniCreate2 = 0;
                
                // Inserisci le allocazioni del portafoglio 2
                for (const allocation of portfolio2AllocationsWithIsin) {
                  const productId = isinToProductId[allocation.isin];
                  if (productId) {
                    try {
                      await db.insert(portfolioAllocations).values({
                        portfolioId: portfolio2.id,
                        productId: productId,
                        percentage: allocation.percentage
                      });
                      allocazioniCreate2++;
                      console.log(`[Register] Creata allocazione per Portfolio 2: ISIN ${allocation.isin} -> ID ${productId}, ${allocation.percentage}%`);
                    } catch (error) {
                      console.error(`[Register Error] Errore creando allocazione per Portfolio 2, ISIN ${allocation.isin}:`, error);
                    }
                  } else {
                    console.log(`[Register] ISIN ${allocation.isin} non trovato per Portfolio 2`);
                  }
                }
                
                console.log(`[Register] Create ${allocazioniCreate2}/${portfolio2AllocationsWithIsin.length} allocazioni per Portfolio 2`);
                
                // Portfolio 3: Portafoglio Crescita Globale Aggressivo
                const portfolio3Data = {
                  name: "Portafoglio Crescita Globale Aggressivo",
                  description: "Portafoglio ad alto rischio e alta crescita, con forte esposizione azionaria globale, mercati emergenti, tecnologia blockchain e una diversificazione tattica in obbligazioni high yield, immobili, oro e materie prime. Ideale per investitori con elevata tolleranza al rischio e orizzonte temporale di lungo periodo.",
                  clientProfile: "Investitore con elevata tolleranza al rischio, orizzonte temporale superiore a 7 anni e obiettivo di crescita significativa del capitale.",
                  riskLevel: "6-7",
                  constructionLogic: "La costruzione del portafoglio parte dall'obiettivo di massimizzare la crescita del capitale in un orizzonte temporale di lungo periodo, accettando elevata volatilità. La componente azionaria è dominante (60%), con una forte esposizione ai mercati sviluppati globali (MSCI World, 30%), ai mercati emergenti (20%) e al settore blockchain (10%) per cogliere trend di crescita strutturale e innovazione. L'esposizione immobiliare (8%) aggiunge diversificazione settoriale e potenziale rendimento da dividendi. La componente obbligazionaria (17%) è focalizzata su high yield e mercati emergenti (12%) per aumentare il rendimento atteso, con una piccola quota in inflation linked (5%) per protezione dall'inflazione. Le materie prime (8%) e l'oro (7%) offrono ulteriore diversificazione e copertura da shock di mercato e inflazione. La selezione dei prodotti privilegia ETF a basso costo e liquidità, con duration media coerente con l'orizzonte di lungo periodo. Il rischio medio ponderato è elevato, in linea con il profilo richiesto. La presenza di asset decorrelati (oro, commodities, real estate) riduce il rischio sistemico pur mantenendo un profilo aggressivo.",
                  entryCost: "0.16",
                  exitCost: "0.08",
                  ongoingCost: "0.325",
                  transactionCost: "0.15",
                  performanceFee: "0",
                  totalAnnualCost: "0.304",
                  averageRisk: "5.1",
                  averageTimeHorizon: "4.7",
                  assetClassDistribution: [
                    {"category": "equity", "percentage": 60},
                    {"category": "real_estate", "percentage": 8},
                    {"category": "bonds", "percentage": 17},
                    {"category": "commodities", "percentage": 15}
                  ]
                };
                
                // Salva il portafoglio 3
                const [portfolio3] = await db.insert(modelPortfolios).values({
                  name: portfolio3Data.name,
                  description: portfolio3Data.description,
                  clientProfile: portfolio3Data.clientProfile,
                  riskLevel: portfolio3Data.riskLevel,
                  constructionLogic: portfolio3Data.constructionLogic,
                  entryCost: portfolio3Data.entryCost,
                  exitCost: portfolio3Data.exitCost,
                  ongoingCost: portfolio3Data.ongoingCost,
                  transactionCost: portfolio3Data.transactionCost,
                  performanceFee: portfolio3Data.performanceFee,
                  totalAnnualCost: portfolio3Data.totalAnnualCost,
                  averageRisk: portfolio3Data.averageRisk,
                  averageTimeHorizon: portfolio3Data.averageTimeHorizon,
                  assetClassDistribution: portfolio3Data.assetClassDistribution,
                  createdBy: user.id
                }).returning();
                
                // Allocazioni per il portafoglio 3 usando ISIN anziché ID
                const portfolio3AllocationsWithIsin = [
                  { isin: "IE00B4L5Y983", percentage: "30" }, // Developed equity
                  { isin: "IE00BKM4GZ66", percentage: "20" }, // Emerging equity
                  { isin: "IE00BGBN6P67", percentage: "10" }, // Blockchain
                  { isin: "IE00BSKRK281", percentage: "8" },  // Real estate
                  { isin: "IE00B4L60045", percentage: "7" },  // High yield bond
                  { isin: "IE00B2NPKV68", percentage: "5" },  // Emerging bond
                  { isin: "IE00B0M62X26", percentage: "5" },  // Inflation-linked
                  { isin: "IE00B4NCWG09", percentage: "7" },  // Gold
                  { isin: "IE00BGL86Z12", percentage: "8" }   // Commodities
                ];
                
                console.log(`[Register] Tentativo di creare ${portfolio3AllocationsWithIsin.length} allocazioni per Portfolio 3`);
                let allocazioniCreate3 = 0;
                
                // Inserisci le allocazioni del portafoglio 3
                for (const allocation of portfolio3AllocationsWithIsin) {
                  const productId = isinToProductId[allocation.isin];
                  if (productId) {
                    try {
                      await db.insert(portfolioAllocations).values({
                        portfolioId: portfolio3.id,
                        productId: productId,
                        percentage: allocation.percentage
                      });
                      allocazioniCreate3++;
                      console.log(`[Register] Creata allocazione per Portfolio 3: ISIN ${allocation.isin} -> ID ${productId}, ${allocation.percentage}%`);
                    } catch (error) {
                      console.error(`[Register Error] Errore creando allocazione per Portfolio 3, ISIN ${allocation.isin}:`, error);
                    }
                  } else {
                    console.log(`[Register] ISIN ${allocation.isin} non trovato per Portfolio 3`);
                  }
                }
                
                console.log(`[Register] Create ${allocazioniCreate3}/${portfolio3AllocationsWithIsin.length} allocazioni per Portfolio 3`);
                console.log(`[Register] Creazione portafogli modello completata con successo per l'utente ${user.id}`);
              };
              
              await createDefaultPortfolios();
            } catch (portfolioError) {
              console.error("[Register Error] Errore durante la creazione dei portafogli modello predefiniti:", portfolioError);
              // Non bloccare la registrazione se la creazione dei portafogli fallisce
            }
          } catch (productError) {
            console.error("[Register Error] Errore durante l'aggiunta di prodotti predefiniti:", productError);
            // Non bloccare la registrazione se l'aggiunta di prodotti fallisce
          }
          
        } catch (clientError) {
          console.error("[Register Error] Errore durante la creazione dei clienti mock:", clientError);
          // Non bloccare la registrazione se la creazione dei clienti fallisce
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
