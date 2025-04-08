/**
 * Interfaccia per i suggerimenti generati dall'AI per il consulente
 */

// Tipo per un singolo suggerimento 
export interface AdvisorRecommendation {
  title: string;
  description: string;
  businessReason: string;
  clientId: number;
  clientName: string;
  suggestedAction: string;
  priority: 'Alta' | 'Media' | 'Bassa';
  personalizedEmail: {
    subject: string;
    body: string;
  };
}

// Tipo per tutti i suggerimenti 
export interface AdvisorSuggestions {
  opportunities: AdvisorRecommendation[];
}

// Tipo per la risposta dall'API
export interface AdvisorSuggestionsResponse {
  suggestions: AdvisorSuggestions;
  lastGeneratedAt: string;
  message?: string;
} 