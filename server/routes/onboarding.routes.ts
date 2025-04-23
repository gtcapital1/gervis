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

    // Validazione dei campi obbligatori
    const requiredFields = [
      'address', 'phone', 'birthDate', 'maritalStatus', 'employmentStatus',
      'educationLevel', 'investmentHorizon', 'investmentExperience',
      'riskProfile', 'portfolioDropReaction', 'volatilityTolerance',
      'yearsOfExperience', 'investmentFrequency', 'advisorUsage', 'monitoringTime'
    ];

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
      maritalStatus: data.maritalStatus || "",
      employmentStatus: data.employmentStatus || "",
      educationLevel: data.educationLevel || "",
      annualIncome: parseInt(data.annualIncome) || 0,
      monthlyExpenses: parseInt(data.monthlyExpenses) || 0,
      debts: parseInt(data.debts) || 0,
      dependents: parseInt(data.dependents) || 0,

      // Sezione 2: Situazione Finanziaria Attuale
      assets: data.assets || [],

      // Sezione 3: Obiettivi d'Investimento
      investmentHorizon: data.investmentHorizon || "",
      retirementInterest: parseInt(data.retirementInterest) || 0,
      wealthGrowthInterest: parseInt(data.wealthGrowthInterest) || 0,
      incomeGenerationInterest: parseInt(data.incomeGenerationInterest) || 0,
      capitalPreservationInterest: parseInt(data.capitalPreservationInterest) || 0,
      estatePlanningInterest: parseInt(data.estatePlanningInterest) || 0,

      // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
      investmentExperience: data.investmentExperience || "",
      pastInvestmentExperience: data.pastInvestmentExperience || [],
      financialEducation: data.financialEducation || [],

      // Sezione 5: Tolleranza al Rischio
      riskProfile: data.riskProfile || "",
      portfolioDropReaction: data.portfolioDropReaction || "",
      volatilityTolerance: data.volatilityTolerance || "",

      // Sezione 6: Esperienza e Comportamento d'Investimento
      yearsOfExperience: data.yearsOfExperience || "",
      investmentFrequency: data.investmentFrequency || "",
      advisorUsage: data.advisorUsage || "",
      monitoringTime: data.monitoringTime || "",

      // Sezione 7: Domande Specifiche (opzionale)
      specificQuestions: data.specificQuestions || null,
    };

    safeLog('Dati MIFID preparati', { clientId }, 'debug');

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

    // Calculate net worth and update client segment
    const totalAssets = data.assets.reduce((sum: number, asset: any) => sum + (parseInt(asset.value) || 0), 0);
    const debts = parseInt(data.debts) || 0;
    const netWorth = totalAssets - debts;

    // Determine client segment based on net worth
    let clientSegment = 'mass_market';
    if (netWorth >= 1000000) clientSegment = 'uhnw';
    else if (netWorth >= 500000) clientSegment = 'vhnw';
    else if (netWorth >= 250000) clientSegment = 'hnw';
    else if (netWorth >= 100000) clientSegment = 'affluent';

    // Update client with net worth and segment
    await db
      .update(clients)
      .set({ 
        totalAssets,
        netWorth,
        clientSegment: clientSegment as "mass_market" | "affluent" | "hnw" | "vhnw" | "uhnw"
      })
      .where(eq(clients.id, clientId));

    safeLog('Patrimonio netto e segmento cliente aggiornati', { clientId, netWorth, clientSegment }, 'info');
    
    // Salva gli asset nella tabella assets
    if (data.assets && Array.isArray(data.assets)) {
      safeLog('Salvataggio assets', { count: data.assets.length, clientId }, 'info');
      
      // Elimina eventuali asset esistenti per questo cliente (opzionale, dipende dal comportamento desiderato)
      // await db.delete(assets).where(eq(assets.clientId, clientId));
      
      for (const asset of data.assets) {
        // Procedi solo se l'asset ha un valore maggiore di zero
        if (asset.value > 0) {
          const assetData: InsertAsset = {
            clientId,
            category: asset.category,
            description: asset.description || "",
            value: parseInt(asset.value) || 0
          };
          
          await db.insert(assets).values(assetData);
        }
      }
      
      safeLog('Assets salvati', { clientId }, 'info');
    }
    
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