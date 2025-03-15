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
      title: `${t('pdf.title')} - ${client.name}`,
      subject: t('pdf.subject'),
      creator: 'Watson Financial Platform',
      author: 'Financial Advisor'
    });
    
    // Add letterhead
    doc.setFillColor(41, 98, 255);
    doc.rect(0, 0, 210, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Watson Financial", 15, 15);
    
    // Add document title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(t('pdf.clientSummaryReport'), 15, 40);
    
    // Add date
    const now = new Date();
    const dateStr = now.toLocaleDateString(language === "english" ? "en-US" : "it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFontSize(10);
    doc.text(`${t('pdf.generatedOn')}: ${dateStr}`, 15, 50);
    
    // Client information
    doc.setFontSize(14);
    doc.text(t('pdf.clientInformation'), 15, 65);
    doc.setDrawColor(41, 98, 255);
    doc.line(15, 68, 195, 68);
    
    // Client details
    doc.setFontSize(11);
    const clientInfo = [
      [`${t('pdf.name')}:`, client.name],
      [`${t('pdf.email')}:`, client.email],
      [`${t('pdf.phone')}:`, client.phone || t('pdf.notProvided')],
      [`${t('pdf.address')}:`, client.address || t('pdf.notProvided')],
      [`${t('pdf.riskProfile')}:`, client.riskProfile ? t(`risk_profiles.${client.riskProfile}`) : t('pdf.notProvided')],
      [`${t('pdf.investmentGoal')}:`, client.investmentGoals?.length ? client.investmentGoals.map(goal => t(`investment_goals.${goal}`)).join(', ') : t('pdf.notProvided')],
      [`${t('pdf.investmentHorizon')}:`, client.investmentHorizon ? t(`investment_horizons.${client.investmentHorizon}`) : t('pdf.notProvided')],
      [`${t('pdf.experienceLevel')}:`, client.investmentExperience ? t(`experience_levels.${client.investmentExperience}`) : t('pdf.notProvided')],
    ];
    
    autoTable(doc, {
      startY: 75,
      head: [],
      body: clientInfo,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      },
      styles: {
        fontSize: 11,
        cellPadding: 3,
      },
    });
    
    // Asset information
    const lastY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(14);
    doc.text(t('pdf.assetsInformation'), 15, lastY + 15);
    doc.setDrawColor(41, 98, 255);
    doc.line(15, lastY + 18, 195, lastY + 18);
    
    // Assets table
    if (assets && assets.length > 0) {
      // Calcola il valore totale per le percentuali
      const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Crea la tabella degli asset con la percentuale
      autoTable(doc, {
        startY: lastY + 25,
        head: [[
          t('pdf.category'),
          t('pdf.value'),
          '%'
        ]],
        body: [
          ...assets.map(asset => [
            t(`asset_categories.${asset.category}`),
            formatCurrency(asset.value),
            `${Math.round((asset.value / totalValue) * 100)}%`
          ]),
          // Aggiungi il totale come ultima riga della tabella
          [
            `${t('pdf.totalAssetsValue')}`,
            formatCurrency(totalValue),
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
      doc.text(t('pdf.noAssetsFound'), 15, lastY + 30);
    }
    
    // Add client declaration
    const declarationY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : lastY + 40;
    
    doc.setFontSize(12);
    doc.text(t('pdf.clientDeclaration'), 15, declarationY);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const declaration = t('pdf.clientDeclarationText');
    const splitDeclaration = doc.splitTextToSize(declaration, 180);
    doc.text(splitDeclaration, 15, declarationY + 10);
    
    // Add signature areas
    const signatureY = declarationY + 10 + splitDeclaration.length * 4.5 + 15;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(t('pdf.advisorSignature'), 15, signatureY);
    doc.text(t('pdf.clientSignature'), 110, signatureY);
    
    // Aggiungi campo data accanto alla firma del cliente
    doc.text(t('pdf.date') + ': ___/___/_____', 110, signatureY + 35);
    
    doc.line(15, signatureY + 25, 85, signatureY + 25);
    doc.line(110, signatureY + 25, 180, signatureY + 25);
    
    // Add advisor signature if available and valid
    if (advisorSignature) {
      try {
        doc.addImage(advisorSignature, 'PNG', 15, signatureY + 5, 70, 20);
      } catch (error) {
        console.warn("Could not add advisor signature image:", error);
        // Instead add text to indicate a signature would be here
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(t('pdf.signatureHere'), 35, signatureY + 15);
      }
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(41, 98, 255);
      doc.line(15, 280, 195, 280);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Watson Financial Services | www.watsonfinancial.com', 15, 285);
      doc.text(`${t('pdf.page')} ${i} ${t('pdf.of')} ${pageCount}`, 170, 285);
    }
    
    // Save the PDF
    doc.save(`${client.name.replace(/\s+/g, '_')}_Financial_Summary.pdf`);
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