import { db } from '../db';
import { clients, aiProfiles, assets, mifid, recommendations, clientLogs } from '../../shared/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';

/**
 * Servizio per fornire un profilo cliente completo e unificato
 * Raccoglie dati da tutte le tabelle pertinenti e li organizza in una struttura coherente
 * Include metadati e descrizioni per ogni campo
 */

interface FieldMetadata<T> {
  value: T;
  description: string; 
  source: string;
  lastUpdated?: Date;
}

/**
 * Recupera un profilo cliente completo con tutti i dati disponibili e metadati
 * @param clientId ID del cliente
 * @returns Un profilo cliente completo con metadati
 */
export async function getCompleteClientProfile(clientId: number) {
  try {
    // 1. Recupera i dati di base del cliente
    const clientData = await db.select().from(clients).where(eq(clients.id, clientId));
    
    if (!clientData.length) {
      return {
        success: false,
        error: `Cliente con ID ${clientId} non trovato nel database.`
      };
    }
    
    const client = clientData[0];
    
    // 2. Raccogliere tutti i dati aggiuntivi del cliente
    const clientAssets = await db.select().from(assets).where(eq(assets.clientId, clientId));
    const aiProfile = await db.select().from(aiProfiles).where(eq(aiProfiles.clientId, clientId));
    const mifidProfile = await db.select().from(mifid).where(eq(mifid.clientId, clientId));
    const clientRecommendations = await db.select().from(recommendations).where(eq(recommendations.clientId, clientId));
    const recentLogs = await db.select().from(clientLogs)
      .where(eq(clientLogs.clientId, clientId))
      .orderBy(desc(clientLogs.logDate))
      .limit(10);
    
    // 3. Costruire il profilo completo con metadati
    const completeProfile: Record<string, FieldMetadata<any>> = {
      // Dati anagrafici (tabella clients)
      id: {
        value: client.id,
        description: "Identificativo univoco del cliente nel sistema",
        source: "clients"
      },
      firstName: {
        value: client.firstName,
        description: "Nome del cliente",
        source: "clients"
      },
      lastName: {
        value: client.lastName,
        description: "Cognome del cliente",
        source: "clients"
      },
      name: {
        value: client.name,
        description: "Nome completo del cliente",
        source: "clients"
      },
      email: {
        value: client.email,
        description: "Indirizzo email principale del cliente",
        source: "clients"
      },
      taxCode: {
        value: client.taxCode,
        description: "Codice fiscale del cliente",
        source: "clients"
      },
      totalAssets: {
        value: client.totalAssets,
        description: "Valore totale degli asset del cliente in Euro",
        source: "clients"
      },
      netWorth: {
        value: client.netWorth,
        description: "Patrimonio netto del cliente in Euro",
        source: "clients"
      },
      clientSegment: {
        value: client.clientSegment,
        description: "Segmento cliente (mass_market, affluent, hnw, vhnw, uhnw)",
        source: "clients"
      },
      active: {
        value: client.active,
        description: "Indica se il cliente è attivo nel sistema",
        source: "clients"
      },
      createdAt: {
        value: client.createdAt,
        description: "Data di creazione del profilo cliente",
        source: "clients"
      },
      
      // Dati dal profilo MIFID
      ...(mifidProfile.length ? {
        // Dati di contatto MIFID
        address: {
          value: mifidProfile[0].address,
          description: "Indirizzo di residenza del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        phone: {
          value: mifidProfile[0].phone,
          description: "Numero di telefono principale del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        birthDate: {
          value: mifidProfile[0].birthDate,
          description: "Data di nascita del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        
        // Dati finanziari MIFID
        maritalStatus: {
          value: mifidProfile[0].maritalStatus,
          description: "Stato civile del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        employmentStatus: {
          value: mifidProfile[0].employmentStatus,
          description: "Stato occupazionale del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        educationLevel: {
          value: mifidProfile[0].educationLevel,
          description: "Livello di istruzione del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        annualIncome: {
          value: mifidProfile[0].annualIncome,
          description: "Reddito annuale del cliente in Euro",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        financialAssets: {
          value: mifidProfile[0].financialAssets,
          description: "Valore totale degli asset finanziari del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        realEstateAssets: {
          value: mifidProfile[0].realEstateAssets,
          description: "Valore totale degli immobili posseduti dal cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        liabilities: {
          value: mifidProfile[0].liabilities,
          description: "Totale dei debiti e passività del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        
        // Profilo di investimento MIFID
        riskProfile: {
          value: mifidProfile[0].riskProfile,
          description: "Profilo di rischio del cliente (basso, medio, alto)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        investmentHorizon: {
          value: mifidProfile[0].investmentHorizon,
          description: "Orizzonte temporale per gli investimenti del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        investmentExperience: {
          value: mifidProfile[0].investmentExperience,
          description: "Livello di esperienza negli investimenti (basso, medio, alto)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        investmentObjectives: {
          value: mifidProfile[0].investmentObjectives,
          description: "Obiettivi di investimento generali del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        investmentPreferences: {
          value: mifidProfile[0].investmentPreferences,
          description: "Preferenze di investimento specifiche del cliente",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        
        // Interessi di investimento (con priorità)
        retirementInterest: {
          value: mifidProfile[0].retirementInterest,
          description: "Interesse per investimenti pensionistici (1=massima priorità, 5=minima)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        wealthGrowthInterest: {
          value: mifidProfile[0].wealthGrowthInterest,
          description: "Interesse per la crescita del patrimonio (1=massima priorità, 5=minima)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        incomeGenerationInterest: {
          value: mifidProfile[0].incomeGenerationInterest,
          description: "Interesse per generazione di reddito (1=massima priorità, 5=minima)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        capitalPreservationInterest: {
          value: mifidProfile[0].capitalPreservationInterest,
          description: "Interesse per preservazione del capitale (1=massima priorità, 5=minima)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        },
        estatePlanningInterest: {
          value: mifidProfile[0].estatePlanningInterest,
          description: "Interesse per pianificazione successoria (1=massima priorità, 5=minima)",
          source: "mifid",
          lastUpdated: mifidProfile[0].updatedAt
        }
      } : {}),
      
      // Insights AI sul cliente
      ...(aiProfile.length ? {
        aiInsights: {
          value: aiProfile[0].profileData,
          description: "Analisi e insights generati dall'AI sul profilo cliente",
          source: "ai_profiles",
          lastUpdated: aiProfile[0].lastGeneratedAt
        }
      } : {})
    };
    
    // 4. Aggiungere asset come array separato con metadati
    const assetsWithMetadata = clientAssets.map(asset => ({
      id: {
        value: asset.id,
        description: "Identificativo univoco dell'asset",
        source: "assets"
      },
      category: {
        value: asset.category,
        description: "Categoria dell'asset (azioni, obbligazioni, fondi, immobili, etc.)",
        source: "assets" 
      },
      value: {
        value: asset.value,
        description: "Valore corrente dell'asset in Euro",
        source: "assets"
      },
      description: {
        value: asset.description,
        description: "Descrizione dettagliata dell'asset",
        source: "assets"
      },
      createdAt: {
        value: asset.createdAt,
        description: "Data di registrazione dell'asset",
        source: "assets"
      }
    }));
    
    // 5. Aggiungere raccomandazioni come array separato con metadati
    const recommendationsWithMetadata = clientRecommendations.map(rec => ({
      id: {
        value: rec.id,
        description: "Identificativo univoco della raccomandazione",
        source: "recommendations"
      },
      content: {
        value: rec.content,
        description: "Contenuto della raccomandazione per il cliente",
        source: "recommendations"
      },
      createdAt: {
        value: rec.createdAt,
        description: "Data di creazione della raccomandazione",
        source: "recommendations"
      },
      ...(rec.actions ? {
        actions: {
          value: rec.actions,
          description: "Azioni suggerite relative alla raccomandazione",
          source: "recommendations"
        }
      } : {})
    }));
    
    // 6. Aggiungere log recenti come array separato con metadati
    const logsWithMetadata = recentLogs.map(log => ({
      id: {
        value: log.id,
        description: "Identificativo univoco del log",
        source: "client_logs"
      },
      type: {
        value: log.type,
        description: "Tipo di interazione (email, note, call, meeting, etc.)",
        source: "client_logs"
      },
      title: {
        value: log.title,
        description: "Titolo o oggetto dell'interazione",
        source: "client_logs"
      },
      content: {
        value: log.content,
        description: "Contenuto dettagliato dell'interazione",
        source: "client_logs"
      },
      logDate: {
        value: log.logDate,
        description: "Data in cui è avvenuta l'interazione",
        source: "client_logs"
      },
      ...(log.emailSubject ? {
        emailSubject: {
          value: log.emailSubject,
          description: "Oggetto dell'email inviata al cliente",
          source: "client_logs"
        }
      } : {}),
      ...(log.emailRecipients ? {
        emailRecipients: {
          value: log.emailRecipients,
          description: "Destinatari dell'email",
          source: "client_logs"
        }
      } : {}),
      createdAt: {
        value: log.createdAt,
        description: "Data di registrazione del log",
        source: "client_logs"
      }
    }));
    
    // 7. Costruisci e restituisci il profilo completo
    return {
      success: true,
      clientProfile: completeProfile,
      assets: assetsWithMetadata,
      recommendations: recommendationsWithMetadata,
      recentActivity: logsWithMetadata,
      // Meta-informazioni sulla completezza dei dati
      profileCompleteness: {
        hasBasicInfo: true,
        hasMifidProfile: mifidProfile.length > 0,
        hasAssets: clientAssets.length > 0,
        hasAiInsights: aiProfile.length > 0,
        hasRecommendations: clientRecommendations.length > 0,
        hasRecentActivities: recentLogs.length > 0,
        completenessScore: calculateCompletenessScore(
          client, 
          mifidProfile.length > 0 ? mifidProfile[0] : null
        )
      }
    };
    
  } catch (error) {
    console.error("Errore nel recupero del profilo cliente completo:", error);
    return {
      success: false,
      error: "Errore nel recupero del profilo cliente: " + (error instanceof Error ? error.message : "Errore sconosciuto")
    };
  }
}

/**
 * Calcola un punteggio di completezza per il profilo cliente
 * @param client Dati base del cliente
 * @param mifidData Dati MIFID del cliente
 * @returns Punteggio di completezza (0-100)
 */
function calculateCompletenessScore(client: any, mifidData: any | null): number {
  let totalFields = 0;
  let completedFields = 0;
  
  // Dati base cliente
  const basicFields = ['firstName', 'lastName', 'email', 'taxCode', 'clientSegment'];
  totalFields += basicFields.length;
  basicFields.forEach(field => {
    if (client[field] !== undefined && client[field] !== null && client[field] !== '') {
      completedFields++;
    }
  });
  
  // Dati MIFID
  if (mifidData) {
    const mifidFields = [
      'address', 'phone', 'birthDate', 'maritalStatus', 'employmentStatus',
      'educationLevel', 'annualIncome', 'riskProfile', 'investmentHorizon',
      'investmentExperience', 'investmentObjectives'
    ];
    totalFields += mifidFields.length;
    mifidFields.forEach(field => {
      if (mifidData[field] !== undefined && mifidData[field] !== null && mifidData[field] !== '') {
        completedFields++;
      }
    });
  }
  
  // Calcola percentuale
  return Math.round((completedFields / totalFields) * 100);
}

/**
 * Ricerca un cliente per nome (parziale o completo)
 * @param clientName Nome o parte del nome del cliente
 * @returns ID del cliente se trovato
 */
export async function findClientByName(clientName: string): Promise<number | null> {
  try {
    // Dividi il nome in parti
    const nameParts = clientName.trim().split(/\s+/);
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length >= 2) {
      // Se ci sono almeno due parti, assume che la prima sia il nome e l'ultima il cognome
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
    } else if (nameParts.length === 1) {
      // Se c'è solo una parte, cerca di abbinare con nome o cognome
      firstName = nameParts[0];
      lastName = nameParts[0];
    }
    
    // Cerca il cliente nel database con criteri flessibili
    const clientData = await db.select().from(clients).where(
      or(
        and(
          like(clients.firstName, `%${firstName}%`),
          like(clients.lastName, `%${lastName}%`)
        ),
        like(clients.firstName, `%${clientName}%`),
        like(clients.lastName, `%${clientName}%`)
      )
    ).limit(1);
    
    if (!clientData.length) {
      return null;
    }
    
    return clientData[0].id;
  } catch (error) {
    console.error("Errore nella ricerca del cliente per nome:", error);
    return null;
  }
} 