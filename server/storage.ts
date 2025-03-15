import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";
import session from "express-session";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, gt } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import connectPgSimple from "connect-pg-simple";
import { randomBytes } from 'crypto';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

const PgSession = connectPgSimple(session);

export interface IStorage {
  sessionStore: session.Store;
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client Methods
  getClient(id: number): Promise<Client | undefined>;
  getClientsByAdvisor(advisorId: number): Promise<Client[]>;
  getClientByToken(token: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  generateOnboardingToken(clientId: number): Promise<string>;
  
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
  private sql: any;
  private db: ReturnType<typeof drizzle>;
  public sessionStore: session.Store;
  
  constructor() {
    this.sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(this.sql);
    
    // Temporary memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every day
    });
    
    // We'll use the dynamic import for pg to avoid ESM issues
    this.setupPgSession();
  }
  
  private async setupPgSession() {
    try {
      const pg = await import('pg');
      const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      this.sessionStore = new PgSession({
        pool: pool,
        createTableIfMissing: true
      });
    } catch (error) {
      console.error('Failed to setup PG session store:', error);
      // Continue using memory store if this fails
    }
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Client Methods
  async getClient(id: number): Promise<Client | undefined> {
    const result = await this.db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }
  
  async getClientsByAdvisor(advisorId: number): Promise<Client[]> {
    const result = await this.db.select().from(clients).where(eq(clients.advisorId, advisorId));
    return result;
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await this.db.insert(clients).values({
      ...insertClient,
      createdAt: new Date()
    }).returning();
    return result[0];
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client> {
    const result = await this.db.update(clients)
      .set(clientUpdate)
      .where(eq(clients.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteClient(id: number): Promise<boolean> {
    const result = await this.db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }
  
  async getClientByToken(token: string): Promise<Client | undefined> {
    const result = await this.db.select().from(clients).where(
      and(
        eq(clients.onboardingToken, token),
        gt(clients.tokenExpiry as any, new Date())
      )
    );
    return result[0];
  }
  
  async generateOnboardingToken(clientId: number): Promise<string> {
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
    
    return token;
  }
  
  // Asset Methods
  async getAssetsByClient(clientId: number): Promise<Asset[]> {
    const result = await this.db.select().from(assets).where(eq(assets.clientId, clientId));
    return result;
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const result = await this.db.insert(assets).values({
      ...insertAsset,
      createdAt: new Date()
    }).returning();
    return result[0];
  }
  
  async updateAsset(id: number, assetUpdate: Partial<Asset>): Promise<Asset> {
    const result = await this.db.update(assets)
      .set(assetUpdate)
      .where(eq(assets.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    const result = await this.db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }
  
  // Recommendation Methods
  async getRecommendationsByClient(clientId: number): Promise<Recommendation[]> {
    const result = await this.db.select().from(recommendations).where(eq(recommendations.clientId, clientId));
    return result;
  }
  
  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const result = await this.db.insert(recommendations).values({
      ...insertRecommendation,
      createdAt: new Date()
    }).returning();
    return result[0];
  }
  
  async deleteRecommendation(id: number): Promise<boolean> {
    const result = await this.db.delete(recommendations).where(eq(recommendations.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new PostgresStorage();
