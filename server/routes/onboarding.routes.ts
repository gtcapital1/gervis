import type { Express, Request, Response } from "express";
import { db } from "../db";
import { mifid, clients, assets, type InsertAsset } from "@shared/schema";
import { eq } from "drizzle-orm";
import { safeLog, handleErrorResponse, typedCatch } from "../routes";

// Funzione per salvare i dati dell'onboarding
async function saveOnboardingData(clientId: number, data: any) {
  try {
    safeLog('Salvataggio dati onboarding', { clientId }, 'info');

    // Verifica che il cliente esista
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      safeLog('Cliente non trovato', { clientId }, 'error');
      throw new Error("Client not found");
    }

    // Validazione dei campi obbligatori aggiornati secondo il nuovo schema
    const requiredFields = [
      'address', 'phone', 'birthDate', 'employmentStatus',
      'educationLevel', 'annualIncome', 'monthlyExpenses', 'debts', 'netWorth',
      'investmentHorizon', 'investmentExperience', 'pastInvestmentExperience',
      'financialEducation', 'etfObjectiveQuestion', 'riskProfile', 'portfolioDropReaction'
    ];

    safeLog('Verifico campi richiesti', { fields: Object.keys(data) }, 'debug');
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      safeLog('Campi obbligatori mancanti', { missingFields }, 'error');
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Prepara i dati per il salvataggio
    const mifidData = {
      clientId,
      // Sezione 1: Dati Anagrafici e Informazioni Personali
      address: data.address || "",
      phone: data.phone || "",
      birthDate: data.birthDate || "",
      employmentStatus: data.employmentStatus || "",
      educationLevel: data.educationLevel || "",
      
      // Sezione 2: Situazione Finanziaria Attuale
      annualIncome: data.annualIncome || "",
      monthlyExpenses: data.monthlyExpenses || "",
      debts: data.debts || "",
      netWorth: data.netWorth || "",
      assets: data.assets || [],

      // Sezione 3: Obiettivi d'Investimento
      investmentHorizon: data.investmentHorizon || "",
      investmentObjective: data.investmentInterests && data.investmentInterests.length > 0 
        ? data.investmentInterests.join(', ') 
        : "",
      investmentInterests: data.investmentInterests || [],
      
      // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
      investmentExperience: data.investmentExperience || "",
      pastInvestmentExperience: data.pastInvestmentExperience || [],
      financialEducation: data.financialEducation || [],
      etfObjectiveQuestion: data.etfObjectiveQuestion || "",

      // Sezione 5: Tolleranza al Rischio
      riskProfile: data.riskProfile || "",
      portfolioDropReaction: data.portfolioDropReaction || "",
      volatilityTolerance: data.volatilityTolerance || "",
    };

    safeLog('Dati MIFID preparati', { clientId, data: mifidData }, 'debug');

    // Inserisci i dati nella tabella mifid
    const result = await db.insert(mifid).values(mifidData);
    safeLog('Dati MIFID inseriti', { clientId }, 'info');

    // Aggiorna lo stato di onboarding del cliente
    await db
      .update(clients)
      .set({ 
        isOnboarded: true,
        onboardedAt: new Date(),
        active: false // Set default to inactive
      })
      .where(eq(clients.id, clientId));
    
    safeLog('Stato cliente aggiornato', { clientId, isOnboarded: true }, 'info');

    // Determine client segment based on net worth
    let clientSegment = 'mass_market';
    if (data.netWorth === "over-100000") clientSegment = 'hnw';
    else if (data.netWorth === "30000-100000") clientSegment = 'affluent';

    // Update client with net worth as string and segment
    await db
      .update(clients)
      .set({ 
        clientSegment: clientSegment as "mass_market" | "affluent" | "hnw" | "vhnw" | "uhnw"
      })
      .where(eq(clients.id, clientId));

    safeLog('Segmento cliente aggiornato', { clientId, clientSegment }, 'info');
    
    return { success: true };
  } catch (error: unknown) {
    const typedError = typedCatch(error);
    safeLog('Errore nel salvataggio dati onboarding', typedError, 'error');
    throw typedError;
  }
}

// Funzione per verificare la validità del token
async function validateToken(token: string) {
  try {
    // Cerca il cliente con il token fornito
    const client = await db.query.clients.findFirst({
      where: eq(clients.onboardingToken, token),
    });

    // Se il cliente non esiste, il token non è valido
    if (!client) {
      return { isValid: false, error: "Invalid token" };
    }

    // Controlla se il token è scaduto
    if (client.tokenExpiry) {
      const now = new Date();
      const expiryDate = new Date(client.tokenExpiry);
      
      if (expiryDate < now) {
        return { isValid: false, error: "Token expired" };
      }
    }

    // Se siamo arrivati qui, il token è valido
    return { 
      isValid: true, 
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        isOnboarded: client.isOnboarded
      }
    };
  } catch (error) {
    safeLog('Errore nella validazione del token', error, 'error');
    throw error;
  }
}

export function registerOnboardingRoutes(app: Express) {
  // Endpoint per verificare la validità del token di onboarding
  app.get('/api/onboarding', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      safeLog('Richiesta di verifica token onboarding', { hasToken: !!token }, 'info');
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Verifica la validità del token
      const validation = await validateToken(token as string);
      
      if (!validation.isValid) {
        safeLog('Token onboarding non valido', { error: validation.error }, 'error');
        return res.status(404).json({ error: validation.error });
      }

      safeLog('Token onboarding valido', { clientId: validation.client?.id }, 'info');
      
      res.json(validation.client);
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore nella verifica del token', typedError, 'error');
      res.status(500).json({ 
        error: typedError.message || "Failed to validate token",
        details: typedError.message
      });
    }
  });

  // Endpoint per salvare i dati dell'onboarding
  app.post('/api/onboarding', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      safeLog('Richiesta onboarding ricevuta', { hasToken: !!token }, 'info');
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Verifica la validità del token
      const validation = await validateToken(token as string);
      
      if (!validation.isValid) {
        safeLog('Token onboarding non valido', { error: validation.error }, 'error');
        return res.status(404).json({ error: validation.error });
      }

      if (validation.client?.isOnboarded) {
        safeLog('Cliente già onboarded', { clientId: validation.client.id }, 'info');
        return res.status(400).json({ error: "Client already onboarded" });
      }

      safeLog('Cliente trovato, procedo con onboarding', { clientId: validation.client?.id }, 'info');

      // Salva i dati dell'onboarding
      await saveOnboardingData(validation.client!.id, req.body);

      res.json({ success: true });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore durante onboarding', typedError, 'error');
      res.status(500).json({ 
        error: typedError.message || "Failed to save onboarding data",
        details: typedError.message
      });
    }
  });

  // Endpoint per verificare il completamento dell'onboarding
  app.get('/api/onboarding/success', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      safeLog('Verifica completamento onboarding', { hasToken: !!token }, 'info');
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Verifica la validità del token
      const validation = await validateToken(token as string);
      
      if (!validation.isValid) {
        safeLog('Token onboarding non valido', { error: validation.error }, 'error');
        return res.status(404).json({ error: validation.error });
      }

      // Verifica se il cliente ha completato l'onboarding
      if (!validation.client?.isOnboarded) {
        safeLog('Onboarding non completato', { clientId: validation.client?.id }, 'error');
        return res.status(404).json({ error: "Onboarding not completed" });
      }

      safeLog('Verifica onboarding completata con successo', { clientId: validation.client.id }, 'info');
      res.json({ success: true });
    } catch (error: unknown) {
      const typedError = typedCatch(error);
      safeLog('Errore nella verifica del completamento onboarding', typedError, 'error');
      res.status(500).json({ 
        error: typedError.message || "Failed to verify onboarding completion",
        details: typedError.message
      });
    }
  });
} 