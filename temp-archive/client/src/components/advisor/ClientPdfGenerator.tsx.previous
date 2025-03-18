import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText, Mail } from "lucide-react";
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

export function ClientPdfGenerator({ client, assets, advisorSignature }: ClientPdfGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<string>("english");
  const { t, i18n } = useTranslation();
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
    introduction: language === "english" 
      ? "It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations."
      : "È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.",
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
      introduction: language === "english" 
        ? "It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations."
        : "È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.",
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
      
      // Saluti
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(letterFields.greeting, 20, 85);
      
      // Corpo della lettera - introduzione personalizzata
      const introLines = doc.splitTextToSize(letterFields.introduction, 170);
      doc.text(introLines, 20, 95);
      
      // Testo collaborazione
      const collaborationLines = doc.splitTextToSize(letterFields.collaboration, 170);
      doc.text(collaborationLines, 20, 125);
      
      // Punti numerati personalizzati
      let bulletY = 132;
      
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
      // Crea il corpo della mail composto solo dal testo della lettera (senza intestazioni)
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
                <Label htmlFor="greeting">
                  {language === "english" ? "Greeting" : "Saluto"}
                </Label>
                <Input
                  id="greeting"
                  value={letterFields.greeting}
                  onChange={(e) => setLetterFields({...letterFields, greeting: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="introduction">
                  {language === "english" ? "Introduction" : "Introduzione"}
                </Label>
                <Textarea
                  id="introduction"
                  value={letterFields.introduction}
                  onChange={(e) => setLetterFields({...letterFields, introduction: e.target.value})}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collaboration">
                  {language === "english" ? "Collaboration Text" : "Testo Collaborazione"}
                </Label>
                <Textarea
                  id="collaboration"
                  value={letterFields.collaboration}
                  onChange={(e) => setLetterFields({...letterFields, collaboration: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>
                    {language === "english" ? "Service Points" : "Punti del Servizio"}
                  </Label>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={addServicePoint}
                  >
                    {language === "english" ? "Add Point" : "Aggiungi Punto"}
                  </Button>
                </div>
                
                {letterFields.servicePoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-none w-8 text-center pt-2 font-bold">{index + 1}.</div>
                    <Textarea
                      value={point}
                      onChange={(e) => updateServicePoint(index, e.target.value)}
                      rows={2}
                      className="flex-grow"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost" 
                      className="flex-none h-10 mt-1"
                      onClick={() => removeServicePoint(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="process">
                  {language === "english" ? "Process Text" : "Testo Processo"}
                </Label>
                <Textarea
                  id="process"
                  value={letterFields.process}
                  onChange={(e) => setLetterFields({...letterFields, process: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactInfo">
                  {language === "english" ? "Contact Information" : "Informazioni di Contatto"}
                </Label>
                <Textarea
                  id="contactInfo"
                  value={letterFields.contactInfo}
                  onChange={(e) => setLetterFields({...letterFields, contactInfo: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="closing">
                  {language === "english" ? "Closing" : "Chiusura"}
                </Label>
                <Textarea
                  id="closing"
                  value={letterFields.closing}
                  onChange={(e) => setLetterFields({...letterFields, closing: e.target.value})}
                  rows={2}
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
              <div className="border rounded-md p-4 bg-gray-50 space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">{language === "english" ? "From:" : "Da:"}</p>
                    <p>{client.advisorId ? advisorSignature?.split('\n')[0] || "Financial Advisor" : "Financial Advisor"}</p>
                  </div>
                  <div className="text-right">
                    <p>{new Date().toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</p>
                  </div>
                </div>
                
                <div className="text-right mt-6">
                  <p>{t('pdf.coverLetter.toClient')}:</p>
                  <p className="font-bold">{client.firstName} {client.lastName}</p>
                  <p>{client.email}</p>
                </div>
                
                <div className="mt-4">
                  <p>
                    <span className="font-bold">{language === "english" ? "Subject: " : "Oggetto: "}</span>
                    <span>{language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"}</span>
                  </p>
                </div>
                
                <div className="mt-4">
                  <p>{letterFields.greeting}</p>
                  <p className="mt-2">{letterFields.introduction}</p>
                  <p className="mt-4">{letterFields.collaboration}</p>
                  
                  <ul className="mt-2 pl-4">
                    {letterFields.servicePoints.map((point, index) => (
                      <li key={index} className="mt-1">
                        <span className="font-bold">{index + 1}. </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  
                  <p className="mt-4">{letterFields.process}</p>
                  <p className="mt-4">{letterFields.contactInfo}</p>
                  <p className="mt-4">{letterFields.closing}</p>
                  
                  <p className="mt-4 font-bold">
                    {client.advisorId ? advisorSignature?.split('\n')[0] || "Financial Advisor" : "Financial Advisor"}
                  </p>
                  <p>
                    {client.advisorId ? advisorSignature?.split('\n')[1] || "" : ""}
                  </p>
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
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  generatePdf();
                  setShowSendEmailDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isGenerating}
              >
                <Mail className="mr-2 h-4 w-4" />
                {language === "english" ? "Generate & Send Email" : "Genera & Invia Email"}
              </Button>
              
              <Button
                onClick={generatePdf}
                className="bg-green-600 hover:bg-green-700"
                disabled={isGenerating}
              >
                <FileText className="mr-2 h-4 w-4" />
                {language === "english" ? "Generate PDF" : "Genera PDF"}
              </Button>
            </div>
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
            
            <div className="space-y-2">
              <Label htmlFor="emailMessage">
                {language === "english" ? "Email Message (Optional)" : "Messaggio Email (Opzionale)"}
              </Label>
              <Textarea
                id="emailMessage"
                placeholder={language === "english" ? "Leave blank to use cover letter text" : "Lascia vuoto per usare il testo della lettera"}
                value={emailCustomMessage}
                onChange={(e) => setEmailCustomMessage(e.target.value)}
                rows={6}
              />
              <p className="text-sm text-gray-500">
                {language === "english" 
                  ? "If left blank, the cover letter text will be used as the email body." 
                  : "Se lasciato vuoto, il testo della lettera di accompagnamento sarà usato come corpo dell'email."}
              </p>
            </div>
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