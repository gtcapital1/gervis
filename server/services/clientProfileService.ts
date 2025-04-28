import { db } from '../db.js';
import { clients, aiProfiles, assets, mifid, recommendations, clientLogs } from '../../shared/schema.js';
import { eq, desc, and, or, like, ilike, sql } from 'drizzle-orm';

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
 * Ricerca avanzata di clienti con varie opzioni di filtro
 * @param searchTerm Nome o parte del nome del cliente da cercare
 * @param options Opzioni di ricerca (limit, advisorId, onlyActive, etc.)
 * @returns Array di clienti trovati con punteggio di corrispondenza
 */
export async function findClients(searchTerm: string, options: {
  limit?: number;        // Numero massimo di risultati da restituire
  advisorId: number;     // PARAMETRO OBBLIGATORIO: Filtra per advisor specifico
  onlyActive?: boolean;  // Solo clienti attivi
  exactMatch?: boolean;  // Cerca corrispondenza esatta
}) {
  try {
    const {
      limit = 1,                  // Default: restituisce solo il primo risultato
      advisorId,                  // OBBLIGATORIO: ora è un parametro richiesto
      onlyActive = false,         // Default: cerca tra tutti i clienti
      exactMatch = false          // Default: cerca corrispondenze parziali
    } = options;

    // Controllo di sicurezza: advisorId deve essere definito
    if (advisorId === undefined || advisorId === null) {
      console.error("[SECURITY] Tentativo di ricerca clienti senza specificare advisorId");
      return [];
    }

    // Normalizza il termine di ricerca
    const normalizedTerm = searchTerm.trim().toLowerCase();
    
    // Se il termine è vuoto, restituisci array vuoto
    if (!normalizedTerm) {
      return [];
    }
    
    // Dividi il termine di ricerca in parti
    const searchParts = normalizedTerm.split(/\s+/);
    let firstName = searchParts[0] || '';
    let lastName = searchParts.length > 1 ? searchParts[searchParts.length - 1] : '';
    
    // Costruisci la query di base
    let query = db.select().from(clients);
    
    // Aggiungi condizioni di ricerca
    let searchConditions = [];
    
    if (exactMatch) {
      // Ricerca per corrispondenza esatta
      if (firstName && lastName) {
        // Nome e cognome entrambi specificati - prova entrambi gli ordini
        searchConditions.push(
          or(
            and(
              sql`LOWER(${clients.firstName}) = ${firstName}`,
              sql`LOWER(${clients.lastName}) = ${lastName}`
            ),
            and(
              sql`LOWER(${clients.firstName}) = ${lastName}`,
              sql`LOWER(${clients.lastName}) = ${firstName}`
            )
          )
        );
      } else {
        // Solo un termine specificato
        searchConditions.push(
          or(
            sql`LOWER(${clients.firstName}) = ${normalizedTerm}`,
            sql`LOWER(${clients.lastName}) = ${normalizedTerm}`
          )
        );
      }
    } else {
      // Ricerca flessibile con ILIKE (case insensitive)
      if (firstName && lastName) {
        // Nome e cognome entrambi specificati - prova entrambi gli ordini
        searchConditions.push(
          or(
            and(
              ilike(clients.firstName, `%${firstName}%`),
              ilike(clients.lastName, `%${lastName}%`)
            ),
            and(
              ilike(clients.firstName, `%${lastName}%`),
              ilike(clients.lastName, `%${firstName}%`)
            )
          )
        );
      }
      
      // Più flessibile: cerca ogni parola singola in entrambi i campi
      searchParts.forEach(part => {
        if (part.length >= 2) { // Skip parole troppo corte
          searchConditions.push(ilike(clients.firstName, `%${part}%`));
          searchConditions.push(ilike(clients.lastName, `%${part}%`));
        }
      });
      
      // Cerca anche come nome intero in entrambi i campi
      if (normalizedTerm.length >= 3) { // Skip termini troppo corti
        searchConditions.push(ilike(clients.firstName, `%${normalizedTerm}%`));
        searchConditions.push(ilike(clients.lastName, `%${normalizedTerm}%`));
      }
      
      // Cerca anche negli altri campi utili come email
      if ('email' in clients) {
        searchConditions.push(ilike(clients.email, `%${normalizedTerm}%`));
      }
      
      // Se è disponibile un campo "name" completo, cerca anche lì
      if ('name' in clients) {
        searchConditions.push(ilike(clients.name, `%${normalizedTerm}%`));
      }
    }
    
    // Applica le condizioni di ricerca
    query = query.where(or(...searchConditions));
    
    // SICUREZZA: Filtra SEMPRE per advisor specificato
    query = query.where(eq(clients.advisorId, advisorId));
    
    // Filtra solo clienti attivi se richiesto
    if (onlyActive) {
      query = query.where(eq(clients.active, true));
    }
    
    // NON applichiamo il limit qui, ma prendiamo più risultati per valutarli
    // e applicare la logica di scoring personalizzata
    const maxResults = 100; // Prendiamo massimo 100 risultati per evitare problemi di memoria
    query = query.limit(maxResults);
    
    // Esegui la query
    const results = await query;
    
    // Calcola punteggi di corrispondenza
    const scoredResults = results.map(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const clientFirstNameLower = client.firstName.toLowerCase();
      const clientLastNameLower = client.lastName.toLowerCase();
      
      // Calcola un punteggio di corrispondenza più sofisticato
      let score = 0;
      
      // Corrispondenza esatta con nome completo
      if (fullName === normalizedTerm) {
        score += 100;
      } 
      
      // Corrispondenza con nomecognome senza spazi
      if ((clientFirstNameLower + clientLastNameLower) === normalizedTerm.replace(/\s+/g, '')) {
        score += 90;
      }
      
      // Corrispondenza con cognomenome senza spazi
      if ((clientLastNameLower + clientFirstNameLower) === normalizedTerm.replace(/\s+/g, '')) {
        score += 85;
      }
      
      // Corrispondenza con nome e cognome individualmente (nell'ordine corretto)
      if (clientFirstNameLower === firstName && clientLastNameLower === lastName) {
        score += 80;
      }
      
      // Corrispondenza con nome e cognome in ordine inverso
      if (clientFirstNameLower === lastName && clientLastNameLower === firstName) {
        score += 75;
      }
      
      // Corrispondenza parziale con nome e cognome (nell'ordine corretto)
      if (clientFirstNameLower.includes(firstName) && clientLastNameLower.includes(lastName)) {
        score += 60;
      }
      
      // Corrispondenza parziale con nome e cognome in ordine inverso
      if (clientFirstNameLower.includes(lastName) && clientLastNameLower.includes(firstName)) {
        score += 55;
      }
      
      // Corrispondenza con solo nome o cognome
      if (clientFirstNameLower === normalizedTerm || clientLastNameLower === normalizedTerm) {
        score += 50;
      }
      
      // Corrispondenza parziale con nome o cognome
      if (clientFirstNameLower.includes(normalizedTerm) || clientLastNameLower.includes(normalizedTerm)) {
        score += 40;
      }
      
      // Corrispondenza parziale con nome o cognome (per ogni parte)
      searchParts.forEach(part => {
        if (part.length >= 2) {
          if (clientFirstNameLower.includes(part)) {
            score += 10;
          }
          if (clientLastNameLower.includes(part)) {
            score += 10;
          }
        }
      });
      
      return {
        ...client,
        score,
        fullName: `${client.firstName} ${client.lastName}`
      };
    })
    // Ordina per punteggio decrescente
    .sort((a, b) => b.score - a.score);
    
    // Ora applica il limite dopo l'ordinamento per score
    const limitedResults = limit > 0 ? scoredResults.slice(0, limit) : scoredResults;
    
    return limitedResults;
    
  } catch (error) {
    console.error("Errore nella ricerca dei clienti:", error);
    return [];
  }
}

/**
 * Utility per trovare un singolo cliente per nome
 * Mantiene compatibilità con il vecchio findClientByName ma usa la nuova implementazione
 * @param clientName Nome o parte del nome
 * @param advisorId ID dell'advisor (OBBLIGATORIO)
 * @param onlyActive Se cercare solo clienti attivi (default: false, cerca tutti)
 * @returns ID del cliente, se trovato
 */
export async function findClientByName(clientName: string, advisorId: number, onlyActive: boolean = false): Promise<number | null> {
  try {
    // Log dettagliati per debug
    console.log(`[DEBUG SICUREZZA] findClientByName - INPUT - clientName: "${clientName}", advisorId: ${advisorId}, onlyActive: ${onlyActive}`);
    
    // Controllo di sicurezza: advisorId deve essere definito
    if (advisorId === undefined || advisorId === null) {
      console.error("[SECURITY] Tentativo di ricerca cliente per nome senza specificare advisorId:", clientName);
      return null;
    }

    // Imposta un limite maggiore per la ricerca iniziale
    const results = await findClients(clientName, {
      limit: 10, // Aumenta il limite per vedere più risultati potenziali
      advisorId, // OBBLIGATORIO
      onlyActive
    });
    
    // Log dettagliati dei risultati
    console.log(`[DEBUG SICUREZZA] findClientByName - Risultati trovati: ${results.length}`);
    if (results.length > 0) {
      console.log(`[DEBUG SICUREZZA] findClientByName - Primi 3 risultati:`);
      results.slice(0, 3).forEach((client, idx) => {
        console.log(`  ${idx+1}. ${client.firstName} ${client.lastName} (ID: ${client.id}, Score: ${client.score}, advisorId: ${client.advisorId})`);
      });
    } else {
      console.log(`[DEBUG SICUREZZA] findClientByName - Nessun risultato nel database - searchTerm: "${clientName}", advisorId: ${advisorId}`);
      
      // Prova ricerca ultra-permissiva
      const parts = clientName.toLowerCase().trim().split(/\s+/);
      let flexResults = [];
      
      try {
        // Costruisci una query molto permissiva che cerca parole parziali
        const searchConditions = [];
        
        // Per ogni parola del nome, cerca corrispondenze parziali
        for (const part of parts) {
          if (part.length >= 2) {
            // Considera solo parti con almeno 2 caratteri
            // Ad esempio, per "matt col" cerca %ma% e %co% nei campi nome e cognome
            const firstChars = part.substring(0, 2); // Prendi i primi 2 caratteri
            searchConditions.push(ilike(clients.firstName, `%${firstChars}%`));
            searchConditions.push(ilike(clients.lastName, `%${firstChars}%`));
          }
        }
        
        // Se ci sono condizioni valide, esegui la query
        if (searchConditions.length > 0) {
          let query = db.select().from(clients).where(or(...searchConditions));
          
          // SICUREZZA: Filtra SEMPRE per advisor specificato
          query = query.where(eq(clients.advisorId, advisorId));
          
          // Filtra solo clienti attivi se richiesto
          if (onlyActive) {
            query = query.where(eq(clients.active, true));
          }
          
          // Esegui la query
          flexResults = await query.limit(50);
          
          // Log dei risultati
          console.log(`[DEBUG SICUREZZA] findClientByName - Ricerca flessibile ha trovato: ${flexResults.length} risultati`);
          
          // Stampa una rappresentazione della query SQL per debug
          console.log(`[DEBUG SICUREZZA] Query SQL approssimativa: SELECT * FROM clients WHERE (${searchConditions.map(() => 'firstName ILIKE ? OR lastName ILIKE ?').join(' OR ')}) AND advisorId = ${advisorId} ${onlyActive ? 'AND active = true' : ''} LIMIT 50`);
          
          // Calcola un punteggio di corrispondenza rudimentale
          flexResults = flexResults.map(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
            let score = 0;
            
            // Calcola quanto ciascuna parte del nome cerca corrisponde
            for (const part of parts) {
              if (client.firstName.toLowerCase().includes(part)) score += 20;
              if (client.lastName.toLowerCase().includes(part)) score += 20;
              
              // Corrispondenze parziali
              for (let i = 2; i <= part.length; i++) {
                const subPart = part.substring(0, i);
                if (client.firstName.toLowerCase().includes(subPart)) score += 2;
                if (client.lastName.toLowerCase().includes(subPart)) score += 2;
              }
            }
            
            return { ...client, score, fullName };
          })
          .sort((a, b) => b.score - a.score);
          
          // Log dei migliori risultati
          if (flexResults.length > 0) {
            console.log(`[DEBUG SICUREZZA] findClientByName - Migliori risultati ricerca flessibile:`);
            flexResults.slice(0, 3).forEach((client, idx) => {
              console.log(`  ${idx+1}. ${client.firstName} ${client.lastName} (ID: ${client.id}, Score: ${client.score}, advisorId: ${client.advisorId})`);
            });
          }
        }
      } catch (flexError) {
        console.error(`[DEBUG SICUREZZA] findClientByName - Errore durante la ricerca flessibile:`, flexError);
      }
      
      // Se abbiamo trovato risultati con la ricerca flessibile, usali
      if (flexResults.length > 0) {
        console.log(`[DEBUG SICUREZZA] findClientByName - Restituzione risultato ricerca flessibile: ID: ${flexResults[0].id}, Nome: ${flexResults[0].firstName} ${flexResults[0].lastName}`);
        return flexResults[0].id;
      }
    }
    
    // Se abbiamo trovato almeno un cliente con la ricerca normale, restituisci il suo ID
    if (results.length > 0) {
      console.log(`[DEBUG SICUREZZA] findClientByName - Restituzione risultato: ID: ${results[0].id}, Nome: ${results[0].firstName} ${results[0].lastName}`);
      return results[0].id;
    }
    
    console.log(`[DEBUG SICUREZZA] findClientByName - Nessun cliente trovato con nome "${clientName}" per advisorId ${advisorId}`);
    return null;
  } catch (error) {
    console.error("[DEBUG SICUREZZA] Errore nella ricerca del cliente per nome:", error);
    return null;
  }
} 