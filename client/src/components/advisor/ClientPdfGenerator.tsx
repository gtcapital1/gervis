import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";
import { Client as ClientSchema } from "@shared/schema";

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
  const [language, setLanguage] = useState<string>("english");
  const { t, i18n } = useTranslation();
  
  // Testi predefiniti in inglese e italiano
  const defaultEnglishText = "It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations.";
  const defaultItalianText = "È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti.";

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    // Cambia immediatamente la lingua per il PDF
    i18n.changeLanguage(lang === "english" ? "en" : "it");
    
    // Aggiorna anche il testo personalizzato in base alla lingua selezionata
    setCustomLetterText(lang === "english" ? defaultEnglishText : defaultItalianText);
    console.log("Language changed to:", lang, "i18n language:", i18n.language);
  };
  
  // Stato per il testo personalizzato della lettera
  const [customLetterText, setCustomLetterText] = useState<string>(
    language === "english" ? defaultEnglishText : defaultItalianText
  );
  
  // Aggiorna il testo quando cambia la lingua
  useEffect(() => {
    if (language === "english") {
      document.documentElement.lang = "en";
    } else {
      document.documentElement.lang = "it";
    }
  }, [language]);
  
  const generatePdf = () => {
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
    const greetingText = `${t('pdf.coverLetter.greetings')} ${client.firstName},`;
    doc.text(greetingText, 20, 85);
    
    // Corpo della lettera - utilizziamo il testo personalizzato
    const introLines = doc.splitTextToSize(customLetterText, 170);
    doc.text(introLines, 20, 95);
    
    // Collaboration text
    const collaborationText = t('pdf.coverLetter.collaboration');
    doc.text(collaborationText, 20, 125);
    
    // Punti numerati
    const points = t('pdf.coverLetter.points', { returnObjects: true }) as string[];
    let bulletY = 132;
    
    for (let i = 0; i < points.length; i++) {
      const pointLines = doc.splitTextToSize(`${i+1}. ${points[i]}`, 160);
      doc.text(pointLines, 25, bulletY);
      bulletY += pointLines.length * 6;
    }
    
    // Process text
    const processText = t('pdf.coverLetter.process');
    const processLines = doc.splitTextToSize(processText, 170);
    doc.text(processLines, 20, bulletY + 5);
    
    // Contact info
    const contactText = t('pdf.coverLetter.contactInfo');
    const contactLines = doc.splitTextToSize(contactText, 170);
    doc.text(contactLines, 20, bulletY + 20);
    
    // Chiusura e firma
    doc.text(t('pdf.coverLetter.closing'), 20, bulletY + 40);
    
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
  };
  
  // Funzione per aggiornare il testo della lettera personalizzata
  const updateCustomLetterText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomLetterText(e.target.value);
  };

  // Ripristina il testo predefinito in base alla lingua
  const resetToDefaultText = () => {
    setCustomLetterText(
      language === "english" 
        ? "It's a genuine pleasure to welcome you and begin this collaboration. My goal is to offer you a highly personalized advisory service, designed to help you manage your assets strategically and efficiently, with a cost-conscious approach and in full compliance with current regulations."
        : "È un vero piacere darti il benvenuto e iniziare questa collaborazione. Il mio obiettivo è offrirti un servizio di consulenza altamente personalizzato, pensato per aiutarti a gestire il tuo patrimonio in modo strategico ed efficiente, con un approccio attento ai costi e nel pieno rispetto delle normative vigenti."
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <FileText className="h-4 w-4" />
          {t('pdf.generatePdf')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">{t('pdf.selectLanguage')}</Label>
            <Select onValueChange={changeLanguage} defaultValue={language}>
              <SelectTrigger id="language">
                <SelectValue placeholder={t('pdf.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="italian">Italiano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customText">
              {language === "english" ? "Custom letter text" : "Testo personalizzato della lettera"}
            </Label>
            <Textarea 
              id="customText" 
              value={customLetterText}
              onChange={updateCustomLetterText}
              rows={6}
              className="resize-none"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetToDefaultText}
              className="text-xs w-full"
            >
              {language === "english" ? "Reset to default text" : "Ripristina testo predefinito"}
            </Button>
          </div>
          
          <Button className="w-full" onClick={generatePdf}>
            {t('pdf.generate')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}