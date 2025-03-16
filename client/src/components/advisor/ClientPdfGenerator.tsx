import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
}

export function ClientPdfGenerator({ client, assets, advisorSignature }: ClientPdfGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<string>("english");
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [emailSubject, setEmailSubject] = useState("");
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("letter");
  
  // Formato predefinito della lettera
  const defaultLetterTemplate = language === "english" 
    ? `Dear ${client.firstName},

It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.

Through in-depth analysis and advanced tools, we will work together to:
1. Optimize the composition of your portfolio based on your objectives and risk profile.
2. Identify tailored solutions for more effective and sustainable asset management over time.
3. Ensure transparent advice in line with best industry practices.

To complete the onboarding process, I invite you to review and return the attached documents, signed. This step is necessary to formalize our collaboration and proceed with the planned activities.

I remain available for any clarification or requirement. Thank you for your trust, and I am confident this will be the beginning of a valuable journey.

Kind regards,

${advisorSignature?.split('\n')?.[0] || "Financial Advisor"}
${advisorSignature?.split('\n')?.[1] || "Company"}
${advisorSignature?.split('\n')?.[2] || "email@example.com"}
${advisorSignature?.split('\n')?.[3] || "+1 123-456-7890"}`
    : `Gentile ${client.firstName},

È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.

Attraverso un'analisi approfondita e strumenti avanzati, lavoreremo insieme per:
1. Ottimizzare la composizione del tuo portafoglio in base ai tuoi obiettivi e al tuo profilo di rischio.
2. Individuare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo. 
3. Assicurare una consulenza trasparente e in linea con le migliori pratiche di settore.

Per completare il processo di onboarding, ti invito a verificare e restituire i documenti allegati, firmati. Questo passaggio è necessario per formalizzare la nostra collaborazione e procedere con le attività pianificate.

Resto a disposizione per qualsiasi chiarimento o esigenza. Ti ringrazio per la fiducia e sono certo che sarà l'inizio di un percorso di valore.

Un cordiale saluto,

${advisorSignature?.split('\n')?.[0] || "Consulente Finanziario"}
${advisorSignature?.split('\n')?.[1] || "Società"}
${advisorSignature?.split('\n')?.[2] || "email@esempio.com"}
${advisorSignature?.split('\n')?.[3] || "+39 123-456-7890"}`;

  // Stato per la lettera completamente personalizzabile
  const [letterContent, setLetterContent] = useState<string>(defaultLetterTemplate);

  // Gestisce il cambio di scheda
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Aggiorna la preview quando cambia la tab o il contenuto della lettera
  useEffect(() => {
    // Questo codice viene eseguito quando activeTab, letterContent o language cambiano
    if (activeTab === "preview") {
      // Forza un aggiornamento della preview
      const previewElement = document.querySelector('.preview-content');
      if (previewElement) {
        previewElement.textContent = letterContent;
      }
    }
  }, [activeTab, letterContent, language]);

  // Function to handle language change
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang === "english" ? "en" : "it");
    
    // Aggiorna il template della lettera quando cambia la lingua
    setLetterContent(
      lang === "english" 
        ? `Dear ${client.firstName},

It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.

Through in-depth analysis and advanced tools, we will work together to:
1. Optimize the composition of your portfolio based on your objectives and risk profile.
2. Identify tailored solutions for more effective and sustainable asset management over time.
3. Ensure transparent advice in line with best industry practices.

To complete the onboarding process, I invite you to review and return the attached documents, signed. This step is necessary to formalize our collaboration and proceed with the planned activities.

I remain available for any clarification or requirement. Thank you for your trust, and I am confident this will be the beginning of a valuable journey.

Kind regards,

${advisorSignature?.split('\n')?.[0] || "Financial Advisor"}
${advisorSignature?.split('\n')?.[1] || "Company"}
${advisorSignature?.split('\n')?.[2] || "email@example.com"}
${advisorSignature?.split('\n')?.[3] || "+1 123-456-7890"}`
        : `Gentile ${client.firstName},

È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.

Attraverso un'analisi approfondita e strumenti avanzati, lavoreremo insieme per:
1. Ottimizzare la composizione del tuo portafoglio in base ai tuoi obiettivi e al tuo profilo di rischio.
2. Individuare soluzioni su misura per una gestione patrimoniale più efficace e sostenibile nel tempo. 
3. Assicurare una consulenza trasparente e in linea con le migliori pratiche di settore.

Per completare il processo di onboarding, ti invito a verificare e restituire i documenti allegati, firmati. Questo passaggio è necessario per formalizzare la nostra collaborazione e procedere con le attività pianificate.

Resto a disposizione per qualsiasi chiarimento o esigenza. Ti ringrazio per la fiducia e sono certo che sarà l'inizio di un percorso di valore.

Un cordiale saluto,

${advisorSignature?.split('\n')?.[0] || "Consulente Finanziario"}
${advisorSignature?.split('\n')?.[1] || "Società"}
${advisorSignature?.split('\n')?.[2] || "email@esempio.com"}
${advisorSignature?.split('\n')?.[3] || "+39 123-456-7890"}`
    );
  };

  // Reset to default template
  const resetToDefaults = () => {
    setLetterContent(defaultLetterTemplate);
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
      
      // Mittente a sinistra in alto (nome, cognome, società, mail, telefono)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const fromLabel = language === "english" ? "From:" : "Da:";
      doc.text(fromLabel, 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.text(advisorName, 35, 25);
      if (advisorCompany) {
        doc.text(advisorCompany, 35, 30);
      }
      if (advisorEmail) {
        doc.text(advisorEmail, 35, 35);
      }
      if (advisorPhone) {
        doc.text(advisorPhone, 35, 40);
      }
      
      // Data in alto a destra
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(dateStr, rightMargin, 25, { align: "right" });
      
      // Destinatario veramente a destra (allineato correttamente)
      const toClientText = `${t('pdf.coverLetter.toClient')}:`;
      doc.text(toClientText, rightMargin, 50, { align: "right" });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${client.firstName} ${client.lastName}`, rightMargin, 55, { align: "right" });
      doc.setFont('helvetica', 'normal');
      if (client.email) {
        doc.text(client.email, rightMargin, 60, { align: "right" });
      }
      
      // Oggetto - adatta in base alla lingua
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const subjectLabel = language === "english" ? "Subject:" : "Oggetto:";
      doc.text(subjectLabel, 20, 75);
      doc.setFont('helvetica', 'normal');
      const subjectText = language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione";
      doc.text(subjectText, 65, 75);
      
      // Testo della lettera - tutto da letterContent
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const letterContentLines = doc.splitTextToSize(letterContent, 170);
      doc.text(letterContentLines, 20, 85);
      
      // ======== PAGINA 2 - INFORMAZIONI PERSONALI E PROFILO INVESTIMENTO ========
      doc.addPage();
      
      // Titolo documento
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.clientSummaryReport'), 105, 20, { align: "center" });
      
      // SECTION 1: Personal Information
      doc.setFontSize(14);
      doc.text(t('pdf.personalInformation'), 15, 40);
      doc.setDrawColor(41, 98, 255);
      doc.line(15, 43, 195, 43);
      
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
        startY: 50,
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
      
      // Titolo documento
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.clientSummaryReport'), 105, 20, { align: "center" });
      
      // Asset allocation section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.assetAllocation'), 15, 40);
      doc.setDrawColor(41, 98, 255);
      doc.line(15, 43, 195, 43);
      
      // Assets table
      if (assets && assets.length > 0) {
        // Calcola il valore totale per le percentuali
        const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        
        // Crea la tabella degli asset con la percentuale
        autoTable(doc, {
          startY: 50,
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
        doc.text(t('pdf.noAssetsFound'), 15, 55);
      }
      
      // Add client declaration
      const declarationY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 120;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('pdf.clientDeclaration'), 15, declarationY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
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
  const generateAndSendEmail = async () => {
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
      // Genera il PDF prima di inviare l'email
      const pdfDoc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Set PDF document properties
      pdfDoc.setProperties({
        title: `${t('pdf.title')} - ${client.firstName} ${client.lastName}`,
        subject: t('pdf.subject'),
        creator: 'Financial Advisor Platform',
        author: 'Financial Advisor'
      });
      
      // ======== PAGINA 1 - LETTERA DI ACCOMPAGNAMENTO ========
      
      // Estrai informazioni del consulente
      const advisorInfo = client.advisorId ? (advisorSignature?.split('\n') || []) : [];
      const advisorName = advisorInfo[0] || "Financial Advisor";
      const advisorCompany = advisorInfo[1] || "";
      const advisorEmail = advisorInfo[2] || "";
      const advisorPhone = advisorInfo[3] || "";
      
      // Usa Calibri (sans-serif) per la lettera
      pdfDoc.setFont('helvetica', 'normal'); // JSPDF non ha Calibri, helvetica è il più simile

      // Creo un margine destro per allineare correttamente
      const rightMargin = 190;
      
      // Mittente a sinistra in alto (nome, cognome, società, mail, telefono)
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'bold');
      const fromLabel = language === "english" ? "From:" : "Da:";
      pdfDoc.text(fromLabel, 20, 25);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(advisorName, 35, 25);
      if (advisorCompany) {
        pdfDoc.text(advisorCompany, 35, 30);
      }
      if (advisorEmail) {
        pdfDoc.text(advisorEmail, 35, 35);
      }
      if (advisorPhone) {
        pdfDoc.text(advisorPhone, 35, 40);
      }
      
      // Data in alto a destra
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      pdfDoc.text(dateStr, rightMargin, 25, { align: "right" });
      
      // Destinatario veramente a destra (allineato correttamente)
      const toClientText = `${t('pdf.coverLetter.toClient')}:`;
      pdfDoc.text(toClientText, rightMargin, 50, { align: "right" });
      
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(`${client.firstName} ${client.lastName}`, rightMargin, 55, { align: "right" });
      pdfDoc.setFont('helvetica', 'normal');
      if (client.email) {
        pdfDoc.text(client.email, rightMargin, 60, { align: "right" });
      }
      
      // Oggetto - adatta in base alla lingua
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'bold');
      const subjectLabel = language === "english" ? "Subject:" : "Oggetto:";
      pdfDoc.text(subjectLabel, 20, 75);
      pdfDoc.setFont('helvetica', 'normal');
      const subjectText = language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione";
      pdfDoc.text(subjectText, 65, 75);
      
      // Testo della lettera - tutto da letterContent
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'normal');
      const letterContentLines = pdfDoc.splitTextToSize(letterContent, 170);
      pdfDoc.text(letterContentLines, 20, 85);
      
      // ======== PAGINA 2 - INFORMAZIONI PERSONALI E PROFILO INVESTIMENTO ========
      pdfDoc.addPage();
      
      // Titolo documento
      pdfDoc.setFontSize(18);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(t('pdf.clientSummaryReport'), 105, 20, { align: "center" });
      
      // SECTION 1: Personal Information
      pdfDoc.setFontSize(14);
      pdfDoc.text(t('pdf.personalInformation'), 15, 40);
      pdfDoc.setDrawColor(41, 98, 255);
      pdfDoc.line(15, 43, 195, 43);
      
      // Client personal details
      pdfDoc.setFontSize(11);
      
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
      
      autoTable(pdfDoc, {
        startY: 50,
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
      const section2Y = (pdfDoc as any).lastAutoTable.finalY + 20;
      
      pdfDoc.setFontSize(14);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(t('pdf.investmentProfile'), 15, section2Y);
      pdfDoc.setDrawColor(41, 98, 255);
      pdfDoc.line(15, section2Y + 3, 195, section2Y + 3);
      
      // Investment profile details
      const investmentProfile = [
        [`${t('pdf.riskProfile')}:`, client.riskProfile ? t(`risk_profiles.${client.riskProfile}`) : t('pdf.notProvided')],
        [`${t('pdf.investmentGoal')}:`, client.investmentGoals?.length ? client.investmentGoals.map(goal => t(`investment_goals.${goal}`)).join(', ') : t('pdf.notProvided')],
        [`${t('pdf.investmentHorizon')}:`, client.investmentHorizon ? t(`investment_horizons.${client.investmentHorizon}`) : t('pdf.notProvided')],
        [`${t('pdf.experienceLevel')}:`, client.investmentExperience ? t(`experience_levels.${client.investmentExperience}`) : t('pdf.notProvided')],
      ];
      
      autoTable(pdfDoc, {
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
      pdfDoc.addPage();
      
      // Titolo documento
      pdfDoc.setFontSize(18);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(t('pdf.clientSummaryReport'), 105, 20, { align: "center" });
      
      // Asset allocation section
      pdfDoc.setFontSize(14);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(t('pdf.assetAllocation'), 15, 40);
      pdfDoc.setDrawColor(41, 98, 255);
      pdfDoc.line(15, 43, 195, 43);
      
      // Assets table
      if (assets && assets.length > 0) {
        // Calcola il valore totale per le percentuali
        const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        
        // Crea la tabella degli asset con la percentuale
        autoTable(pdfDoc, {
          startY: 50,
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
        pdfDoc.setFontSize(11);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.text(t('pdf.noAssetsFound'), 15, 55);
      }
      
      // Add client declaration
      const declarationY = (pdfDoc as any).lastAutoTable ? (pdfDoc as any).lastAutoTable.finalY + 20 : 120;
      
      pdfDoc.setFontSize(12);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(t('pdf.clientDeclaration'), 15, declarationY);
      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'normal');
      
      const declaration = t('pdf.clientDeclarationText');
      const splitDeclaration = pdfDoc.splitTextToSize(declaration, 180);
      pdfDoc.text(splitDeclaration, 15, declarationY + 10);
      
      // Add signature areas
      const signatureY = declarationY + 10 + splitDeclaration.length * 4.5 + 15;
      
      pdfDoc.setFontSize(11);
      pdfDoc.text(t('pdf.clientSignature'), 15, signatureY);
      
      // Aggiungi campo data accanto alla firma del cliente
      pdfDoc.text(t('pdf.date') + ': ___/___/_____', 15, signatureY + 35);
      
      pdfDoc.line(15, signatureY + 25, 85, signatureY + 25);
      
      // Add page numbers solo alle pagine del modulo (non alla lettera)
      const pageCount = pdfDoc.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        pdfDoc.setPage(i);
        
        // Page numbers - partendo da pag 1 per il modulo
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(100, 100, 100);
        pdfDoc.text(`${t('pdf.page')} ${i-1} ${t('pdf.of')} ${pageCount-1}`, 170, 285);
      }

      // Ottieni il PDF come base64
      const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
      
      // Invia il testo completo della lettera, il server gestirà la firma nell'email
      // Invia email con il PDF allegato
      const response = await apiRequest(`/api/clients/${client.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject || (language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"),
          message: letterContent,
          language: language === "english" ? "english" : "italian",
          attachment: {
            filename: `${client.firstName}_${client.lastName}_Onboarding_Form.pdf`,
            content: pdfBase64,
            encoding: 'base64'
          }
        }),
      });

      if (response.success) {
        // Salva anche il PDF
        pdfDoc.save(`${client.firstName}_${client.lastName}_Onboarding_Form.pdf`);
        
        toast({
          title: language === "english" ? "Email Sent" : "Email Inviata",
          description: language === "english" ? "Email sent successfully with PDF attachment" : "Email inviata con successo con PDF allegato",
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
          
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="mt-4"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="letter">
                {language === "english" ? "Cover Letter" : "Lettera di Accompagnamento"}
              </TabsTrigger>
              <TabsTrigger value="preview">
                {language === "english" ? "Preview" : "Anteprima"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="letter" className="space-y-4">
              <div className="flex justify-between mb-4">
                <Label htmlFor="language" className="text-base font-semibold">
                  {language === "english" ? "Language" : "Lingua"}
                </Label>
                <Select onValueChange={changeLanguage} defaultValue={language}>
                  <SelectTrigger id="language" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="italian">Italiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="letterContent">
                  {language === "english" ? "Letter Content" : "Contenuto della Lettera"}
                </Label>
                <Textarea
                  id="letterContent"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  rows={20}
                  className="font-mono"
                />
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetToDefaults}
                className="w-full"
              >
                {language === "english" ? "Reset to Default Text" : "Ripristina Testo Predefinito"}
              </Button>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-md p-6 bg-white shadow-sm divide-y max-h-[70vh] overflow-y-auto">
                {/* Header con mittente e data */}
                <div className="pb-4">
                  <div className="flex flex-row justify-between">
                    <div className="flex flex-col">
                      <div className="font-semibold mb-1">{language === "english" ? "From:" : "Da:"}</div>
                      <div>{client.advisorId ? advisorSignature?.split('\n')[0] || "Financial Advisor" : "Financial Advisor"}</div>
                      {client.advisorId && advisorSignature?.split('\n')[1] && <div>{advisorSignature?.split('\n')[1]}</div>}
                      {client.advisorId && advisorSignature?.split('\n')[2] && <div>{advisorSignature?.split('\n')[2]}</div>}
                      {client.advisorId && advisorSignature?.split('\n')[3] && <div>{advisorSignature?.split('\n')[3]}</div>}
                    </div>
                    <div className="text-right">
                      {new Date().toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Destinatario */}
                <div className="py-4">
                  <div className="text-right">
                    <div>{t('pdf.coverLetter.toClient')}:</div>
                    <div className="font-bold">{client.firstName} {client.lastName}</div>
                    <div>{client.email}</div>
                  </div>
                </div>
                
                {/* Oggetto */}
                <div className="py-4">
                  <div>
                    <span className="font-bold">{language === "english" ? "Subject: " : "Oggetto: "}</span>
                    <span>{emailSubject || (language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione")}</span>
                  </div>
                </div>
                
                {/* Contenuto lettera */}
                <div className="py-4">
                  <pre className="font-sans whitespace-pre-wrap preview-content">{letterContent}</pre>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                <span>{language === "english" ? "A full PDF with client information will be generated and attached to the email" : "Un PDF completo con le informazioni del cliente verrà generato e allegato all'email"}</span>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="sm:mr-auto"
            >
              {language === "english" ? "Cancel" : "Annulla"}
            </Button>
            
            <Button
              onClick={() => setShowSendEmailDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isGenerating}
            >
              <Mail className="mr-2 h-4 w-4" />
              {language === "english" ? "Generate & Send Email" : "Genera & Invia Email"}
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
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailSubject">
                {language === "english" ? "Email Subject" : "Oggetto Email"}
              </Label>
              <Input
                id="emailSubject"
                placeholder={language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <p className="text-sm">
              {language === "english" 
                ? "The complete letter will be used as the email body." 
                : "Il testo completo della lettera verrà utilizzato come corpo dell'email."}
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendEmailDialog(false)}
              disabled={isSending}
            >
              {language === "english" ? "Cancel" : "Annulla"}
            </Button>
            
            <Button
              onClick={generateAndSendEmail}
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