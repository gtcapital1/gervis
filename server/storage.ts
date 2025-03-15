import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private assets: Map<number, Asset>;
  private recommendations: Map<number, Recommendation>;
  private userCurrentId: number;
  private clientCurrentId: number;
  private assetCurrentId: number;
  private recommendationCurrentId: number;
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Clear expired sessions every day
    });
    this.users = new Map();
    this.clients = new Map();
    this.assets = new Map();
    this.recommendations = new Map();
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.assetCurrentId = 1;
    this.recommendationCurrentId = 1;
    
    // Add a default admin user with hashed password
    // The password is "password" hashed with scrypt and salt
    this.users.set(this.userCurrentId++, {
      id: 1,
      username: "admin",
      password: "c6e19da1cbbfe0c96d33bc7972f0f9ab755fc78d592b874c3cc9c28146d7e94c78e28724a0d53cb8f5b5ed51552bf5bf24aa7adac5d7ca8a32df3761c3645acd.6c76704d14bc8241d1a89ebcab6d7371",
      name: "Admin User",
      email: "admin@watson.com",
      role: "advisor"
    });
    
    // Add demo clients for testing
    // Demo client 1 (Regular client)
    this.clients.set(this.clientCurrentId++, {
      id: 1,
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, New York, NY 10001",
      taxCode: "123-45-6789",
      isOnboarded: true,
      isArchived: false,
      riskProfile: "balanced",
      onboardingToken: null,
      tokenExpiry: null,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      advisorId: 1
    });
    
    // Demo client 2 (Not onboarded yet)
    this.clients.set(this.clientCurrentId++, {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "+1 (555) 987-6543",
      address: null,
      taxCode: null,
      isOnboarded: false,
      isArchived: false,
      riskProfile: null,
      onboardingToken: null,
      tokenExpiry: null,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      advisorId: 1
    });
    
    // Demo client 3 (Archived client)
    this.clients.set(this.clientCurrentId++, {
      id: 3,
      name: "Robert Davis",
      email: "robert.davis@example.com",
      phone: "+1 (555) 456-7890",
      address: "789 Oak Ave, Chicago, IL 60007",
      taxCode: "987-65-4321",
      isOnboarded: true,
      isArchived: true,
      riskProfile: "conservative",
      onboardingToken: null,
      tokenExpiry: null,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      advisorId: 1
    });
    
    // Add some assets for the demo clients
    // Assets for John Smith (Client 1)
    this.assets.set(this.assetCurrentId++, {
      id: 1,
      clientId: 1,
      category: "real_estate",
      value: 450000,
      description: "Primary residence",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    });
    
    this.assets.set(this.assetCurrentId++, {
      id: 2,
      clientId: 1,
      category: "equity",
      value: 150000,
      description: "Stock portfolio",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    });
    
    this.assets.set(this.assetCurrentId++, {
      id: 3,
      clientId: 1,
      category: "cash",
      value: 50000,
      description: "Savings account",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    });
    
    // Assets for Robert Davis (Client 3)
    this.assets.set(this.assetCurrentId++, {
      id: 4,
      clientId: 3,
      category: "bonds",
      value: 200000,
      description: "Government bonds",
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000)
    });
    
    this.assets.set(this.assetCurrentId++, {
      id: 5,
      clientId: 3,
      category: "cash",
      value: 75000,
      description: "Emergency fund",
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000)
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Client Methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientsByAdvisor(advisorId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.advisorId === advisorId
    );
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientCurrentId++;
    const client: Client = { 
      ...insertClient, 
      id, 
      createdAt: new Date() 
    };
    this.clients.set(id, client);
    return client;
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    const updatedClient = { ...client, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }
  
  async getClientByToken(token: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.onboardingToken === token && 
                  client.tokenExpiry && 
                  new Date(client.tokenExpiry) > new Date()
    );
  }
  
  async generateOnboardingToken(clientId: number): Promise<string> {
    const client = await this.getClient(clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }
    
    // Generate a random token
    const token = Array.from(Array(32), () => Math.floor(Math.random() * 36).toString(36)).join('');
    
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
    return Array.from(this.assets.values()).filter(
      (asset) => asset.clientId === clientId
    );
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = this.assetCurrentId++;
    const asset: Asset = { 
      ...insertAsset, 
      id, 
      createdAt: new Date() 
    };
    this.assets.set(id, asset);
    return asset;
  }
  
  async updateAsset(id: number, assetUpdate: Partial<Asset>): Promise<Asset> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    const updatedAsset = { ...asset, ...assetUpdate };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    return this.assets.delete(id);
  }
  
  // Recommendation Methods
  async getRecommendationsByClient(clientId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      (recommendation) => recommendation.clientId === clientId
    );
  }
  
  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationCurrentId++;
    const recommendation: Recommendation = { 
      ...insertRecommendation, 
      id, 
      createdAt: new Date() 
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }
  
  async deleteRecommendation(id: number): Promise<boolean> {
    return this.recommendations.delete(id);
  }
}

export const storage = new MemStorage();
