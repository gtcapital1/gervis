import { Router } from "express";
import { db } from "@/db";
import { mifid } from "@/db/schema/mifid";
import { clients } from "@/db/schema/clients";
import { eq } from "drizzle-orm";

const router = Router();

// Funzione per salvare i dati dell'onboarding
async function saveOnboardingData(clientId: number, data: any) {
  try {
    console.log("Starting saveOnboardingData with clientId:", clientId);
    console.log("Raw data received:", JSON.stringify(data, null, 2));

    // Verifica che il cliente esista
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      console.error("Client not found with ID:", clientId);
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
      console.error("Missing required fields:", missingFields);
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

    console.log("Transformed mifidData:", JSON.stringify(mifidData, null, 2));

    // Inserisci i dati nella tabella mifid
    const result = await db.insert(mifid).values(mifidData);
    console.log("Database insertion result:", result);

    // Aggiorna lo stato di onboarding del cliente
    await db
      .update(clients)
      .set({ 
        isOnboarded: true,
        onboarded_at: new Date(),
        active: false // Set default to inactive
      })
      .where(eq(clients.id, clientId));
    
    console.log("Client onboarding status updated");

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
        clientSegment
      })
      .where(eq(clients.id, clientId));

    return { success: true };
  } catch (error: any) {
    console.error("Error in saveOnboardingData:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

// Endpoint per salvare i dati dell'onboarding
router.post("/", async (req, res) => {
  try {
    const { token } = req.query;
    console.log("Received token:", token);
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Verifica il token e ottieni l'ID del cliente
    const client = await db.query.clients.findFirst({
      where: eq(clients.onboardingToken, token as string),
    });

    console.log("Found client:", client);

    if (!client) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    console.log("Received data:", JSON.stringify(req.body, null, 2));

    // Salva i dati dell'onboarding
    await saveOnboardingData(client.id, req.body);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in onboarding endpoint:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: error.message || "Failed to save onboarding data",
      details: error.message // Includiamo il messaggio di errore specifico
    });
  }
});

// Endpoint per verificare il completamento dell'onboarding
router.get("/success", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Verifica il token e ottieni l'ID del cliente
    const client = await db.query.clients.findFirst({
      where: eq(clients.onboardingToken, token as string),
    });

    if (!client) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    // Verifica se il cliente ha completato l'onboarding
    if (!client.isOnboarded) {
      return res.status(404).json({ error: "Onboarding not completed" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in onboarding success endpoint:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: error.message || "Failed to verify onboarding completion",
      details: error.message
    });
  }
});

export default router; 