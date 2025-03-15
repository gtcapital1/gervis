import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertClientSchema, insertAssetSchema, insertRecommendationSchema } from "@shared/schema";

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  // For demo purposes, we're not implementing real auth yet
  // Assume admin user (id: 1) is logged in
  req.user = { id: 1 };
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
