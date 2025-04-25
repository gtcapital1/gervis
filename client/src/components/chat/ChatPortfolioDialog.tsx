import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Save, BookOpen, Pencil } from "lucide-react";
import { useTranslation } from 'react-i18next';

// Define types
export interface PortfolioAllocation {
  isinId: number;
  isin: string;
  name: string;
  category: string;
  percentage: number;
}

export interface AssetClassDistribution {
  [key: string]: number;
}

export interface PortfolioMetrics {
  averageRisk: number;
  averageInvestmentHorizon: number | null;
  assetClassDistribution: AssetClassDistribution;
}

export interface PortfolioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: {
    name: string;
    description: string;
    clientProfile: string;
    riskLevel: string;
    investmentHorizon: string;
    allocation: PortfolioAllocation[];
    generationLogic: string;
  };
  portfolioMetrics: PortfolioMetrics;
  onSaveToModels: () => void;
}

// Category colors for charts
const CATEGORY_COLORS: {[key: string]: string} = {
  equity: '#4C51BF',      // Indigo
  bonds: '#3182CE',       // Blue
  cash: '#38B2AC',        // Teal
  real_estate: '#ED8936', // Orange
  private_equity: '#ECC94B', // Yellow
  venture_capital: '#F56565', // Red
  cryptocurrencies: '#805AD5', // Purple
  commodities: '#68D391', // Green
  other: '#A0AEC0'        // Gray
};

// Helper to get category display name
const getCategoryDisplayName = (category: string): string => {
  const categoryMap: {[key: string]: string} = {
    equity: 'Azioni',
    bonds: 'Obbligazioni',
    cash: 'Liquidità',
    real_estate: 'Immobiliare',
    private_equity: 'Private Equity',
    venture_capital: 'Venture Capital',
    cryptocurrencies: 'Criptovalute',
    commodities: 'Materie Prime',
    other: 'Altro'
  };
  
  return categoryMap[category] || category;
};

// Data formatter for percentage
const percentFormatter = (value: number) => `${value.toFixed(2)}%`;

// Risk level formatter 
const getRiskLevelDisplay = (riskLevel: string): string => {
  const riskMap: {[key: string]: string} = {
    conservative: 'Conservativo',
    moderate: 'Moderato',
    balanced: 'Bilanciato',
    growth: 'Crescita',
    aggressive: 'Aggressivo'
  };
  
  return riskMap[riskLevel] || riskLevel;
};

// Investment horizon formatter
const getInvestmentHorizonDisplay = (horizon: string): string => {
  const horizonMap: {[key: string]: string} = {
    short_term: 'Breve termine (1-3 anni)',
    medium_term: 'Medio termine (3-7 anni)',
    long_term: 'Lungo termine (7+ anni)'
  };
  
  return horizonMap[horizon] || horizon;
};

const ChatPortfolioDialog: React.FC<PortfolioDialogProps> = ({ 
  isOpen, 
  onClose, 
  portfolio, 
  portfolioMetrics,
  onSaveToModels 
}) => {
  const { t } = useTranslation();
  
  // Prepare data for the pie chart
  const pieChartData = Object.entries(portfolioMetrics.assetClassDistribution).map(([category, percentage]) => ({
    name: getCategoryDisplayName(category),
    value: percentage,
    category: category
  }));
  
  // Prepare data for allocation bar chart
  const allocationData = portfolio.allocation.map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    percentage: item.percentage,
    category: item.category
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{portfolio.name}</DialogTitle>
          <DialogDescription>
            {portfolio.description}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="overview">{t('portfolio.overview')}</TabsTrigger>
            <TabsTrigger value="allocation">{t('portfolio.allocation')}</TabsTrigger>
            <TabsTrigger value="logic">{t('portfolio.construction_logic')}</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Portfolio Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('portfolio.details')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">{t('portfolio.risk_level')}:</div>
                    <div>{getRiskLevelDisplay(portfolio.riskLevel)}</div>
                    
                    <div className="font-medium">{t('portfolio.investment_horizon')}:</div>
                    <div>{getInvestmentHorizonDisplay(portfolio.investmentHorizon)}</div>
                    
                    <div className="font-medium">{t('portfolio.average_risk')}:</div>
                    <div>{portfolioMetrics.averageRisk.toFixed(2)} / 7</div>
                    
                    <div className="font-medium">{t('portfolio.average_duration')}:</div>
                    <div>
                      {portfolioMetrics.averageInvestmentHorizon 
                        ? `${portfolioMetrics.averageInvestmentHorizon.toFixed(1)} ${t('portfolio.years')}`
                        : t('portfolio.not_available')}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Asset Allocation Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('portfolio.asset_distribution')}</CardTitle>
                </CardHeader>
                <CardContent className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Client Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t('portfolio.client_profile')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{portfolio.clientProfile}</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Allocation Tab */}
          <TabsContent value="allocation">
            <Card>
              <CardHeader>
                <CardTitle>{t('portfolio.allocation_details')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={allocationData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis tickFormatter={percentFormatter} />
                      <Tooltip formatter={(value) => [`${value}%`, t('portfolio.percentage')]} />
                      <Legend />
                      <Bar dataKey="percentage" name={t('portfolio.allocation')} radius={[4, 4, 0, 0]}>
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3">{t('portfolio.product_name')}</th>
                        <th scope="col" className="px-6 py-3">{t('portfolio.category')}</th>
                        <th scope="col" className="px-6 py-3">{t('portfolio.isin')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('portfolio.percentage')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.allocation.map((item, index) => (
                        <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                          <td className="px-6 py-4 font-medium">{item.name}</td>
                          <td className="px-6 py-4">{getCategoryDisplayName(item.category)}</td>
                          <td className="px-6 py-4 font-mono">{item.isin}</td>
                          <td className="px-6 py-4 text-right">{item.percentage.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Logic Tab */}
          <TabsContent value="logic">
            <Card>
              <CardHeader>
                <CardTitle>{t('portfolio.construction_logic')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{portfolio.generationLogic}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t('portfolio.view_in_app')}
          </Button>
          <Button variant="default" className="gap-2" onClick={onSaveToModels}>
            <Save className="h-4 w-4" />
            {t('portfolio.save_to_models')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatPortfolioDialog; 