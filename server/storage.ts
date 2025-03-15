import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  assets, type Asset, type InsertAsset,
  recommendations, type Recommendation, type InsertRecommendation
} from "@shared/schema";

export interface IStorage {
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

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.assets = new Map();
    this.recommendations = new Map();
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.assetCurrentId = 1;
    this.recommendationCurrentId = 1;
    
    // Add a default admin user
    this.users.set(this.userCurrentId++, {
      id: 1,
      username: "admin",
      password: "password",
      name: "Admin User",
      email: "admin@watson.com",
      role: "advisor"
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
