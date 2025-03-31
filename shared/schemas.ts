import { z } from "zod";

// Schema per gli asset
export const ASSET_CATEGORIES = [
  "real_estate",
  "equity",
  "bonds",
  "cash",
  "private_equity",
  "venture_capital",
  "cryptocurrencies",
  "other"
] as const;

export const assetSchema = z.object({
  value: z.coerce.number().min(0, "Il valore non può essere negativo"),
  category: z.string().refine(val => ASSET_CATEGORIES.includes(val as any), {
    message: "Seleziona una categoria valida"
  }),
  description: z.string().optional(),
});

// Schema MIFID
export const MIFID_SCHEMA = z.object({
  // Sezione 1: Dati Anagrafici e Informazioni Personali
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio"),
  birthDate: z.string().min(1, "La data di nascita è obbligatoria"),
  maritalStatus: z.string().min(1, "Lo stato civile è obbligatorio"),
  employmentStatus: z.string().min(1, "La situazione occupazionale è obbligatoria"),
  educationLevel: z.string().min(1, "Il livello di istruzione è obbligatorio"),
  annualIncome: z.coerce.number().min(0, "Il reddito annuale non può essere negativo"),
  monthlyExpenses: z.coerce.number().min(0, "Le spese mensili non possono essere negative"),
  debts: z.coerce.number().min(0, "I debiti non possono essere negativi"),
  dependents: z.coerce.number().min(0, "Il numero di persone a carico non può essere negativo"),

  // Sezione 2: Situazione Finanziaria Attuale
  assets: z.array(assetSchema).min(1, "Inserisci almeno un asset").refine(
    (assets) => assets.some(asset => asset.value > 0),
    "Inserisci almeno un asset con valore maggiore di 0"
  ),

  // Sezione 3: Obiettivi d'Investimento
  investmentHorizon: z.string().min(1, "L'orizzonte temporale è obbligatorio"),
  retirementInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  wealthGrowthInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  incomeGenerationInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  capitalPreservationInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),
  estatePlanningInterest: z.coerce.number().min(1).max(5, "Il valore deve essere tra 1 e 5"),

  // Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari
  investmentExperience: z.string().min(1, "L'esperienza di investimento è obbligatoria"),
  pastInvestmentExperience: z.array(z.string()).min(1, "Seleziona almeno un'esperienza passata"),
  financialEducation: z.array(z.string()).min(1, "Seleziona almeno un'opzione di educazione finanziaria"),

  // Sezione 5: Tolleranza al Rischio
  riskProfile: z.string().min(1, "Il profilo di rischio è obbligatorio"),
  portfolioDropReaction: z.string().min(1, "La reazione al calo del portafoglio è obbligatoria"),
  volatilityTolerance: z.string().min(1, "La tolleranza alla volatilità è obbligatoria"),

  // Sezione 6: Esperienza e Comportamento d'Investimento
  yearsOfExperience: z.string().min(1, "Gli anni di esperienza sono obbligatori"),
  investmentFrequency: z.string().min(1, "La frequenza di investimento è obbligatoria"),
  advisorUsage: z.string().min(1, "L'utilizzo del consulente è obbligatorio"),
  monitoringTime: z.string().min(1, "Il tempo di monitoraggio è obbligatorio"),

  // Sezione 7: Domande Specifiche (opzionale)
  specificQuestions: z.string().optional(),
});

export type MifidData = z.infer<typeof MIFID_SCHEMA>; 