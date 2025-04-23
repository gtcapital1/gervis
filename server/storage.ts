import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation,
  clientLogs, type ClientLog, type InsertClientLog,
  aiProfiles, type AiProfile, type InsertAiProfile,
  meetings, type Meeting, type InsertMeeting,
  LOG_TYPES, type LogType,
  completedTasks, type CompletedTask, type InsertCompletedTask,
  mifid, type Mifid
} from "@shared/schema";
import session from "express-session";
import { eq, and, gt, sql, desc, gte, lte, inArray, lt } from 'drizzle-orm';
import connectPgSimple from "connect-pg-simple";
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import createMemoryStore from 'memorystore';
import { db, sql as pgClient } from './db';
import { sendOnboardingEmail } from './email';
import { promisify } from 'util';
import pg from 'pg';
const { Pool } = pg;

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
  getAiProfileByClient(clientId: number): Promise<AiProfile | null>;
  createAiProfile(profile: InsertAiProfile): Promise<AiProfile>;
  updateAiProfile(clientId: number, profileData: any): Promise<AiProfile>;
  deleteAiProfile(clientId: number): Promise<boolean>;
  
  // Advisor Suggestions Methods
  getAdvisorSuggestions(advisorId: number): Promise<any>;
  updateAdvisorSuggestions(advisorId: number, suggestionsData: any): Promise<void>;
  createAdvisorSuggestions(data: { advisorId: number, suggestionsData: any }): Promise<void>;
  
  // Meeting Methods
  getMeetingsByAdvisor(advisorId: number): Promise<Meeting[]>;
  getMeetingsByClient(clientId: number): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<Meeting>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<boolean>;
  getMeetingsForDate(advisorId: number, date: Date): Promise<Meeting[]>;
  getAllMeetings(advisorId: number): Promise<Meeting[]>;

  // Task Completion Methods
  getCompletedTasks(advisorId: number, date: Date): Promise<CompletedTask[]>;
  markTaskAsCompleted(taskId: number, advisorId: number): Promise<boolean>;
  markTaskAsUncompleted(taskId: number, advisorId: number): Promise<boolean>;

  // MIFID Methods
  getMifidByClient(clientId: number): Promise<Mifid | undefined>;
  getAllMifidByClients(clientIds: number[]): Promise<Mifid[]>;
  updateMifid(clientId: number, mifidData: Partial<Mifid>): Promise<Mifid>;

  // Asset methods
  deleteAssetsByClient(clientId: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    
    
    // Initialize with memory store as default
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every day
    });
    
    // Try to initialize PostgreSQL session store
    this.initializePgSession().catch(err => {
      
      
    });
  }
  
  private async initializePgSession() {
    
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error("DATABASE_URL non è definito");
      }
      
      // Create a separate connection for the session store
      const pool = new Pool({
        connectionString: dbUrl
      });
      
      // Test connection
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        
      } finally {
        client.release();
      }
      
      // Initialize session store with the pool
      this.sessionStore = new PgSession({
        pool: pool,
        createTableIfMissing: true,
        tableName: 'session'
      });
      
      
    } catch (error) {
      
      // Don't throw, just log the error and continue with memory store
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
    try {
      console.log("[DB] Cercando utente con email:", email);
      
      // Aggiunta di timestamp per tracciare il tempo di esecuzione
      const startTime = Date.now();
      
      // Verifica che l'input sia valido
      if (!email || typeof email !== 'string') {
        console.error(`[DB Error] Email non valida: ${email}, tipo: ${typeof email}`);
        return undefined;
      }
      
      // Log della query SQL che verrà eseguita
      console.log(`[DB Debug] SQL query: SELECT * FROM users WHERE email = '${email}'`);
      
      const result = await db.select().from(users).where(eq(users.email, email));
      
      const endTime = Date.now();
      console.log(`[DB] Tempo di esecuzione query: ${endTime - startTime}ms`);
      
      if (result.length > 0) {
        console.log(`[DB] Utente trovato con ID: ${result[0].id}`);
        console.log(`[DB] Stato email verificata: ${result[0].isEmailVerified}`);
        console.log(`[DB] Stato approvazione: ${result[0].approvalStatus}`);
      } else {
        console.log("[DB] Nessun utente trovato con questa email");
      }
      
      return result[0];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      const errorStack = error instanceof Error ? error.stack : '';
      console.error("[DB Error] Errore durante ricerca utente per email:", errorMessage);
      console.error("[DB Debug] Stack trace:", errorStack);
      
      // Se c'è un errore nella connessione al DB o nella query, lo registriamo
      if (error instanceof Error && 'code' in error) {
        console.error(`[DB Error] Codice errore DB: ${(error as any).code}`);
        console.error(`[DB Error] Dettagli: ${(error as any).detail || 'Nessun dettaglio'}`);
      }
      
      throw error; // Rilanciamo l'errore per gestirlo in passport
    }
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
    try {
      console.log("[DB] Creazione nuovo utente:", insertUser.email);
      
      // Controllo dei tipi di dati prima dell'inserimento
      const validatedUser: any = {
        ...insertUser,
        approvalStatus: 'pending' as const
      };

      // Rimuovi campi undefined che potrebbero causare problemi
      Object.keys(validatedUser).forEach(key => {
        if (validatedUser[key] === undefined) {
          delete validatedUser[key];
        }
      });
      
      console.log("[DB] Inserimento utente nel database");
      const result = await db.insert(users).values(validatedUser).returning();
      
      if (!result || result.length === 0) {
        console.error("[DB Error] Inserimento fallito - nessun risultato");
        throw new Error("Inserimento utente fallito - nessun risultato");
      }
      
      console.log("[DB] Utente creato con successo:", result[0].id);
      return result[0];
    } catch (error) {
      console.error("[DB Error] Errore durante creazione utente:", error);
      throw error;
    }
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
    try {
      console.log(`[Storage] Iniziando eliminazione utente con ID ${id}`);
      
      // Verifichiamo prima se l'utente esiste
      const userExists = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
      if (userExists.length === 0) {
        console.log(`[Storage] Utente con ID ${id} non trovato`);
        return false;
      }
      
      // Otteniamo tutti i clienti dell'utente da eliminare
      const userClients = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.advisorId, id));
      
      const clientIds = userClients.map(client => client.id);
      
      console.log(`[Storage] Trovati ${clientIds.length} clienti collegati all'utente ${id}`);
      
      // Eliminazione degli elementi collegati ai clienti
      if (clientIds.length > 0) {
        // Elimina tutti i clienti dell'utente e i loro dati associati
        for (const clientId of clientIds) {
          await this.deleteClient(clientId);
        }
      }
      
      // Eliminazione delle conversazioni
      const deletedConversations = await db.delete(conversations)
        .where(eq(conversations.userId, id))
        .returning({ id: conversations.id });
        
      console.log(`[Storage] Eliminate ${deletedConversations.length} conversazioni`);
      
      // Eliminazione degli advisor_suggestions
      const deletedSuggestions = await db.delete(advisorSuggestions)
        .where(eq(advisorSuggestions.advisorId, id))
        .returning({ id: advisorSuggestions.id });
        
      console.log(`[Storage] Eliminati ${deletedSuggestions.length} suggerimenti`);
      
      // Eliminazione dei completed_tasks
      const deletedTasks = await db.delete(completedTasks)
        .where(eq(completedTasks.advisorId, id))
        .returning({ id: completedTasks.id });
        
      console.log(`[Storage] Eliminati ${deletedTasks.length} task completati`);
      
      // Rimuove i riferimenti nelle tabelle dove l'utente potrebbe essere createdBy
      // Imposta createdBy a NULL anziché eliminare i record
      await db.update(clientLogs)
        .set({ createdBy: null })
        .where(eq(clientLogs.createdBy, id));
        
      await db.update(aiProfiles)
        .set({ createdBy: null })
        .where(eq(aiProfiles.createdBy, id));
        
      await db.update(verifiedDocuments)
        .set({ createdBy: null })
        .where(eq(verifiedDocuments.createdBy, id));
      
      // Finalmente, elimina l'utente
      const result = await db.delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
        
      const success = result.length > 0;
      console.log(`[Storage] Eliminazione utente ${id} completata con successo: ${success}`);
      
      return success;
      
    } catch (error) {
      console.error(`[Storage] Errore durante l'eliminazione dell'utente ${id}:`, error);
      
      // In caso di fallimento, proviamo con un approccio SQL diretto
      try {
        console.log(`[Storage] Tentativo eliminazione diretta con SQL per l'utente ${id}`);
        
        // Utilizza SQL diretto per gestire le dipendenze
        // Imposta a NULL i riferimenti nelle tabelle con foreign key
        await db.execute(sql`UPDATE client_logs SET created_by = NULL WHERE created_by = ${id}`);
        await db.execute(sql`UPDATE ai_profiles SET created_by = NULL WHERE created_by = ${id}`);
        await db.execute(sql`UPDATE verified_documents SET created_by = NULL WHERE created_by = ${id}`);
        
        // Elimina le righe nelle tabelle con CASCADE
        await db.execute(sql`DELETE FROM conversations WHERE "userId" = ${id}`);
        await db.execute(sql`DELETE FROM advisor_suggestions WHERE advisor_id = ${id}`);
        await db.execute(sql`DELETE FROM completed_tasks WHERE advisor_id = ${id}`);
        
        // Elimina i clienti associati all'utente
        const clientsResult = await db.execute(sql`SELECT id FROM clients WHERE advisor_id = ${id}`);
        if (clientsResult && clientsResult.length > 0) {
          for (const row of clientsResult) {
            const clientId = row.id;
            await db.execute(sql`DELETE FROM assets WHERE client_id = ${clientId}`);
            await db.execute(sql`DELETE FROM recommendations WHERE client_id = ${clientId}`);
            await db.execute(sql`DELETE FROM ai_profiles WHERE client_id = ${clientId}`);
            await db.execute(sql`DELETE FROM client_logs WHERE client_id = ${clientId}`);
            await db.execute(sql`DELETE FROM mifid WHERE client_id = ${clientId}`);
            await db.execute(sql`DELETE FROM clients WHERE id = ${clientId}`);
          }
        }
        
        // Infine, elimina l'utente
        await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
        
        // Verifica se l'utente è stato realmente eliminato
        const verifyResult = await db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.id, id));
          
        const success = verifyResult[0].count === 0;
        console.log(`[Storage] Eliminazione SQL diretta dell'utente ${id} completata con successo: ${success}`);
        
        return success;
      } catch (fallbackError) {
        console.error(`[Storage] Anche il fallback SQL è fallito per l'utente ${id}:`, fallbackError);
        throw error; // Rilancia l'errore originale
      }
    }
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
    const { firstName, lastName, name, ...restOfClient } = insertClient;
    
    // If first name and last name are provided but name is not,
    // automatically generate the full name
    const fullName = name || `${firstName} ${lastName}`;
    
    const result = await db.insert(clients).values({
      firstName: firstName || (name ? name.split(' ')[0] : ''),
      lastName: lastName || (name ? name.split(' ').slice(1).join(' ') : ''),
      name: fullName,
      ...restOfClient,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client> {
    const { firstName, lastName, name, ...restOfUpdate } = clientUpdate;
    
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
    
    
    try {
      // Verifichiamo se il cliente esiste prima dell'eliminazione
      const clientExists = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (clientExists.length === 0) {
        
        return false;
      }
      
      // Eliminiamo seguendo un ordine specifico per garantire la compatibilità
      // con tutti gli ambienti, sia con CASCADE che senza
      
      // 1. Eliminiamo prima le entità dipendenti in modo esplicito
      
      
      // Eliminiamo gli asset
      const deletedAssets = await db.delete(assets)
        .where(eq(assets.clientId, id))
        .returning({ id: assets.id });
      
      
      // Eliminiamo le raccomandazioni
      const deletedRecommendations = await db.delete(recommendations)
        .where(eq(recommendations.clientId, id))
        .returning({ id: recommendations.id });
      
      
      // Eliminiamo i profili AI
      const deletedProfiles = await db.delete(aiProfiles)
        .where(eq(aiProfiles.clientId, id))
        .returning({ id: aiProfiles.id });
      
      
      // Eliminiamo i client logs
      const deletedLogs = await db.delete(clientLogs)
        .where(eq(clientLogs.clientId, id))
        .returning({ id: clientLogs.id });
      
      
      // Eliminiamo i dati MIFID
      const deletedMifid = await db.delete(mifid)
        .where(eq(mifid.clientId, id))
        .returning({ id: mifid.id });
      
      
      // 2. Ora che tutte le dipendenze sono state rimosse, possiamo eliminare il cliente
      const result = await db.delete(clients)
        .where(eq(clients.id, id))
        .returning({ id: clients.id });
      
      const success = result.length > 0;
      
      if (success) {
        
      } else {
        // Questo non dovrebbe mai accadere dato il controllo iniziale
        
      }
      
      // Verifica finale - conferma che il cliente è stato realmente eliminato
      const verifyDeleted = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (verifyDeleted.length > 0) {
        // Errore: il cliente esiste ancora dopo l'eliminazione
        
        
        return false;
      }
      
      return success;
    } catch (error) {
      
      
      // In caso di fallimento riproviamo con un approach più diretto usando raw SQL
      try {
        
        
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
        
        
        
        return success;
      } catch (fallbackError) {
        
        throw fallbackError; // Propaga l'errore originale
      }
    }
  }
  
  async archiveClient(id: number): Promise<Client> {
    
    
    try {
      // STEP 1: Verifichiamo che il cliente esista
      
      const existingClient = await this.getClient(id);
      
      if (!existingClient) {
        
        throw new Error(`Client with id ${id} not found`);
      }
      
      
      
      // STEP 2: Aggiorniamo lo stato di archiviazione con Drizzle ORM
      
      try {
        const result = await db.update(clients)
          .set({ isArchived: true })
          .where(eq(clients.id, id))
          .returning();
        
        if (!result[0]) {
          
          throw new Error(`Failed to archive client with id ${id} - No result returned`);
        }
        
        
        return result[0];
      } catch (drizzleError) {
        // STEP 3: Fallback in caso di errore con Drizzle ORM
        
        
        
        try {
          // Utilizzo SQL diretto come fallback
          const sqlResult = await pgClient`
            UPDATE clients
            SET "isArchived" = true
            WHERE id = ${id}
            RETURNING *
          `;
          
          if (!sqlResult || sqlResult.length === 0) {
            
            throw new Error(`Failed to archive client with id ${id} - SQL direct approach failed`);
          }
          
          
          return sqlResult[0] as Client;
        } catch (sqlError) {
          
          throw new Error(`Failed to archive client with id ${id} - Both approaches failed`);
        }
      }
    } catch (error) {
      
      throw error;
    }
  }
  
  async restoreClient(id: number): Promise<Client> {
    
    
    try {
      // STEP 1: Verifichiamo che il cliente esista
      
      const existingClient = await this.getClient(id);
      
      if (!existingClient) {
        
        throw new Error(`Client with id ${id} not found`);
      }
      
      if (existingClient.isArchived !== true) {
        
        return existingClient; // Ritorna il cliente già non archiviato
      }
      
      
      
      // STEP 2: Ripristiniamo il cliente con Drizzle ORM
      
      try {
        const result = await db.update(clients)
          .set({ isArchived: false })
          .where(eq(clients.id, id))
          .returning();
        
        if (!result[0]) {
          
          throw new Error(`Failed to restore client with id ${id} - No result returned`);
        }
        
        
        return result[0];
      } catch (drizzleError) {
        // STEP 3: Fallback in caso di errore con Drizzle ORM
        
        
        
        try {
          // Utilizzo SQL diretto come fallback
          const sqlResult = await pgClient`
            UPDATE clients
            SET "isArchived" = false
            WHERE id = ${id}
            RETURNING *
          `;
          
          if (!sqlResult || sqlResult.length === 0) {
            
            throw new Error(`Failed to restore client with id ${id} - SQL direct approach failed`);
          }
          
          
          return sqlResult[0] as Client;
        } catch (sqlError) {
          
          throw new Error(`Failed to restore client with id ${id} - Both approaches failed`);
        }
      }
    } catch (error) {
      
      throw error;
    }
  }
  
  async getClientByToken(token: string): Promise<Client | undefined> {
    
    
    // Prima facciamo una query senza controllo data per debuggare
    const checkClient = await db.select().from(clients).where(
      eq(clients.onboardingToken, token)
    );
    
    if (checkClient.length === 0) {
      
      return undefined;
    }
    
    const now = new Date();
    const expiryDate = checkClient[0].tokenExpiry as Date;
    
    
    
    
    
    
    // Ora eseguiamo la query con il controllo di scadenza corretto
    const result = await db.select().from(clients).where(
      and(
        eq(clients.onboardingToken, token),
        gt(clients.tokenExpiry as any, now)
      )
    );
    
    if (result.length === 0) {
      
    } else {
      
    }
    
    return result[0];
  }
  
  async generateOnboardingToken(clientId: number, language: 'english' | 'italian' = 'english', customMessage?: string, advisorEmail?: string, customSubject?: string): Promise<string> {
    // Log di debug aggiuntivi per verificare se l'oggetto email è passato correttamente
    
    
    
    
    
    
    
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
        
        needsNewToken = false;
      } else {
        
      }
    } else {
      
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
      
      
    }

    // Generate onboarding link (solo per debug)
    const baseUrl = process.env.BASE_URL || `https://workspace.gianmarcotrapasso.replit.app`;
    const onboardingLink = `${baseUrl}/onboarding?token=${token}`;
    
    
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
  
  // Funzione di utilità per aggiornare il totalAssets di un cliente
  private async updateClientTotalAssets(clientId: number): Promise<void> {
    try {
      // Ottieni tutti gli asset del cliente
      const clientAssets = await this.getAssetsByClient(clientId);
      
      // Calcola la somma totale del valore degli asset
      const totalValue = clientAssets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Aggiorna il campo totalAssets del cliente
      await db.update(clients)
        .set({ totalAssets: totalValue })
        .where(eq(clients.id, clientId));
      
      
    } catch (error) {
      
    }
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const result = await db.insert(assets).values({
      ...insertAsset,
      createdAt: new Date()
    }).returning();
    
    // Aggiorna il totalAssets del cliente
    await this.updateClientTotalAssets(insertAsset.clientId);
    
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
    
    // Aggiorna il totalAssets del cliente se il valore è cambiato
    if ('value' in assetUpdate) {
      await this.updateClientTotalAssets(result[0].clientId);
    }
    
    return result[0];
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    // Prima recuperiamo l'asset per ottenere il clientId
    const assetToDelete = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!assetToDelete[0]) {
      return false;
    }
    
    const clientId = assetToDelete[0].clientId;
    
    // Quindi eliminare l'asset
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    
    // E infine aggiornare il totalAssets del cliente
    if (result.length > 0) {
      await this.updateClientTotalAssets(clientId);
    }
    
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
      
      throw error;
    }
  }

  async createClientLog(insertLog: InsertClientLog): Promise<ClientLog> {
    try {
      // Verifichiamo che il cliente esista prima di creare il log
      const clientId = Number(insertLog.clientId);
      if (isNaN(clientId)) {
        throw new Error(`Invalid clientId: ${insertLog.clientId}`);
      }
      
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error(`Client with id ${clientId} not found`);
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
          clientId,
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
      
      throw error;
    }
  }
  
  async getAiProfileByClient(clientId: number): Promise<AiProfile | null> {
    try {
      const result = await db.select()
        .from(aiProfiles)
        .where(eq(aiProfiles.clientId, clientId));
      return result[0] || null;
    } catch (error) {
      
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
      
      throw error;
    }
  }

  // Meeting Methods
  async getMeetingsByAdvisor(advisorId: number): Promise<Meeting[]> {
    const result = await db.select().from(meetings).where(eq(meetings.advisorId, advisorId)).orderBy(meetings.dateTime);
    return result;
  }

  async getMeetingsByClient(clientId: number): Promise<Meeting[]> {
    const result = await db.select().from(meetings).where(eq(meetings.clientId, clientId)).orderBy(meetings.dateTime);
    return result;
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const result = await db.select().from(meetings).where(eq(meetings.id, id));
    return result[0];
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    try {
      // Validazione input
      if (!insertMeeting.subject?.trim()) {
        throw new Error('Il soggetto del meeting è obbligatorio');
      }
      if (insertMeeting.subject.length > 255) {
        throw new Error('Il soggetto del meeting non può superare i 255 caratteri');
      }
      
      // Validazione clientId
      const clientId = Number(insertMeeting.clientId);
      if (isNaN(clientId)) {
        throw new Error(`Invalid clientId: ${insertMeeting.clientId}`);
      }
      
      // Validazione advisorId
      const advisorId = Number(insertMeeting.advisorId);
      if (isNaN(advisorId)) {
        throw new Error(`Invalid advisorId: ${insertMeeting.advisorId}`);
      }
      
      // Validazione location
      const validLocations = ['zoom', 'office', 'phone'];
      if (insertMeeting.location && !validLocations.includes(insertMeeting.location)) {
        throw new Error(`Location non valida. Valori permessi: ${validLocations.join(', ')}`);
      }
      
      // Validazione duration
      const duration = Number(insertMeeting.duration);
      if (isNaN(duration) || duration <= 0 || duration > 480) { // max 8 ore
        throw new Error('La durata deve essere un numero positivo non superiore a 480 minuti');
      }
      
      // Validazione e parsing della data
      let meetingDateTime: Date;
      if (typeof insertMeeting.dateTime === 'string') {
        meetingDateTime = new Date(insertMeeting.dateTime);
      } else if (insertMeeting.dateTime instanceof Date) {
        meetingDateTime = insertMeeting.dateTime;
      } else {
        throw new Error('dateTime deve essere una stringa ISO o un oggetto Date');
      }
      
      if (isNaN(meetingDateTime.getTime())) {
        throw new Error(`Data invalida: ${insertMeeting.dateTime}`);
      }
      
      // Verifica che la data non sia nel passato
      const now = new Date();
      if (meetingDateTime < now) {
        throw new Error('Non è possibile creare meeting nel passato');
      }
      
      // Inizia una transazione
      return await db.transaction(async (tx) => {
        // Verifica che il client esista
        const client = await tx.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        if (!client.length) {
          throw new Error(`Cliente con ID ${clientId} non trovato`);
        }
        
        // Verifica che l'advisor esista
        const advisor = await tx.select().from(users).where(eq(users.id, advisorId)).limit(1);
        if (!advisor.length) {
          throw new Error(`Advisor con ID ${advisorId} non trovato`);
        }
        
        // Calcola l'intervallo del meeting
        const meetingEnd = new Date(meetingDateTime);
        meetingEnd.setMinutes(meetingEnd.getMinutes() + duration);
        
        // Verifica sovrapposizioni con altri meeting dell'advisor
        const overlappingMeetings = await tx
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.advisorId, advisorId),
              lt(meetings.dateTime, meetingEnd),
              gt(sql`${meetings.dateTime} + (${meetings.duration} || ' minutes')::interval`, meetingDateTime)
            )
          );
        
        if (overlappingMeetings.length > 0) {
          throw new Error('Esiste già un meeting programmato in questo slot temporale');
        }
        
        // Crea il meeting
        const meetingToInsert = {
          ...insertMeeting,
          clientId,
          advisorId,
          dateTime: meetingDateTime,
          duration,
          location: insertMeeting.location || 'zoom'
        };
        
        const result = await tx.insert(meetings).values(meetingToInsert).returning();
        return result[0];
      });
    } catch (error) {
      // Log dettagliato dell'errore
      console.error('[ERROR] Errore nella creazione del meeting:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        meetingData: {
          ...insertMeeting,
          clientId: Number(insertMeeting.clientId),
          advisorId: Number(insertMeeting.advisorId)
        }
      });
      throw error;
    }
  }

  async updateMeeting(id: number, meetingUpdate: Partial<Meeting>): Promise<Meeting> {
    try {
      // Ottieni il meeting corrente
      const currentMeeting = await this.getMeeting(id);
      if (!currentMeeting) {
        throw new Error(`Meeting con ID ${id} non trovato`);
      }
      
      // Se c'è un campo dateTime, assicurati che sia un oggetto Date
      let updatedFields: Partial<Meeting> = { ...meetingUpdate };
      
      // Se vengono aggiornati clientId o advisorId, assicurati che siano numeri validi
      if (meetingUpdate.clientId !== undefined) {
        const clientId = Number(meetingUpdate.clientId);
        if (isNaN(clientId)) {
          throw new Error(`Invalid clientId: ${meetingUpdate.clientId}`);
        }
        updatedFields.clientId = clientId;
      }
      
      if (meetingUpdate.advisorId !== undefined) {
        const advisorId = Number(meetingUpdate.advisorId);
        if (isNaN(advisorId)) {
          throw new Error(`Invalid advisorId: ${meetingUpdate.advisorId}`);
        }
        updatedFields.advisorId = advisorId;
      }
      
      if (meetingUpdate.dateTime !== undefined) {
        let meetingDateTime: Date;
        if (typeof meetingUpdate.dateTime === 'string') {
          meetingDateTime = new Date(meetingUpdate.dateTime);
          if (isNaN(meetingDateTime.getTime())) {
            throw new Error(`Data invalida: ${meetingUpdate.dateTime}`);
          }
        } else if (meetingUpdate.dateTime instanceof Date) {
          meetingDateTime = meetingUpdate.dateTime;
        } else {
          throw new Error('dateTime deve essere una stringa ISO o un oggetto Date');
        }
        
        // Sostituisci il campo dateTime con l'oggetto Date
        updatedFields.dateTime = meetingDateTime;
      }
      
      
      
      // Aggiorna il meeting
      const result = await db
        .update(meetings)
        .set(updatedFields)
        .where(eq(meetings.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      
      throw error;
    }
  }

  async deleteMeeting(id: number): Promise<boolean> {
    try {
      // Ottieni il meeting prima di eliminarlo
      const meeting = await this.getMeeting(id);
      if (!meeting) {
        return false; // Meeting non trovato
      }
      
      // Elimina il meeting
      const deleted = await db.delete(meetings).where(eq(meetings.id, id)).returning();
      
      return deleted.length > 0;
    } catch (error) {
      
      throw error;
    }
  }

  async getMeetingsForDate(advisorId: number, date: Date): Promise<Meeting[]> {
    try {
      
      
      // Rimosso il filtro per data per mostrare tutti i meeting dell'advisor
      const result = await db
        .select()
        .from(meetings)
        .where(
          eq(meetings.advisorId, advisorId)
        )
        .orderBy(meetings.dateTime);
      
      
      
      // Debug: mostra i meeting trovati
      if (result.length > 0) {
        
      }
      
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  async getAllMeetings(advisorId: number): Promise<Meeting[]> {
    try {
      
      
      const result = await db
        .select()
        .from(meetings)
        .where(
          eq(meetings.advisorId, advisorId)
        )
        .orderBy(meetings.dateTime);
      
      
      
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  // --- Task Completion Methods ---

  /**
   * Ottiene tutte le attività completate per un consulente in una determinata data
   */
  async getCompletedTasks(advisorId: number, date: Date): Promise<CompletedTask[]> {
    // Imposta l'inizio della giornata
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Imposta la fine della giornata
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      // Cerca le attività completate nella tabella completed_tasks
      const result = await db
        .select()
        .from(completedTasks)
        .where(and(
          eq(completedTasks.advisorId, advisorId),
          gte(completedTasks.completedAt, startOfDay),
          lte(completedTasks.completedAt, endOfDay)
        ));
      
      return result;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Segna un'attività come completata
   */
  async markTaskAsCompleted(taskId: number, advisorId: number): Promise<boolean> {
    try {
      // Verifica se l'attività è già stata segnata come completata
      const existing = await db
        .select()
        .from(completedTasks)
        .where(and(
          eq(completedTasks.taskId, taskId),
          eq(completedTasks.advisorId, advisorId)
        ));
      
      // Se l'attività è già stata segnata come completata, non fare nulla
      if (existing.length > 0) {
        return true;
      }
      
      // Inserisci il record nella tabella completed_tasks
      await db.insert(completedTasks).values({
        advisorId,
        taskId,
        completedAt: new Date()
      });
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Segna un'attività come da completare (rimuove il segno di completamento)
   */
  async markTaskAsUncompleted(taskId: number, advisorId: number): Promise<boolean> {
    try {
      // Elimina il record dalla tabella completed_tasks
      await db
        .delete(completedTasks)
        .where(and(
          eq(completedTasks.taskId, taskId),
          eq(completedTasks.advisorId, advisorId)
        ));
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  // Modifica lo stato "active" di un cliente
  async updateClientActiveStatus(clientId: number, active: boolean) {
    try {
      const now = new Date();
      await db
        .update(clients)
        .set({ 
          active,
          ...(active ? { activatedAt: now } : {}) // Se il cliente viene attivato, imposta activatedAt
        })
        .where(eq(clients.id, clientId));
      
      
      
      return { success: true };
    } catch (error) {
      
      return { success: false, error: 'Database error' };
    }
  }

  // MIFID Methods
  async getMifidByClient(clientId: number): Promise<Mifid | undefined> {
    const result = await db.select().from(mifid).where(eq(mifid.clientId, clientId));
    return result[0];
  }

  async getAllMifidByClients(clientIds: number[]): Promise<Mifid[]> {
    if (!clientIds.length) return [];
    const result = await db.select().from(mifid).where(inArray(mifid.clientId, clientIds));
    return result;
  }

  async updateMifid(clientId: number, mifidData: Partial<Mifid>): Promise<Mifid> {
    // Check if MIFID record exists for the client
    const existingMifid = await this.getMifidByClient(clientId);
    
    if (existingMifid) {
      // Update existing record
      const [updatedMifid] = await db.update(mifid)
        .set({
          ...mifidData,
          updatedAt: new Date()
        })
        .where(eq(mifid.clientId, clientId))
        .returning();
      
      return updatedMifid;
    } else {
      // Create new record
      const [newMifid] = await db.insert(mifid)
        .values({
          clientId,
          ...mifidData as any,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newMifid;
    }
  }

  // Advisor Suggestions Methods
  async getAdvisorSuggestions(advisorId: number): Promise<any> {
    try {
      // Importa direttamente dalla radice per evitare problemi di path
      const schema = await import('@shared/schema');
      
      // Ottieni i suggerimenti per il consulente specifico
      const suggestions = await db.select().from(schema.advisorSuggestions)
        .where(eq(schema.advisorSuggestions.advisorId, advisorId))
        .limit(1);
      
      return suggestions.length > 0 ? suggestions[0] : null;
    } catch (error) {
      console.error(`Error retrieving advisor suggestions for advisor ${advisorId}:`, error);
      return null;
    }
  }

  async updateAdvisorSuggestions(advisorId: number, suggestionsData: any): Promise<void> {
    try {
      // Importa direttamente dalla radice per evitare problemi di path
      const schema = await import('@shared/schema');
      
      // Aggiorna i suggerimenti
      await db.update(schema.advisorSuggestions)
        .set({
          suggestionsData,
          lastGeneratedAt: new Date()
        })
        .where(eq(schema.advisorSuggestions.advisorId, advisorId));
      
      console.log(`Updated advisor suggestions for advisor ${advisorId}`);
    } catch (error) {
      console.error(`Error updating advisor suggestions for advisor ${advisorId}:`, error);
      throw error;
    }
  }

  async createAdvisorSuggestions(data: { advisorId: number, suggestionsData: any }): Promise<void> {
    try {
      // Importa direttamente dalla radice per evitare problemi di path
      const schema = await import('@shared/schema');
      
      // Crea nuovi suggerimenti
      await db.insert(schema.advisorSuggestions).values({
        advisorId: data.advisorId,
        suggestionsData: data.suggestionsData,
        lastGeneratedAt: new Date()
      });
      
      console.log(`Created advisor suggestions for advisor ${data.advisorId}`);
    } catch (error) {
      console.error(`Error creating advisor suggestions for advisor ${data.advisorId}:`, error);
      throw error;
    }
  }

  // Asset methods
  async deleteAssetsByClient(clientId: number): Promise<boolean> {
    try {
      // Eliminiamo gli asset del cliente
      const deletedAssets = await db.delete(assets)
        .where(eq(assets.clientId, clientId))
        .returning({ id: assets.id });
      
      // Aggiorniamo il totalAssets del cliente
      await db.update(clients)
        .set({ totalAssets: 0 })
        .where(eq(clients.id, clientId));
      
      return deletedAssets.length > 0;
    } catch (error) {
      
      throw error;
    }
  }
}

export const storage = new PostgresStorage();

// Trend Data Methods
export async function saveTrendData(
  advisorId: number,
  type: string,
  date: Date,
  value: number | null,
  valueFloat: string | null = null,
  metadata: any = null
): Promise<boolean> {
  try {
    // Importa direttamente dalla radice per evitare problemi di path
    const schema = await import('@shared/schema');
    
    await db.insert(schema.trendData).values({
      advisorId,
      type: type as any, // Cast come any per evitare problemi di tipo
      date,
      value: value !== null ? value : undefined,
      valueFloat: valueFloat !== null ? valueFloat : undefined,
      metadata,
    });
    return true;
  } catch (error) {
    console.error(`Error saving trend data for advisor ${advisorId}:`, error);
    return false;
  }
}

export async function getTrendData(
  advisorId: number,
  type: string | string[] | null = null,
  startDate: Date | null = null,
  endDate: Date | null = null
): Promise<any[]> {
  try {
    // Importa direttamente dalla radice per evitare problemi di path
    const schema = await import('@shared/schema');
    
    let query = db.select().from(schema.trendData).where(eq(schema.trendData.advisorId, advisorId));
    
    // Filtra per tipo
    if (type !== null) {
      if (Array.isArray(type)) {
        query = query.where(inArray(schema.trendData.type, type as any[]));
      } else {
        query = query.where(eq(schema.trendData.type, type as any));
      }
    }
    
    // Filtra per intervallo di date
    if (startDate !== null) {
      query = query.where(gte(schema.trendData.date, startDate));
    }
    
    if (endDate !== null) {
      query = query.where(lte(schema.trendData.date, endDate));
    }
    
    // Ordina per data
    query = query.orderBy(schema.trendData.date);
    
    const result = await query;
    return result;
  } catch (error) {
    console.error(`Error fetching trend data for advisor ${advisorId}:`, error);
    return [];
  }
}

/**
 * Ottiene i dati di trend aggregati per diversi timeframe
 * @param advisorId - ID del consulente
 * @param type - Tipo di trend da recuperare (o array di tipi)
 * @param timeframe - Timeframe di aggregazione ('daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'yearly')
 * @param limit - Numero massimo di punti dati da recuperare
 * @param userCreatedAt - Data di iscrizione dell'utente (per limitare i dati a questa data)
 * @returns Array di oggetti con dati aggregati per timeframe
 */
export async function getTrendDataByTimeframe(
  advisorId: number,
  type: string | string[] | null = null,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' = 'monthly',
  limit: number = 12,
  userCreatedAt: Date | null = null
): Promise<any[]> {
  try {
    // Importa direttamente dalla radice per evitare problemi di path
    const schema = await import('@shared/schema');
    
    // Calcola la data di inizio in base al timeframe e al limite
    let startDate = new Date();
    let sqlTimeframeFormat: string;
    
    switch(timeframe) {
      case 'daily':
        startDate.setDate(startDate.getDate() - limit);
        sqlTimeframeFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - (limit * 7));
        sqlTimeframeFormat = 'IYYY-IW'; // ISO year and week
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - limit);
        sqlTimeframeFormat = 'YYYY-MM';
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - (limit * 3));
        sqlTimeframeFormat = 'YYYY-"Q"Q'; // Anno e trimestre (es. 2023-Q1)
        break;
      case 'semiannual':
        startDate.setMonth(startDate.getMonth() - (limit * 6));
        sqlTimeframeFormat = 'YYYY-"H"' + 
          sql`CASE WHEN EXTRACT(MONTH FROM "date") <= 6 THEN '1' ELSE '2' END`; // Anno e semestre (es. 2023-H1, 2023-H2)
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - limit);
        sqlTimeframeFormat = 'YYYY';
        break;
    }
    
    // Se l'utente ha una data di iscrizione, usa quella come limite minimo
    if (userCreatedAt && userCreatedAt > startDate) {
      startDate = userCreatedAt;
    }
    
    // Costruisci la query SQL per raggruppare per timeframe
    let query = sql`
      SELECT 
        TO_CHAR("date", ${sqlTimeframeFormat}) AS timeframe_key,
        type,
        MAX("date") AS latest_date,
        AVG(CASE WHEN value IS NOT NULL THEN value::float ELSE NULL END) AS avg_value,
        AVG(CASE WHEN value_float IS NOT NULL THEN value_float::float ELSE NULL END) AS avg_value_float,
        COUNT(*) AS data_points
      FROM trend_data
      WHERE advisor_id = ${advisorId}
        AND "date" >= ${startDate}
    `;
    
    // Aggiungi filtri per tipo
    if (type !== null) {
      if (Array.isArray(type)) {
        query = sql`${query} AND type IN (${sql.join(type)})`; 
      } else {
        query = sql`${query} AND type = ${type}`;
      }
    }
    
    // Completa la query con GROUP BY e ORDER BY
    query = sql`
      ${query}
      GROUP BY timeframe_key, type
      ORDER BY timeframe_key DESC, type
    `;
    
    const result = await db.execute(query);
    return result;
  } catch (error) {
    console.error(`Error fetching trend data by timeframe for advisor ${advisorId}:`, error);
    return [];
  }
}
