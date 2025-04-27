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
  PieChart,
  Mail
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  netWorth: number;
  investmentObjective?: string;
};

interface ClientInfoTabProps {
  client: any; // Using any for simplicity, could be more strictly typed
  mifid: MifidType | null;
  assets: AssetType[];
}

const InvestmentGoals = ({ mifid }: { mifid: MifidType | null }) => {
  const { t } = useTranslation();
  
  if (!mifid) return null;

  // Create a mapping of investment types to their translated labels and icons
  const investmentLabels = {
    'retirement': { 
      label: t('investment_goals.retirement_interest'),
      icon: <PiggyBank className="h-4 w-4 text-amber-500" />,
      color: "bg-amber-50 border-amber-200"
    },
    'wealth_growth': { 
      label: t('investment_goals.wealth_growth_interest'),
      icon: <LineChart className="h-4 w-4 text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-200"
    },
    'income_generation': { 
      label: t('investment_goals.income_generation_interest'),
      icon: <Banknote className="h-4 w-4 text-blue-500" />,
      color: "bg-blue-50 border-blue-200"
    },
    'capital_preservation': { 
      label: t('investment_goals.capital_preservation_interest'),
      icon: <Landmark className="h-4 w-4 text-indigo-500" />,
      color: "bg-indigo-50 border-indigo-200"
    },
    'estate_planning': { 
      label: t('investment_goals.estate_planning_interest'),
      icon: <FileText className="h-4 w-4 text-purple-500" />,
      color: "bg-purple-50 border-purple-200"
    }
  };

  // Parse selected investment objectives from the investmentObjective field
  // This should be a comma-separated string of investment objectives
  const selectedObjectives = mifid.investmentObjective ? mifid.investmentObjective.split(', ') : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {selectedObjectives.length > 0 ? (
        selectedObjectives.map((objective, index) => {
          const goalInfo = investmentLabels[objective as keyof typeof investmentLabels];
          
          if (!goalInfo) return null;
          
          return (
            <div 
              key={objective} 
              className={`rounded-lg p-3 border ${goalInfo.color} shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {goalInfo.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">
                    {goalInfo.label}
                  </h4>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-sm text-gray-500 col-span-2 flex items-center justify-center p-4 border border-dashed rounded-md">
          {t('client.not_specified')}
        </div>
      )}
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

  // Helper function to get progress value for investment horizon
  const getHorizonProgressValue = (horizon: string): number => {
    switch(horizon) {
      case "0-2-anni": return 25;
      case "2-5-anni": return 50;
      case "5-10-anni": return 75;
      case "over-10-anni": return 100;
      case "short_term": return 25;
      case "medium_term": return 50;
      case "long_term": return 75;
      default: return 0;
    }
  };

  // Helper function to get progress value for risk profile
  const getRiskProgressValue = (profile: string): number => {
    switch(profile) {
      case "conservative": return 333.333333333;
      case "balanced": return 66.66666666666666;
      case "aggressive": return 100;
      default: return 0;
    }
  };

  // Helper function to get progress value for investment experience
  const getExperienceProgressValue = (experience: string): number => {
    switch(experience) {
      case "none": return 20;
      case "beginner": return 40;
      case "intermediate": return 60;
      case "advanced": return 80;
      case "expert": return 100;
      default: return 0;
    }
  };

  // Helper function to get color for progress bar
  const getProgressColor = (value: number): string => {
    if (value <= 33) return "#3b82f6"; // Blu
    if (value <= 66) return "#6366f1"; // Indigo
    return "#8b5cf6"; // Viola
  };

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
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">Email:</span>
                    <span className="text-sm text-gray-800">{client.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">{t('client.birth_date')}:</span>
                    <span className="text-sm text-gray-800">{mifid.birthDate}</span>
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
                  </div>

                  {/* Right column - Assets & Net Worth */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.debts')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{mifid.debts.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.net_worth')}:</span>
                      <span className="text-sm font-medium text-gray-800">€{mifid.netWorth.toLocaleString()}</span>
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
                  <span className="text-sm text-gray-500 block mb-2">{t('client.investment_horizon')}:</span>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {mifid.investmentHorizon ? 
                          (mifid.investmentHorizon === "0-2-anni" ? "0-2 anni" :
                          mifid.investmentHorizon === "2-5-anni" ? "2-5 anni" :
                          mifid.investmentHorizon === "5-10-anni" ? "5-10 anni" :
                          mifid.investmentHorizon === "over-10-anni" ? "Oltre 10 anni" :
                          t(`investment_horizons.${mifid.investmentHorizon}`)) : 
                          t('client.not_specified')}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {[
                        {value: "0-2-anni", label: "0-2 anni"},
                        {value: "2-5-anni", label: "2-5 anni"},
                        {value: "5-10-anni", label: "5-10 anni"},
                        {value: "over-10-anni", label: "Oltre 10 anni"}
                      ].map((option) => (
                        <div 
                          key={option.value}
                          className={`h-2.5 rounded-full ${option.value === mifid.investmentHorizon ? 'bg-blue-800' : 'bg-gray-200'}`}
                          title={option.label}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500 text-center flex-1">0-2 anni</span>
                      <span className="text-xs text-gray-500 text-center flex-1">2-5 anni</span>
                      <span className="text-xs text-gray-500 text-center flex-1">5-10 anni</span>
                      <span className="text-xs text-gray-500 text-center flex-1">Oltre 10 anni</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500 block mb-2">{t('client.risk_profile')}:</span>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                    {mifid.riskProfile ? t(`risk_profiles.${mifid.riskProfile}`) : t('client.not_specified')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {[
                        {value: "conservative", label: t('risk_profiles.conservative')},
                        {value: "balanced", label: t('risk_profiles.balanced')},
                        {value: "aggressive", label: t('risk_profiles.aggressive')}
                      ].map((option) => (
                        <div 
                          key={option.value}
                          className={`h-2.5 rounded-full ${option.value === mifid.riskProfile ? 'bg-blue-800' : 'bg-gray-200'}`}
                          title={option.label}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500 text-center flex-1">{t('risk_profiles.conservative')}</span>
                      <span className="text-xs text-gray-500 text-center flex-1">{t('risk_profiles.balanced')}</span>
                      <span className="text-xs text-gray-500 text-center flex-1">{t('risk_profiles.aggressive')}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500 block mb-2">{t('client.investment_experience')}:</span>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                    {t(`experience_levels.${mifid.investmentExperience}`)}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {[
                        {value: "none", label: t('experience_levels.none')},
                        {value: "beginner", label: t('experience_levels.beginner')},
                        {value: "intermediate", label: t('experience_levels.intermediate')},
                        {value: "advanced", label: t('experience_levels.advanced')},
                        {value: "expert", label: t('experience_levels.expert')}
                      ].map((option) => (
                        <div 
                          key={option.value}
                          className={`h-2.5 rounded-full ${option.value === mifid.investmentExperience ? 'bg-blue-800' : 'bg-gray-200'}`}
                          title={option.label}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-5 mt-1">
                      <span className="text-[10px] text-gray-500 text-center">{t('experience_levels.none')}</span>
                      <span className="text-[10px] text-gray-500 text-center">{t('experience_levels.beginner')}</span>
                      <span className="text-[10px] text-gray-500 text-center">{t('experience_levels.intermediate')}</span>
                      <span className="text-[10px] text-gray-500 text-center">{t('experience_levels.advanced')}</span>
                      <span className="text-[10px] text-gray-500 text-center">{t('experience_levels.expert')}</span>
                    </div>
                  </div>
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