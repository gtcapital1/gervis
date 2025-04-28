import { db } from "../db.js";
import { clients, assets, aiProfiles, mifid, recommendations, clientLogs, signedDocuments, verifiedDocuments, trendData } from "../../shared/schema.js";
import { and, eq, like, or, desc } from "drizzle-orm";
import { findClientByName } from "../services/clientProfileService.js";

/**
 * Comprehensive function to fetch all client-related data with field descriptions
 * @param firstName The client's first name
 * @param lastName The client's last name
 * @param advisorId Optional advisor ID to restrict search to a specific advisor's clients
 * @returns A complete structured data object with metadata and descriptions
 */
export async function getCompleteClientData(firstName: string, lastName: string, advisorId?: number) {
  try {
    console.log(`[DEBUG SICUREZZA] getCompleteClientData - Ricerca per: ${firstName} ${lastName}, advisorId: ${advisorId || 'non specificato'}`);
    
    // 1. Find the client using the improved findClientByName function
    const fullName = `${firstName} ${lastName}`.trim();
    
    // PROBLEMA CRITICO: Se advisor non è specificato, la funzione non può trovare clienti
    // dopo le modifiche di sicurezza introdotte
    if (!advisorId) {
      console.error(`[CRITICAL SECURITY ERROR] getCompleteClientData chiamata senza advisorId! Questo è un bug che deve essere corretto.`);
      console.error(`[CRITICAL SECURITY ERROR] Stack trace:`, new Error().stack);
      
      // Se siamo chiamati direttamente da getClientContext, possiamo leggere il userId dai parametri
      // altrimenti dobbiamo restituire un errore
      return {
        success: false,
        error: `Client "${firstName} ${lastName}" not found in the database. Security error: Missing advisorId parameter.`
      };
    }
    
    const clientId = await findClientByName(fullName, advisorId, false);
    
    console.log(`[DEBUG SICUREZZA] getCompleteClientData - Risultato findClientByName: clientId=${clientId || 'non trovato'}`);
    
    if (!clientId) {
      const errMsg = `Client "${firstName} ${lastName}" not found in the database.`;
      console.log(`[DEBUG SICUREZZA] getCompleteClientData - Errore: ${errMsg}`);
      return {
        success: false,
        error: errMsg
      };
    }
    
    // Ora che abbiamo l'ID, otteniamo i dati completi del cliente
    const clientData = await db.select().from(clients).where(eq(clients.id, clientId));
    
    if (!clientData.length) {
      const errMsg = `Client with ID ${clientId} not found in the database. This is unusual and might indicate a database inconsistency.`;
      console.log(`[DEBUG SICUREZZA] getCompleteClientData - Errore: ${errMsg}`);
      return {
        success: false,
        error: errMsg
      };
    }
    
    const client = clientData[0];
    console.log(`[DEBUG SICUREZZA] getCompleteClientData - Cliente trovato: ID ${client.id}, Nome: ${client.firstName} ${client.lastName}, AdvisorId: ${client.advisorId}`);
    
    // CONTROLLO DI SICUREZZA: Verifica che il cliente appartiene all'advisor specificato
    if (advisorId && client.advisorId !== advisorId) {
      const errMsg = `Security violation: client ID ${client.id} belongs to advisor ${client.advisorId}, not authorized for advisor ${advisorId}`;
      console.error(`[SECURITY VIOLATION] ${errMsg}`);
      return {
        success: false,
        error: `Client "${firstName} ${lastName}" not found in the database.` // Messaggio generico per evitare data leakage
      };
    }
    
    // 2. Fetch all related data for the client
    const clientAssets = await db.select().from(assets).where(eq(assets.clientId, client.id));
    const aiProfile = await db.select().from(aiProfiles).where(eq(aiProfiles.clientId, client.id));
    const mifidProfile = await db.select().from(mifid).where(eq(mifid.clientId, client.id));
    const clientRecommendations = await db.select().from(recommendations).where(eq(recommendations.clientId, client.id));
    const clientDocuments = await db.select().from(signedDocuments).where(eq(signedDocuments.clientId, client.id));
    const verifiedDocs = await db.select().from(verifiedDocuments).where(eq(verifiedDocuments.clientId, client.id));
    const performanceData = await db.select().from(trendData).where(eq(trendData.clientId, client.id));
    const recentLogs = await db.select().from(clientLogs)
      .where(eq(clientLogs.clientId, client.id))
      .orderBy(desc(clientLogs.logDate))
      .limit(10);
    
    // 3. Construct a comprehensive data object with descriptions
    const completeClientData = {
      metadata: {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        clientId: client.id,
        fullName: `${client.firstName} ${client.lastName}`,
        dataCompleteness: {
          hasBasicInfo: true,
          hasMifidProfile: mifidProfile.length > 0,
          hasAssets: clientAssets.length > 0,
          hasAiInsights: aiProfile.length > 0,
          hasRecommendations: clientRecommendations.length > 0,
          hasDocuments: clientDocuments.length > 0,
          hasVerifiedIdentity: verifiedDocs.length > 0,
          hasPerformanceData: performanceData.length > 0,
          hasActivityLogs: recentLogs.length > 0
        }
      },
      
      // Basic client information with field descriptions
      personalInformation: {
        description: "Basic personal and contact information for the client",
        data: {
          id: {
            value: client.id,
            description: "Unique identifier for the client in the database"
          },
          firstName: {
            value: client.firstName,
            description: "Client's first name"
          },
          lastName: {
            value: client.lastName,
            description: "Client's last name"
          },
          email: {
            value: client.email,
            description: "Client's email address for communications"
          },
          taxCode: {
            value: client.taxCode,
            description: "Client's tax identification code"
          },
          clientSegment: {
            value: client.clientSegment,
            description: "Classification of the client (e.g., Retail, Affluent, Private, HNWI)"
          },
          createdAt: {
            value: formatDate(client.createdAt),
            description: "Date when the client was first added to the system"
          },
          onboardedAt: {
            value: client.onboardedAt ? formatDate(client.onboardedAt) : null,
            description: "Date when the client completed the onboarding process"
          },
          birthDate: {
            value: mifidProfile.length && mifidProfile[0].birthDate ? mifidProfile[0].birthDate : null,
            description: "Client's date of birth"
          },
          phone: {
            value: mifidProfile.length && mifidProfile[0].phone ? mifidProfile[0].phone : null,
            description: "Client's phone number"
          },
          address: {
            value: mifidProfile.length && mifidProfile[0].address ? mifidProfile[0].address : null,
            description: "Client's residential address"
          }
        }
      },
      
      // Financial overview
      financialOverview: {
        description: "Summary of the client's financial situation",
        data: {
          totalAssets: {
            value: client.totalAssets,
            description: "Total value of all client assets in euros"
          },
          netWorth: {
            value: client.netWorth,
            description: "Client's estimated net worth in euros"
          },
          annualIncome: {
            value: mifidProfile.length ? mifidProfile[0].annualIncome : null,
            description: "Client's annual income in euros"
          },
          monthlyExpenses: {
            value: mifidProfile.length ? mifidProfile[0].monthlyExpenses : null, 
            description: "Client's average monthly expenses in euros"
          },
          debts: {
            value: mifidProfile.length ? mifidProfile[0].debts : null,
            description: "Client's total outstanding debts in euros"
          }
        }
      },
      
      // Detailed asset information
      assetDetails: {
        description: "Breakdown of the client's investment portfolio and assets",
        data: clientAssets.map((asset: any) => ({
          id: {
            value: asset.id,
            description: "Unique identifier for this asset"
          },
          category: {
            value: asset.category,
            description: "Type of asset (e.g., Stocks, Bonds, Real Estate, Cash)"
          },
          value: {
            value: asset.value,
            description: "Current monetary value of the asset in euros"
          },
          description: {
            value: asset.description,
            description: "Detailed description of the asset"
          },
          createdAt: {
            value: formatDate(asset.createdAt),
            description: "Date when the asset was recorded in the system"
          }
        }))
      },
      
      // Investment profile from MIFID questionnaire
      investmentProfile: {
        description: "Client's investment preferences and risk profile based on MIFID assessment",
        data: mifidProfile.length ? {
          riskProfile: {
            value: mifidProfile[0].riskProfile,
            description: "Client's overall risk tolerance category (Conservative, Moderate, Aggressive)"
          },
          investmentHorizon: {
            value: mifidProfile[0].investmentHorizon,
            description: "Client's intended investment timeframe (Short-term, Medium-term, Long-term)"
          },
          investmentExperience: {
            value: mifidProfile[0].investmentExperience,
            description: "Client's level of experience with financial investments"
          },
          investmentGoals: {
            value: getTopInvestmentGoals(mifidProfile[0]),
            description: "Client's primary financial objectives ranked by importance"
          },
          retirementInterest: {
            value: mifidProfile[0].retirementInterest,
            description: "Level of importance (1-5) the client places on retirement planning"
          },
          wealthGrowthInterest: {
            value: mifidProfile[0].wealthGrowthInterest,
            description: "Level of importance (1-5) the client places on growing overall wealth"
          },
          incomeGenerationInterest: {
            value: mifidProfile[0].incomeGenerationInterest,
            description: "Level of importance (1-5) the client places on generating regular income"
          },
          capitalPreservationInterest: {
            value: mifidProfile[0].capitalPreservationInterest,
            description: "Level of importance (1-5) the client places on preserving capital"
          },
          estatePlanningInterest: {
            value: mifidProfile[0].estatePlanningInterest,
            description: "Level of importance (1-5) the client places on estate planning"
          },
          volatilityTolerance: {
            value: mifidProfile[0].volatilityTolerance,
            description: "Client's tolerance for investment value fluctuations"
          },
          portfolioDropReaction: {
            value: mifidProfile[0].portfolioDropReaction,
            description: "How the client would react to a significant drop in portfolio value"
          }
        } : null
      },
      
      // AI-generated insights
      aiInsights: {
        description: "AI-generated analysis and insights about the client's financial profile",
        data: aiProfile.length ? {
          profileData: {
            value: aiProfile[0].profileData,
            description: "Structured AI analysis of client data with recommendations"
          },
          lastGeneratedAt: {
            value: formatDate(aiProfile[0].lastGeneratedAt),
            description: "Date when the AI insights were last updated"
          }
        } : null
      },
      
      // Investment recommendations
      recommendations: {
        description: "Investment recommendations and advisory suggestions for the client",
        data: clientRecommendations.map((rec: any) => ({
          id: {
            value: rec.id,
            description: "Unique identifier for this recommendation"
          },
          content: {
            value: rec.content,
            description: "Detailed explanation of the investment recommendation"
          },
          actions: {
            value: rec.actions,
            description: "Suggested action items related to this recommendation"
          },
          createdAt: {
            value: formatDate(rec.createdAt),
            description: "Date when this recommendation was created"
          }
        }))
      },
      
      // Document history
      documents: {
        description: "Legal and financial documents signed by the client",
        data: clientDocuments.map((doc: any) => ({
          documentName: {
            value: doc.documentName,
            description: "Name of the document"
          },
          documentType: {
            value: doc.documentType,
            description: "Type/category of document (contract, disclosure, etc.)"
          },
          signatureDate: {
            value: formatDate(doc.signatureDate),
            description: "Date when the client signed this document"
          },
          signatureType: {
            value: doc.signatureType,
            description: "Method of signature (digital, traditional)"
          }
        }))
      },
      
      // Identity verification
      identityVerification: {
        description: "Information about client identity verification",
        data: verifiedDocs.length ? {
          verificationDate: {
            value: formatDate(verifiedDocs[0].verificationDate),
            description: "Date when the client's identity was verified"
          },
          verificationStatus: {
            value: verifiedDocs[0].verificationStatus,
            description: "Current status of identity verification (pending, verified, rejected)"
          },
          documentType: {
            value: "Identity document and selfie",
            description: "Type of documents used for verification"
          }
        } : null
      },
      
      // Performance data
      performanceData: {
        description: "Historical performance data of client's portfolio",
        data: performanceData.map((data: any) => ({
          date: {
            value: formatDate(data.date),
            description: "Date of the recorded performance snapshot"
          },
          portfolioValue: {
            value: data.portfolioValue,
            description: "Total portfolio value in euros on this date"
          },
          roi: {
            value: data.roi,
            description: "Return on investment percentage on this date"
          },
          risk: {
            value: data.risk,
            description: "Risk assessment score (1-10) for the portfolio on this date"
          }
        }))
      },
      
      // Recent activities and interactions
      recentActivities: {
        description: "Recent interactions and communications with the client",
        data: recentLogs.map((log: any) => ({
          type: {
            value: log.type,
            description: "Type of interaction (email, note, call, meeting, document signing)"
          },
          title: {
            value: log.title,
            description: "Title or subject of the interaction"
          },
          content: {
            value: log.content,
            description: "Detailed content of the interaction"
          },
          logDate: {
            value: formatDate(log.logDate),
            description: "Date when this interaction occurred"
          },
          emailSubject: {
            value: log.emailSubject || null,
            description: "Subject line of the email (if interaction was an email)"
          },
          emailRecipients: {
            value: log.emailRecipients || null,
            description: "Recipients of the email (if interaction was an email)"
          }
        }))
      }
    };
    
    return {
      success: true,
      clientData: completeClientData
    };
    
  } catch (error) {
    console.error("Error retrieving comprehensive client data:", error);
    return {
      success: false,
      error: "Error retrieving client data: " + (error instanceof Error ? error.message : "Unknown error")
    };
  }
}

// Helper function to extract the top investment goals
function getTopInvestmentGoals(mifidData: any) {
  const goals = [
    { name: "Retirement", value: mifidData.retirementInterest },
    { name: "Wealth Growth", value: mifidData.wealthGrowthInterest },
    { name: "Income Generation", value: mifidData.incomeGenerationInterest },
    { name: "Capital Preservation", value: mifidData.capitalPreservationInterest },
    { name: "Estate Planning", value: mifidData.estatePlanningInterest }
  ];
  
  return goals
    .sort((a, b) => a.value - b.value) // Sort by ascending value (1 is highest priority)
    .slice(0, 3)
    .map(g => `${g.name} (${g.value}/5, highest priority = 1)`)
    .join(", ");
}

// Helper function to format dates consistently
function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
} 