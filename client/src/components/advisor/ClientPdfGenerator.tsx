import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useTranslation } from 'react-i18next';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, ArrowRight, Mail, Globe } from 'lucide-react';
import { httpRequest } from '@/lib/queryClient';
import z from 'zod';

interface ClientSchema {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  isOnboarded: boolean | null;
  riskProfile: string | null;
  investmentGoals: string[] | null;
  investmentHorizon: string | null;
  investmentExperience: string | null;
  birthDate: string | null;
  employmentStatus: string | null;
  annualIncome: number | null;
  monthlyExpenses: number | null;
  dependents: number | null;
  advisorId: number | null;
}

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

interface LetterFields {
  fullContent: string;
}

export function ClientPdfGenerator({ client, assets, advisorSignature, companyLogo, companyInfo }: ClientPdfGeneratorProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Usa la lingua attualmente impostata nella pagina
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language === 'en' ? 'english' : 'italian');
  
  // Aggiorna il currentLanguage quando cambia i18n.language
  useEffect(() => {
    setCurrentLanguage(i18n.language === 'en' ? 'english' : 'italian');
    console.log("Lingua ereditata dalla pagina:", i18n.language);
  }, [i18n.language]);
  
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  
  const [letterFields, setLetterFields] = useState<LetterFields>({
    fullContent: ''
  });
  
  // Imposta i campi della lettera in base alla lingua corrente
  useEffect(() => {
    setLetterFieldsByLanguage(currentLanguage);
  }, [currentLanguage]);
  
  // Funzione per impostare i campi della lettera in base alla lingua
  const setLetterFieldsByLanguage = (lang: string) => {
    // Crea un contenuto completo basato sulle traduzioni
    const greeting = t('pdf.coverLetter.greeting');
    const introduction = t('pdf.coverLetter.introduction', { firstName: client.firstName, lastName: client.lastName });
    const collaboration = t('pdf.coverLetter.collaboration');
    const servicePoint1 = t('pdf.coverLetter.servicePoint1');
    const servicePoint2 = t('pdf.coverLetter.servicePoint2');
    const servicePoint3 = t('pdf.coverLetter.servicePoint3');
    const servicePoint4 = t('pdf.coverLetter.servicePoint4');
    const process = t('pdf.coverLetter.process');
    const contactInfo = t('pdf.coverLetter.contactInfo');
    const closing = t('pdf.coverLetter.closing');
    
    // Crea il testo completo formattato come vorrebbe essere nella lettera
    const fullContent = `${greeting}

${introduction}

${collaboration}
1. ${servicePoint1}
2. ${servicePoint2}
3. ${servicePoint3}
4. ${servicePoint4}

${process}

${contactInfo}

${closing}`;
    
    setLetterFields({ fullContent });
  };

  // Funzione per generare il contenuto del PDF senza salvarlo
  const generatePdfContent = () => {
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
      // Altezza fissa del logo in mm (definita qui per essere visibile in tutto il metodo)
      const LOGO_HEIGHT = 25;
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
          // Posizione in alto ancora più a destra come richiesto
          const x = 150; // Coordinate X (spostato più a destra)
          const y = 5;   // Coordinate Y (alto del foglio)
          
          // Calcoliamo le dimensioni effettive del logo e le proporzioni
          // utilizzando un oggetto Image
          const img = new Image();
          img.src = companyLogo;
          
          // Usiamo un rapporto di default di base pari a 2:1
          let logoWidth = LOGO_HEIGHT * 2;
          
          // Quando l'immagine sarà caricata, applicheremo il rapporto corretto
          // ma intanto visualizziamo il logo con un rapporto provvisorio
          
          // Calcoliamo il logo usando un rapporto di aspetto temporaneo
          // Clean the area before drawing
          doc.setFillColor(255, 255, 255);
          doc.rect(x - 1, y - 1, logoWidth + 2, LOGO_HEIGHT + 2, 'F');
          
          // Draw the image with maintained aspect ratio
          doc.addImage(
            companyLogo,
            'JPEG', // formato automatico
            x,
            y,
            logoWidth,
            LOGO_HEIGHT,
            undefined, // alias
            'FAST' // compression 
          );
          
          // Prepariamo il calcolo preciso delle dimensioni per usi futuri
          img.onload = function() {
            const actualRatio = img.width / img.height;
            console.log("Logo actual dimensions:", { 
              width: img.width, 
              height: img.height, 
              ratio: actualRatio 
            });
          };
        } catch (err) {
          console.error("Errore nel caricamento del logo:", err);
          
          // In caso di errore, usiamo dimensioni standard di fallback
          try {
            doc.addImage(
              companyLogo, 
              'JPEG',
              150,    // Spostato più a destra anche nel fallback
              5,      
              LOGO_HEIGHT * 2,   // larghezza standard (rapporto 2:1)
              LOGO_HEIGHT        // altezza standard (come richiesto)
            );
          } catch (e) {
            console.error("Impossibile caricare il logo anche con dimensioni standard:", e);
          }
        }
      }
      
      // Determina l'altezza necessaria per l'intestazione
      headerHeight = Math.max(LOGO_HEIGHT + 10, companyInfoHeight + 15);
      
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
    const fromLabel = currentLanguage === "english" ? "From:" : "Da:";
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
    const dateStr = now.toLocaleDateString(currentLanguage === "english" ? "en-US" : "it-IT", {
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
    const subjectLabel = currentLanguage === "english" ? "Subject:" : "Oggetto:";
    doc.text(subjectLabel, 20, headerHeight + 60);
    doc.setFont('helvetica', 'normal');
    const subjectText = currentLanguage === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione";
    doc.text(subjectText, 65, headerHeight + 60);
    
    // Corpo della lettera completo - usando il contenuto pieno personalizzato
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Dividiamo il testo completo in righe separate per il rendering
    const contentLines = letterFields.fullContent.split('\n');
    
    // Posizione Y iniziale per il testo dopo l'intestazione
    let yPosition = headerHeight + 70;
    
    // Renderizza ciascuna riga del contenuto
    contentLines.forEach(line => {
      // Se la linea è vuota (newline), incrementa lo spazio
      if (line.trim() === '') {
        yPosition += 6;
        return;
      }
      
      // Formatta il testo in modo che si adatti correttamente alla pagina
      const formattedLines = doc.splitTextToSize(line, 170);
      
      // Applica il testo al documento
      doc.text(formattedLines, 20, yPosition);
      
      // Incrementa la posizione Y per la prossima riga
      yPosition += formattedLines.length * 6;
    });
    
    // Imposta la posizione finale per la firma (è un po' più in basso)
    const bulletY = yPosition + 10;
    
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
    
    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `${t('pdf.page')} ${i} ${t('pdf.of')} ${totalPages}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }
    
    return doc;
  };

  // Generate PDF document
  const generatePdf = () => {
    setIsGenerating(true);
    
    try {
      // Utilizza la funzione condivisa per generare il PDF
      const doc = generatePdfContent();
      
      // Salva il PDF con nome appropriato
      const fileName = `${client.firstName}_${client.lastName}_Onboarding_Form.pdf`;
      doc.save(fileName);
      
      // Set state to indicate PDF generation completed successfully
      setPdfGenerated(true);
      toast({
        title: currentLanguage === "english" ? "Success" : "Successo",
        description: currentLanguage === "english" ? "PDF generated successfully" : "PDF generato con successo",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: currentLanguage === "english" ? "Error" : "Errore",
        description: currentLanguage === "english" ? "Failed to generate PDF" : "Impossibile generare il PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to send email with PDF attachment
  const sendEmail = async () => {
    setIsSending(true);
    
    try {      
      // Generate PDF content
      const doc = generatePdfContent();
      
      // Convert PDF to base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Construct email data with translated subject and message
      const defaultSubject = t('pdf.emailDefaultSubject') || (currentLanguage === "english" ? 
        "Welcome to our consultancy service" : 
        "Benvenuto nel nostro servizio di consulenza");
      
      // Usa il contenuto della lettera come corpo dell'email
      const emailMessage = letterFields.fullContent;
      
      // Formato dati che corrisponde a quello atteso dal server
      const emailData = {
        subject: emailSubject || defaultSubject,
        message: emailMessage,
        language: currentLanguage,
        attachment: {
          filename: `${client.firstName}_${client.lastName}_Onboarding_Form.pdf`,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      };
      
      // Send email
      const response = await fetch(`/api/clients/${client.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Si è verificato un errore durante l'invio dell'email");
      }
      
      toast({
        title: currentLanguage === "english" ? "Success" : "Successo",
        description: currentLanguage === "english" ? "Email sent successfully" : "Email inviata con successo",
        variant: "default",
      });
      
      setShowSendEmailDialog(false);
      
    } catch (error) {
      console.error("Error sending email:", error);
      let errorMessage = currentLanguage === "english" 
        ? "Failed to send email" 
        : "Impossibile inviare l'email";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: currentLanguage === "english" ? "Error" : "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Function to update single letter field (full content)
  const handleLetterFieldChange = (field: keyof LetterFields, value: string) => {
    setLetterFields({
      ...letterFields,
      [field]: value
    });
  };

  // Non abbiamo più bisogno della funzione handleLanguageChange
  // poiché la lingua viene ereditata direttamente dalla pagina

  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main button to open the customize dialog */}
      <Button 
        onClick={() => setShowCustomizeDialog(true)} 
        className="w-full"
        variant="default"
        size="lg"
      >
        <FileText className="mr-2 h-5 w-5" />
        {t('pdf.generatePdf')}
      </Button>

      {/* Customize dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('pdf.customizeLetterContent')}</DialogTitle>
            <DialogDescription>
              {t('pdf.emailDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Rimosso il pulsante di cambio lingua perché ora la lingua viene ereditata dalla pagina */}
          
          <div className="grid grid-cols-1 gap-4 py-2">
            <div>
              <Label htmlFor="fullContent">{t('pdf.coverLetter.fields.fullContent')}</Label>
              <Textarea 
                id="fullContent" 
                rows={20}
                className="font-mono text-sm bg-white text-black"
                value={letterFields.fullContent}
                onChange={(e) => handleLetterFieldChange('fullContent', e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-4 flex justify-between sm:justify-between">
            <div className="flex space-x-2">
              <Button 
                onClick={generatePdf} 
                disabled={isGenerating}
                className="w-auto"
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileText className="mr-2 h-4 w-4" />
                {t('pdf.generatePdf')}
              </Button>
              
              <Button 
                onClick={() => setShowSendEmailDialog(true)} 
                disabled={!pdfGenerated || !client.email}
                variant="outline"
                className="w-auto"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('pdf.sendByEmail')}
              </Button>
            </div>
            
            <Button variant="secondary" onClick={() => setShowCustomizeDialog(false)}>
              {t('dashboard.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Dialog */}
      <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('pdf.sendByEmail')}</DialogTitle>
            <DialogDescription>
              {t('pdf.emailDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailSubject" className="text-right">
                {t('pdf.emailSubject')}
              </Label>
              <Input
                id="emailSubject"
                className="col-span-3"
                placeholder={currentLanguage === "english" ? "Welcome to our consultancy service" : "Benvenuto nel nostro servizio di consulenza"}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-4 text-sm text-muted-foreground">
                {t('pdf.emailBodyInfoMessage')}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={sendEmail}
              disabled={isSending}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('pdf.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}