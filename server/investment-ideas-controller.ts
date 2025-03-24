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

    // 5. Prepara i dati dei clienti per il matching intelligente
    const clientData = clients.map(client => ({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      riskProfile: client.riskProfile,
      investmentGoals: client.investmentGoals,
      personalInterests: client.personalInterests
    }));

    // 6. Costruisci il prompt per OpenAI
    // Il prompt chiede di generare 5 idee d'investimento,
    // ciascuna con titolo, spiegazione, URL della notizia e una lista di clienti affini (ID + motivazione)
    const prompt = `
Sei un esperto analista finanziario e consulente per investimenti.
Ti fornisco un insieme di notizie finanziarie e i profili di alcuni clienti.
Il tuo compito è:
1. Selezionare le 5 idee d'investimento più rilevanti basandoti sulle notizie.
2. Per ogni idea, genera:
   - Un titolo esplicativo (massimo 6-8 parole).
   - Un paragrafo che spiega in 2-3 frasi perché investire in questa opportunità.
   - Il link (URL) della notizia di riferimento che ha ispirato l'idea.
   - Una lista di clienti potenzialmente affini. Analizza i profili dei clienti forniti e, per ciascuno, includi:
       - "clientId": l'ID del cliente,
       - "reason": una breve spiegazione (1-2 frasi) sul perché il cliente è adatto (basato su riskProfile, obiettivi e interessi).

Rispondi con un JSON valido e strutturato esattamente nel seguente formato:
{
  "investmentIdeas": [
    {
      "title": "Titolo dell'idea",
      "explanation": "Paragrafo esplicativo sull'opportunità d'investimento",
      "newsUrl": "Link della notizia usata",
      "matchedClients": [
        {
          "clientId": numero,
          "reason": "Breve spiegazione del match"
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

    // 7. Invia il prompt a OpenAI (utilizzando GPT-3.5-turbo)
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un esperto analista finanziario." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

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