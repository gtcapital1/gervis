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
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
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
    // Start with memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every day
    });
    
    // Set up PG session asynchronously
    this.setupPgSession();
    
    // Log database status
    console.log('PostgreSQL storage initialized with database connection');
  }
  
  private async setupPgSession() {
    try {
      const pg = await import('pg');
      // Create a separate connection for the session store
      const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      // Initialize session store with the pool
      this.sessionStore = new PgSession({
        pool: pool,
        createTableIfMissing: true
      });
      
      console.log('PostgreSQL session store initialized successfully');
    } catch (error) {
      console.error('Failed to setup PG session store:', error);
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
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
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
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
    const baseUrl = process.env.BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const onboardingLink = `${baseUrl}/onboarding/${token}`;
    
    // Get advisor information (to include signature)
    const advisor = client.advisorId ? await this.getUser(client.advisorId) : undefined;
    const advisorSignature = advisor?.signature || undefined;

    // Send onboarding email
    try {
      // Use advisor email if provided, otherwise get from advisor object
      const emailToUse = advisorEmail || (advisor ? advisor.email : undefined);
      
      await sendOnboardingEmail(
        client.email,
        client.firstName,
        client.lastName,
        onboardingLink,
        language,
        customMessage,
        advisorSignature,
        emailToUse
      );
      console.log(`Onboarding email sent to ${client.email} in ${language}`);
    } catch (error) {
      console.error('Failed to send onboarding email:', error);
      // Don't throw error, still return the token
    }
    
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
