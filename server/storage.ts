import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation,
  clientLogs, type ClientLog, type InsertClientLog,
  aiProfiles, type AiProfile, type InsertAiProfile,
  sparkPriorities, type SparkPriority, type InsertSparkPriority,
  LOG_TYPES, type LogType
} from "@shared/schema";
import session from "express-session";
import { eq, and, gt, sql, desc, inArray } from 'drizzle-orm';
import connectPgSimple from "connect-pg-simple";
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import createMemoryStore from 'memorystore';
import { db, sql as pgClient } from './db';
import { sendOnboardingEmail } from './email';
import { promisify } from 'util';
import { Pool } from 'pg';

const MemoryStore = createMemoryStore(session);
const PgSession = connectPgSimple(session);

export interface IStorage {
  sessionStore: session.Store;
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByField(field: string, value: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  approveUser(id: number): Promise<User>;
  rejectUser(id: number): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  isAdminEmail(email: string): Promise<boolean>;
  
  // Client Methods
  getClient(id: number): Promise<Client | undefined>;
  getClientsByAdvisor(advisorId: number): Promise<Client[]>;
  getClientByToken(token: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  generateOnboardingToken(clientId: number, language?: 'english' | 'italian', customMessage?: string, advisorEmail?: string, customSubject?: string): Promise<string>;
  archiveClient(id: number): Promise<Client>;
  restoreClient(id: number): Promise<Client>;
  updateClientPassword(clientId: number, password: string): Promise<boolean>;
  verifyClientPassword(clientId: number, password: string): Promise<boolean>;
  
  // Asset Methods
  getAssetsByClient(clientId: number): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: number): Promise<boolean>;
  
  // Recommendation Methods
  getRecommendationsByClient(clientId: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<boolean>;
  
  // Client Log Methods
  getClientLogs(clientId: number): Promise<ClientLog[]>;
  createClientLog(log: InsertClientLog): Promise<ClientLog>;
  updateClientLog(id: number, log: Partial<ClientLog>): Promise<ClientLog>;
  deleteClientLog(id: number): Promise<boolean>;
  
  // AI Profile Methods
  getAiProfile(clientId: number): Promise<AiProfile | undefined>;
  createAiProfile(profile: InsertAiProfile): Promise<AiProfile>;
  updateAiProfile(clientId: number, profileData: any): Promise<AiProfile>;
  deleteAiProfile(clientId: number): Promise<boolean>;
  
  // Spark Priority Methods
  getSparkPriorities(advisorId: number): Promise<SparkPriority[]>;
  createSparkPriority(priority: InsertSparkPriority): Promise<SparkPriority>;
  updateSparkPriorityStatus(id: number, isNew: boolean): Promise<SparkPriority>;
  deleteSparkPriority(id: number): Promise<boolean>;
  clearOldSparkPriorities(advisorId: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    console.log("DEBUG - Inizializzazione PostgresStorage");
    
    // Start with memory store for sessions
    try {
      console.log("DEBUG - Creazione MemoryStore temporaneo per sessioni");
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // Clear expired sessions every day
      });
      console.log("DEBUG - MemoryStore creato con successo");
    } catch (err) {
      console.error("ERRORE - Fallita creazione MemoryStore:", err);
      // Crea un dummy store per evitare errori null
      const MemoryStore = createMemoryStore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // Clear expired sessions every day
      });
    }
    
    // Set up PG session asynchronously
    console.log("DEBUG - Avvio setup sessione PostgreSQL");
    this.setupPgSession().catch(err => {
      console.error("ERRORE - setupPgSession fallito nella promise:", err);
    });
    
    // Log database status
    console.log('DEBUG - PostgreSQL storage initialized with database connection');
  }
  
  private async setupPgSession() {
    console.log("DEBUG - setupPgSession iniziato");
    try {
      console.log("DEBUG - Importazione modulo pg");
      const pg = await import('pg');
      
      console.log("DEBUG - Verifico DATABASE_URL");
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error("DATABASE_URL non è definito");
      }
      
      console.log("DEBUG - Creazione pool di connessioni per sessione");
      // Create a separate connection for the session store
      const pool = new pg.default.Pool({
        connectionString: dbUrl
      });
      
      console.log("DEBUG - Test connessione pool");
      // Test di connessione al database
      const client = await pool.connect();
      try {
        console.log("DEBUG - Test query sul pool");
        const result = await client.query('SELECT NOW()');
        console.log("DEBUG - Test query riuscito:", result.rows[0]);
      } catch (queryError) {
        console.error("ERRORE - Test query fallito:", queryError);
        throw queryError;
      } finally {
        client.release();
        console.log("DEBUG - Client rilasciato");
      }
      
      console.log("DEBUG - Inizializzazione PgSession");
      // Initialize session store with the pool
      this.sessionStore = new PgSession({
        pool: pool,
        createTableIfMissing: true,
        tableName: 'session' // Nome tabella esplicito
      });
      
      console.log('DEBUG - PostgreSQL session store inizializzato con successo');
    } catch (error) {
      console.error('ERRORE CRITICO - Failed to setup PG session store:', error);
      // Continue using memory store if this fails
    }
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByField(field: string, value: string): Promise<User | undefined> {
    // Build dynamic where clause based on field
    // This is a safe approach since we're controlling the field name directly
    let result;
    
    switch(field) {
      case 'verificationToken':
        result = await db.select().from(users).where(eq(users.verificationToken, value));
        break;
      case 'email':
        result = await this.getUserByEmail(value);
        return result;
      case 'username':
        result = await this.getUserByUsername(value);
        return result;
      default:
        throw new Error(`Field ${field} not supported for user lookup`);
    }
    
    return result?.[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Imposta lo stato di approvazione come pending per tutti i nuovi utenti
    const userWithApproval = {
      ...insertUser,
      approvalStatus: 'pending' as const
    };
    
    const result = await db.insert(users).values(userWithApproval).returning();
    return result[0];
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async getPendingUsers(): Promise<User[]> {
    const result = await db.select().from(users).where(eq(users.approvalStatus, 'pending'));
    return result;
  }

  async approveUser(id: number): Promise<User> {
    const result = await db.update(users)
      .set({ approvalStatus: 'approved' })
      .where(eq(users.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result[0];
  }

  async rejectUser(id: number): Promise<User> {
    const result = await db.update(users)
      .set({ approvalStatus: 'rejected' })
      .where(eq(users.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async isAdminEmail(email: string): Promise<boolean> {
    // Amministratore specifico (hardcoded per motivi di sicurezza)
    return email === 'gianmarco.trapasso@gmail.com';
  }
  
  // Client Methods
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }
  
  async getClientsByAdvisor(advisorId: number): Promise<Client[]> {
    const result = await db.select().from(clients).where(eq(clients.advisorId, advisorId));
    return result;
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    // Ensure we have both first and last name
    const { firstName, lastName, name, personalInterests, investmentGoals, ...restOfClient } = insertClient;
    
    // If first name and last name are provided but name is not,
    // automatically generate the full name
    const fullName = name || `${firstName} ${lastName}`;
    
    // Normalizzazione di array personalInterests
    let normalizedPersonalInterests = personalInterests;
    if (personalInterests !== undefined && !Array.isArray(personalInterests)) {
      if (typeof personalInterests === 'string') {
        try {
          normalizedPersonalInterests = personalInterests.split(',').map(s => s.trim());
        } catch (e) {
          console.error('Errore nella conversione di personalInterests:', e);
          normalizedPersonalInterests = [];
        }
      } else {
        normalizedPersonalInterests = [];
      }
    }
    
    // Normalizzazione di array investmentGoals
    let normalizedInvestmentGoals = investmentGoals;
    if (investmentGoals !== undefined && !Array.isArray(investmentGoals)) {
      if (typeof investmentGoals === 'string') {
        try {
          normalizedInvestmentGoals = investmentGoals.split(',').map(s => s.trim());
        } catch (e) {
          console.error('Errore nella conversione di investmentGoals:', e);
          normalizedInvestmentGoals = [];
        }
      } else {
        normalizedInvestmentGoals = [];
      }
    }
    
    const result = await db.insert(clients).values({
      firstName: firstName || (name ? name.split(' ')[0] : ''),
      lastName: lastName || (name ? name.split(' ').slice(1).join(' ') : ''),
      name: fullName,
      ...restOfClient,
      personalInterests: normalizedPersonalInterests,
      investmentGoals: normalizedInvestmentGoals,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client> {
    const { firstName, lastName, name, personalInterests, investmentGoals, ...restOfUpdate } = clientUpdate;
    
    // Get the current client first
    const currentClient = await this.getClient(id);
    if (!currentClient) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    let updateData: Partial<Client> = { ...restOfUpdate };
    
    // Handle name fields synchronization
    if (firstName !== undefined || lastName !== undefined) {
      // If either first or last name is updated, update all three fields
      const newFirstName = firstName !== undefined ? firstName : currentClient.firstName;
      const newLastName = lastName !== undefined ? lastName : currentClient.lastName;
      
      updateData = {
        ...updateData,
        firstName: newFirstName,
        lastName: newLastName,
        name: `${newFirstName} ${newLastName}`
      };
    } else if (name !== undefined) {
      // If only full name is updated, update first and last name too
      const nameParts = name.split(' ');
      const newFirstName = nameParts[0];
      const newLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      updateData = {
        ...updateData,
        firstName: newFirstName,
        lastName: newLastName,
        name
      };
    }

    // Normalizza gli array di interessi personali e obiettivi d'investimento
    if (personalInterests !== undefined) {
      // Assicurati che sia sempre un array
      if (Array.isArray(personalInterests)) {
        updateData.personalInterests = personalInterests;
      } else if (typeof personalInterests === 'string') {
        // Se è una stringa, potrebbe essere in formato "18,19,20" o simile
        // Converte in array di stringhe, separando per virgole
        try {
          updateData.personalInterests = personalInterests.split(',').map(s => s.trim());
        } catch (e) {
          console.error('Errore nella conversione di personalInterests:', e);
          updateData.personalInterests = [];
        }
      } else {
        updateData.personalInterests = [];
      }
    }

    if (investmentGoals !== undefined) {
      // Assicurati che sia sempre un array
      if (Array.isArray(investmentGoals)) {
        updateData.investmentGoals = investmentGoals;
      } else if (typeof investmentGoals === 'string') {
        try {
          updateData.investmentGoals = investmentGoals.split(',').map(s => s.trim());
        } catch (e) {
          console.error('Errore nella conversione di investmentGoals:', e);
          updateData.investmentGoals = [];
        }
      } else {
        updateData.investmentGoals = [];
      }
    }
    
    const result = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Failed to update client with id ${id}`);
    }
    
    return result[0];
  }
  
  async deleteClient(id: number): Promise<boolean> {
    console.log(`[INFO] Avvio eliminazione del cliente ID: ${id}`);
    
    try {
      // Verifichiamo se il cliente esiste prima dell'eliminazione
      const clientExists = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (clientExists.length === 0) {
        console.log(`[INFO] Cliente ID: ${id} non trovato`);
        return false;
      }
      
      // Eliminiamo seguendo un ordine specifico per garantire la compatibilità
      // con tutti gli ambienti, sia con CASCADE che senza
      
      // 1. Eliminiamo prima le entità dipendenti in modo esplicito
      console.log(`[INFO] Eliminazione delle entità dipendenti per il cliente ID: ${id}`);
      
      // Eliminiamo gli asset
      const deletedAssets = await db.delete(assets)
        .where(eq(assets.clientId, id))
        .returning({ id: assets.id });
      console.log(`[INFO] Eliminati ${deletedAssets.length} asset del cliente`);
      
      // Eliminiamo le raccomandazioni
      const deletedRecommendations = await db.delete(recommendations)
        .where(eq(recommendations.clientId, id))
        .returning({ id: recommendations.id });
      console.log(`[INFO] Eliminate ${deletedRecommendations.length} raccomandazioni del cliente`);
      
      // Eliminiamo i profili AI
      const deletedProfiles = await db.delete(aiProfiles)
        .where(eq(aiProfiles.clientId, id))
        .returning({ id: aiProfiles.id });
      console.log(`[INFO] Eliminati ${deletedProfiles.length} profili AI del cliente`);
      
      // Eliminiamo i client logs
      const deletedLogs = await db.delete(clientLogs)
        .where(eq(clientLogs.clientId, id))
        .returning({ id: clientLogs.id });
      console.log(`[INFO] Eliminati ${deletedLogs.length} logs del cliente`);
      
      // 2. Ora che tutte le dipendenze sono state rimosse, possiamo eliminare il cliente
      const result = await db.delete(clients)
        .where(eq(clients.id, id))
        .returning({ id: clients.id });
      
      const success = result.length > 0;
      
      if (success) {
        console.log(`[INFO] Cliente ID: ${id} eliminato con successo`);
      } else {
        // Questo non dovrebbe mai accadere dato il controllo iniziale
        console.log(`[WARN] Impossibile eliminare il cliente ID: ${id}, nessuna riga rimossa`);
      }
      
      // Verifica finale - conferma che il cliente è stato realmente eliminato
      const verifyDeleted = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (verifyDeleted.length > 0) {
        // Errore: il cliente esiste ancora dopo l'eliminazione
        console.error(`[ERROR] Anomalia: il cliente ID: ${id} esiste ancora dopo l'eliminazione`);
        
        return false;
      }
      
      return success;
    } catch (error) {
      console.error(`[ERROR] Errore durante l'eliminazione del cliente ID: ${id}:`, error);
      
      // In caso di fallimento riproviamo con un approach più diretto usando raw SQL
      try {
        console.log(`[INFO] Tentativo alternativo di eliminazione con SQL diretto per il cliente ID: ${id}`);
        
        // Utilizzo di raw SQL con Drizzle invece di postgres direttamente
        // Questo permette di mantenere la compatibilità con la pooled connection
        await db.execute(sql`DELETE FROM assets WHERE client_id = ${id}`);
        await db.execute(sql`DELETE FROM recommendations WHERE client_id = ${id}`);
        await db.execute(sql`DELETE FROM ai_profiles WHERE client_id = ${id}`);
        await db.execute(sql`DELETE FROM client_logs WHERE client_id = ${id}`);
        await db.execute(sql`DELETE FROM clients WHERE id = ${id}`);
        
        // Verifica se il cliente è stato effettivamente eliminato
        const verifyDeleted = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
        const success = verifyDeleted.length === 0;
        
        console.log(`[INFO] Risultato del tentativo alternativo: cliente ${success ? 'eliminato' : 'ancora presente'}`);
        
        return success;
      } catch (fallbackError) {
        console.error(`[ERROR] Fallimento anche del tentativo alternativo:`, fallbackError);
        throw fallbackError; // Propaga l'errore originale
      }
    }
  }
  
  async archiveClient(id: number): Promise<Client> {
    console.log(`[INFO] Archiviazione cliente ID: ${id} - Inizio processo`);
    
    try {
      // STEP 1: Verifichiamo che il cliente esista
      console.log(`[INFO] Verifica esistenza cliente ID: ${id}`);
      const existingClient = await this.getClient(id);
      
      if (!existingClient) {
        console.log(`[ERROR] Cliente ID: ${id} non trovato per archiviazione`);
        throw new Error(`Client with id ${id} not found`);
      }
      
      console.log(`[INFO] Cliente ID: ${id} trovato, procedo con archiviazione`);
      
      // STEP 2: Aggiorniamo lo stato di archiviazione con Drizzle ORM
      console.log(`[INFO] Aggiornamento stato archiviazione per cliente ID: ${id}`);
      try {
        const result = await db.update(clients)
          .set({ isArchived: true })
          .where(eq(clients.id, id))
          .returning();
        
        if (!result[0]) {
          console.log(`[ERROR] Nessun risultato restituito dall'operazione di archiviazione per cliente ID: ${id}`);
          throw new Error(`Failed to archive client with id ${id} - No result returned`);
        }
        
        console.log(`[INFO] Cliente ID: ${id} archiviato con successo tramite Drizzle ORM`);
        return result[0];
      } catch (drizzleError) {
        // STEP 3: Fallback in caso di errore con Drizzle ORM
        console.log(`[WARNING] Errore con Drizzle ORM durante archiviazione cliente ID: ${id}, tento approccio SQL diretto`);
        console.error(drizzleError);
        
        try {
          // Utilizzo SQL diretto come fallback
          const sqlResult = await pgClient`
            UPDATE clients
            SET "isArchived" = true
            WHERE id = ${id}
            RETURNING *
          `;
          
          if (!sqlResult || sqlResult.length === 0) {
            console.log(`[ERROR] Fallback SQL: Nessun cliente archiviato con ID: ${id}`);
            throw new Error(`Failed to archive client with id ${id} - SQL direct approach failed`);
          }
          
          console.log(`[INFO] Fallback SQL: Cliente ID: ${id} archiviato con successo`);
          return sqlResult[0] as Client;
        } catch (sqlError) {
          console.error(`[ERROR] Anche l'approccio SQL diretto è fallito per cliente ID: ${id}`, sqlError);
          throw new Error(`Failed to archive client with id ${id} - Both approaches failed`);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Errore fatale durante l'archiviazione del cliente ID: ${id}:`, error);
      throw error;
    }
  }
  
  async restoreClient(id: number): Promise<Client> {
    console.log(`[INFO] Ripristino cliente archiviato ID: ${id} - Inizio processo`);
    
    try {
      // STEP 1: Verifichiamo che il cliente esista
      console.log(`[INFO] Verifica esistenza cliente ID: ${id}`);
      const existingClient = await this.getClient(id);
      
      if (!existingClient) {
        console.log(`[ERROR] Cliente ID: ${id} non trovato per ripristino`);
        throw new Error(`Client with id ${id} not found`);
      }
      
      if (existingClient.isArchived !== true) {
        console.log(`[WARNING] Cliente ID: ${id} non è archiviato, non serve ripristinarlo`);
        return existingClient; // Ritorna il cliente già non archiviato
      }
      
      console.log(`[INFO] Cliente ID: ${id} trovato, procedo con il ripristino`);
      
      // STEP 2: Ripristiniamo il cliente con Drizzle ORM
      console.log(`[INFO] Aggiornamento stato archiviazione per cliente ID: ${id}`);
      try {
        const result = await db.update(clients)
          .set({ isArchived: false })
          .where(eq(clients.id, id))
          .returning();
        
        if (!result[0]) {
          console.log(`[ERROR] Nessun risultato restituito dall'operazione di ripristino per cliente ID: ${id}`);
          throw new Error(`Failed to restore client with id ${id} - No result returned`);
        }
        
        console.log(`[INFO] Cliente ID: ${id} ripristinato con successo tramite Drizzle ORM`);
        return result[0];
      } catch (drizzleError) {
        // STEP 3: Fallback in caso di errore con Drizzle ORM
        console.log(`[WARNING] Errore con Drizzle ORM durante ripristino cliente ID: ${id}, tento approccio SQL diretto`);
        console.error(drizzleError);
        
        try {
          // Utilizzo SQL diretto come fallback
          const sqlResult = await pgClient`
            UPDATE clients
            SET "isArchived" = false
            WHERE id = ${id}
            RETURNING *
          `;
          
          if (!sqlResult || sqlResult.length === 0) {
            console.log(`[ERROR] Fallback SQL: Nessun cliente ripristinato con ID: ${id}`);
            throw new Error(`Failed to restore client with id ${id} - SQL direct approach failed`);
          }
          
          console.log(`[INFO] Fallback SQL: Cliente ID: ${id} ripristinato con successo`);
          return sqlResult[0] as Client;
        } catch (sqlError) {
          console.error(`[ERROR] Anche l'approccio SQL diretto è fallito per cliente ID: ${id}`, sqlError);
          throw new Error(`Failed to restore client with id ${id} - Both approaches failed`);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Errore fatale durante il ripristino del cliente ID: ${id}:`, error);
      throw error;
    }
  }
  
  async getClientByToken(token: string): Promise<Client | undefined> {
    console.log(`DEBUG - getClientByToken chiamato con token: ${token}`);
    
    // Prima facciamo una query senza controllo data per debuggare
    const checkClient = await db.select().from(clients).where(
      eq(clients.onboardingToken, token)
    );
    
    if (checkClient.length === 0) {
      console.log(`DEBUG - Nessun cliente trovato con token: ${token}`);
      return undefined;
    }
    
    const now = new Date();
    const expiryDate = checkClient[0].tokenExpiry as Date;
    
    console.log(`DEBUG - Token trovato per cliente ID: ${checkClient[0].id}`);
    console.log(`DEBUG - Data corrente: ${now.toISOString()}`);
    console.log(`DEBUG - Data scadenza token: ${expiryDate?.toISOString()}`);
    console.log(`DEBUG - Token scaduto? ${expiryDate < now}`);
    
    // Ora eseguiamo la query con il controllo di scadenza corretto
    const result = await db.select().from(clients).where(
      and(
        eq(clients.onboardingToken, token),
        gt(clients.tokenExpiry as any, now)
      )
    );
    
    if (result.length === 0) {
      console.log(`DEBUG - Token scaduto o non valido`);
    } else {
      console.log(`DEBUG - Token valido, cliente trovato: ${result[0].id}`);
    }
    
    return result[0];
  }
  
  async generateOnboardingToken(clientId: number, language: 'english' | 'italian' = 'english', customMessage?: string, advisorEmail?: string, customSubject?: string): Promise<string> {
    // Log di debug aggiuntivi per verificare se l'oggetto email è passato correttamente
    console.log("DEBUG Storage - generateOnboardingToken ricevuto questi parametri:");
    console.log(`DEBUG Storage - clientId: ${clientId}`);
    console.log(`DEBUG Storage - language: ${language}`);
    console.log(`DEBUG Storage - customMessage: ${customMessage || "(non specificato)"}`);
    console.log(`DEBUG Storage - advisorEmail: ${advisorEmail || "(non specificato)"}`);
    console.log(`DEBUG Storage - customSubject: ${customSubject || "(non specificato)"}`);
    
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }
    
    // Verifica se esiste già un token valido per questo cliente
    let token = client.onboardingToken;
    let tokenExpiry = client.tokenExpiry;
    let needsNewToken = true;
    
    if (token && tokenExpiry) {
      // Controlla se il token esistente è ancora valido (non scaduto)
      const now = new Date();
      const expiryDate = new Date(tokenExpiry);
      
      if (expiryDate > now) {
        // Il token esistente è ancora valido, lo riutilizziamo
        console.log(`DEBUG Storage - Riutilizzo token esistente per cliente ID: ${clientId}`);
        needsNewToken = false;
      } else {
        console.log(`DEBUG Storage - Token esistente scaduto per cliente ID: ${clientId}, ne genero uno nuovo`);
      }
    } else {
      console.log(`DEBUG Storage - Nessun token esistente per cliente ID: ${clientId}, ne genero uno nuovo`);
    }
    
    // Se necessario, generiamo un nuovo token
    if (needsNewToken) {
      // Generate a random token
      token = randomBytes(16).toString('hex');
      
      // Set token expiry to 7 days from now
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      tokenExpiry = expiry;
      
      // Update client with token and expiry
      await this.updateClient(clientId, { 
        onboardingToken: token,
        tokenExpiry: expiry
      });
      
      console.log(`DEBUG Storage - Nuovo token generato per cliente ID: ${clientId}: ${token}`);
    }

    // Generate onboarding link (solo per debug)
    const baseUrl = process.env.BASE_URL || `https://workspace.gianmarcotrapasso.replit.app`;
    const onboardingLink = `${baseUrl}/onboarding?token=${token}`;
    console.log(`DEBUG Storage - Link onboarding: ${onboardingLink}`);
    
    // Get advisor information (to include signature)
    const advisor = client.advisorId ? await this.getUser(client.advisorId) : undefined;
    const advisorSignature = advisor?.signature || undefined;

    // Non inviamo più l'email qui per evitare duplicazioni
    // L'email viene inviata solamente in server/routes.ts
    
    return token as string;
  }
  
  // Asset Methods
  async getAssetsByClient(clientId: number): Promise<Asset[]> {
    const result = await db.select().from(assets).where(eq(assets.clientId, clientId));
    return result;
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const result = await db.insert(assets).values({
      ...insertAsset,
      createdAt: new Date()
    }).returning();
    return result[0];
  }
  
  async updateAsset(id: number, assetUpdate: Partial<Asset>): Promise<Asset> {
    const result = await db.update(assets)
      .set(assetUpdate)
      .where(eq(assets.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }
  
  // Recommendation Methods
  async getRecommendationsByClient(clientId: number): Promise<Recommendation[]> {
    const result = await db.select().from(recommendations).where(eq(recommendations.clientId, clientId));
    return result;
  }
  
  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const result = await db.insert(recommendations).values({
      ...insertRecommendation,
      createdAt: new Date()
    }).returning();
    return result[0];
  }
  
  async deleteRecommendation(id: number): Promise<boolean> {
    const result = await db.delete(recommendations).where(eq(recommendations.id, id)).returning();
    return result.length > 0;
  }
  
  // Client password management methods
  async updateClientPassword(clientId: number, password: string): Promise<boolean> {
    // First, get the client to ensure it exists
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }
    
    // Generate a salt
    const salt = randomBytes(16).toString('hex');
    
    // Hash the password with the salt
    const scryptAsync = promisify(scrypt);
    const passwordHash = await scryptAsync(password, salt, 64) as Buffer;
    
    // Store the hashed password with salt in format: hash:salt
    const passwordField = `${passwordHash.toString('hex')}:${salt}`;
    
    // Update the client record
    const result = await db.update(clients)
      .set({ 
        password: passwordField,
        hasPortalAccess: true 
      })
      .where(eq(clients.id, clientId))
      .returning();
    
    return result.length > 0;
  }
  
  async verifyClientPassword(clientId: number, password: string): Promise<boolean> {
    // First, get the client with the stored password
    const client = await this.getClient(clientId);
    if (!client || !client.password) {
      return false;
    }
    
    // Split the stored password field into hash and salt
    const [storedHash, salt] = client.password.split(':');
    
    if (!storedHash || !salt) {
      return false;
    }
    
    // Hash the provided password with the same salt
    const scryptAsync = promisify(scrypt);
    const passwordHash = await scryptAsync(password, salt, 64) as Buffer;
    
    // Compare the hashes
    const providedHash = passwordHash.toString('hex');
    
    // Use timingSafeEqual to prevent timing attacks
    try {
      const bufferedStored = Buffer.from(storedHash, 'hex');
      const bufferedProvided = Buffer.from(providedHash, 'hex');
      return timingSafeEqual(bufferedStored, bufferedProvided);
    } catch (err) {
      console.error('Error verifying password:', err);
      return false;
    }
  }

  // Client Log Methods
  async getClientLogs(clientId: number): Promise<ClientLog[]> {
    try {
      const result = await db.select()
        .from(clientLogs)
        .where(eq(clientLogs.clientId, clientId))
        .orderBy(desc(clientLogs.createdAt));
      return result;
    } catch (error) {
      console.error(`[ERROR] Errore durante il recupero dei log per il cliente ID: ${clientId}:`, error);
      throw error;
    }
  }

  async createClientLog(insertLog: InsertClientLog): Promise<ClientLog> {
    try {
      // Verifichiamo che il cliente esista prima di creare il log
      const client = await this.getClient(insertLog.clientId || 0);
      if (!client) {
        throw new Error(`Client with id ${insertLog.clientId} not found`);
      }
      
      // Verifichiamo che il tipo sia valido
      if (!LOG_TYPES.includes(insertLog.type as LogType)) {
        throw new Error(`Invalid log type: ${insertLog.type}. Valid types are: ${LOG_TYPES.join(', ')}`);
      }
      
      // Utilizziamo un approccio più specifico per validare il tipo
      // Questo garantisce che il valore sia esattamente uno di quelli accettati
      let logType: LogType;
      
      switch(insertLog.type) {
        case 'email':
          logType = 'email';
          break;
        case 'note':
          logType = 'note';
          break;
        case 'call':
          logType = 'call';
          break;
        case 'meeting':
          logType = 'meeting';
          break;
        default:
          // Fallback sicuro al tipo 'note' se il valore non è valido
          logType = 'note';
          console.warn(`Tipo log non valido: ${insertLog.type}, impostato su 'note'`);
      }
      
      // Ora costruiamo un oggetto che rispetta esattamente lo schema atteso
      const result = await db.insert(clientLogs)
        .values([{
          clientId: insertLog.clientId,
          type: logType, // Ora è sicuramente uno dei valori accettati
          title: insertLog.title,
          content: insertLog.content,
          emailSubject: insertLog.emailSubject,
          emailRecipients: insertLog.emailRecipients,
          logDate: insertLog.logDate,
          createdBy: insertLog.createdBy
        }])
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('[ERROR] Errore durante la creazione del log del cliente:', error);
      throw error;
    }
  }

  async updateClientLog(id: number, logUpdate: Partial<ClientLog>): Promise<ClientLog> {
    try {
      // Non permettiamo di modificare il clientId per mantenere l'integrità dei dati
      const { clientId, type, ...restOfUpdate } = logUpdate;
      
      // Processiamo il campo type in modo sicuro
      let updateData: Record<string, any> = { ...restOfUpdate };
      
      // Se viene fornito un tipo, verifichiamo che sia valido
      if (type) {
        // Validazione esplicita del tipo
        let validType: LogType;
        
        switch(type) {
          case 'email':
            validType = 'email';
            break;
          case 'note':
            validType = 'note';
            break;
          case 'call':
            validType = 'call';
            break;
          case 'meeting':
            validType = 'meeting';
            break;
          default:
            // Se non è valido, non lo aggiorniamo
            console.warn(`Tipo log non valido in aggiornamento: ${type}, ignorato`);
            validType = undefined as any; // Non aggiungiamo il tipo
        }
        
        // Solo se abbiamo un tipo valido lo includiamo nell'aggiornamento
        if (validType) {
          updateData.type = validType;
        }
      }
      
      const result = await db.update(clientLogs)
        .set(updateData)
        .where(eq(clientLogs.id, id))
        .returning();
      
      if (!result[0]) {
        throw new Error(`Log with id ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Errore durante l'aggiornamento del log ID: ${id}:`, error);
      throw error;
    }
  }

  async deleteClientLog(id: number): Promise<boolean> {
    try {
      const result = await db.delete(clientLogs)
        .where(eq(clientLogs.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`[ERROR] Errore durante l'eliminazione del log ID: ${id}:`, error);
      throw error;
    }
  }
  
  // AI Profile Methods
  async getAiProfile(clientId: number): Promise<AiProfile | undefined> {
    try {
      const result = await db.select()
        .from(aiProfiles)
        .where(eq(aiProfiles.clientId, clientId));
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Errore durante il recupero del profilo AI per il cliente ID: ${clientId}:`, error);
      throw error;
    }
  }
  
  async createAiProfile(profile: InsertAiProfile): Promise<AiProfile> {
    try {
      const result = await db.insert(aiProfiles)
        .values({
          ...profile,
          lastGeneratedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Errore durante la creazione del profilo AI per il cliente ID: ${profile.clientId}:`, error);
      throw error;
    }
  }
  
  async updateAiProfile(clientId: number, profileData: any): Promise<AiProfile> {
    try {
      // Verifica se esiste un profilo per questo cliente
      const existingProfile = await this.getAiProfile(clientId);
      
      if (existingProfile) {
        // Aggiorna il profilo esistente
        const result = await db.update(aiProfiles)
          .set({ 
            profileData,
            lastGeneratedAt: new Date()  
          })
          .where(eq(aiProfiles.clientId, clientId))
          .returning();
        
        if (!result[0]) {
          throw new Error(`Failed to update AI profile for client ${clientId}`);
        }
        
        return result[0];
      } else {
        // Crea un nuovo profilo
        return this.createAiProfile({
          clientId,
          profileData,
          createdBy: null // Opzionale, può essere fornito dal controller
        });
      }
    } catch (error) {
      console.error(`[ERROR] Errore durante l'aggiornamento del profilo AI per il cliente ID: ${clientId}:`, error);
      throw error;
    }
  }
  
  async deleteAiProfile(clientId: number): Promise<boolean> {
    try {
      const result = await db.delete(aiProfiles)
        .where(eq(aiProfiles.clientId, clientId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`[ERROR] Errore durante l'eliminazione del profilo AI per il cliente ID: ${clientId}:`, error);
      throw error;
    }
  }

  // Spark Priority Methods
  async getSparkPriorities(advisorId: number): Promise<SparkPriority[]> {
    // Recupera le priorità Spark, join con clients per ottenere il nome del cliente
    const result = await db.select({
      id: sparkPriorities.id,
      clientId: sparkPriorities.clientId,
      clientName: clients.name,
      title: sparkPriorities.title,
      description: sparkPriorities.description,
      priority: sparkPriorities.priority,
      relatedNewsTitle: sparkPriorities.relatedNewsTitle,
      relatedNewsUrl: sparkPriorities.relatedNewsUrl,
      isNew: sparkPriorities.isNew,
      createdAt: sparkPriorities.createdAt,
      lastUpdatedAt: sparkPriorities.lastUpdatedAt,
      createdBy: sparkPriorities.createdBy,
    })
    .from(sparkPriorities)
    .innerJoin(clients, eq(sparkPriorities.clientId, clients.id))
    .where(eq(clients.advisorId, advisorId))
    .orderBy(sparkPriorities.priority, sparkPriorities.createdAt)
    .limit(5);
    
    return result;
  }

  async createSparkPriority(priority: InsertSparkPriority): Promise<SparkPriority> {
    // Controlla se l'input contiene una stringa clientId con formato "11,12,13,..."
    let clientIdToUse: number;
    
    if (typeof priority.clientId === 'string' && priority.clientId.includes(',')) {
      // Se è una stringa di ID separati da virgole, prendi solo il primo valore
      console.warn(`[WARNING] Received comma-separated clientId string: "${priority.clientId}". Taking only first value.`);
      const firstId = priority.clientId.split(',')[0].trim();
      clientIdToUse = parseInt(firstId, 10);
      
      if (isNaN(clientIdToUse)) {
        console.error(`[ERROR] Cannot parse first clientId from string: "${priority.clientId}"`);
        throw new Error(`Invalid client ID format: ${priority.clientId}`);
      }
    } else if (typeof priority.clientId === 'string') {
      // Se è una stringa ma non contiene virgole, converti in numero
      clientIdToUse = parseInt(priority.clientId, 10);
      
      if (isNaN(clientIdToUse)) {
        console.error(`[ERROR] Cannot parse clientId from string: "${priority.clientId}"`);
        throw new Error(`Invalid client ID: ${priority.clientId}`);
      }
    } else if (typeof priority.clientId === 'number') {
      // Se è già un numero, usalo direttamente
      clientIdToUse = priority.clientId;
    } else {
      // Se è null, undefined o altro tipo non supportato
      console.error(`[ERROR] Invalid clientId in createSparkPriority: ${priority.clientId}, type: ${typeof priority.clientId}`);
      throw new Error(`Invalid client ID: ${priority.clientId}`);
    }
    
    // Verifica che il client esista prima di creare la priorità
    const client = await this.getClient(clientIdToUse);
    if (!client) {
      throw new Error(`Client with id ${clientIdToUse} not found`);
    }
    
    // Log di debug
    console.log(`[DEBUG] Creating Spark priority for client ID: ${clientIdToUse} (original input: ${typeof priority.clientId === 'object' ? JSON.stringify(priority.clientId) : priority.clientId})`);
    
    // Garantiamo che i valori siano correttamente tipizzati
    const validatedPriority = {
      ...priority,
      clientId: clientIdToUse,
      priority: Number(priority.priority || 1),
      isNew: Boolean(priority.isNew !== false), // Default a true se non specificato
      createdBy: priority.createdBy ? Number(priority.createdBy) : null,
      createdAt: new Date(),
      lastUpdatedAt: new Date()
    };
    
    try {
      const result = await db.insert(sparkPriorities)
        .values(validatedPriority)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Failed to insert Spark priority for client ${clientIdToUse}:`, error);
      
      // Log i dettagli per debug
      console.error(`Validated priority data:`, JSON.stringify(validatedPriority, null, 2));
      
      throw error;
    }
  }

  async updateSparkPriorityStatus(id: number, isNew: boolean): Promise<SparkPriority> {
    const result = await db.update(sparkPriorities)
      .set({ 
        isNew,
        lastUpdatedAt: new Date()
      })
      .where(eq(sparkPriorities.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Spark priority with id ${id} not found`);
    }
    
    return result[0];
  }

  async deleteSparkPriority(id: number): Promise<boolean> {
    const result = await db.delete(sparkPriorities).where(eq(sparkPriorities.id, id)).returning();
    return result.length > 0;
  }

  async clearOldSparkPriorities(advisorId: number): Promise<boolean> {
    // Recupera i clienti gestiti dall'advisor
    const clientsForAdvisor = await this.getClientsByAdvisor(advisorId);
    const clientIds = clientsForAdvisor.map(client => client.id);
    
    if (clientIds.length === 0) {
      return true; // Nessun cliente, quindi niente da eliminare
    }
    
    try {
      // Utilizziamo un array literal di PostgreSQL per passare l'array di interi
      // invece di fare casting di un parametro
      console.log(`Tentativo di eliminare priorità per ${clientIds.length} clienti con ARRAY constructor`);
      
      // Costruiamo l'array di interi direttamente nella query SQL
      // Questo evita problemi di casting tra 'record' e 'integer[]'
      const idsString = clientIds.join(', ');
      const query = sql`DELETE FROM spark_priorities WHERE client_id = ANY(ARRAY[${sql.raw(idsString)}]::int[])`;
      
      await db.execute(query);
      console.log(`Priorità Spark eliminate per ${clientIds.length} clienti`);
      return true;
    } catch (error) {
      console.error("Errore durante la cancellazione delle priorità Spark:", error);
      console.error("Dettagli errore:", JSON.stringify(error, null, 2));
      
      // Fallback alternativo: utilizziamo una stringa SQL diretta con ARRAY
      try {
        console.log("Tentativo con query SQL diretta...");
        // Costruiamo una query SQL sicura con array literal
        const idsString = clientIds.join(', ');
        const directQuery = `DELETE FROM spark_priorities WHERE client_id = ANY(ARRAY[${idsString}]::int[])`;
        
        // Eseguiamo la query diretta tramite pg
        await pgClient.unsafe(directQuery);
        
        console.log(`Priorità Spark eliminate per ${clientIds.length} clienti usando SQL diretto`);
        return true;
      } catch (directError) {
        console.error("Fallback con SQL diretto fallito:", directError);
        
        // Fallback finale: elimina singolarmente
        try {
          console.log("Tentativo di eliminazione singola per ogni cliente...");
          for (const clientId of clientIds) {
            await db.delete(sparkPriorities)
              .where(eq(sparkPriorities.clientId, clientId))
              .execute();
          }
          console.log("Eliminazione singola completata con successo");
          return true;
        } catch (finalError) {
          console.error("Tutti i fallback falliti:", finalError);
          throw finalError;
        }
      }
    }
  }
}

export const storage = new PostgresStorage();
