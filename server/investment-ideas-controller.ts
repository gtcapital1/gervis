import { Request, Response } from "express";
import axios from "axios";
import OpenAI from "openai";
import { storage } from "./storage"; // modulo per interagire con il database
import { Client } from "@shared/schema";

// Inizializza OpenAI con la chiave API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateInvestmentIdeas(req: Request, res: Response) {
  try {
    // 1. Verifica che l'utente sia autenticato
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2. Scarica le notizie da Financial Modeling Prep (FMP) - limitato a 25 per ridurre il numero di token
    const newsResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock_news?limit=25&apikey=${process.env.FINANCIAL_API_KEY}`
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

    // 4. Prepara i dati delle notizie (campi rilevanti), limita la lunghezza della descrizione a 150 caratteri
    const newsData = newsArticles.map((article: any, index: number) => {
      const description = article.text || article.description || "";
      return {
        index,
        title: article.title,
        description: description.length > 150 ? description.substring(0, 150) + "..." : description,
        url: article.url
      };
    });

    // 5. Prepara i dati dei clienti per il matching intelligente
    // Limitiamo a max 10 clienti per ridurre il numero di token
    const maxClients = 10;
    const limitedClients = clients.length > maxClients ? clients.slice(0, maxClients) : clients;
    
    const clientData = limitedClients.map(client => ({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      riskProfile: client.riskProfile,
      investmentGoals: client.investmentGoals ? 
                        (Array.isArray(client.investmentGoals) ? 
                         client.investmentGoals.slice(0, 3) : client.investmentGoals) : 
                        null,
      personalInterests: client.personalInterests ? 
                         (Array.isArray(client.personalInterests) ? 
                          client.personalInterests.slice(0, 3) : client.personalInterests) : 
                         null
    }));

    // 6. Costruisci il prompt per OpenAI - ottimizzato per ridurre token
    // Il prompt chiede di generare 3 idee d'investimento (ridotto da 5)
    const prompt = `
Sei un esperto analista finanziario. Seleziona 3 idee d'investimento dalle notizie fornite.
Per ogni idea genera:
- Titolo (max 6 parole)
- Spiegazione (1-2 frasi)
- URL della notizia
- Per ciascun cliente indicato, determina se è adatto e fornisci una breve motivazione (1 frase).

Formato JSON di risposta:
{
  "investmentIdeas": [
    {
      "title": "Titolo breve",
      "explanation": "Spiegazione concisa",
      "newsUrl": "URL",
      "matchedClients": [
        {
          "clientId": ID_NUMERICO,
          "reason": "Motivazione breve"
        }
      ]
    }
  ]
}

News:
${JSON.stringify(newsData, null, 0)}

Clienti:
${JSON.stringify(clientData, null, 0)}
    `;

    // 7. Invia il prompt a OpenAI (utilizzando GPT-4)
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Sei un esperto analista finanziario." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    // 8. Estrai e parsifica il JSON restituito da OpenAI
    const responseContent = openaiResponse.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

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

    // 9. Restituisci il risultato
    return res.json({
      success: true,
      message: "Investment ideas generated successfully",
      investmentIdeas
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