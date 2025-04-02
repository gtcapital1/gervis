import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Definizione dell'interfaccia per gli asset
interface Asset {
  id?: number;
  clientId?: number;
  category: string;
  value: number;
  description?: string;
  createdAt?: string;
}

// Definizione dell'interfaccia per i dati MiFID
interface MifidType {
  id?: string;
  clientId?: number;
  createdAt?: string;
  updatedAt?: string;
  address?: string;
  phone?: string;
  birthDate?: string;
  maritalStatus?: string;
  employmentStatus?: string;
  educationLevel?: string;
  annualIncome?: number;
  monthlyExpenses?: number;
  debts?: number;
  dependents?: number;
  assets?: Asset[];
  investmentHorizon?: string;
  retirementInterest?: number;
  wealthGrowthInterest?: number;
  incomeGenerationInterest?: number;
  capitalPreservationInterest?: number;
  estatePlanningInterest?: number;
  investmentExperience?: string;
  pastInvestmentExperience?: string[];
  financialEducation?: string[];
  riskProfile?: string;
  portfolioDropReaction?: string;
  volatilityTolerance?: string;
  yearsOfExperience?: string;
  investmentFrequency?: string;
  advisorUsage?: string;
  monitoringTime?: string;
  specificQuestions?: string[] | null;
  assetCategories?: string[];
  [key: string]: any; // Per consentire l'accesso a proprietà dinamiche
}

// Definizione dell'interfaccia per il client
interface ClientSchema {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | null;
  maritalStatus?: string | null;
  employmentStatus?: string | null;
  educationLevel?: string | null;
  annualIncome?: number | null;
  monthlyExpenses?: number | null;
  debts?: number | null;
  dependents?: number | null;
  riskProfile?: string | null;
  investmentHorizon?: string | null;
  investmentExperience?: string | null;
  retirementInterest?: number | null;
  wealthGrowthInterest?: number | null;
  incomeGenerationInterest?: number | null;
  capitalPreservationInterest?: number | null;
  estatePlanningInterest?: number | null;
  pastInvestmentExperience?: string[] | null;
  financialEducation?: string[] | null;
  portfolioDropReaction?: string | null;
  volatilityTolerance?: string | null;
  yearsOfExperience?: string | null;
  investmentFrequency?: string | null;
  advisorUsage?: string | null;
  monitoringTime?: string | null;
  specificQuestions?: string[] | null;
  assetCategories?: string[] | null;
  investmentPriorities?: {
    capitalGrowth?: number | null;
    incomeGeneration?: number | null;
    capitalPreservation?: number | null;
    liquidity?: number | null;
  } | null;
  mifid?: MifidType | null; // Aggiungiamo la proprietà mifid
}

// Definizione dell'interfaccia per le props
interface ClientPdfGeneratorProps {
  client: ClientSchema;
  assets: Asset[];
  advisorSignature?: string | null;
  companyLogo?: string | null;
  companyInfo?: string | null;
  onGenerated?: () => void;
}

export function ClientPdfGenerator({
  client,
  assets,
  advisorSignature,
  companyLogo,
  companyInfo,
  onGenerated
}: ClientPdfGeneratorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Stati per gestire il flusso
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailBody, setEmailBody] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Questionario MiFID");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  
  // Inizializza l'email predefinita e genera l'anteprima HTML
  useEffect(() => {
    if (client) {
      setEmailBody(`Gentile ${client.firstName || client.name},\n\nIn allegato trovi il tuo questionario MiFID compilato.\nTi ringraziamo per la fiducia.\n\nCordiali saluti,\nIl tuo consulente finanziario`);
      generateHtmlPreview();
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

  // Helper per creare un filename sicuro
  const createSafeFilename = (firstName: string | undefined, lastName: string | undefined): string => {
    // Funzione più sicura per sanitizzare stringhe per nome file
    const sanitizeForFilename = (str: string | undefined): string => {
      if (!str) return '';
      
      // Rimuovi tutti i caratteri non alfanumerici e sostituiscili con underscore
      // Poi rimuovi underscore multipli consecutivi
      return str
        .normalize('NFD')                // Decomponi accenti/diacritici
        .replace(/[\u0300-\u036f]/g, '') // Rimuovi i segni diacritici
        .replace(/[^a-z0-9]/gi, '_')     // Sostituisci caratteri non alfanumerici con underscore
        .replace(/_{2,}/g, '_')          // Riduci underscore multipli a uno solo
        .replace(/^_|_$/g, '')           // Rimuovi underscore all'inizio e alla fine
        .substring(0, 30);               // Limita la lunghezza 
    };
    
    const safeLastName = sanitizeForFilename(lastName || 'Cliente');
    const safeFirstName = sanitizeForFilename(firstName || '');
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Crea un nome file sicuro
    const filename = `MiFID_${safeLastName}${safeFirstName ? '_' + safeFirstName : ''}_${date}.pdf`;
    
    // Log per debug
    
    
    return filename;
  };

  // Funzione per generare un'anteprima HTML
  const generateHtmlPreview = (): void => {
    setIsGenerating(true);
    
    try {
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
          student: 'Studente/ssa'
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
          extensive: 'Estesa'
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
          alternative: 'Investimenti alternativi'
        };
        
        return categories.map(cat => translations[cat] || cat).join(', ');
      };
      
      // Genera l'HTML
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: rgb(0, 51, 102); margin-bottom: 10px;">QUESTIONARIO DI PROFILAZIONE MiFID</h1>
            <h2 style="font-size: 18px; margin-bottom: 5px;">Cliente: ${getClientProperty('firstName', '')} ${getClientProperty('lastName', getClientProperty('name', ''))}</h2>
            <p>Data: ${formatDate(new Date())}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: rgb(0, 51, 102); border-bottom: 1px solid #ccc; padding-bottom: 5px;">DATI PERSONALI</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Campo</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Valore</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Nome</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('firstName', 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Cognome</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('lastName', 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('email', 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Telefono</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('phone', 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Indirizzo</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('address', 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Data di nascita</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(getClientProperty('birthDate'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Stato civile</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateMaritalStatus(getClientProperty('maritalStatus'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Situazione lavorativa</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateEmploymentStatus(getClientProperty('employmentStatus'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Livello di istruzione</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateEducationLevel(getClientProperty('educationLevel'))}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: rgb(0, 51, 102); border-bottom: 1px solid #ccc; padding-bottom: 5px;">SITUAZIONE FINANZIARIA</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Campo</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Valore</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Reddito annuale</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(getClientProperty('annualIncome'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Spese mensili</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(getClientProperty('monthlyExpenses'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Debiti</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(getClientProperty('debts'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Persone a carico</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getClientProperty('dependents', 'N/A')}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: rgb(0, 51, 102); border-bottom: 1px solid #ccc; padding-bottom: 5px;">OBIETTIVI DI INVESTIMENTO</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Campo</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Valore</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Profilo di rischio</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateRiskProfile(getClientProperty('riskProfile'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Orizzonte temporale</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateInvestmentHorizon(getClientProperty('investmentHorizon'))}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: rgb(0, 51, 102); border-bottom: 1px solid #ccc; padding-bottom: 5px;">CONOSCENZA ED ESPERIENZA FINANZIARIA</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Campo</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Valore</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Esperienza in investimenti</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateInvestmentExperience(getClientProperty('investmentExperience'))}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Categorie di asset</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${translateAssetCategories(getClientProperty('assetCategories'))}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 40px; font-size: 11px; color: #666; text-align: center;">
            <p>Documento generato il ${formatDate(new Date())}</p>
            <p>Firma del cliente: ___________________________</p>
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
  const downloadPdf = (): void => {
    try {
      const doc = new jsPDF();
      generatePdfContent(doc);
      
      // Crea un nome file sicuro senza caratteri speciali
      const sanitizedFirstName = (client.firstName || '').replace(/[^\w\s]/g, '');
      const sanitizedLastName = (client.lastName || '').replace(/[^\w\s]/g, '');
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `MIFID_${sanitizedLastName}_${sanitizedFirstName}_${currentDate}.pdf`;
      
      // Salva il PDF
      doc.save(fileName);
      
      toast({
        title: "PDF Scaricato",
        description: "Il PDF è stato scaricato con successo."
      });
    } catch (error) {
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il download del PDF.",
        variant: "destructive"
      });
    }
  };

  // Funzione per inviare email con PDF allegato
  const sendEmailWithPdf = async (): Promise<void> => {
    setIsSending(true);
    
    try {
      // Crea il PDF per l'invio
      const doc = new jsPDF();
      generatePdfContent(doc);
      
      // Crea un oggetto Blob anziché utilizzare i metodi data URI
      const pdfBlob = doc.output('blob');
      
      // Crea un oggetto FormData per l'invio multipart
      const formData = new FormData();
      
      // Crea un nome file sicuro senza caratteri speciali
      const sanitizedFirstName = (client.firstName || '').replace(/[^\w\s]/g, '');
      const sanitizedLastName = (client.lastName || '').replace(/[^\w\s]/g, '');
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `MIFID_${sanitizedLastName}_${sanitizedFirstName}_${currentDate}.pdf`;
      
      // Aggiungi il PDF come file
      formData.append('pdf', pdfBlob, fileName);
      
      // Aggiungi gli altri campi del form
      formData.append('clientId', client.id.toString());
      formData.append('emailSubject', emailSubject);
      formData.append('emailBody', emailBody);
      
      // Invia la richiesta al server
      const response = await fetch('/api/clients/send-pdf', {
        method: 'POST',
        body: formData,
        // Non includere l'header Content-Type, verrà aggiunto automaticamente con il boundary corretto
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Email inviata",
          description: "Il PDF è stato inviato via email con successo."
        });
        
        // Chiudi il dialog
      if (onGenerated) {
        onGenerated();
      }
      } else {
        
        toast({
          title: "Errore",
          description: result.message || "Si è verificato un errore durante l'invio dell'email.",
          variant: "destructive"
        });
      }
    } catch (error) {
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Funzione per annullare e chiudere il dialogo
  const handleCancel = () => {
    // Chiudi il dialogo
    if (onGenerated) {
      onGenerated();
    }
  };

  // Interfaccia utente con layout side by side
    return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Questionario MiFID: {client.firstName} {client.lastName}</h2>
      </div>
      
      {/* Contenuto principale - layout side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Anteprima HTML */}
        <div className="h-full flex flex-col">
          <h3 className="text-lg font-medium mb-2">Anteprima documento</h3>
          <div className="border rounded-md flex-1 overflow-auto">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                  <p>Generazione anteprima in corso...</p>
                </div>
              </div>
            ) : previewHtml ? (
              <div 
                ref={previewContainerRef}
                className="p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nessuna anteprima disponibile
              </div>
            )}
          </div>
        </div>
        
        {/* Form per l'email */}
        <div className="h-full flex flex-col">
          <h3 className="text-lg font-medium mb-2">Email di accompagnamento</h3>
          <div className="border rounded-md p-4 flex-1 overflow-auto">
            <div className="space-y-4">
              <div>
                <label htmlFor="emailSubject" className="block text-sm font-medium mb-1">
                  Oggetto
                </label>
                <input
                  id="emailSubject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="emailBody" className="block text-sm font-medium mb-1">
                  Testo email
                </label>
                <textarea
                  id="emailBody"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full p-2 border rounded-md resize-vertical"
                />
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <p>Il PDF sarà allegato automaticamente all'email.</p>
                <p>Destinatario: {client.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pulsanti azione in fondo */}
      <div className="flex justify-between mt-4">
      <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={isSending}
        >
          Annulla
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={downloadPdf}
            disabled={isGenerating || isSending}
          >
              <Download className="h-4 w-4 mr-2" />
            Scarica PDF
                </Button>
              <Button 
            onClick={sendEmailWithPdf} 
            disabled={isGenerating || isSending}
          >
            {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Invio in corso...
          </>
        ) : (
          <>
                <Send className="h-4 w-4 mr-2" />
                Invia Email
          </>
        )}
            </Button>
        </div>
      </div>
    </div>
  );
}