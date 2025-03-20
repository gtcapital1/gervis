import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";
import session from "express-session";
import { eq, and, gt } from 'drizzle-orm';
import connectPgSimple from "connect-pg-simple";
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import createMemoryStore from 'memorystore';
import { db } from './db';
import { sendOnboardingEmail } from './email';
import { promisify } from 'util';

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
  generateOnboardingToken(clientId: number, language?: 'english' | 'italian', customMessage?: string, advisorEmail?: string): Promise<string>;
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
    console.log(`[DEBUG deleteClient] Avvio eliminazione del cliente ID: ${id}`);
    
    // Utilizziamo una transazione esplicita per garantire l'atomicità dell'operazione
    const connection = await db.connection().connect();
    
    try {
      await connection.execute(sql`BEGIN`);
      
      // 1. Verifichiamo se il cliente esiste
      const clientExists = await connection.select().from(clients).where(eq(clients.id, id));
      console.log(`[DEBUG deleteClient] Verifica esistenza cliente: ${JSON.stringify(clientExists)}`);
      
      if (clientExists.length === 0) {
        console.log(`[DEBUG deleteClient] Cliente ID: ${id} non trovato`);
        await connection.execute(sql`ROLLBACK`);
        connection.release();
        return false;
      }
      
      // 2. Diagnostica - Verifichiamo l'esistenza di asset e raccomandazioni prima dell'eliminazione
      const clientAssets = await connection.select().from(assets).where(eq(assets.clientId, id));
      console.log(`[DEBUG deleteClient] Trovati ${clientAssets.length} asset collegati al cliente`);
      
      const clientRecommendations = await connection.select().from(recommendations).where(eq(recommendations.clientId, id));
      console.log(`[DEBUG deleteClient] Trovate ${clientRecommendations.length} raccomandazioni collegate al cliente`);
      
      // 3. Verifichiamo che i vincoli CASCADE DELETE siano correttamente configurati
      const constraintCheck = await connection.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_name = 'assets_client_id_fkey' 
          AND constraint_type = 'FOREIGN KEY'
        ) AS assets_constraint_exists,
        EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_name = 'recommendations_client_id_fkey' 
          AND constraint_type = 'FOREIGN KEY'
        ) AS recommendations_constraint_exists,
        (SELECT confdeltype FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE conname = 'assets_client_id_fkey'
         AND n.nspname = 'public') as assets_delete_rule,
        (SELECT confdeltype FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE conname = 'recommendations_client_id_fkey'
         AND n.nspname = 'public') as recommendations_delete_rule;
      `);
      
      console.log(`[DEBUG deleteClient] Stato vincoli: ${JSON.stringify(constraintCheck[0])}`);
      
      // Verifichiamo se i vincoli di CASCADE DELETE non sono configurati correttamente
      // 'c' rappresenta CASCADE, 'a' rappresenta NO ACTION, 'r' rappresenta RESTRICT
      const assetsConstraintExists = constraintCheck[0]?.assets_constraint_exists;
      const recommendationsConstraintExists = constraintCheck[0]?.recommendations_constraint_exists;
      const assetsDeleteRule = constraintCheck[0]?.assets_delete_rule;
      const recommendationsDeleteRule = constraintCheck[0]?.recommendations_delete_rule;
      
      const constraintsConfigured = assetsConstraintExists && recommendationsConstraintExists && 
                                   assetsDeleteRule === 'c' && recommendationsDeleteRule === 'c';
      
      console.log(`[DEBUG deleteClient] Vincoli CASCADE configurati correttamente: ${constraintsConfigured}`);
      
      // Se i vincoli non sono configurati correttamente, ricorriamo all'eliminazione manuale
      if (!constraintsConfigured) {
        console.log(`[DEBUG deleteClient] Utilizzo eliminazione manuale (i vincoli CASCADE non sono configurati correttamente)`);
        
        // Eliminiamo manualmente gli asset
        await connection.delete(assets).where(eq(assets.clientId, id));
        console.log(`[DEBUG deleteClient] Asset eliminati manualmente`);
        
        // Eliminiamo manualmente le raccomandazioni
        await connection.delete(recommendations).where(eq(recommendations.clientId, id));
        console.log(`[DEBUG deleteClient] Raccomandazioni eliminate manualmente`);
      }
      
      // 4. Eliminiamo il cliente (con CASCADE automatico se i vincoli sono configurati)
      try {
        const result = await connection.delete(clients).where(eq(clients.id, id)).returning();
        const success = result.length > 0;
        
        if (success) {
          // Commit della transazione
          await connection.execute(sql`COMMIT`);
          console.log(`[DEBUG deleteClient] Eliminazione del cliente ID: ${id} completata con successo`);
        } else {
          // Rollback in caso di problemi
          await connection.execute(sql`ROLLBACK`);
          console.log(`[DEBUG deleteClient] Nessuna riga eliminata per il cliente ID: ${id}`);
        }
        
        // 5. Verifica finale - Controlliamo che effettivamente il cliente non esista più
        const finalCheck = await connection.select().from(clients).where(eq(clients.id, id));
        console.log(`[DEBUG deleteClient] Verifica finale: ${finalCheck.length === 0 ? 'Cliente eliminato' : 'Cliente ancora presente'}`);
        
        // 6. E Che anche asset e raccomandazioni siano stati eliminati
        const finalAssetsCheck = await connection.select().from(assets).where(eq(assets.clientId, id));
        const finalRecommendationsCheck = await connection.select().from(recommendations).where(eq(recommendations.clientId, id));
        console.log(`[DEBUG deleteClient] Asset rimasti: ${finalAssetsCheck.length}, Raccomandazioni rimaste: ${finalRecommendationsCheck.length}`);
        
        return success;
      } catch (deleteError) {
        // Rollback in caso di errore
        await connection.execute(sql`ROLLBACK`);
        console.error(`[DEBUG deleteClient] Errore specifico nella query DELETE:`, deleteError);
        
        if (deleteError instanceof Error) {
          console.error(`[DEBUG deleteClient] Tipo errore: ${deleteError.name}, Messaggio: ${deleteError.message}`);
          console.error(`[DEBUG deleteClient] Stack trace: ${deleteError.stack}`);
        }
        throw deleteError;
      }
    } catch (error) {
      // Assicuriamoci che la transazione venga annullata in caso di errore
      try {
        await connection.execute(sql`ROLLBACK`);
      } catch (rollbackError) {
        console.error(`[DEBUG deleteClient] Errore durante il rollback:`, rollbackError);
      }
      
      console.error(`[DEBUG deleteClient] Errore durante l'eliminazione del cliente ID: ${id}:`, error);
      
      if (error instanceof Error) {
        console.error(`[DEBUG deleteClient] Tipo errore: ${error.name}, Messaggio: ${error.message}`);
        console.error(`[DEBUG deleteClient] Stack trace: ${error.stack}`);
      }
      throw error;
    } finally {
      // Rilasciamo sempre la connessione
      connection.release();
    }
  }
  
  async archiveClient(id: number): Promise<Client> {
    const result = await db.update(clients)
      .set({ isArchived: true })
      .where(eq(clients.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async restoreClient(id: number): Promise<Client> {
    const result = await db.update(clients)
      .set({ isArchived: false })
      .where(eq(clients.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async getClientByToken(token: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(
      and(
        eq(clients.onboardingToken, token),
        gt(clients.tokenExpiry as any, new Date())
      )
    );
    return result[0];
  }
  
  async generateOnboardingToken(clientId: number, language: 'english' | 'italian' = 'english', customMessage?: string, advisorEmail?: string): Promise<string> {
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
