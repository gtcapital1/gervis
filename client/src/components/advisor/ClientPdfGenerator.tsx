import { useState } from "react";
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
  
  // Formato predefinito della lettera
  const defaultLetterTemplate = language === "english" 
    ? `Dear ${client.firstName},

It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.

Our collaboration will include:

1. Comprehensive financial planning tailored to your specific needs and goals
2. Regular portfolio reviews and adjustments
3. Strategic advice on investment opportunities
4. Tax optimization strategies
5. Ongoing support and guidance whenever you need it

My process is designed to be straightforward and transparent, with regular check-ins to ensure we're making progress toward your financial goals.

Please feel free to contact me anytime at [your phone number] or [your email] if you have questions or concerns.

Warm regards,

${advisorSignature?.split('\n')?.[0] || "Financial Advisor"}`
    : `Gentile ${client.firstName},

È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.

La nostra collaborazione comprenderà:

1. Pianificazione finanziaria completa e personalizzata in base alle tue esigenze e obiettivi
2. Revisioni e adeguamenti regolari del portafoglio
3. Consulenza strategica sulle opportunità di investimento
4. Strategie di ottimizzazione fiscale
5. Supporto e guida continui quando ne hai bisogno

Il mio processo è progettato per essere semplice e trasparente, con controlli regolari per assicurare che stiamo facendo progressi verso i tuoi obiettivi finanziari.

Non esitare a contattarmi in qualsiasi momento al [tuo numero di telefono] o [tua email] se hai domande o dubbi.

Cordiali saluti,

${advisorSignature?.split('\n')?.[0] || "Consulente Finanziario"}`;

  // Stato per la lettera completamente personalizzabile
  const [letterContent, setLetterContent] = useState(defaultLetterTemplate);

  // Function to handle language change
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang === "english" ? "en" : "it");
    
    // Aggiorna il template della lettera quando cambia la lingua
    setLetterContent(
      lang === "english" 
        ? `Dear ${client.firstName},

It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.

Our collaboration will include:

1. Comprehensive financial planning tailored to your specific needs and goals
2. Regular portfolio reviews and adjustments
3. Strategic advice on investment opportunities
4. Tax optimization strategies
5. Ongoing support and guidance whenever you need it

My process is designed to be straightforward and transparent, with regular check-ins to ensure we're making progress toward your financial goals.

Please feel free to contact me anytime at [your phone number] or [your email] if you have questions or concerns.

Warm regards,

${advisorSignature?.split('\n')?.[0] || "Financial Advisor"}`
        : `Gentile ${client.firstName},

È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.

La nostra collaborazione comprenderà:

1. Pianificazione finanziaria completa e personalizzata in base alle tue esigenze e obiettivi
2. Revisioni e adeguamenti regolari del portafoglio
3. Consulenza strategica sulle opportunità di investimento
4. Strategie di ottimizzazione fiscale
5. Supporto e guida continui quando ne hai bisogno

Il mio processo è progettato per essere semplice e trasparente, con controlli regolari per assicurare che stiamo facendo progressi verso i tuoi obiettivi finanziari.

Non esitare a contattarmi in qualsiasi momento al [tuo numero di telefono] o [tua email] se hai domande o dubbi.

Cordiali saluti,

${advisorSignature?.split('\n')?.[0] || "Consulente Finanziario"}`
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
      const response = await apiRequest(`/api/clients/${client.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject || (language === "english" ? "Beginning of our collaboration" : "Avvio della nostra collaborazione"),
          message: letterContent,
          language: language === "english" ? "english" : "italian"
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
                
                <div className="mt-4 whitespace-pre-line">
                  {letterContent}
                </div>
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