import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";
import session from "express-session";
import { eq, and, gt, sql } from 'drizzle-orm';
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
    console.log(`[INFO] Archiviazione cliente ID: ${id}`);
    
    try {
      // Verifichiamo se il cliente esiste
      const clientExists = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (clientExists.length === 0) {
        console.log(`[INFO] Cliente ID: ${id} non trovato per archiviazione`);
        throw new Error(`Client with id ${id} not found`);
      }
      
      // Aggiorniamo lo stato di archiviazione
      const result = await db.update(clients)
        .set({ isArchived: true })
        .where(eq(clients.id, id))
        .returning();
      
      if (!result[0]) {
        throw new Error(`Failed to archive client with id ${id}`);
      }
      
      console.log(`[INFO] Cliente ID: ${id} archiviato con successo`);
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Errore durante l'archiviazione del cliente ID: ${id}:`, error);
      throw error;
    }
  }
  
  async restoreClient(id: number): Promise<Client> {
    console.log(`[INFO] Ripristino cliente archiviato ID: ${id}`);
    
    try {
      // Verifichiamo se il cliente esiste
      const clientExists = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id));
      
      if (clientExists.length === 0) {
        console.log(`[INFO] Cliente ID: ${id} non trovato per ripristino`);
        throw new Error(`Client with id ${id} not found`);
      }
      
      // Ripristiniamo il cliente rimuovendo lo stato di archiviazione
      const result = await db.update(clients)
        .set({ isArchived: false })
        .where(eq(clients.id, id))
        .returning();
      
      if (!result[0]) {
        throw new Error(`Failed to restore client with id ${id}`);
      }
      
      console.log(`[INFO] Cliente ID: ${id} ripristinato con successo`);
      return result[0];
    } catch (error) {
      console.error(`[ERROR] Errore durante il ripristino del cliente ID: ${id}:`, error);
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
    
    // Generate a random token
    const token = randomBytes(16).toString('hex');
    
    // Set token expiry to 7 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    // Update client with token and expiry
    await this.updateClient(clientId, { 
      onboardingToken: token,
      tokenExpiry: expiry
    });

    // Generate onboarding link
    const baseUrl = process.env.BASE_URL || `https://workspace.gianmarcotrapasso.replit.app`;
    const onboardingLink = `${baseUrl}/onboarding?token=${token}`;
    
    // Get advisor information (to include signature)
    const advisor = client.advisorId ? await this.getUser(client.advisorId) : undefined;
    const advisorSignature = advisor?.signature || undefined;

    // Non inviamo più l'email qui per evitare duplicazioni
    // L'email viene inviata solamente in server/routes.ts
    
    return token;
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
}

export const storage = new PostgresStorage();
