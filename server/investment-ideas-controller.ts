import { Request, Response } from "express";
import axios from "axios";
import OpenAI from "openai";
import { storage } from "./storage";
import { Client } from "../shared/schema";

// Inizializza OpenAI con la chiave API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Endpoint di debug per visualizzare il prompt
export async function getPromptForDebug(req: Request, res: Response) {
  try {
    // 1. Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2. Scarica le notizie da Financial Modeling Prep (FMP)
    const newsResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock_news?limit=50&apikey=${process.env.FINANCIAL_API_KEY}`
    );
    const newsArticles = newsResponse.data;
    if (!Array.isArray(newsArticles) || newsArticles.length === 0) {
      return res.status(404).json({ success: false, message: "No news articles found" });
    }

    // 3. Recupera i dati dei clienti dell'advisor
    const clients = await storage.getClientsByAdvisor(req.user.id);
    if (!clients.length) {
      return res.status(404).json({ success: false, message: "No clients found for advisor" });
    }

    // 4. Prepara i dati delle notizie (campi rilevanti)
    const newsData = newsArticles.map((article: any, index: number) => ({
      index,
      title: article.title,
      description: article.text || article.description || "",
      url: article.url
    }));

    // 5. Prepara i dati dei clienti completi con profilo Sigmund, asset e profilo investimento
    const clientDataEnriched = await Promise.all(clients.map(async client => {
      // Ottenere gli asset del cliente
      const assets = await storage.getAssetsByClient(client.id);
      
      // Ottenere il profilo Sigmund/AI del cliente
      const aiProfile = await storage.getAiProfile(client.id);
      
      // Calcolare l'allocazione degli asset per categoria
      const assetAllocation: Record<string, number> = {};
      let totalAssetValue = 0;
      
      if (assets && assets.length > 0) {
        // Calcola il valore totale 
        totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        
        // Raggruppa gli asset per categoria
        assets.forEach(asset => {
          const category = asset.category;
          if (!assetAllocation[category]) {
            assetAllocation[category] = 0;
          }
          assetAllocation[category] += asset.value;
        });
        
        // Converti in percentuali
        Object.keys(assetAllocation).forEach(key => {
          assetAllocation[key] = totalAssetValue > 0 
            ? Math.round((assetAllocation[key] / totalAssetValue) * 100) 
            : 0;
        });
      }
      
      // Prepara dati delle priorità di investimento (valori numerici da 1-5)
      const investmentPriorities = {
        retirement: typeof client.retirementInterest === 'number' ? client.retirementInterest : 0,
        wealthGrowth: typeof client.wealthGrowthInterest === 'number' ? client.wealthGrowthInterest : 0,
        incomeGeneration: typeof client.incomeGenerationInterest === 'number' ? client.incomeGenerationInterest : 0,
        capitalPreservation: typeof client.capitalPreservationInterest === 'number' ? client.capitalPreservationInterest : 0,
        estatePlanning: typeof client.estatePlanningInterest === 'number' ? client.estatePlanningInterest : 0
      };

      // Restituisci il cliente con dati arricchiti
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        // Dati demografici (se disponibili)
        ...(typeof client.age === 'number' ? { age: client.age } : {}),
        ...(client.occupation ? { occupation: client.occupation } : {}),
        // Profilo rischio e investimento
        riskProfile: client.riskProfile,
        investmentGoals: client.investmentGoals,
        investmentHorizon: client.investmentHorizon,
        // Interessi personali
        personalInterests: client.personalInterests,
        // Priorità di investimento (valori numerici da 1-5)
        investmentPriorities,
        // Asset allocation
        assetAllocation,
        totalAssetValue,
        // Profilo Sigmund
        sigmundProfile: aiProfile ? aiProfile.profileData : null
      };
    }));

    // 6. Costruisci il prompt per OpenAI con i dati arricchiti
    const prompt = generatePrompt(newsData, clientDataEnriched);
    
    // 7. Stima dei token
    const estimatedTokens = Math.ceil(prompt.length / 4);
    
    // 8. Restituisci il prompt e la stima dei token
    return res.json({
      success: true,
      prompt,
      estimatedTokens,
      promptLength: prompt.length
    });
  } catch (error) {
    console.error("Error generating prompt for debug:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating prompt",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Funzione per generare il prompt con struttura riutilizzabile
function generatePrompt(newsData: any[], clientData: any[]) {
  return `
Sei un esperto analista finanziario e consulente per investimenti di alto livello.
Ti fornisco un insieme di notizie finanziarie e i profili di alcuni clienti.
Il tuo compito è:
1. Selezionare le 5 idee d'investimento più rilevanti basandoti sulle notizie.
2. Per ogni idea, genera:
   - Un titolo esplicativo (massimo 6-8 parole).
   - Una spiegazione dettagliata e strutturata dell'opportunità di investimento (5-7 frasi) che includa:
      * Contesto macroeconomico e geopolitico dell'idea (es. "Tightening supply due to Iran sanctions and OPEC+ output curbs supports a bullish crude outlook")
      * Analisi delle tendenze del settore rilevanti
      * Fattori di rischio e potenziali rendimenti
      * Prospettiva a medio e lungo termine
   - Il link (URL) della notizia di riferimento che ha ispirato l'idea.
   - Una lista di clienti potenzialmente affini. Analizza i profili dei clienti forniti e, per ciascuno, includi:
       - "clientId": l'ID del cliente,
       - "reason": una spiegazione dettagliata (4-5 frasi) che analizzi specificamente:
           * Come l'idea si adatta al loro profilo di rischio specifico
           * Come complementa i loro obiettivi di investimento dichiarati
           * Perché si allinea con i loro interessi personali
           * Come potrebbe integrare la loro attuale strategia di investimento

Rispondi con un JSON valido e strutturato esattamente nel seguente formato:
{
  "investmentIdeas": [
    {
      "title": "Titolo dell'idea",
      "explanation": "Analisi approfondita dell'opportunità d'investimento",
      "newsUrl": "Link della notizia usata",
      "matchedClients": [
        {
          "clientId": numero,
          "reason": "Spiegazione dettagliata del perché l'idea è adatta a questo cliente specifico"
        }
      ]
    }
  ]
}

News articles:
${JSON.stringify(newsData, null, 2)}

Client profiles:
${JSON.stringify(clientData, null, 2)}
  `;
}

export async function generateInvestmentIdeas(req: Request, res: Response) {
  try {
    // 1. Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2. Scarica le notizie da Financial Modeling Prep (FMP)
    const newsResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock_news?limit=50&apikey=${process.env.FINANCIAL_API_KEY}`
    );
    const newsArticles = newsResponse.data;
    if (!Array.isArray(newsArticles) || newsArticles.length === 0) {
      return res.status(404).json({ success: false, message: "No news articles found" });
    }

    // 3. Recupera i dati dei clienti dell'advisor
    const clients: Client[] = await storage.getClientsByAdvisor(req.user.id);
    if (!clients.length) {
      return res.status(404).json({ success: false, message: "No clients found for advisor" });
    }

    // 4. Prepara i dati delle notizie (campi rilevanti)
    const newsData = newsArticles.map((article: any, index: number) => ({
      index,
      title: article.title,
      description: article.text || article.description || "",
      url: article.url
    }));

    // 5. Prepara i dati dei clienti completi con profilo Sigmund, asset e profilo investimento
    const clientDataEnriched = await Promise.all(clients.map(async client => {
      // Ottenere gli asset del cliente
      const assets = await storage.getAssetsByClient(client.id);
      
      // Ottenere il profilo Sigmund/AI del cliente
      const aiProfile = await storage.getAiProfile(client.id);
      
      // Calcolare l'allocazione degli asset per categoria
      const assetAllocation: Record<string, number> = {};
      let totalAssetValue = 0;
      
      if (assets && assets.length > 0) {
        // Calcola il valore totale 
        totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        
        // Raggruppa gli asset per categoria
        assets.forEach(asset => {
          const category = asset.category;
          if (!assetAllocation[category]) {
            assetAllocation[category] = 0;
          }
          assetAllocation[category] += asset.value;
        });
        
        // Converti in percentuali
        Object.keys(assetAllocation).forEach(key => {
          assetAllocation[key] = totalAssetValue > 0 
            ? Math.round((assetAllocation[key] / totalAssetValue) * 100) 
            : 0;
        });
      }
      
      // Prepara dati delle priorità di investimento (valori numerici da 1-5)
      const investmentPriorities = {
        retirement: typeof client.retirementInterest === 'number' ? client.retirementInterest : 0,
        wealthGrowth: typeof client.wealthGrowthInterest === 'number' ? client.wealthGrowthInterest : 0,
        incomeGeneration: typeof client.incomeGenerationInterest === 'number' ? client.incomeGenerationInterest : 0,
        capitalPreservation: typeof client.capitalPreservationInterest === 'number' ? client.capitalPreservationInterest : 0,
        estatePlanning: typeof client.estatePlanningInterest === 'number' ? client.estatePlanningInterest : 0
      };

      // Restituisci il cliente con dati arricchiti
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        // Dati demografici (se disponibili)
        ...(typeof client.age === 'number' ? { age: client.age } : {}),
        ...(client.occupation ? { occupation: client.occupation } : {}),
        // Profilo rischio e investimento
        riskProfile: client.riskProfile,
        investmentGoals: client.investmentGoals,
        investmentHorizon: client.investmentHorizon,
        // Interessi personali
        personalInterests: client.personalInterests,
        // Priorità di investimento (valori numerici da 1-5)
        investmentPriorities,
        // Asset allocation
        assetAllocation,
        totalAssetValue,
        // Profilo Sigmund
        sigmundProfile: aiProfile ? aiProfile.profileData : null
      };
    }));

    // 6. Costruisci il prompt per OpenAI con i dati arricchiti
    const prompt = generatePrompt(newsData, clientDataEnriched);

    // 7. Invia il prompt a OpenAI (utilizzando GPT-3.5-turbo senza limite di token)
    let openaiResponse;
    try {
      openaiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Sei un esperto analista finanziario." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
        // Rimosso il limite di max_tokens per consentire la risposta completa
      });
    } catch (openaiError: any) {
      // Cattura specificamente gli errori di token
      if (openaiError.name === 'RateLimitError' || 
          (openaiError.error && openaiError.error.code === 'context_length_exceeded') ||
          (openaiError.message && openaiError.message.includes('maximum context length'))) {
        
        // Stima approssimativa dei token nel prompt
        const promptTokens = Math.ceil(prompt.length / 4); // Stima approssimativa: ~4 caratteri = 1 token
        
        throw new Error(
          `Errore di limite token OpenAI: il prompt contiene circa ${promptTokens} token, ` +
          `che supera il limite consentito dal modello. ${openaiError.message}`
        );
      }
      // Rilancia altri tipi di errori
      throw openaiError;
    }

    // 8. Estrai e parsifica il JSON restituito da OpenAI
    const responseContent = openaiResponse.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Calcola i token utilizzati
    const tokensUsed = {
      total: openaiResponse.usage?.total_tokens || 0,
      prompt: openaiResponse.usage?.prompt_tokens || 0,
      completion: openaiResponse.usage?.completion_tokens || 0
    };

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseContent);
    } catch (err) {
      const jsonMatch = responseContent.match(/{[\s\S]*}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON from OpenAI response");
      }
    }

    const investmentIdeas = parsedResult.investmentIdeas;
    if (!Array.isArray(investmentIdeas) || investmentIdeas.length === 0) {
      throw new Error("No investment ideas generated");
    }

    // 9. Restituisci il risultato con i token usati
    return res.json({
      success: true,
      message: "Investment ideas generated successfully",
      investmentIdeas,
      tokensUsed
    });

  } catch (error) {
    console.error("Error generating investment ideas:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating investment ideas",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}