import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { Label } from "@/components/ui/label";

interface ClientPdfGeneratorProps {
  client: ClientSchema;
  assets: Asset[];
  advisorSignature?: string | null;
}

export function ClientPdfGenerator({ client, assets, advisorSignature }: ClientPdfGeneratorProps) {
  const [language, setLanguage] = useState<string>("english");
  const { t, i18n } = useTranslation();
  
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    // Cambia immediatamente la lingua per il PDF
    i18n.changeLanguage(lang === "english" ? "en" : "it");
    console.log("Language changed to:", lang, "i18n language:", i18n.language);
  };
  
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
    
    // Intestazione in alto
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.coverLetter.heading'), 105, 20, { align: "center" });
    
    // Mittente (Consulente)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('pdf.coverLetter.fromAdvisor')}:`, 15, 40);
    doc.setFont('helvetica', 'normal');
    
    // Estrai nome, cognome e società dalla firma
    const advisorInfo = client.advisorId ? (advisorSignature?.split('\n') || []) : [];
    const advisorName = advisorInfo[0] || "Financial Advisor";
    const advisorCompany = advisorInfo[1] || "";
    
    doc.text(advisorName, 45, 40);
    if (advisorCompany) {
      doc.text(advisorCompany, 45, 46);
    }
    
    // Data
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('pdf.coverLetter.date')}:`, 140, 40);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(dateStr, 155, 40);
    
    // Linea separatrice
    doc.setDrawColor(100, 100, 100);
    doc.line(15, 50, 195, 50);
    
    // Destinatario (Cliente)
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('pdf.coverLetter.toClient')}:`, 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${client.firstName} ${client.lastName}`, 45, 60);
    
    // Oggetto
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('pdf.coverLetter.subject')}:`, 15, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf.coverLetter.title'), 45, 70);
    
    // Spazio
    const greetingText = `${t('pdf.coverLetter.greetings')} ${client.firstName},`;
    doc.text(greetingText, 15, 85);
    
    // Corpo della lettera
    const introText = t('pdf.coverLetter.intro');
    const introLines = doc.splitTextToSize(introText, 180);
    doc.text(introLines, 15, 95);
    
    // Collaboration text
    const collaborationText = t('pdf.coverLetter.collaboration');
    doc.text(collaborationText, 15, 115);
    
    // Bullet points
    const points = t('pdf.coverLetter.points', { returnObjects: true }) as string[];
    let bulletY = 122;
    
    for (const point of points) {
      doc.text(`- ${point}`, 20, bulletY);
      bulletY += 7;
    }
    
    // Process text
    const processText = t('pdf.coverLetter.process');
    const processLines = doc.splitTextToSize(processText, 180);
    doc.text(processLines, 15, bulletY + 5);
    
    // Contact info
    const contactText = t('pdf.coverLetter.contactInfo');
    const contactLines = doc.splitTextToSize(contactText, 180);
    doc.text(contactLines, 15, bulletY + 20);
    
    // Chiusura e firma
    doc.text(t('pdf.coverLetter.closing'), 15, bulletY + 40);
    
    // Nome, cognome e società nella firma
    doc.text(advisorName, 15, bulletY + 50);
    if (advisorCompany) {
      doc.text(advisorCompany, 15, bulletY + 56);
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
      [`${t('onboarding.income')}:`, client.annualIncome ? formatCurrency(client.annualIncome) + ' €' : t('pdf.notProvided')],
      [`${t('onboarding.expenses')}:`, client.monthlyExpenses ? formatCurrency(client.monthlyExpenses) + ' €' : t('pdf.notProvided')],
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
            formatCurrency(asset.value) + ' €',
            `${Math.round((asset.value / totalValue) * 100)}%`
          ]),
          // Aggiungi il totale come ultima riga della tabella
          [
            `${t('pdf.totalAssetsValue')}`,
            formatCurrency(totalValue) + ' €',
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
    
    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Page numbers
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${t('pdf.page')} ${i} ${t('pdf.of')} ${pageCount}`, 170, 285);
    }
    
    // Save the PDF
    doc.save(`${client.firstName}_${client.lastName}_Onboarding_Form.pdf`);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <FileText className="h-4 w-4" />
          {t('pdf.generatePdf')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
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
          <Button className="w-full" onClick={generatePdf}>
            {t('pdf.generate')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}