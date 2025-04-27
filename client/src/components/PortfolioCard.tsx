import { Eye, Calendar, Coins, Clock, Trash2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import React from "react";
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  Tooltip as RechartsTooltip,
  Legend 
} from "recharts";

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/utils";

// Importa le interfacce condivise
import { AllocationItem, ModelPortfolio } from "@/types/portfolio";

// Importa il nuovo componente
import SimpleAllocationPieChart from "./SimpleAllocationPieChart";

interface PortfolioCardProps {
  portfolio: ModelPortfolio;
  onViewDetails: (portfolio: ModelPortfolio) => void;
  getCategoryColor: (category: string) => string;
  getRiskLevelColor: (riskLevel: string) => string;
  onDeletePortfolio?: (portfolioId: number) => void;
}

export default function PortfolioCard({ 
  portfolio, 
  onViewDetails, 
  getCategoryColor, 
  getRiskLevelColor,
  onDeletePortfolio
}: PortfolioCardProps) {
  const { t } = useTranslation();
  
  // Debug info
  React.useEffect(() => {
    // Console log rimossi
  }, [portfolio]);

  // Funzione per determinare il colore del badge SRI
  const getSRIColor = (risk: number | undefined) => {
    if (!risk) return 'bg-gray-200 text-gray-800';
    if (risk <= 2) return 'bg-blue-200 text-blue-800';
    if (risk <= 3) return 'bg-green-200 text-green-800';
    if (risk <= 4) return 'bg-yellow-200 text-yellow-800';
    if (risk <= 5) return 'bg-orange-200 text-orange-800';
    return 'bg-red-200 text-red-800';
  };

  // Formatta il rischio con un decimale
  const formatRisk = (risk: number | undefined) => {
    if (!risk) return "N/D";
    try {
      // Assicuriamoci che sia un numero
      const riskNumber = Number(risk);
      return isNaN(riskNumber) ? "N/D" : riskNumber.toFixed(1);
    } catch (e) {
      console.error("Error formatting risk:", e);
      return "N/D";
    }
  };

  // Formatta l'orizzonte temporale con un decimale
  const formatHorizon = () => {
    // Controlla tutte le possibili varianti del nome
    const value = portfolio.averageInvestmentHorizon !== undefined 
      ? portfolio.averageInvestmentHorizon 
      : portfolio.average_time_horizon !== undefined
        ? portfolio.average_time_horizon
        : (portfolio as any).averageTimeHorizon;
                  
    if (value === undefined || value === null) return "N/D";
    
    // Conversione a numero
    const numHorizon = Number(value);
    
    if (!isNaN(numHorizon) && numHorizon > 0) {
      return `${numHorizon.toFixed(1)} anni`;
    }
    
    return "N/D";
  };

  return (
    <Card 
      className="overflow-hidden border border-muted hover:shadow-md transition-all cursor-pointer group relative"
      onClick={() => onViewDetails(portfolio)}
    >
      <div 
        className={`absolute top-0 left-0 h-1 w-full ${getRiskLevelColor(portfolio.riskLevel).split(' ')[0]}`}
      ></div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2">{portfolio.name}</CardTitle>
          <Badge className={`${getSRIColor(portfolio.averageRisk)} px-2.5 min-w-[80px] text-center whitespace-nowrap`}>
            SRI: {formatRisk(portfolio.averageRisk)} / 7
          </Badge>
        </div>
        <CardDescription className="line-clamp-3 text-sm mt-2">
          {portfolio.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
            <Calendar className="h-3 w-3" />
            <span>{new Date(portfolio.createdAt).toLocaleDateString()}</span>
          </div>
          
          {/* Rimosso il badge della logica di costruzione */}
        </div>
      
        <div className="mt-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('portfolio.asset_allocation')}
            </h4>
          </div>
        
          {portfolio.asset_class_distribution && 
           typeof portfolio.asset_class_distribution === 'object' && 
           !Array.isArray(portfolio.asset_class_distribution) &&
           Object.keys(portfolio.asset_class_distribution).length > 0 ? (
            <div className="h-36">
              <SimpleAllocationPieChart 
                allocationData={portfolio.asset_class_distribution}
                getCategoryColor={getCategoryColor}
                height={120}
              />
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center text-muted-foreground text-sm">
              <div>
                {t('portfolio.no_allocation')}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Coins className="h-3 w-3" />
              TER
            </div>
            <div className="font-semibold text-black">
              {portfolio.totalAnnualCost ? formatPercent(Number(portfolio.totalAnnualCost), 2) : "N/D"}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              Orizzonte consigliato medio
            </div>
            <div className="font-semibold">
              {formatHorizon()}
            </div>
          </div>
        </div>
      </CardContent>
      {onDeletePortfolio && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button 
            variant="destructive" 
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(t('portfolio.confirm_delete'))) {
                onDeletePortfolio(portfolio.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
} 