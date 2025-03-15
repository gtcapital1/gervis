import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertClientSchema, insertAssetSchema, insertRecommendationSchema } from "@shared/schema";
import { setupAuth } from "./auth";

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Landing page contact form schema
const contactFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
  privacy: z.boolean().refine(val => val === true)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  // Contact form endpoint (landing page)
  app.post('/api/contact', async (req, res) => {
    try {
      // Validate the request body
      const validatedData = contactFormSchema.parse(req.body);
      
      // Log the contact submission (would typically save to database)
      console.log('Contact form submission:', validatedData);
      
      // Return success
      res.status(200).json({ success: true, message: 'Contact form submitted successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        console.error('Error processing contact form:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  });

  // ===== Client Management Routes =====
  
  // Get all clients for the advisor
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const advisorId = req.user?.id;
      const clients = await storage.getClientsByAdvisor(advisorId);
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });
  
  // Get single client by ID
  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to access this client' });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ message: 'Failed to fetch client' });
    }
  });
  
  // Create new client
  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse({
        ...req.body,
        advisorId: req.user?.id
      });
      
      const newClient = await storage.createClient(validatedData);
      res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        console.error('Error creating client:', error);
        res.status(500).json({ message: 'Failed to create client' });
      }
    }
  });
  
  // Update client
  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to update this client' });
      }
      
      const updatedClient = await storage.updateClient(clientId, req.body);
      res.json(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ message: 'Failed to update client' });
    }
  });
  
  // Delete client
  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to delete this client' });
      }
      
      await storage.deleteClient(clientId);
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: 'Failed to delete client' });
    }
  });
  
  // ===== Asset Management Routes =====
  
  // Get all assets for a client
  app.get('/api/clients/:clientId/assets', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to access this client' });
      }
      
      const assets = await storage.getAssetsByClient(clientId);
      res.json(assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ message: 'Failed to fetch assets' });
    }
  });
  
  // Create new asset for a client
  app.post('/api/clients/:clientId/assets', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to add assets to this client' });
      }
      
      const validatedData = insertAssetSchema.parse({
        ...req.body,
        clientId
      });
      
      const newAsset = await storage.createAsset(validatedData);
      res.status(201).json(newAsset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        console.error('Error creating asset:', error);
        res.status(500).json({ message: 'Failed to create asset' });
      }
    }
  });
  
  // ===== Onboarding Routes =====

  // Generate onboarding token for a client
  app.post('/api/clients/:clientId/onboarding-token', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to generate token for this client' });
      }
      
      const token = await storage.generateOnboardingToken(clientId);
      
      // Return the token and a link that can be sent to the client
      const onboardingLink = `${req.protocol}://${req.get('host')}/onboarding/${token}`;
      
      res.json({ 
        success: true,
        token,
        link: onboardingLink 
      });
    } catch (error) {
      console.error('Error generating onboarding token:', error);
      res.status(500).json({ message: 'Failed to generate onboarding token' });
    }
  });
  
  // Get client data using onboarding token (no auth required)
  app.get('/api/onboarding/:token', async (req, res) => {
    try {
      const token = req.params.token;
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ message: 'Invalid or expired token' });
      }
      
      // Return limited client information
      res.json({
        id: client.id,
        name: client.name,
        email: client.email,
        isOnboarded: client.isOnboarded
      });
    } catch (error) {
      console.error('Error retrieving client by token:', error);
      res.status(500).json({ message: 'Failed to retrieve client information' });
    }
  });
  
  // Update client information using onboarding token (no auth required)
  app.post('/api/onboarding/:token', async (req, res) => {
    try {
      const token = req.params.token;
      const client = await storage.getClientByToken(token);
      
      if (!client) {
        return res.status(404).json({ message: 'Invalid or expired token' });
      }
      
      // Validate the onboarding data
      const onboardingSchema = z.object({
        phone: z.string().optional(),
        address: z.string().optional(),
        taxCode: z.string().optional(),
        riskProfile: z.enum(['conservative', 'moderate', 'balanced', 'growth', 'aggressive']),
        assets: z.array(z.object({
          category: z.enum(['real_estate', 'equity', 'bonds', 'cash', 'other']),
          value: z.number().min(0),
          description: z.string().optional()
        })).optional()
      });
      
      const validatedData = onboardingSchema.parse(req.body);
      
      // Update client data
      const updateData = {
        ...validatedData,
        isOnboarded: true,
        onboardingToken: null,  // Clear the token after successful onboarding
        tokenExpiry: null
      };
      
      // Remove assets from the update data as we'll handle them separately
      const { assets, ...clientUpdateData } = updateData;
      const updatedClient = await storage.updateClient(client.id, clientUpdateData);
      
      // Add assets if provided
      if (assets && assets.length > 0) {
        for (const asset of assets) {
          await storage.createAsset({
            ...asset,
            clientId: client.id
          });
        }
      }
      
      res.json({ 
        success: true,
        message: 'Onboarding completed successfully',
        client: updatedClient
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        console.error('Error completing onboarding:', error);
        res.status(500).json({ message: 'Failed to complete onboarding' });
      }
    }
  });

  // ===== Recommendation Routes =====
  
  // Get recommendations for a client
  app.get('/api/clients/:clientId/recommendations', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to access this client' });
      }
      
      const recommendations = await storage.getRecommendationsByClient(clientId);
      res.json(recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });
  
  // Create recommendation for a client
  app.post('/api/clients/:clientId/recommendations', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if this client belongs to the current advisor
      if (client.advisorId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to add recommendations to this client' });
      }
      
      const validatedData = insertRecommendationSchema.parse({
        ...req.body,
        clientId
      });
      
      const newRecommendation = await storage.createRecommendation(validatedData);
      res.status(201).json(newRecommendation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        console.error('Error creating recommendation:', error);
        res.status(500).json({ message: 'Failed to create recommendation' });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
