import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText, Mail, Plus, Trash, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";
import { Client as ClientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Define types for Asset and Client
interface Asset {
  id: number;
  clientId: number;
  category: string;
  value: number;
  description: string;
  createdAt: string;
}

interface ClientPdfGeneratorProps {
  client: ClientSchema;
  assets: Asset[];
  advisorSignature?: string | null;
  companyLogo?: string | null;
  companyInfo?: string | null;
}

// Tipo per i campi della lettera completamente personalizzabile
interface LetterFields {
  greeting: string;
  introduction: string;
  collaboration: string;
  servicePoints: string[];
  process: string;
  contactInfo: string;
  closing: string;
}

export function ClientPdfGenerator({ client, assets, advisorSignature, companyLogo, companyInfo }: ClientPdfGeneratorProps) {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  // Utilizziamo la lingua corrente dell'i18n come default
  const [language, setLanguage] = useState<string>(() => {
    return i18n.language === "it" ? "italian" : "english";
  });
  const { toast } = useToast();
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  // Default letter texts
  const defaultLetterFields: LetterFields = {
    greeting: `${t('pdf.coverLetter.greetings')} ${client.firstName},`,
    introduction: t('pdf.coverLetter.intro'),
    collaboration: t('pdf.coverLetter.collaboration'),
    servicePoints: t('pdf.coverLetter.points', { returnObjects: true }) as string[],
    process: t('pdf.coverLetter.process'),
    contactInfo: t('pdf.coverLetter.contactInfo'),
    closing: t('pdf.coverLetter.closing')
  };

  // State for fully customizable letter
  const [letterFields, setLetterFields] = useState<LetterFields>(defaultLetterFields);

  // Function to handle language change
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang === "english" ? "en" : "it");
    
    // Reset all fields to defaults in the new language
    resetToDefaults();
  };

  // Reset all fields to defaults based on current language
  const resetToDefaults = () => {
    setLetterFields({
      greeting: `${t('pdf.coverLetter.greetings')} ${client.firstName},`,
      introduction: t('pdf.coverLetter.intro'),
      collaboration: t('pdf.coverLetter.collaboration'),
      servicePoints: t('pdf.coverLetter.points', { returnObjects: true }) as string[],
      process: t('pdf.coverLetter.process'),
      contactInfo: t('pdf.coverLetter.contactInfo'),
      closing: t('pdf.coverLetter.closing')
    });
  };

  // Generate PDF document
  const generatePdf = () => {
    setIsGenerating(true);
    
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Set PDF document properties
      doc.setProperties({
        title: `${t('pdf.title')} - ${client.firstName} ${client.lastName}`,
        subject: t('pdf.subject'),
        creator: 'Financial Advisor Platform',
        author: 'Financial Advisor'
      });
      
      // Aggiungi intestazione con logo e informazioni aziendali
      let headerHeight = 0;
      
      // Function to add header to all pages - returns header height
      const addHeaderToPage = (pageNum: number) => {
        doc.setPage(pageNum);
        
        // Variables to track the height needed for the header
        let headerHeight = 0;
        const logoHeight = 25; // Altezza fissa del logo in mm
        let companyInfoHeight = 0;
        
        // Add company info in gray text in the top-left corner
        if (companyInfo) {
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128); // Gray color
          doc.setFont('helvetica', 'normal'); // Assicuriamo che il testo non sia in grassetto
          
          // Manteniamo i ritorni a capo originali delle settings
          const trimmedCompanyInfo = companyInfo.trim();
          
          // Sostituiamo i newline con specifici caratteri per l'allineamento a sinistra
          // preservando i ritorni a capo originali
          const companyInfoLines = trimmedCompanyInfo.split('\n').map(line => line.trim());
          
          // Calcoliamo l'altezza in base al numero di righe
          companyInfoHeight = companyInfoLines.length * 3.5;
          
          // Aggiunge il testo giustificato a sinistra, riga per riga
          companyInfoLines.forEach((line, index) => {
            doc.text(line, 15, 15 + (index * 3.5), { align: "left" });
          });
          
          // Reset text color for the rest of the content
          doc.setTextColor(0, 0, 0); // Back to black
        }
        
        // Add the logo in the top-right corner with correct proportions
        if (companyLogo) {
          try {
            // Miglioriamo il posizionamento del logo
            const FIXED_HEIGHT = 20; // Altezza fissa in mm
            
            // Posizione in alto a destra
            const x = 135; // Coordinate X (più a destra)
            const y = 5;   // Coordinate Y (alto del foglio)
            
            // Per prevenire che l'immagine venga schiacciata, bisogna calcolare
            // le dimensioni proporzionali dall'immagine originale
            
            // Utilizziamo un approccio sincrono per garantire che le proporzioni
            // vengano mantenute in ogni circostanza
            
            // Impostiamo un rapporto larghezza/altezza predefinito di 2:1
            // che dovrebbe funzionare bene per la maggior parte dei loghi aziendali
            const defaultRatio = 2;
            const width = FIXED_HEIGHT * defaultRatio;
            
            // Clean the area before drawing
            doc.setFillColor(255, 255, 255);
            doc.rect(x - 1, y - 1, width + 2, FIXED_HEIGHT + 2, 'F');
            
            // Draw the image with maintained aspect ratio
            doc.addImage(
              companyLogo,
              'JPEG', // formato automatico
              x,
              y,
              width,
              FIXED_HEIGHT,
              undefined, // alias
              'FAST' // compression 
            );
            
            // Creiamo anche un'immagine nel DOM per calcolare
            // le proporzioni corrette per un eventuale aggiornamento futuro
            const img = new Image();
            img.onload = function() {
              const actualRatio = img.width / img.height;
              console.log("Logo actual dimensions:", { width: img.width, height: img.height, ratio: actualRatio });
            };
            img.src = companyLogo;
            
          } catch (err) {
            console.error("Errore nel caricamento del logo:", err);
            
            // In caso di errore, usiamo dimensioni standard di fallback
            try {
              doc.addImage(
                companyLogo, 
                'JPEG',
                135,    
                5,      
                40,     // larghezza standard
                20      // altezza standard
              );
            } catch (e) {
              console.error("Impossibile caricare il logo anche con dimensioni standard:", e);
            }
          }
        }
        
        // Determina l'altezza necessaria per l'intestazione
        headerHeight = Math.max(logoHeight + 10, companyInfoHeight + 15);
        
        // Aggiungi linea di separazione sotto il logo e le informazioni societarie
        doc.setDrawColor(220, 220, 220); // Grigio chiaro per la linea
        doc.setLineWidth(0.5);
        doc.line(15, headerHeight, 195, headerHeight); // Linea orizzontale da sinistra a destra
        
        return headerHeight;
      };
      
      // Apply header to first page and get its height
      headerHeight = addHeaderToPage(1);
      
      // ======== PAGINA 1 - LETTERA DI ACCOMPAGNAMENTO ========
      
      // Estrai informazioni del consulente
      const advisorInfo = client.advisorId ? (advisorSignature?.split('\n') || []) : [];
      const advisorName = advisorInfo[0] || "Financial Advisor";
      const advisorCompany = advisorInfo[1] || "";
      const advisorEmail = advisorInfo[2] || "";
      const advisorPhone = advisorInfo[3] || "";
      
      // Usa Calibri (sans-serif) per la lettera
      doc.setFont('helvetica', 'normal'); // JSPDF non ha Calibri, helvetica è il più simile

      // Creo un margine destro per allineare correttamente
      const rightMargin = 190;
      
      // Mittente a sinistra (nome, cognome, società, mail, telefono) - posizionato dopo l'intestazione
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const fromLabel = language === "english" ? "From:" : "Da:";
      doc.text(fromLabel, 20, headerHeight + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(advisorName, 35, headerHeight + 15);
      if (advisorCompany) {
        doc.text(advisorCompany, 35, headerHeight + 20);
      }
      if (advisorEmail) {
        doc.text(advisorEmail, 35, headerHeight + 25);
      }
      if (advisorPhone) {
        doc.text(advisorPhone, 35, headerHeight + 30);
      }
      
      // Data a destra
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(dateStr, rightMargin, headerHeight + 15, { align: "right" });
      
      // Destinatario a destra (allineato correttamente)
      const toClientText = `${t('pdf.coverLetter.toClient')}:`;
      doc.text(toClientText, rightMargin, headerHeight + 35, { align: "right" });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${client.firstName} ${client.lastName}`, rightMargin, headerHeight + 40, { align: "right" });
      doc.setFont('helvetica', 'normal');
      if (client.email) {
        doc.text(client.email, rightMargin, headerHeight + 45, { align: "right" });
      }
      
      // Oggetto - adatta in base alla lingua
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const subjectLabel = language === "english" ? "Subject:" : "Oggetto:";
      doc.text(subjectLabel, 20, headerHeight + 60);
      doc.setFont('helvetica', 'normal');
      const subjectText = language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione";
      doc.text(subjectText, 65, headerHeight + 60);
      
      // Saluti
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(letterFields.greeting, 20, headerHeight + 70);
      
      // Corpo della lettera - introduzione personalizzata
      const introLines = doc.splitTextToSize(letterFields.introduction, 170);
      doc.text(introLines, 20, headerHeight + 80);
      
      // Testo collaborazione
      const collaborationLines = doc.splitTextToSize(letterFields.collaboration, 170);
      doc.text(collaborationLines, 20, headerHeight + 110);
      
      // Punti numerati personalizzati
      let bulletY = headerHeight + 120;
      
      for (let i = 0; i < letterFields.servicePoints.length; i++) {
        const pointLines = doc.splitTextToSize(`${i+1}. ${letterFields.servicePoints[i]}`, 160);
        doc.text(pointLines, 25, bulletY);
        bulletY += pointLines.length * 6;
      }
      
      // Testo processo
      const processLines = doc.splitTextToSize(letterFields.process, 170);
      doc.text(processLines, 20, bulletY + 5);
      
      // Informazioni di contatto
      const contactLines = doc.splitTextToSize(letterFields.contactInfo, 170);
      doc.text(contactLines, 20, bulletY + 20);
      
      // Chiusura e firma
      doc.text(letterFields.closing, 20, bulletY + 40);
      
      // Nome, cognome e società nella firma
      doc.setFont('helvetica', 'bold');
      doc.text(advisorName, 20, bulletY + 50);
      doc.setFont('helvetica', 'normal');
      if (advisorCompany) {
        doc.text(advisorCompany, 20, bulletY + 56);
      }
      
      // ======== PAGINA 2 - INFORMAZIONI PERSONALI E PROFILO INVESTIMENTO ========
      doc.addPage();
      
      // Aggiungi intestazione alla pagina 2
      addHeaderToPage(2);
      
      // Titolo documento - posizionato più in basso su richiesta dell'utente
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.clientSummaryReport'), 105, 50, { align: "center" });
      
      // SECTION 1: Personal Information
      doc.setFontSize(14);
      doc.text(t('pdf.personalInformation'), 15, 60);
      doc.setDrawColor(41, 98, 255);
      doc.line(15, 63, 195, 63);
      
      // Client personal details
      doc.setFontSize(11);
      
      // Gather all available personal information from client
      const personalInfo = [
        [`${t('pdf.name')}:`, `${client.firstName} ${client.lastName}`],
        [`${t('pdf.email')}:`, client.email],
        [`${t('pdf.phone')}:`, client.phone || t('pdf.notProvided')],
        [`${t('pdf.address')}:`, client.address || t('pdf.notProvided')],
        [`${t('onboarding.dependent_count')}:`, client.dependents?.toString() || t('pdf.notProvided')],
        [`${t('onboarding.income')}:`, client.annualIncome ? `${formatCurrency(client.annualIncome)} €` : t('pdf.notProvided')],
        [`${t('onboarding.expenses')}:`, client.monthlyExpenses ? `${formatCurrency(client.monthlyExpenses)} €` : t('pdf.notProvided')],
        [`${t('pdf.employmentStatus')}:`, client.employmentStatus || t('pdf.notProvided')],
        [`${t('pdf.taxCode')}:`, client.taxCode || t('pdf.notProvided')],
      ];
      
      autoTable(doc, {
        startY: 70,
        head: [],
        body: personalInfo,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 100 }
        },
        styles: {
          fontSize: 11,
          cellPadding: 3,
        },
      });
      
      // SECTION 2: Investment Profile
      const section2Y = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.investmentProfile'), 15, section2Y);
      doc.setDrawColor(41, 98, 255);
      doc.line(15, section2Y + 3, 195, section2Y + 3);
      
      // Investment profile details
      const investmentProfile = [
        [`${t('pdf.riskProfile')}:`, client.riskProfile ? t(`risk_profiles.${client.riskProfile}`) : t('pdf.notProvided')],
        [`${t('pdf.investmentGoal')}:`, client.investmentGoals?.length ? client.investmentGoals.map(goal => t(`investment_goals.${goal}`)).join(', ') : t('pdf.notProvided')],
        [`${t('pdf.investmentHorizon')}:`, client.investmentHorizon ? t(`investment_horizons.${client.investmentHorizon}`) : t('pdf.notProvided')],
        [`${t('pdf.experienceLevel')}:`, client.investmentExperience ? t(`experience_levels.${client.investmentExperience}`) : t('pdf.notProvided')],
      ];
      
      autoTable(doc, {
        startY: section2Y + 10,
        head: [],
        body: investmentProfile,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 100 }
        },
        styles: {
          fontSize: 11,
          cellPadding: 3,
        },
      });
      
      // ======== PAGINA 3 - ASSET ALLOCATION E DICHIARAZIONE ========
      doc.addPage();
      
      // Aggiungi intestazione alla pagina 3
      addHeaderToPage(3);
      
      // Nella pagina 3 (asset allocation) non riproponiamo il titolo del modulo
      // per evitare ripetizioni
      
      // Asset allocation section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.assetAllocation'), 15, 60);
      doc.setDrawColor(41, 98, 255);
      doc.line(15, 63, 195, 63);
      
      // Assets table
      if (assets && assets.length > 0) {
        // Calcola il valore totale per le percentuali
        const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        
        // Crea la tabella degli asset con la percentuale
        autoTable(doc, {
          startY: 70,
          head: [[
            t('pdf.category'),
            t('pdf.value'),
            '%'
          ]],
          body: [
            ...assets.map(asset => [
              t(`asset_categories.${asset.category}`),
              `${formatCurrency(asset.value)} €`,
              `${Math.round((asset.value / totalValue) * 100)}%`
            ]),
            // Aggiungi il totale come ultima riga della tabella
            [
              `${t('pdf.totalAssetsValue')}`,
              `${formatCurrency(totalValue)} €`,
              '100%'
            ]
          ],
          theme: 'grid',
          headStyles: {
            fillColor: [41, 98, 255],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          },
          // Applica stile in grassetto all'ultima riga (totale)
          bodyStyles: {
            fontSize: 10
          },
          // Stile specifico per la riga del totale
          didDrawCell: (data) => {
            if (data.row.index === assets.length && data.section === 'body') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [220, 220, 220];
            }
          },
        });
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(t('pdf.noAssetsFound'), 15, 75);
      }
      
      // Add client declaration
      const declarationY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 120;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(t('pdf.clientDeclaration'), 15, declarationY);
      doc.setFontSize(10);
      
      const declaration = t('pdf.clientDeclarationText');
      const splitDeclaration = doc.splitTextToSize(declaration, 180);
      doc.text(splitDeclaration, 15, declarationY + 10);
      
      // Add signature areas
      const signatureY = declarationY + 10 + splitDeclaration.length * 4.5 + 15;
      
      doc.setFontSize(11);
      doc.text(t('pdf.clientSignature'), 15, signatureY);
      
      // Aggiungi campo data accanto alla firma del cliente
      doc.text(t('pdf.date') + ': ___/___/_____', 15, signatureY + 35);
      
      doc.line(15, signatureY + 25, 85, signatureY + 25);
      
      // Add page numbers solo alle pagine del modulo (non alla lettera)
      const pageCount = doc.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Page numbers - partendo da pag 1 per il modulo
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${t('pdf.page')} ${i-1} ${t('pdf.of')} ${pageCount-1}`, 170, 285);
      }
      
      // Save the PDF
      doc.save(`${client.firstName}_${client.lastName}_Onboarding_Form.pdf`);
      
      // Set state to indicate PDF generation completed successfully
      setPdfGenerated(true);
      toast({
        title: language === "english" ? "Success" : "Successo",
        description: language === "english" ? "PDF generated successfully" : "PDF generato con successo",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: language === "english" ? "Error" : "Errore",
        description: language === "english" ? "Failed to generate PDF" : "Impossibile generare il PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to send email with PDF attachment
  const sendEmail = async () => {
    if (!client.email) {
      toast({
        title: language === "english" ? "Error" : "Errore",
        description: language === "english" ? "Client email is required" : "L'email del cliente è obbligatoria",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Create email body from letter text only (without headers)
      const emailBody = `${letterFields.greeting}\n\n${letterFields.introduction}\n\n${letterFields.collaboration}\n\n${letterFields.servicePoints.map((p, i) => `${i+1}. ${p}`).join('\n')}\n\n${letterFields.process}\n\n${letterFields.contactInfo}\n\n${letterFields.closing}`;

      const response = await apiRequest(`/api/clients/${client.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject || (language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"),
          message: emailCustomMessage || emailBody,
          language: language === "english" ? "english" : "italian",
          includeAttachment: true
        }),
      });

      if (response.success) {
        toast({
          title: language === "english" ? "Email Sent" : "Email Inviata",
          description: language === "english" ? "Email sent successfully" : "Email inviata con successo",
          variant: "default",
        });
        setShowSendEmailDialog(false);
      } else {
        throw new Error(response.message || 'Unknown error');
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: language === "english" ? "Error" : "Errore",
        description: language === "english" ? "Failed to send email" : "Impossibile inviare l'email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Function to update service points
  const updateServicePoint = (index: number, value: string) => {
    const newPoints = [...letterFields.servicePoints];
    newPoints[index] = value;
    setLetterFields({
      ...letterFields,
      servicePoints: newPoints
    });
  };

  // Function to add a service point
  const addServicePoint = () => {
    setLetterFields({
      ...letterFields,
      servicePoints: [...letterFields.servicePoints, ""]
    });
  };

  // Function to remove a service point
  const removeServicePoint = (index: number) => {
    const newPoints = [...letterFields.servicePoints];
    newPoints.splice(index, 1);
    setLetterFields({
      ...letterFields,
      servicePoints: newPoints
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <FileText className="h-4 w-4" />
            {t('pdf.generatePdf')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === "english" ? "Generate PDF Document" : "Genera Documento PDF"}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="letter" className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="letter">
                {language === "english" ? "Cover Letter" : "Lettera di Accompagnamento"}
              </TabsTrigger>
              <TabsTrigger value="preview">
                {language === "english" ? "Preview" : "Anteprima"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="letter" className="py-4">
              <div className="flex justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="language" className="font-semibold">
                    {language === "english" ? "Language:" : "Lingua:"}
                  </Label>
                  <Select onValueChange={changeLanguage} defaultValue={language}>
                    <SelectTrigger id="language" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="italian">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {language === "english" ? "Reset Text" : "Ripristina Testo"}
                </Button>
              </div>
              
              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="font-bold mb-4">{language === "english" ? "Cover Letter Content" : "Contenuto della Lettera"}</h3>
                
                <Textarea
                  id="fullLetterContent"
                  value={`${letterFields.greeting}

${letterFields.introduction}

${letterFields.collaboration}

${letterFields.servicePoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

${letterFields.process}

${letterFields.contactInfo}

${letterFields.closing}`}
                  onChange={(e) => {
                    // Dividiamo il testo in sezioni
                    const text = e.target.value;
                    const sections = text.split('\n\n');
                    
                    if (sections.length >= 6) {
                      // Estraiamo i punti di servizio (possono contenere più righe)
                      const servicePointSection = sections.length > 6 ? sections.slice(2, -3).join('\n\n') : sections[2];
                      const pointsText = servicePointSection;
                      
                      // Estraiamo i punti numerati
                      const pointsRegex = /(\d+)\.\s*(.+)/g;
                      const points: string[] = [];
                      let match;
                      
                      while ((match = pointsRegex.exec(pointsText)) !== null) {
                        points.push(match[2].trim());
                      }
                      
                      // Se non ci sono punti numerati, conserviamo quelli esistenti
                      const servicePoints = points.length > 0 ? points : letterFields.servicePoints;
                      
                      // Aggiorniamo il letterFields con le sezioni
                      setLetterFields({
                        ...letterFields,
                        greeting: sections[0]?.trim() || letterFields.greeting,
                        introduction: sections[1]?.trim() || letterFields.introduction,
                        collaboration: sections[2]?.trim() || letterFields.collaboration,
                        servicePoints,
                        process: sections[sections.length - 3]?.trim() || letterFields.process,
                        contactInfo: sections[sections.length - 2]?.trim() || letterFields.contactInfo,
                        closing: sections[sections.length - 1]?.trim() || letterFields.closing,
                      });
                    }
                  }}
                  placeholder={language === "english" ? "Enter the full content of your cover letter here..." : "Inserisci qui il contenuto completo della tua lettera..."}
                  rows={20}
                  className="w-full mb-4"
                />
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {language === "english" 
                      ? "The text will be automatically formatted in the PDF. Press Enter twice to create paragraph breaks." 
                      : "Il testo sarà formattato automaticamente nel PDF. Premi Invio due volte per creare interruzioni di paragrafo."}
                  </div>
                  
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={resetToDefaults}
                    className="mt-2"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {language === "english" ? "Reset Default Text" : "Ripristina Testo Predefinito"}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="preview-container">
                {/* PDF Preview - Exactly as it will appear in the PDF */}
                <div className="space-y-8">
                  {/* Header with company info and logo (simulated) */}
                  <div className="border rounded-md p-5 bg-white text-black relative">
                    <div className="border-b pb-2 preview-header">
                      {companyInfo && (
                        <div className="text-gray-500 text-xs mb-2 max-w-[60%]">
                          {companyInfo}
                        </div>
                      )}
                      
                      {companyLogo && (
                        <div className="absolute top-5 right-5">
                          <img 
                            src={companyLogo} 
                            alt="Company Logo" 
                            className="preview-company-logo" 
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Page 1 - Cover Letter */}
                    <div className="space-y-4 mt-6">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">{language === "english" ? "From:" : "Da:"}</p>
                          <p>{client.advisorId ? advisorSignature?.split('\n')[0] || "Financial Advisor" : "Financial Advisor"}</p>
                          {advisorSignature?.split('\n')[1] && (
                            <p>{advisorSignature.split('\n')[1]}</p>
                          )}
                          {advisorSignature?.split('\n')[2] && (
                            <p>{advisorSignature.split('\n')[2]}</p>
                          )}
                          {advisorSignature?.split('\n')[3] && (
                            <p>{advisorSignature.split('\n')[3]}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p>{new Date().toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p>{t('pdf.coverLetter.toClient')}:</p>
                        <p className="font-bold">{client.firstName} {client.lastName}</p>
                        <p>{client.email}</p>
                      </div>
                      
                      <div>
                        <p>
                          <span className="font-bold">{language === "english" ? "Subject: " : "Oggetto: "}</span>
                          <span>{language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"}</span>
                        </p>
                      </div>
                      
                      <p>{letterFields.greeting}</p>
                      <p>{letterFields.introduction}</p>
                      <p>{letterFields.collaboration}</p>
                      
                      <div className="pl-4">
                        {letterFields.servicePoints.map((point, index) => (
                          <div key={index} className="mb-2">
                            <span className="font-bold">{index + 1}. </span>
                            {point}
                          </div>
                        ))}
                      </div>
                      
                      <p>{letterFields.process}</p>
                      <p>{letterFields.contactInfo}</p>
                      <p>{letterFields.closing}</p>
                      
                      <div className="mt-6">
                        <p className="font-bold">
                          {client.advisorId ? advisorSignature?.split('\n')[0] || "Financial Advisor" : "Financial Advisor"}
                        </p>
                        <p>
                          {client.advisorId ? advisorSignature?.split('\n')[1] || "" : ""}
                        </p>
                      </div>
                      
                      <div className="text-xs text-right text-gray-500 mt-8">
                        {language === "english" ? "Page 1" : "Pagina 1"}
                      </div>
                    </div>
                  </div>

                  {/* Page 2 - Client Summary Report */}
                  <div className="border rounded-md p-5 bg-white text-black relative">
                    <div className="border-b pb-2 preview-header">
                      {companyInfo && (
                        <div className="text-gray-500 text-xs mb-2 max-w-[60%]">
                          {companyInfo}
                        </div>
                      )}
                      
                      {companyLogo && (
                        <div className="absolute top-5 right-5">
                          <img 
                            src={companyLogo} 
                            alt="Company Logo" 
                            className="preview-company-logo" 
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-6 text-center">
                      <h3 className="text-xl font-bold">{language === "english" ? "Client Summary Report" : "Riepilogo Cliente"}</h3>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2 border-b border-blue-500 pb-1">
                        {language === "english" ? "Personal Information" : "Informazioni Personali"}
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <p className="font-bold">{language === "english" ? "Name:" : "Nome:"}</p>
                        <p>{client.firstName} {client.lastName}</p>
                        <p className="font-bold">{language === "english" ? "Email:" : "Email:"}</p>
                        <p>{client.email}</p>
                        <p className="font-bold">{language === "english" ? "Phone:" : "Telefono:"}</p>
                        <p>{client.phone || (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Address:" : "Indirizzo:"}</p>
                        <p>{client.address || (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Tax Code:" : "Codice Fiscale:"}</p>
                        <p>{client.taxCode || (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Dependents:" : "Persone a carico:"}</p>
                        <p>{client.dependents || (language === "english" ? "Not provided" : "Non fornito")}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2 border-b border-blue-500 pb-1">
                        {language === "english" ? "Financial Information" : "Informazioni Finanziarie"}
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                        <p className="font-bold">{language === "english" ? "Annual Income:" : "Reddito Annuale:"}</p>
                        <p>{client.annualIncome ? `${formatCurrency(client.annualIncome)} €` : (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Monthly Expenses:" : "Spese Mensili:"}</p>
                        <p>{client.monthlyExpenses ? `${formatCurrency(client.monthlyExpenses)} €` : (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Risk Profile:" : "Profilo di Rischio:"}</p>
                        <p>{client.riskProfile ? t(`risk_profiles.${client.riskProfile}`) : (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Investment Goal:" : "Obiettivo di Investimento:"}</p>
                        <p>{client.investmentGoals && client.investmentGoals.length > 0 ? 
                            client.investmentGoals.map(goal => t(`investment_goals.${goal}`)).join(', ') : 
                            (language === "english" ? "Not provided" : "Non fornito")}
                        </p>
                        <p className="font-bold">{language === "english" ? "Investment Horizon:" : "Orizzonte di Investimento:"}</p>
                        <p>{client.investmentHorizon ? t(`investment_horizons.${client.investmentHorizon}`) : (language === "english" ? "Not provided" : "Non fornito")}</p>
                        <p className="font-bold">{language === "english" ? "Experience Level:" : "Livello di Esperienza:"}</p>
                        <p>{client.investmentExperience ? t(`experience_levels.${client.investmentExperience}`) : (language === "english" ? "Not provided" : "Non fornito")}</p>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h4 className="font-semibold mb-2 border-b border-blue-500 pb-1">
                        {language === "english" ? "Asset Allocation" : "Allocazione Asset"}
                      </h4>
                      {assets && assets.length > 0 ? (
                        <div className="mt-3">
                          <div className="grid grid-cols-3 gap-4 font-bold pb-2 mb-1">
                            <p>{language === "english" ? "Category" : "Categoria"}</p>
                            <p>{language === "english" ? "Value" : "Valore"}</p>
                            <p>%</p>
                          </div>
                          
                          {assets.map((asset, index) => {
                            const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
                            const percentage = Math.round((asset.value / totalValue) * 100);
                            return (
                              <div key={index} className="grid grid-cols-3 gap-4 py-1 border-b border-gray-100">
                                <p>{t(`asset_categories.${asset.category}`)}</p>
                                <p>{formatCurrency(asset.value)} €</p>
                                <p>{percentage}%</p>
                              </div>
                            );
                          })}
                          
                          {/* Total row */}
                          <div className="grid grid-cols-3 gap-4 mt-2 pt-1 font-bold">
                            <p>{language === "english" ? "Total" : "Totale"}</p>
                            <p>{formatCurrency(assets.reduce((sum, a) => sum + a.value, 0))} €</p>
                            <p>100%</p>
                          </div>
                        </div>
                      ) : (
                        <p className="italic mt-3">{language === "english" ? "No assets found" : "Nessun asset trovato"}</p>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <p>{language === "english" ? "Client Declaration" : "Dichiarazione Cliente"}</p>
                      <p className="text-sm mt-2">{t('pdf.clientDeclarationText')}</p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-8">
                        <div>
                          <p className="font-semibold mb-2">{language === "english" ? "Client Signature:" : "Firma Cliente:"}</p>
                          <div className="border-b border-gray-400 h-8 w-full"></div>
                        </div>
                        <div>
                          <p className="font-semibold mb-2">{language === "english" ? "Date:" : "Data:"}</p>
                          <div className="border-b border-gray-400 h-8 w-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-right text-gray-500 mt-8">
                      {language === "english" ? "Page 2" : "Pagina 2"}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="sm:mr-auto"
            >
              {language === "english" ? "Cancel" : "Annulla"}
            </Button>
            
            <Button
              onClick={() => {
                generatePdf();
                setShowSendEmailDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              disabled={isGenerating}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isGenerating 
                ? language === "english" ? "Generating..." : "Generazione in corso..." 
                : language === "english" ? "Generate & Send Email" : "Genera & Invia Email"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Dialog */}
      <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "english" ? "Send Email to Client" : "Invia Email al Cliente"}
            </DialogTitle>
          </DialogHeader>
          
          <div>
            <div className="flex mb-3">
              <Label htmlFor="emailSubject" className="w-20 pt-2">
                {language === "english" ? "Subject:" : "Oggetto:"}
              </Label>
              <Input
                id="emailSubject"
                placeholder={language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex">
              <Label htmlFor="emailMessage" className="w-20 pt-2">
                {language === "english" ? "Message:" : "Messaggio:"}
              </Label>
              <div className="flex-1">
                <Textarea
                  id="emailMessage"
                  placeholder={language === "english" ? "Your message here..." : "Il tuo messaggio qui..."}
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  rows={8}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1 italic">
                  {language === "english" 
                    ? "Leave blank to use cover letter text as email body." 
                    : "Lascia vuoto per usare il testo della lettera come corpo dell'email."}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSendEmailDialog(false)}
              disabled={isSending}
            >
              {language === "english" ? "Cancel" : "Annulla"}
            </Button>
            
            <Button
              onClick={sendEmail}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSending}
            >
              {isSending
                ? language === "english" ? "Sending..." : "Invio in corso..."
                : language === "english" ? "Send Email" : "Invia Email"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}