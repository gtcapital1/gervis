import React from "react";
import { useTranslation } from "react-i18next";
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  TabsContent 
} from "@/components/ui/tabs";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Calendar, 
  User, 
  Briefcase, 
  FileText,
  Building2,
  Coins,
  LineChart,
  Wallet,
  PiggyBank,
  Landmark,
  BriefcaseIcon,
  Banknote,
  PieChart
} from "lucide-react";

// Define colors for the pie chart
const COLORS = [
  "#0d47a1", // Blu più scuro
  "#1565c0", 
  "#1976d2", 
  "#1e88e5", 
  "#2196f3", 
  "#42a5f5", 
  "#64b5f6", 
  "#90caf9"  // Blu più chiaro
];

// Define the asset type to fix TypeScript errors
type AssetType = {
  id: number;
  clientId: number;
  category: string;
  value: number;
  description: string;
  createdAt: string;
};

// Define the MIFID type
type MifidType = {
  id: string;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  address: string;
  phone: string;
  birthDate: string;
  maritalStatus: string;
  employmentStatus: string;
  educationLevel: string;
  annualIncome: number;
  monthlyExpenses: number;
  debts: number;
  dependents: number;
  assets: AssetType[];
  investmentHorizon: string;
  retirementInterest: number;
  wealthGrowthInterest: number;
  incomeGenerationInterest: number;
  capitalPreservationInterest: number;
  estatePlanningInterest: number;
  investmentExperience: string;
  pastInvestmentExperience: string[];
  financialEducation: string[];
  riskProfile: string;
  portfolioDropReaction: string;
  volatilityTolerance: string;
  yearsOfExperience: string;
  investmentFrequency: string;
  advisorUsage: string;
  monitoringTime: string;
  specificQuestions: string | null;
};

interface ClientInfoTabProps {
  client: any; // Using any for simplicity, could be more strictly typed
  mifid: MifidType | null;
  assets: AssetType[];
}

const InvestmentGoals = ({ mifid }: { mifid: MifidType | null }) => {
  const { t } = useTranslation();
  
  if (!mifid) return null;

  // Crea un array di obiettivi con i loro valori (inverti il valore per il sorting)
  // Più basso è il numero, più alta è la priorità (1 è massima priorità, 5 è minima)
  const goals = [
    { key: 'retirement_interest', value: mifid.retirementInterest, label: t('investment_goals.retirement_interest') },
    { key: 'wealth_growth_interest', value: mifid.wealthGrowthInterest, label: t('investment_goals.wealth_growth_interest') },
    { key: 'income_generation_interest', value: mifid.incomeGenerationInterest, label: t('investment_goals.income_generation_interest') },
    { key: 'capital_preservation_interest', value: mifid.capitalPreservationInterest, label: t('investment_goals.capital_preservation_interest') },
    { key: 'estate_planning_interest', value: mifid.estatePlanningInterest, label: t('investment_goals.estate_planning_interest') }
  ];

  // Ordina gli obiettivi per valore crescente (priorità 1 in cima, poi 2, 3, ecc.)
  const sortedGoals = [...goals].sort((a, b) => a.value - b.value);

  // Funzione per ottenere il colore della barra di importanza
  const getImportanceColor = (value: number) => {
    if (value <= 1) return "bg-blue-700"; // Priorità massima (1)
    if (value <= 2) return "bg-blue-600";
    if (value <= 3) return "bg-blue-500";
    if (value <= 4) return "bg-blue-400";
    return "bg-blue-300"; // Priorità minima (5)
  };

  return (
    <div className="space-y-3">
      {sortedGoals.map((goal, index) => (
        <div key={goal.key} className="bg-white rounded-md p-2 shadow-sm">
          <div className="flex items-center mb-1">
            <span className="text-sm font-medium text-gray-800">{goal.label}</span>
            <div className="ml-auto text-sm font-bold text-blue-600">
              Priorità {goal.value}
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${getImportanceColor(goal.value)}`} 
              style={{ width: `${(6 - goal.value) * 20}%` }}>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Tab delle Informazioni del Cliente che mostra i dettagli personali e finanziari
 * 
 * Questa componente mostra:
 * - Informazioni personali del cliente
 * - Situazione finanziaria attuale
 * - Profilo di investimento
 * - Allocazione degli asset
 */
export function ClientInfoTab({ client, mifid, assets }: ClientInfoTabProps) {
  const { t } = useTranslation();
  
  // Calculate total asset value for percentage calculations
  const totalValue = assets.reduce((sum: number, asset: AssetType) => sum + asset.value, 0);

  return (
    <TabsContent value="client-info" className="space-y-6">
      {/* Personal Information and Financial Situation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Personal Information */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 bg-white border-b">
            <CardTitle className="text-xl text-gray-800 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              {t('client.personal_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {mifid && (
                <>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.address')}:</span>
                    <span className="text-sm text-gray-800">{mifid.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.phone')}:</span>
                    <span className="text-sm text-gray-800">{mifid.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.birth_date')}:</span>
                    <span className="text-sm text-gray-800">{mifid.birthDate}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.marital_status')}:</span>
                    <span className="text-sm text-gray-800">{t(`marital_status.${mifid.maritalStatus}`)}</span>
                  </div>
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.employment_status')}:</span>
                    <span className="text-sm text-gray-800">{t(`employment_status.${mifid.employmentStatus}`)}</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.education_level')}:</span>
                    <span className="text-sm text-gray-800">{t(`education_levels.${mifid.educationLevel}`)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column: Financial Situation */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 bg-white border-b">
            <CardTitle className="text-xl text-gray-800 flex items-center">
              <Coins className="h-5 w-5 mr-2 text-blue-600" />
              {t('client.current_financial_situation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {mifid && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column - Income & Expenses */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.annual_income')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{mifid.annualIncome.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.monthly_expenses')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{mifid.monthlyExpenses.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.dependents')}:</span>
                      <span className="text-sm font-medium text-gray-800">{mifid.dependents}</span>
                    </div>
                  </div>

                  {/* Right column - Assets & Net Worth */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.total_assets')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{client.totalAssets?.toLocaleString() || '0'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.debts')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{mifid.debts.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.net_worth')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{client.netWorth?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>

                {/* Client Segment - Centered below */}
                <div className="flex flex-col items-center pt-4 border-t mt-4">
                  <span className="text-sm text-gray-500 mb-2">{t('client.segment')}:</span>
                  <div className="flex justify-center gap-3">
                    {[
                      {key: 'mass_market', label: 'Mass', range: '<100K'},
                      {key: 'affluent', label: 'Affluent', range: '100K-500K'},
                      {key: 'hnw', label: 'HNW', range: '500K-2M'},
                      {key: 'vhnw', label: 'VHNW', range: '2M-10M'},
                      {key: 'uhnw', label: 'UHNW', range: '>10M'}
                    ].map((segment) => {
                      const isClientSegment = client.clientSegment === segment.key;
                      
                      return (
                        <div key={segment.key} className="flex flex-col items-center mx-2">
                          <Badge 
                            className="px-2 py-0.5 text-sm"
                            style={{
                              backgroundColor: isClientSegment ? 
                                segment.key === "mass_market" ? "#93c5fd" : // Light blue
                                segment.key === "affluent" ? "#60a5fa" : // Medium light blue
                                segment.key === "hnw" ? "#3b82f6" : // Medium blue
                                segment.key === "vhnw" ? "#2563eb" : // Medium dark blue
                                segment.key === "uhnw" ? "#1e40af" : // Dark blue
                                "#6b7280" : // Gray default
                                "#e5e7eb", // Light gray for non-selected segments
                              color: isClientSegment ? "#ffffff" : "#6b7280"
                            }}
                          >
                            {segment.label}
                          </Badge>
                          <span className="text-xs text-gray-500 mt-1">€{segment.range}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Investment Profile and Asset Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Investment Profile */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 bg-white border-b">
            <CardTitle className="text-xl text-gray-800 flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-blue-600" />
              {t('client.investment_profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {mifid && (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500 block">{t('client.investment_horizon')}:</span>
                  <Badge 
                    className="mt-1" 
                    style={{
                      backgroundColor: 
                        mifid.investmentHorizon === "short_term" ? "#3b82f6" : // Blu
                        mifid.investmentHorizon === "medium_term" ? "#6366f1" : // Indigo
                        mifid.investmentHorizon === "long_term" ? "#8b5cf6" : // Viola
                        "#6b7280", // Grigio default
                      color: "#ffffff"
                    }}
                  >
                    {t(`investment_horizons.${mifid.investmentHorizon}`)}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">{t('client.risk_profile')}:</span>
                  <Badge 
                    className="mt-1" 
                    style={{
                      backgroundColor: 
                        mifid.riskProfile === "conservative" ? "#60a5fa" : // Blu chiaro
                        mifid.riskProfile === "moderate" ? "#3b82f6" : // Blu medio
                        mifid.riskProfile === "balanced" ? "#2563eb" : // Blu scuro
                        mifid.riskProfile === "growth" ? "#1d4ed8" : // Blu molto scuro
                        mifid.riskProfile === "aggressive" ? "#1e40af" : // Blu intenso
                        "#6b7280", // Grigio default
                      color: "#ffffff"
                    }}
                  >
                    {mifid.riskProfile ? t(`risk_profiles.${mifid.riskProfile}`) : t('client.not_specified')}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">{t('client.investment_experience')}:</span>
                  <Badge 
                    className="mt-1" 
                    style={{
                      backgroundColor: 
                        mifid.investmentExperience === "none" ? "#93c5fd" : // Blu molto chiaro
                        mifid.investmentExperience === "beginner" ? "#60a5fa" : // Blu chiaro
                        mifid.investmentExperience === "intermediate" ? "#3b82f6" : // Blu medio
                        mifid.investmentExperience === "advanced" ? "#2563eb" : // Blu scuro
                        mifid.investmentExperience === "expert" ? "#1e40af" : // Blu intenso
                        "#6b7280", // Grigio default
                      color: "#ffffff"
                    }}
                  >
                    {t(`experience_levels.${mifid.investmentExperience}`)}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">{t('client.investment_goals')}:</span>
                  <div className="mt-2">
                    <InvestmentGoals mifid={mifid} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Asset Allocation */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 bg-white border-b">
            <CardTitle className="text-xl text-gray-800 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              {t('client.asset_allocation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {assets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {/* Pie Chart con etichette invece della legenda */}
                <div className="h-64 w-full mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={assets}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="category"
                        label={({ name, percent }) => {
                          const translatedCategory = t(`asset_categories.${name.toLowerCase().replace(/ /g, '_')}`) || name;
                          return `${translatedCategory}: ${(percent * 100).toFixed(0)}%`;
                        }}
                      >
                        {assets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
                          const translatedName = t(`asset_categories.${name.toLowerCase().replace(/ /g, '_')}`) || name;
                          const formattedValue = value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
                          return [formattedValue, translatedName];
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabella valori */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium mb-2 text-gray-700">{t('client.asset_values')}:</h4>
                  <div className="space-y-2">
                    {assets.map((asset, index) => {
                      // Traduzione per la categoria
                      const translatedCategory = t(`asset_categories.${asset.category.toLowerCase().replace(/ /g, '_')}`) || asset.category;
                      const formatValue = (val: number) => val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
                      const percentage = totalValue > 0 ? Math.round((asset.value / totalValue) * 100) : 0;
                      
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 mr-2 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-gray-800">{translatedCategory}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600 mr-2">{percentage}%</span>
                            <span className="font-medium text-gray-800">{formatValue(asset.value)}</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="flex justify-between text-sm border-t pt-2 mt-2 font-semibold">
                      <span className="text-gray-800">{t('client.total_assets')}:</span>
                      <span className="text-gray-800">{totalValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t('client.no_assets')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profilo Cliente */}
      {client.profiloCliente && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Profilo Cliente
            </h3>
            <div className="text-sm text-gray-700 bg-white p-4 rounded-lg shadow-sm border-l-2 border-blue-400">
              {client.profiloCliente.descrizione}
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
} 