import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Send, FileSignature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

// Interfaccia per le props del componente
interface HtmlPdfGeneratorProps {
  client: any;
  assets: any[];
  advisorSignature?: string;
  companyLogo?: string;
  companyInfo?: string;
  onGenerated?: (url?: string) => void;
}

export function HtmlPdfGenerator({
  client,
  assets,
  advisorSignature,
  companyLogo,
  companyInfo,
  onGenerated
}: HtmlPdfGeneratorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Stati per gestire il flusso
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailBody, setEmailBody] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Questionario MiFID");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Ref per tracciare se il PDF è già stato salvato
  const pdfSavedRef = useRef(false);
  
  // Inizializza l'email predefinita e genera l'anteprima HTML
  useEffect(() => {
    if (client) {
      setEmailBody(`Gentile ${client.firstName || client.name},\n\nÈ un vero piacere darle il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirle un servizio di consulenza altamente personalizzato, progettato per aiutarla a gestire i suoi asset in modo strategico ed efficiente, con un approccio attento ai costi e in piena conformità con le normative vigenti.\n\nAttraverso analisi approfondite e strumenti avanzati, lavoreremo insieme per:\n\n1. Ottimizzare la composizione del suo portafoglio in base ai suoi obiettivi e al suo profilo di rischio.\n2. Identificare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo.\n3. Garantire una consulenza trasparente in linea con le migliori pratiche del settore.\n4. Fornire aggiornamenti e adeguamenti regolari in base ai cambiamenti del mercato e all'evoluzione delle sue esigenze.\n\nCome discusso, per completare il processo di onboarding, la invito a verificare e restituire i documenti allegati firmati. Questo passaggio è necessario per formalizzare la nostra collaborazione e procedere con le attività pianificate.\n\nRimango a disposizione per qualsiasi chiarimento o necessità. Grazie per la sua fiducia, sono fiducioso che questo sarà l'inizio di un percorso prezioso.\n\nCordiali saluti,`);
      generateHtmlPreview();
      
      // Reset del flag quando cambia il cliente
      pdfSavedRef.current = false;
    }
  }, [client]);

  // Formatta numeri come valuta
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    
    try {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    } catch (e) {
      return value.toString();
    }
  };

  // Formatta le date in formato italiano
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('it-IT');
    } catch (e) {
      return String(date);
    }
  };

  // Funzione di utility per accedere in sicurezza alle proprietà del client
  const getClientProperty = (prop: string, fallback: any = 'N/A') => {
    // Prima controlla se la proprietà esiste direttamente sul client
    if (client[prop as keyof typeof client] !== undefined && client[prop as keyof typeof client] !== null) {
      return client[prop as keyof typeof client];
    }
    
    // Poi controlla se esiste un oggetto mifid e la proprietà è lì
    if (client.mifid && typeof client.mifid === 'object' && client.mifid[prop as keyof typeof client.mifid] !== undefined) {
      return client.mifid[prop as keyof typeof client.mifid];
    }
    
    // Infine, restituisci il fallback
    return fallback;
  };

  // Helpers per traduzioni
  const translateMaritalStatus = (status: string | null | undefined): string => {
    if (status === null || status === undefined || status === '') return 'N/A';
    
    const translations: Record<string, string> = {
      single: 'Celibe/Nubile',
      married: 'Sposato/a',
      divorced: 'Divorziato/a',
      widowed: 'Vedovo/a',
      separated: 'Separato/a'
    };
    
    return translations[status] || status;
  };
  
  const translateEmploymentStatus = (status: string | null | undefined): string => {
    if (status === null || status === undefined || status === '') return 'N/A';
    
    const translations: Record<string, string> = {
      employed: 'Impiegato/a',
      unemployed: 'Disoccupato/a',
      self_employed: 'Lavoratore autonomo',
      retired: 'Pensionato/a',
      student: 'Studente/ssa',
      business_owner: 'Imprenditore'
    };
    
    return translations[status] || status;
  };
  
  const translateEducationLevel = (level: string | null | undefined): string => {
    if (level === null || level === undefined || level === '') return 'N/A';
    
    const translations: Record<string, string> = {
      high_school: 'Diploma di scuola superiore',
      bachelor: 'Laurea triennale',
      master: 'Laurea magistrale',
      phd: 'Dottorato',
      other: 'Altro'
    };
    
    return translations[level] || level;
  };
  
  const translateRiskProfile = (profile: string | null | undefined): string => {
    if (profile === null || profile === undefined || profile === '') return 'N/A';
    
    const translations: Record<string, string> = {
      conservative: 'Conservativo',
      moderate: 'Moderato',
      balanced: 'Bilanciato',
      growth: 'Crescita',
      aggressive: 'Aggressivo'
    };
    
    return translations[profile] || profile;
  };
  
  const translateInvestmentHorizon = (horizon: string | null | undefined): string => {
    if (horizon === null || horizon === undefined || horizon === '') return 'N/A';
    
    const translations: Record<string, string> = {
      short_term: 'Breve termine (< 2 anni)',
      medium_term: 'Medio termine (2-5 anni)',
      long_term: 'Lungo termine (> 5 anni)'
    };
    
    return translations[horizon] || horizon;
  };
  
  function translateInvestmentExperience(experience: string | null | undefined): string {
    if (experience === null || experience === undefined || experience === '') return 'N/A';
    
    const translations: Record<string, string> = {
      none: 'Nessuna',
      limited: 'Limitata',
      good: 'Buona',
      extensive: 'Estesa',
      expert: 'Esperto'
    };
    
    return translations[experience] || experience;
  }
  
  const translateAssetCategories = (categories: string[] | null | undefined): string => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return 'N/A';
    }
    
    const translations: Record<string, string> = {
      real_estate: 'Immobili',
      equity: 'Azioni',
      bonds: 'Obbligazioni',
      cash: 'Liquidità',
      crypto: 'Criptovalute',
      commodities: 'Materie prime',
      alternative: 'Investimenti alternativi',
      stocks: 'Azioni',
      etf: 'ETF',
      mutual_funds: 'Fondi comuni',
      derivatives: 'Derivati',
      options: 'Opzioni',
      futures: 'Futures',
      forex: 'Forex',
      other: 'Altro'
    };
    
    return categories.map(cat => translations[cat] || cat).join(', ');
  };

  // Funzione per tradurre le esperienze pregresse
  const translatePastInvestmentExperience = (experience: string): string => {
    const translations: Record<string, string> = {
      stocks: "Azioni",
      bonds: "Obbligazioni",
      real_estate: "Immobili",
      etf: "ETF",
      mutual_funds: "Fondi comuni",
      forex: "Forex",
      commodities: "Materie prime",
      crypto: "Criptovalute",
      derivatives: "Derivati"
    };
    
    return translations[experience] || experience;
  };
  
  // Funzione per tradurre la formazione ricevuta
  const translateFinancialEducation = (education: string): string => {
    const translations: Record<string, string> = {
      self_taught: "Autodidatta",
      courses: "Corsi specializzati",
      university: "Formazione universitaria",
      professional: "Formazione professionale",
      seminars: "Seminari",
      none: "Nessuna formazione specifica"
    };
    
    return translations[education] || education;
  };
  
  // Funzione per tradurre la reazione alla flessione del portafoglio
  const translatePortfolioDropReaction = (reaction: string | null | undefined): string => {
    if (reaction === null || reaction === undefined || reaction === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      sell_all: "Venderei tutti gli investimenti",
      sell_some: "Venderei parte degli investimenti",
      hold: "Manterrei gli investimenti attuali",
      buy_more: "Acquisterei di più approfittando dei prezzi bassi",
      panic: "Entrerei in panico e chiederei consiglio"
    };
    
    return translations[reaction] || reaction;
  };
  
  // Funzione per tradurre la disponibilità a tollerare la volatilità
  const translateVolatilityTolerance = (tolerance: string | null | undefined): string => {
    if (tolerance === null || tolerance === undefined || tolerance === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      very_low: "Molto bassa",
      low: "Bassa",
      medium: "Media",
      high: "Alta",
      very_high: "Molto alta"
    };
    
    return translations[tolerance] || tolerance;
  };
  
  // Funzione per tradurre gli anni di esperienza
  const translateYearsOfExperience = (years: string | null | undefined): string => {
    if (years === null || years === undefined || years === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      none: "Nessuna esperienza",
      less_than_1: "Meno di 1 anno",
      one_to_3: "Da 1 a 3 anni",
      three_to_5: "Da 3 a 5 anni",
      five_to_10: "Da 5 a 10 anni",
      more_than_10: "Più di 10 anni"
    };
    
    return translations[years] || years;
  };
  
  // Funzione per tradurre la frequenza degli investimenti
  const translateInvestmentFrequency = (frequency: string | null | undefined): string => {
    if (frequency === null || frequency === undefined || frequency === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      daily: "Quotidiana",
      weekly: "Settimanale",
      monthly: "Mensile",
      quarterly: "Trimestrale",
      yearly: "Annuale",
      rarely: "Raramente"
    };
    
    return translations[frequency] || frequency;
  };
  
  // Funzione per tradurre l'utilizzo di consulenza finanziaria
  const translateAdvisorUsage = (usage: string | null | undefined): string => {
    if (usage === null || usage === undefined || usage === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      full_autonomy: "Gestisco tutto in autonomia",
      occasional: "Consulto sporadicamente un consulente",
      regular: "Mi avvalgo regolarmente di un consulente",
      high_dependency: "Mi affido completamente a un consulente"
    };
    
    return translations[usage] || usage;
  };
  
  // Funzione per tradurre il tempo dedicato al monitoraggio
  const translateMonitoringTime = (time: string | null | undefined): string => {
    if (time === null || time === undefined || time === '') return 'Non specificato';
    
    const translations: Record<string, string> = {
      daily: "Ogni giorno",
      weekly: "Settimanalmente",
      monthly: "Mensilmente",
      quarterly: "Trimestralmente",
      yearly: "Annualmente",
      never: "Mai"
    };
    
    return translations[time] || time;
  };

  // Funzione per tradurre il livello di interesse (da 1 a 5)
  const translateInterestLevel = (level: number | null | undefined): string => {
    if (level === null || level === undefined) return 'N/A';
    
    const translations: Record<number, string> = {
      1: "Molto alto",
      2: "Alto",
      3: "Medio",
      4: "Basso",
      5: "Molto basso"
    };
    
    return translations[level] || level.toString();
  };
  
  // Funzione per tradurre i tipi di reddito
  const translateIncomeType = (type: string | null | undefined): string => {
    if (type === null || type === undefined || type === '') return 'N/A';
    
    const translations: Record<string, string> = {
      salary: "Stipendio",
      business: "Profitto da attività",
      investments: "Rendite da investimenti",
      pension: "Pensione",
      other: "Altro"
    };
    
    return translations[type] || type;
  };
  
  // Funzione per tradurre i tipi di spesa
  const translateExpenseType = (type: string | null | undefined): string => {
    if (type === null || type === undefined || type === '') return 'N/A';
    
    const translations: Record<string, string> = {
      housing: "Abitazione",
      utilities: "Utenze",
      food: "Alimentari",
      transportation: "Trasporti",
      healthcare: "Salute",
      entertainment: "Svago",
      education: "Istruzione",
      debt_payments: "Pagamento debiti",
      other: "Altro"
    };
    
    return translations[type] || type;
  };
  
  // Funzione per tradurre i tipi di debito
  const translateDebtType = (type: string | null | undefined): string => {
    if (type === null || type === undefined || type === '') return 'N/A';
    
    const translations: Record<string, string> = {
      mortgage: "Mutuo",
      car_loan: "Prestito auto",
      personal_loan: "Prestito personale",
      credit_card: "Carta di credito",
      student_loan: "Prestito studentesco",
      business_loan: "Prestito aziendale",
      other: "Altro"
    };
    
    return translations[type] || type;
  };
  
  // Funzione per tradurre la valuta
  const translateCurrency = (currency: string | null | undefined): string => {
    if (currency === null || currency === undefined || currency === '') return 'EUR';
    
    const translations: Record<string, string> = {
      EUR: "Euro",
      USD: "Dollaro USA",
      GBP: "Sterlina britannica",
      CHF: "Franco svizzero",
      JPY: "Yen giapponese"
    };
    
    return translations[currency] || currency;
  };
  
  // Funzione per tradurre i tipi di investimento
  const translateInvestmentType = (type: string | null | undefined): string => {
    if (type === null || type === undefined || type === '') return 'N/A';
    
    const translations: Record<string, string> = {
      stocks: "Azioni",
      bonds: "Obbligazioni",
      etf: "ETF",
      mutual_funds: "Fondi comuni",
      real_estate: "Immobili",
      commodities: "Materie prime",
      crypto: "Criptovalute",
      forex: "Forex",
      derivatives: "Derivati",
      other: "Altro"
    };
    
    return translations[type] || type;
  };
  
  // Funzione per tradurre i valori di obiettivi di investimento
  const translateInvestmentObjective = (objective: string | null | undefined): string => {
    if (objective === null || objective === undefined || objective === '') return 'N/A';
    
    const translations: Record<string, string> = {
      retirement: "Pensione",
      wealth_growth: "Crescita del capitale",
      income_generation: "Generazione di reddito",
      capital_preservation: "Protezione del capitale",
      estate_planning: "Pianificazione ereditaria",
      education: "Istruzione",
      home_purchase: "Acquisto casa",
      major_purchase: "Acquisti importanti",
      emergency_fund: "Fondo emergenza",
      other: "Altro"
    };
    
    return translations[objective] || objective;
  };

  // Funzione per generare un'anteprima HTML
  const generateHtmlPreview = (): void => {
    setIsGenerating(true);
    
    try {
      // Genera l'HTML che replica esattamente il modulo di onboarding con le 7 sezioni
      let htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #333; line-height: 1.5; box-sizing: border-box; padding: 0; font-size: 14px;">
          <!-- Header -->
          <div style="background-color: #003366; color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; box-sizing: border-box;">
            <h1 style="color: white; font-size: 24px; margin-bottom: 8px; font-weight: 600; margin-top: 0; padding: 0;">QUESTIONARIO DI PROFILAZIONE MiFID</h1>
            <p style="color: #f0f0f0; margin: 0; font-size: 16px; padding: 0;">Documento riservato per ${getClientProperty('firstName', '')} ${getClientProperty('lastName', getClientProperty('name', ''))}</p>
          </div>
          
          <!-- Introduzione -->
          <div style="background-color: #f0f7ff; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #003366; box-sizing: border-box; break-inside: avoid;">
            <h2 style="color: #003366; font-size: 18px; margin-bottom: 12px; margin-top: 0; padding: 0;">Gentile Cliente,</h2>
            <p style="margin-bottom: 10px; line-height: 1.6; color: #333; padding: 0;">La compilazione di questo questionario è un requisito stabilito dalla normativa MiFID (Markets in Financial Instruments Directive) per garantire che i servizi e i prodotti finanziari offerti siano adeguati al Suo profilo di investitore.</p>
            <p style="margin-bottom: 10px; line-height: 1.6; color: #333; padding: 0;">La invitiamo a rileggere con attenzione tutte le informazioni fornite e verificare che rispecchino correttamente la Sua situazione attuale, le Sue conoscenze, la Sua propensione al rischio e i Suoi obiettivi di investimento.</p>
            <p style="font-weight: 500; color: #333; margin-bottom: 0; padding: 0;">Le informazioni raccolte saranno trattate con la massima riservatezza e utilizzate esclusivamente per offrirLe una consulenza adeguata.</p>
          </div>
          
          <!-- Sezione 1: Dati Anagrafici e Informazioni Personali -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">1. Dati Anagrafici e Informazioni Personali</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Informazioni di base su di te e i tuoi recapiti</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; box-sizing: border-box;">
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Data di nascita</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Inserisci la tua data di nascita completa</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${formatDate(getClientProperty('birthDate'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Indirizzo di residenza</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Inserisci il tuo indirizzo di residenza completo</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${getClientProperty('address', 'N/A')}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Stato civile</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Seleziona il tuo stato civile attuale</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateMaritalStatus(getClientProperty('maritalStatus'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Recapito telefonico</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Un numero di telefono dove poterti contattare</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${getClientProperty('phone', 'N/A')}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Professione</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">La tua attuale professione o stato occupazionale</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateEmploymentStatus(getClientProperty('employmentStatus'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin: 0 0 4px 0; font-size: 14px; padding: 0; line-height: 1.2;">Livello di istruzione</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il tuo più alto livello di istruzione conseguito</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateEducationLevel(getClientProperty('educationLevel'))}</div>
              </div>
            </div>
          </div>
          
          <!-- Sezione 2: Situazione Finanziaria Attuale -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">2. Situazione Finanziaria Attuale</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Informazioni sulla tua situazione economica e patrimoniale attuale</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; box-sizing: border-box;">
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Reddito annuo netto</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il tuo reddito netto annuale totale</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${formatCurrency(getClientProperty('annualIncome'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Spese mensili</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Le tue spese fisse mensili totali</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${formatCurrency(getClientProperty('monthlyExpenses'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Debiti e obblighi finanziari</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il totale dei tuoi debiti e obblighi finanziari</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${formatCurrency(getClientProperty('debts'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Persone a carico</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il numero di persone economicamente dipendenti da te</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${getClientProperty('dependents', 'N/A')}</div>
              </div>
            </div>
            
            <div style="margin-top: 20px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 8px; font-size: 14px; padding: 0; line-height: 1.2;">I tuoi asset principali</p>
              
              <!-- Tabella degli asset e patrimonio netto -->
              <div style="margin-top: 12px; box-sizing: border-box;">
                <div style="overflow-x: auto; margin-bottom: 12px;">
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
                    <thead>
                      <tr style="background-color: #f5f8fa; border-bottom: 1px solid #e1e7eb;">
                        <th style="padding: 10px; font-size: 13px; text-align: left; font-weight: 600; color: #334155;">Categoria</th>
                        <th style="padding: 10px; font-size: 13px; text-align: right; font-weight: 600; color: #334155;">Valore</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assets.filter(asset => asset.value > 0).map(asset => `
                        <tr style="border-bottom: 1px solid #e1e7eb;">
                          <td style="padding: 10px; font-size: 13px; color: #475569;">${translateAssetCategories([asset.category])}</td>
                          <td style="padding: 10px; font-size: 13px; color: #475569; text-align: right;">${formatCurrency(asset.value)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>

                <div style="margin-top: 16px; background-color: #f0f7ff; padding: 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #003366;">
                  <p style="font-weight: 700; color: #333; margin: 0; font-size: 15px; padding: 0;">Patrimonio Netto Totale</p>
                  <p style="font-weight: 700; color: #003366; margin: 0; font-size: 16px; padding: 0;">${formatCurrency(assets.reduce((sum, asset) => sum + asset.value, 0) - (getClientProperty('debts') || 0))}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Sezione 3: Obiettivi d'Investimento -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">3. Obiettivi d'Investimento</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Informazioni sui tuoi obiettivi finanziari e priorità</p>
            
            <div style="margin-bottom: 16px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Orizzonte temporale</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il periodo di tempo durante il quale prevedi di mantenere i tuoi investimenti</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateInvestmentHorizon(getClientProperty('investmentHorizon'))}</div>
            </div>
            
            <div style="box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 8px; font-size: 14px; padding: 0; line-height: 1.2;">Priorità degli obiettivi d'investimento</p>
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px; box-sizing: border-box;">
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">Pianificazione della pensione</span>
                    <span style="color: #003366; font-weight: 500;">${translateInterestLevel(getClientProperty('retirementInterest')) || 'N/A'}</span>
                  </div>
                  <p style="color: #666; margin: 0 0 8px 0; font-size: 12px; padding: 0; line-height: 1.2;">Preparazione finanziaria per il pensionamento</p>
                  <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(6 - (getClientProperty('retirementInterest') || 0)) * 20}%; height: 100%; background-color: #003366;"></div>
                  </div>
                </div>
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">Crescita del capitale</span>
                    <span style="color: #003366; font-weight: 500;">${translateInterestLevel(getClientProperty('wealthGrowthInterest')) || 'N/A'}</span>
                  </div>
                  <p style="color: #666; margin: 0 0 8px 0; font-size: 12px; padding: 0; line-height: 1.2;">Aumento del valore del patrimonio nel tempo</p>
                  <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(6 - (getClientProperty('wealthGrowthInterest') || 0)) * 20}%; height: 100%; background-color: #003366;"></div>
                  </div>
                </div>
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">Generazione di reddito</span>
                    <span style="color: #003366; font-weight: 500;">${translateInterestLevel(getClientProperty('incomeGenerationInterest')) || 'N/A'}</span>
                  </div>
                  <p style="color: #666; margin: 0 0 8px 0; font-size: 12px; padding: 0; line-height: 1.2;">Creazione di flussi di reddito regolari</p>
                  <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(6 - (getClientProperty('incomeGenerationInterest') || 0)) * 20}%; height: 100%; background-color: #003366;"></div>
                  </div>
                </div>
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">Protezione del capitale</span>
                    <span style="color: #003366; font-weight: 500;">${translateInterestLevel(getClientProperty('capitalPreservationInterest')) || 'N/A'}</span>
                  </div>
                  <p style="color: #666; margin: 0 0 8px 0; font-size: 12px; padding: 0; line-height: 1.2;">Tutela del valore del capitale investito</p>
                  <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(6 - (getClientProperty('capitalPreservationInterest') || 0)) * 20}%; height: 100%; background-color: #003366;"></div>
                  </div>
                </div>
                <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">Pianificazione ereditaria</span>
                    <span style="color: #003366; font-weight: 500;">${translateInterestLevel(getClientProperty('estatePlanningInterest')) || 'N/A'}</span>
                  </div>
                  <p style="color: #666; margin: 0 0 8px 0; font-size: 12px; padding: 0; line-height: 1.2;">Gestione e trasferimento del patrimonio alle generazioni future</p>
                  <div style="height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${(6 - (getClientProperty('estatePlanningInterest') || 0)) * 20}%; height: 100%; background-color: #003366;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Sezione 4: Conoscenza ed Esperienza con Strumenti Finanziari -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">4. Conoscenza ed Esperienza con Strumenti Finanziari</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Valutazione della tua competenza ed esperienza in ambito finanziario</p>
            
            <div style="margin-bottom: 16px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Livello di conoscenza dei mercati finanziari</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Quanto ti senti preparato sul funzionamento dei mercati finanziari</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateInvestmentExperience(getClientProperty('investmentExperience'))}</div>
            </div>
            
            <div style="margin-bottom: 16px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Esperienze pregresse</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Seleziona gli strumenti finanziari in cui hai già investito in passato</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">
                ${Array.isArray(getClientProperty('pastInvestmentExperience')) ? 
                  getClientProperty('pastInvestmentExperience', []).map((exp: string) => 
                  `<span style="display: inline-block; padding: 4px 0; margin-right: 12px; font-size: 14px;">${translatePastInvestmentExperience(exp)}</span>`
                ).join(' ') : 'Nessuna esperienza'}
              </div>
            </div>
            
            <div style="box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Formazione ricevuta</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Seleziona i tipi di formazione finanziaria che hai ricevuto</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">
                ${Array.isArray(getClientProperty('financialEducation')) ? 
                  getClientProperty('financialEducation', []).map((edu: string) => 
                  `<span style="display: inline-block; padding: 4px 0; margin-right: 12px; font-size: 14px;">${translateFinancialEducation(edu)}</span>`
                ).join(' ') : 'Nessuna formazione specifica'}
              </div>
            </div>
          </div>
          
          <!-- Sezione 5: Tolleranza al Rischio -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">5. Tolleranza al Rischio</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Valutazione della tua propensione al rischio negli investimenti</p>
            
            <div style="margin-bottom: 16px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Profilo di rischio personale</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Il tuo livello di propensione al rischio negli investimenti</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateRiskProfile(getClientProperty('riskProfile'))}</div>
            </div>
            
            <div style="margin-bottom: 16px; box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Reazione a una flessione del portafoglio</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Come reagirebbe in caso di perdite significative del portafoglio?</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translatePortfolioDropReaction(getClientProperty('portfolioDropReaction'))}</div>
            </div>
            
            <div style="box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Disponibilità a tollerare la volatilità</p>
              <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Quanto sei disposto a sopportare oscillazioni di breve termine per raggiungere obiettivi a lungo termine?</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateVolatilityTolerance(getClientProperty('volatilityTolerance'))}</div>
            </div>
          </div>
          
          <!-- Sezione 6: Esperienza e Comportamento d'Investimento -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">6. Esperienza e Comportamento d'Investimento</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Informazioni sulle tue abitudini di investimento e monitoraggio</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; box-sizing: border-box;">
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Anni di esperienza negli investimenti</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Da quanto tempo investi nei mercati finanziari</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateYearsOfExperience(getClientProperty('yearsOfExperience'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Frequenza degli investimenti</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Con quale frequenza effettui nuovi investimenti</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateInvestmentFrequency(getClientProperty('investmentFrequency'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Utilizzo di consulenza finanziaria</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Ti affidi a consulenti per le decisioni d'investimento o operi in autonomia?</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateAdvisorUsage(getClientProperty('advisorUsage'))}</div>
              </div>
              
              <div style="box-sizing: border-box;">
                <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Tempo dedicato al monitoraggio degli investimenti</p>
                <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; padding: 0; line-height: 1.2;">Con quale frequenza monitori i tuoi investimenti</p>
                <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box;">${translateMonitoringTime(getClientProperty('monitoringTime'))}</div>
              </div>
            </div>
          </div>
          
          <!-- Sezione 7: Domande Specifiche -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
            <h2 style="color: #111; font-size: 18px; margin: 0 0 8px 0; font-weight: 600; padding: 0; line-height: 1.2;">7. Domande Specifiche</h2>
            <p style="color: #666; margin-top: 0; margin-bottom: 16px; font-size: 14px; padding: 0;">Se hai domande specifiche o considerazioni particolari che vorresti condividere, scrivile qui</p>
            
            <div style="box-sizing: border-box;">
              <p style="font-weight: 700; color: #333; margin-bottom: 4px; font-size: 14px; padding: 0; line-height: 1.2;">Domande e considerazioni</p>
              <div style="padding: 4px 0; font-size: 14px; box-sizing: border-box; min-height: 40px;">
                ${getClientProperty('specificQuestions') || 'Nessuna domanda o considerazione specificata'}
              </div>
            </div>
          </div>
          
          <!-- Dichiarazione di conferma -->
          <div style="background-color: #f9f9f9; padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #e0e0e0; break-inside: avoid; page-break-inside: avoid;">
            <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px;">
              <div style="min-width: 24px; height: 24px; border: 2px solid #003366; border-radius: 4px;"></div>
              <div>
                <p style="margin: 0; line-height: 1.5; font-size: 14px;">
                  Dichiaro di aver letto attentamente il presente questionario e confermo che le informazioni in esso contenute corrispondono al vero. Sono consapevole che tali informazioni saranno utilizzate per valutare l'adeguatezza dei servizi e prodotti finanziari offerti rispetto al mio profilo di investitore.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Firma -->
          <div style="background-color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); break-inside: avoid; page-break-inside: avoid;">
            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <div style="width: 300px; text-align: right;">
                <p style="font-weight: 500; color: #333; margin-bottom: 10px; font-size: 14px;">Data: ${formatDate(new Date())}</p>
                <p style="font-weight: 500; color: #333; margin-bottom: 4px; font-size: 14px;">Firma cliente</p>
                <div style="height: 60px; border-bottom: 1px solid #aaa;"></div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="font-size: 12px; color: #666;">Documento generato il ${formatDate(new Date())}</p>
            <p style="font-size: 11px; color: #888; margin-top: 5px;">Ai sensi della Direttiva 2014/65/UE (MiFID II)</p>
          </div>
        </div>
      `;
      
      // Aggiorna lo stato con l'HTML generato
      setPreviewHtml(htmlContent);
    } catch (error) {
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione dell'anteprima.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Funzione per scaricare il PDF
  const downloadPdf = useCallback(async (): Promise<void> => {
    try {
      // Ottieni l'elemento HTML da convertire in PDF
      const element = previewContainerRef.current;
      if (!element) {
        toast({
          title: "Errore",
          description: "Impossibile generare il PDF: contenuto non disponibile",
          variant: "destructive"
        });
        return;
      }
      
      // Crea un nome file sicuro senza caratteri speciali
      const sanitizedFirstName = (client.firstName || '').replace(/[^\w\s]/g, '');
      const sanitizedLastName = (client.lastName || '').replace(/[^\w\s]/g, '');
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `MIFID_${sanitizedLastName}_${sanitizedFirstName}_${currentDate}.pdf`;
      
      // Configurazione semplificata per html2pdf
      const opt = {
        margin: 10, 
        filename: fileName,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };
      
      // Genera il PDF e ottieni il blob
      const pdfBlob = await html2pdf()
        .from(element)
        .set(opt)
        .outputPdf('blob');
      
      // Salva il file tramite FileSaver.js
      saveAs(pdfBlob, fileName);

      // Genera un URL temporaneo per il blob
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Notifica il successo
      toast({
        title: "PDF Scaricato",
        description: "Il PDF è stato scaricato con successo."
      });

      // Se c'è un callback onGenerated, invocalo con l'URL del PDF
      if (onGenerated) {
        onGenerated(pdfUrl);
      }

      // Programma la revoca dell'URL dopo 5 minuti per evitare memory leaks
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 300000); // 5 minuti
      
    } catch (error) {
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il download del PDF.",
        variant: "destructive"
      });
    }
  }, [client, onGenerated, toast]);

  // Nuova funzione per salvare il PDF sul server
  const savePdfToServer = useCallback(async (): Promise<void> => {
    try {
      setIsSaving(true);
      
      // Ottieni l'elemento HTML da convertire in PDF
      const element = previewContainerRef.current;
      if (!element) {
        toast({
          title: "Errore",
          description: "Impossibile generare il PDF: contenuto non disponibile",
          variant: "destructive"
        });
        return;
      }
      
      // Crea un nome file sicuro senza caratteri speciali
      const sanitizedFirstName = (client.firstName || '').replace(/[^\w\s]/g, '');
      const sanitizedLastName = (client.lastName || '').replace(/[^\w\s]/g, '');
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `MIFID_${sanitizedLastName}_${sanitizedFirstName}_${currentDate}.pdf`;
      
      // Configurazione semplificata per html2pdf
      const opt = {
        margin: 10, 
        filename: fileName,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };
      
      // Genera il PDF e ottieni il blob
      const pdfBlob = await html2pdf()
        .from(element)
        .set(opt)
        .outputPdf('blob');
      
      // Crea un oggetto FormData per l'invio multipart
      const formData = new FormData();
      
      // Aggiungi il PDF come file
      formData.append('pdf', pdfBlob, fileName);
      
      // Aggiungi l'ID del cliente
      formData.append('clientId', client.id.toString());
      
      // Invia la richiesta al server
      const response = await fetch('/api/clients/save-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "PDF Salvato",
          description: "Il PDF è stato salvato sul server con successo."
        });
        
        // Se c'è un callback onGenerated, invocalo con l'URL del file sul server
        if (onGenerated && result.fileUrl) {
          onGenerated(result.fileUrl);
        }
      } else {
        toast({
          title: "Errore",
          description: result.message || "Si è verificato un errore durante il salvataggio del PDF.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio del PDF.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [client, onGenerated, toast]);
  
  // Effetto per gestire i messaggi postMessage provenienti dal dialogo principale
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.action === 'downloadPdf') {
        // Scarica il PDF quando richiesto
        downloadPdf();
      } else if (event.data && event.data.action === 'savePdfToServer') {
        // Salva il PDF sul server quando richiesto e invia un messaggio con l'URL
        try {
          setIsSaving(true);
          
          // Ottieni l'elemento HTML da convertire in PDF
          const element = previewContainerRef.current;
          if (!element) {
            throw new Error("Contenuto non disponibile");
          }
          
          // Crea un nome file sicuro senza caratteri speciali
          const sanitizedFirstName = (client.firstName || '').replace(/[^\w\s]/g, '');
          const sanitizedLastName = (client.lastName || '').replace(/[^\w\s]/g, '');
          const currentDate = new Date().toISOString().split('T')[0];
          const fileName = `MIFID_${sanitizedLastName}_${sanitizedFirstName}_${currentDate}.pdf`;
          
          // Configurazione semplificata per html2pdf
          const opt = {
            margin: 10, 
            filename: fileName,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { 
              scale: 2, 
              useCORS: true,
              letterRendering: true
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: 'portrait' as const
            }
          };
          
          // Genera il PDF e ottieni il blob
          const pdfBlob = await html2pdf()
            .from(element)
            .set(opt)
            .outputPdf('blob');
          
          // Crea un oggetto FormData per l'invio multipart
          const formData = new FormData();
          
          // Aggiungi il PDF come file
          formData.append('pdf', pdfBlob, fileName);
          
          // Aggiungi l'ID del cliente
          formData.append('clientId', client.id.toString());
          
          // Invia la richiesta al server
          const response = await fetch('/api/clients/save-pdf', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          const result = await response.json();
          
          if (response.ok && result.fileUrl) {
            console.log('[DEBUG HtmlPdfGenerator] PDF salvato sul server con URL:', result.fileUrl);
            
            // Notifica il successo
            toast({
              title: "PDF Salvato",
              description: "Il PDF è stato salvato sul server con successo."
            });
            
            // Invia un messaggio che il PDF è stato salvato, includendo l'URL del file sul server
            window.parent.postMessage({ 
              pdfSavedToServer: true, 
              serverFileUrl: result.fileUrl 
            }, '*');
            
            // Se c'è un callback onGenerated, invocalo con l'URL del file sul server
            if (onGenerated && result.fileUrl) {
              onGenerated(result.fileUrl);
            }
          } else {
            throw new Error(result.message || "Errore durante il salvataggio del PDF");
          }
        } catch (error) {
          console.error("Errore nel salvataggio del PDF:", error);
          
          // Invia comunque un messaggio di errore
          window.parent.postMessage({ 
            pdfSavedToServer: false, 
            error: error instanceof Error ? error.message : "Errore sconosciuto" 
          }, '*');
          
          toast({
            title: "Errore",
            description: "Si è verificato un errore durante il salvataggio del PDF.",
            variant: "destructive"
          });
        } finally {
          setIsSaving(false);
        }
      } else if (event.data && event.data.action === 'prepareForSignature') {
        // Manteniamo questo per compatibilità, ma ora utilizziamo savePdfToServer per la firma
        savePdfToServer();
      }
    };
    
    // Aggiungi il listener per i messaggi
    window.addEventListener('message', handleMessage);
    
    // Cleanup del listener quando il componente viene smontato
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [client, downloadPdf, onGenerated, toast, savePdfToServer]);

  // Aggiungi un effect che salva automaticamente il PDF una sola volta dopo la generazione
  useEffect(() => {
    // Verifica che il contenuto HTML esista, che l'elemento di riferimento esista,
    // che non sia già in corso un salvataggio e che non sia già stato salvato
    if (previewHtml && previewContainerRef.current && !isSaving && !pdfSavedRef.current) {
      pdfSavedRef.current = true; // Marca come salvato per evitare loop
      
      // Piccolo ritardo per assicurarsi che il contenuto sia completamente renderizzato
      const timer = setTimeout(() => {
        savePdfToServer();
      }, 300);
      
      return () => clearTimeout(timer); // Pulizia in caso di unmount
    }
  }, [previewHtml, savePdfToServer, isSaving]);

  // Interfaccia utente con layout side by side
  return (
    <div className="flex flex-col h-full">
      {/* Contenuto principale - solo anteprima */}
      <div className="flex-1 min-h-0">
        {/* Anteprima HTML */}
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-medium mb-2 text-slate-700">Anteprima questionario MIFID</h3>
          <div className="border-2 border-slate-200 rounded-lg flex-1 overflow-hidden bg-slate-50 shadow-md p-2 min-h-0">
            <div className="h-full overflow-y-auto bg-white rounded-md shadow-inner px-1 pb-8" 
                 style={{ maxHeight: "100%", WebkitOverflowScrolling: "touch" }}>
              {isGenerating || isSaving ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                    <p>{isSaving ? "Salvataggio PDF in corso..." : "Generazione anteprima in corso..."}</p>
                  </div>
                </div>
              ) : previewHtml ? (
                <div 
                  ref={previewContainerRef}
                  className="p-3 h-auto relative mx-auto"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  style={{ height: 'auto', maxWidth: '90%' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nessuna anteprima disponibile
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 