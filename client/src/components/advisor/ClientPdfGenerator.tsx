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
import { Loader2, FileText, ArrowRight, Mail } from 'lucide-react';
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
  isOnboarded: boolean;
  riskProfile: string;
  investmentGoals: string[];
  investmentHorizon: string;
  investmentExperience: string;
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
  greeting: string;
  introduction: string;
  collaboration: string;
  servicePoints: string[];
  process: string;
  contactInfo: string;
  closing: string;
}

export function ClientPdfGenerator({ client, assets, advisorSignature, companyLogo, companyInfo }: ClientPdfGeneratorProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const language = i18n.language || "italian"; // Imposta l'italiano come lingua di default
  
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  
  const [letterFields, setLetterFields] = useState<LetterFields>({
    greeting: '',
    introduction: '',
    collaboration: '',
    servicePoints: ['', '', '', ''],
    process: '',
    contactInfo: '',
    closing: ''
  });
  
  // Imposta i campi della lettera in base alla lingua corrente
  useEffect(() => {
    setLetterFieldsByLanguage(language);
  }, [language]);
  
  // Funzione per impostare i campi della lettera in base alla lingua
  const setLetterFieldsByLanguage = (lang: string) => {
    const defaultLetterFields: LetterFields = {
      greeting: t('pdf.coverLetter.greeting'),
      introduction: t('pdf.coverLetter.introduction', { firstName: client.firstName, lastName: client.lastName }),
      collaboration: t('pdf.coverLetter.collaboration'),
      servicePoints: [
        t('pdf.coverLetter.servicePoint1'),
        t('pdf.coverLetter.servicePoint2'),
        t('pdf.coverLetter.servicePoint3'),
        t('pdf.coverLetter.servicePoint4')
      ],
      process: t('pdf.coverLetter.process'),
      contactInfo: t('pdf.coverLetter.contactInfo'),
      closing: t('pdf.coverLetter.closing')
    };
    
    setLetterFields(defaultLetterFields);
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
    setIsSending(true);
    
    try {
      // Crea una stringa concatenata di tutti i punti per evitare problemi con gli array
      const allServicePoints = letterFields.servicePoints.map((p, i) => `${i+1}. ${p}`).join("\n");
      
      // Generate PDF content
      const doc = generatePdfContent();
      
      // Convert PDF to base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Construct email data
      const emailData = {
        to: client.email,
        subject: emailSubject || (language === "english" ? "Welcome to our consultancy service" : "Benvenuto nel nostro servizio di consulenza"),
        message: emailCustomMessage || (language === "english" ? 
          `Dear ${client.firstName} ${client.lastName},\n\nThank you for choosing our financial advisory service. Attached you will find your onboarding document.\n\nBest regards` : 
          `Gentile ${client.firstName} ${client.lastName},\n\nGrazie per aver scelto il nostro servizio di consulenza finanziaria. In allegato troverà il documento di onboarding.\n\nCordiali saluti`),
        includeAttachment: true,
        pdfBase64,
        fileName: `${client.firstName}_${client.lastName}_Onboarding_Form.pdf`,
      };
      
      // Send email
      const response = await fetch('/api/clients/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });
      
      toast({
        title: language === "english" ? "Success" : "Successo",
        description: language === "english" ? "Email sent successfully" : "Email inviata con successo",
        variant: "default",
      });
      
      setShowSendEmailDialog(false);
      
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
  const handleServicePointChange = (index: number, value: string) => {
    const updatedServicePoints = [...letterFields.servicePoints];
    updatedServicePoints[index] = value;
    
    setLetterFields({
      ...letterFields,
      servicePoints: updatedServicePoints
    });
  };

  // Function to update single letter field
  const handleLetterFieldChange = (field: keyof LetterFields, value: string) => {
    setLetterFields({
      ...letterFields,
      [field]: value
    });
  };

  // Function to handle language switch and update letter fields
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setLetterFieldsByLanguage(lang);
  };

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
          
          <div className="flex justify-end space-x-2 mb-4">
            <RadioGroup 
              defaultValue={language}
              className="flex space-x-2 border rounded-lg p-1"
              onValueChange={handleLanguageChange}
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="italian" id="italian" />
                <Label htmlFor="italian">Italiano</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="english" id="english" />
                <Label htmlFor="english">English</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-1 gap-4 py-2">
            <div>
              <Label htmlFor="greeting">{t('pdf.coverLetter.fields.greeting')}</Label>
              <Input 
                id="greeting" 
                value={letterFields.greeting}
                onChange={(e) => handleLetterFieldChange('greeting', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="introduction">{t('pdf.coverLetter.fields.introduction')}</Label>
              <Textarea 
                id="introduction" 
                rows={3}
                value={letterFields.introduction}
                onChange={(e) => handleLetterFieldChange('introduction', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="collaboration">{t('pdf.coverLetter.fields.collaboration')}</Label>
              <Textarea 
                id="collaboration" 
                rows={3}
                value={letterFields.collaboration}
                onChange={(e) => handleLetterFieldChange('collaboration', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('pdf.coverLetter.fields.servicePoints')}</Label>
              {letterFields.servicePoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2 text-sm font-medium">{index + 1}.</span>
                  <Input 
                    value={point}
                    onChange={(e) => handleServicePointChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
            
            <div>
              <Label htmlFor="process">{t('pdf.coverLetter.fields.process')}</Label>
              <Textarea 
                id="process" 
                rows={3}
                value={letterFields.process}
                onChange={(e) => handleLetterFieldChange('process', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="contactInfo">{t('pdf.coverLetter.fields.contactInfo')}</Label>
              <Textarea 
                id="contactInfo" 
                rows={2}
                value={letterFields.contactInfo}
                onChange={(e) => handleLetterFieldChange('contactInfo', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="closing">{t('pdf.coverLetter.fields.closing')}</Label>
              <Input 
                id="closing" 
                value={letterFields.closing}
                onChange={(e) => handleLetterFieldChange('closing', e.target.value)}
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
                placeholder={language === "english" ? "Welcome to our consultancy service" : "Benvenuto nel nostro servizio di consulenza"}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailMessage" className="text-right">
                {t('pdf.emailMessage')}
              </Label>
              <Textarea
                id="emailMessage"
                className="col-span-3"
                rows={4}
                placeholder={language === "english" ? 
                  `Dear ${client.firstName} ${client.lastName},\n\nThank you for choosing our financial advisory service. Attached you will find your onboarding document.\n\nBest regards` : 
                  `Gentile ${client.firstName} ${client.lastName},\n\nGrazie per aver scelto il nostro servizio di consulenza finanziaria. In allegato troverà il documento di onboarding.\n\nCordiali saluti`}
                value={emailCustomMessage}
                onChange={(e) => setEmailCustomMessage(e.target.value)}
              />
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