import { useState } from "react";
import { useTranslation } from "react-i18next";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Estendi l'interfaccia jsPDF per includere il metodo autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Definizione dell'interfaccia per gli asset
interface Asset {
  id?: number;
  clientId?: number;
  category: string;
  value: number;
  description?: string;
  createdAt?: string;
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
  specificQuestions?: string | null;
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

// Rileva se siamo in ambiente di sviluppo
const IS_DEV = import.meta.env.DEV;

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
  
  // Stati minimi
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Formatta numeri come valuta
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('it-IT');
  };

  // Funzione che genera il contenuto del PDF
  const generatePdfContent = (doc: jsPDF): void => {
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.text("QUESTIONARIO DI PROFILAZIONE MiFID", 105, 30, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${client.firstName} ${client.lastName}`, 105, 40, { align: "center" });
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 105, 46, { align: "center" });
    
    // Sezione dati personali
    let yPosition = 60;
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text("Dati Personali", 20, yPosition);
    
    yPosition += 10;
    doc.autoTable({
      startY: yPosition,
      head: [['Campo', 'Valore']],
      body: [
        ['Nome', client.firstName || 'N/A'],
        ['Cognome', client.lastName || 'N/A'],
        ['Email', client.email || 'N/A'],
        ['Telefono', client.phone || 'N/A'],
        ['Indirizzo', client.address || 'N/A']
      ],
      theme: 'striped',
      styles: { fontSize: 10 }
    });
    
    // Aggiungi semplici info finanziarie
    yPosition = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text("Informazioni Finanziarie", 20, yPosition);
    
    yPosition += 10;
    doc.autoTable({
      startY: yPosition,
      head: [['Campo', 'Valore']],
      body: [
        ['Reddito Annuo', client.annualIncome ? `€${formatCurrency(client.annualIncome)}` : 'N/A'],
        ['Patrimonio Netto', 'Vedi dettaglio asset']
      ],
      theme: 'striped',
      styles: { fontSize: 10 }
    });
    
    // Fine documento
    doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
    doc.text(`Documento generato il ${new Date().toLocaleDateString()}`, 105, 280, { align: "center" });
  };

  // Funzione che genera e scarica il PDF
  const generatePdf = () => {
    try {
      setIsGenerating(true);
      
      // In ambiente di sviluppo, non generiamo realmente il PDF per evitare l'errore URI malformed
      if (IS_DEV) {
        // Simula un ritardo
        setTimeout(() => {
          // Notifica all'utente
      toast({
            title: "Modalità di sviluppo",
            description: "In modalità di sviluppo, il PDF non viene generato per evitare errori URI malformed con Vite."
          });
          
          if (onGenerated) {
            onGenerated();
          }
          
          setIsGenerating(false);
        }, 1000);
        
        return;
      }
      
      // Solo in produzione generiamo e scarichiamo realmente il PDF
      const doc = new jsPDF();
      generatePdfContent(doc);
      
      // Usa file-saver per scaricare il PDF
      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
      saveAs(pdfBlob, `MiFID_${client.lastName}_${client.firstName}.pdf`);
      
      // Notifica all'utente
      toast({
        title: "PDF Generato",
        description: "Il PDF è stato generato e scaricato con successo."
      });
      
      // Callback di completamento
      if (onGenerated) {
        onGenerated();
      }
      
      setIsGenerating(false);
    } catch (error) {
      console.error("Errore nella generazione del PDF:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del PDF."
      });
      setIsGenerating(false);
    }
  };

  // In sviluppo, mostriamo un avviso speciale
  if (IS_DEV) {
    return (
      <div className="p-6 text-center space-y-6">
        <h2 className="text-xl font-semibold mb-4">Generazione PDF Profilo Cliente</h2>
        
        <Alert className="text-left bg-amber-50 border-amber-300">
          <AlertTitle className="flex items-center text-amber-800">
            <ExternalLink className="h-4 w-4 mr-2" />
            Modalità di sviluppo
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            In modalità di sviluppo, la generazione PDF è simulata per evitare errori URI malformed con Vite.
            <br />
            La funzionalità completa sarà disponibile in produzione.
          </AlertDescription>
        </Alert>
        
      <Button 
          onClick={generatePdf}
          disabled={isGenerating}
        size="lg"
          className="mx-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulazione generazione...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Simula generazione PDF
            </>
          )}
                </Button>
              </div>
    );
  }

  // Versione standard per produzione
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold mb-4">Generazione PDF Profilo Cliente</h2>
      <p className="mb-6 text-muted-foreground">
        Clicca sul pulsante per generare e scaricare il PDF con i dati del cliente.
      </p>
              
              <Button 
                onClick={generatePdf} 
                disabled={isGenerating}
        size="lg"
        className="mx-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Genera e Scarica PDF
          </>
        )}
            </Button>
    </div>
  );
}