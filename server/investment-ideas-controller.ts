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

    // 2. Scarica le notizie da Financial Modeling Prep (FMP) - limitato a 25
    const newsResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/stock_news?limit=25&apikey=${process.env.FINANCIAL_API_KEY}`
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

    // 5. Prepara i dati semplificati dei clienti - solo nome, cognome e profilo Sigmund
    const clientDataSimplified = await Promise.all(clients.map(async client => {
      // Ottenere il profilo Sigmund/AI del cliente
      const aiProfile = await storage.getAiProfile(client.id);
      
      // Restituisci solo i dati essenziali del cliente
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        // Il profilo Sigmund (precedentemente elaborato dall'AI)
        profile: aiProfile ? aiProfile.profileData : null
      };
    }));

    // 6. Costruisci il prompt per OpenAI con i dati semplificati
    const prompt = generatePrompt(newsData, clientDataSimplified);
    
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
Ti fornisco un insieme di notizie finanziarie e profili essenziali di alcuni clienti.

Il tuo compito è:
1. Selezionare le 5 idee d'investimento più rilevanti basandoti sulle notizie.
2. Per ogni idea, genera:
   - Un titolo esplicativo (massimo 6-8 parole) basato sul titolo originale della notizia.
   - Una spiegazione dettagliata e strutturata dell'opportunità d'investimento (5-7 frasi) che includa:
      * Contesto macroeconomico e geopolitico dell'idea
      * Analisi delle tendenze del settore rilevanti
      * Fattori di rischio e potenziali rendimenti
      * Prospettiva a medio e lungo termine
   - Il link (URL) della notizia di riferimento che ha ispirato l'idea.
   - Una lista di clienti potenzialmente affini. Per ciascuno, includi:
       - "clientId": l'ID del cliente,
       - "reason": una spiegazione dettagliata (4-5 frasi) che analizzi specificatamente:
           * Come l'idea si adatta al cliente considerando il suo profilo
           * Come questa idea implementa le raccomandazioni presenti nel suo profilo
           * Quali benefici specifici potrebbe ottenere il cliente da questa idea

IMPORTANTE:
- Usa il titolo originale della notizia
- DEVI basare l'idea sulla notizia e non sui dati dei clienti. I dati dei clienti sono solo per fare il matching con le idee d'investimento. Non generare idee d'investimento che non sono presenti nelle notizie.
- Per ogni cliente, il campo 'profile' contiene le raccomandazioni generate precedentemente sulla base di un'analisi approfondita dei dati del cliente
- Utilizza queste raccomandazioni come principale criterio per determinare in match con l'idea di investimento

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

    // 2. Scarica le notizie da Financial Modeling Prep (FMP) - limitato a 25
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

    // 4. Prepara i dati delle notizie (campi rilevanti)
    const newsData = newsArticles.map((article: any, index: number) => ({
      index,
      title: article.title,
      description: article.text || article.description || "",
      url: article.url
    }));

    // 5. Prepara i dati semplificati dei clienti - solo nome, cognome e profilo Sigmund
    const clientDataSimplified = await Promise.all(clients.map(async client => {
      // Ottenere il profilo Sigmund/AI del cliente
      const aiProfile = await storage.getAiProfile(client.id);
      
      // Restituisci solo i dati essenziali del cliente
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        // Il profilo Sigmund (precedentemente elaborato dall'AI)
        profile: aiProfile ? aiProfile.profileData : null
      };
    }));

    // 6. Costruisci il prompt per OpenAI con i dati semplificati
    const prompt = generatePrompt(newsData, clientDataSimplified);

    // 7. Invia il prompt a OpenAI (utilizzando GPT-3.5-turbo senza limite di token)
    let openaiResponse;
    try {
      openaiResponse = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { 
            role: "system", 
            content: "Sei un esperto analista finanziario e consulente per investimenti di alto livello. Il tuo compito è fornire idee d'investimento personalizzate basate su notizie finanziarie recenti e profili dei clienti. I profili forniti contengono già raccomandazioni elaborate precedentemente basate sulle interazioni con i clienti. Usa queste raccomandazioni per abbinare le idee d'investimento ai clienti più adatti." 
          },
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
    
    return res.status(500).json({
      success: false,
      message: "Error generating investment ideas",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}