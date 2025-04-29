import React, { useState, useEffect } from "react";
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
  Mail,
  Plus,
  Delete,
  BarChart3
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton
} from "@mui/material";
import {
  calculatePortfolioTER,
  calculatePortfolioSRI,
  calculatePortfolioHorizon,
  calculateAllPortfolioMetrics,
  AssetMetrics
} from "@/utils/portfolio-metrics";

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
  ter?: number;
  sri?: number;
  horizon?: string;
  productName?: string;
  entryFee?: number;
  exitFee?: number;
  ongoingCharge?: number;
  transactionCost?: number;
  recommendedHoldingPeriod?: number;
};

// Define the AssetRow interface for the asset dialog
interface AssetRow {
  id: string;
  isin: string;
  value: string;
  existing: boolean;
}

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
      icon: <PiggyBank className="h-5 w-5 text-amber-500" />,
      bgColor: "bg-amber-50",
      iconBg: "bg-amber-100"
    },
    'wealth_growth': { 
      label: t('investment_goals.wealth_growth_interest'),
      icon: <LineChart className="h-5 w-5 text-emerald-500" />,
      bgColor: "bg-emerald-50",
      iconBg: "bg-emerald-100"
    },
    'income_generation': { 
      label: t('investment_goals.income_generation_interest'),
      icon: <Banknote className="h-5 w-5 text-blue-500" />,
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100"
    },
    'capital_preservation': { 
      label: t('investment_goals.capital_preservation_interest'),
      icon: <Landmark className="h-5 w-5 text-indigo-500" />,
      bgColor: "bg-indigo-50",
      iconBg: "bg-indigo-100"
    },
    'estate_planning': { 
      label: t('investment_goals.estate_planning_interest'),
      icon: <FileText className="h-5 w-5 text-purple-500" />,
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-100"
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
              className={`rounded-xl p-4 ${goalInfo.bgColor} shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px] duration-300`}
            >
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 rounded-full p-2 ${goalInfo.iconBg} flex items-center justify-center`}>
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

// Add Asset Dialog Component
const AddAssetDialog = ({ clientId, onAssetsUpdated, existingAssets }: { clientId: number, onAssetsUpdated: () => void, existingAssets: AssetType[] }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  
  // When dialog opens, initialize with existing assets and 3 empty rows
  useEffect(() => {
    if (open) {
      // Create rows for existing assets with a flag to identify them
      const existingAssetRows = existingAssets.map(asset => ({
        isin: asset.description?.startsWith('ISIN:') ? asset.description.replace('ISIN:', '').trim() : '',
        value: asset.value.toString(),
        existing: true,
        id: `existing-${asset.id || Date.now()}`
      }));
      
      // Add 3 empty rows for new assets
      const emptyRows = Array(3).fill(0).map((_, index) => ({
        isin: '',
        value: '',
        existing: false,
        id: `new-${Date.now()}-${index}`
      }));
      
      // Combine existing and new empty rows
      setAssetRows([...existingAssetRows, ...emptyRows]);
    }
  }, [open, existingAssets]);
  
  const handleIsinChange = (id: string, value: string) => {
    setAssetRows(prev => prev.map(row => row.id === id ? { ...row, isin: value } : row));
  };
  
  const handleValueChange = (id: string, value: string) => {
    setAssetRows(prev => prev.map(row => row.id === id ? { ...row, value } : row));
  };
  
  const handleAddRow = () => {
    setAssetRows(prev => [...prev, { isin: '', value: '', existing: false, id: `new-${Date.now()}` }]);
  };
  
  const handleRemoveRow = (id: string, existing: boolean) => {
    // If removing an existing asset, ask for confirmation
    if (existing) {
      const isConfirmed = window.confirm(t('client.confirm_remove_asset'));
      if (!isConfirmed) return;
    }
    
    setAssetRows(prev => prev.filter(row => row.id !== id));
  };
  
  const handleSubmit = async () => {
    // Validate that rows with filled ISIN also have a valid value
    const invalidRows = assetRows.filter(row => 
      row.isin.trim() !== '' && (row.value.trim() === '' || isNaN(Number(row.value))));
    
    if (invalidRows.length > 0) {
      toast.error('Ensure all assets have both ISIN and valid values');
      return;
    }
    
    try {
      setSaving(true);
      
      // Get ISINs for new assets
      const isins = assetRows
        .filter(row => row.isin.trim() !== '' && !row.existing)
        .map(row => row.isin.trim());
      
      // Fetch product data for these ISINs before creating assets
      let productMap: Record<string, any> = {};
      
      if (isins.length > 0) {
        try {
          const response = await api.get('/api/portfolio-products', {
            params: { isins: isins.join(',') }
          });
          
          if (response.data && Array.isArray(response.data)) {
            productMap = response.data.reduce((acc: Record<string, any>, product: any) => {
              if (product.isin) {
                acc[product.isin.toUpperCase()] = product;
              }
              return acc;
            }, {});
            console.log('Product data for ISINs:', productMap);
          }
        } catch (error) {
          console.error('Error fetching product data:', error);
          // Continue with the default value if we can't fetch product data
        }
      }
      
      // Filter out empty rows and prepare for submission
      const assetsToSubmit = assetRows
        .filter(row => row.isin.trim() !== '')
        .map(row => {
          // Get the original asset object if it's an existing asset
          const existingAsset = row.existing 
            ? existingAssets.find(asset => 
                asset.description?.startsWith('ISIN:') && 
                asset.description.replace('ISIN:', '').trim() === row.isin.trim())
            : null;
          
          // Check if we have product data for this ISIN
          const isin = row.isin.trim().toUpperCase();
          const product = productMap[isin];
          
          return {
            clientId,
            id: existingAsset?.id,  // Keep existing ID if available
            isin: isin,
            value: Number(row.value),
            // Use category from: 1. existing asset, 2. product info, 3. default to 'other'
            category: existingAsset?.category || (product ? product.category : 'other'),
            description: `ISIN: ${isin}`
          };
        });
      
      // Update assets via mifid endpoint
      await api.patch(`/api/clients/${clientId}/mifid`, {
        assets: assetsToSubmit
      });
      
      // Close dialog and notify parent
      setOpen(false);
      onAssetsUpdated();
    } catch (error) {
      console.error('Error saving assets:', error);
      toast.error('Failed to save assets');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <>
      <Button size="sm" variant="outline" className="flex items-center" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        {t('client.add_assets')}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('client.add_assets')}</DialogTitle>
          </DialogHeader>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('client.add_assets_description')}
          </Typography>
          
          {assetRows.length > 0 && (
            <>
              {/* Display section for existing assets if any */}
              {assetRows.some(row => row.existing) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {t('client.existing_assets')}
                  </Typography>
                  {assetRows
                    .filter(row => row.existing)
                    .map((row) => (
                      <Box key={row.id} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                        <TextField
                          label={t('client.isin')}
                          value={row.isin}
                          onChange={(e) => handleIsinChange(row.id, e.target.value)}
                          sx={{ flexGrow: 1 }}
                        />
                        <TextField
                          label={t('client.value')}
                          value={row.value}
                          onChange={(e) => handleValueChange(row.id, e.target.value)}
                          sx={{ flexGrow: 1 }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                          }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoveRow(row.id, row.existing)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ))
                  }
                </Box>
              )}
              
              {/* Section for new assets */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {t('client.new_assets')}
                </Typography>
                {assetRows
                  .filter(row => !row.existing)
                  .map((row) => (
                    <Box key={row.id} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                      <TextField
                        label={t('client.isin')}
                        value={row.isin}
                        onChange={(e) => handleIsinChange(row.id, e.target.value)}
                        sx={{ flexGrow: 1 }}
                      />
                      <TextField
                        label={t('client.value')}
                        value={row.value}
                        onChange={(e) => handleValueChange(row.id, e.target.value)}
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        }}
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveRow(row.id, row.existing)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))
                }
              </Box>
            </>
          )}
          
          <Button 
            onClick={handleAddRow} 
            variant="outline" 
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('client.add_asset_row')}
          </Button>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="default"
              disabled={saving}
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Just before export function ClientInfoTab...
// Create a simple LoadingButton component if it doesn't exist
const LoadingButton = ({ 
  loading, 
  onClick, 
  variant = "default", 
  children 
}: { 
  loading: boolean; 
  onClick: () => void; 
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link"; 
  children: React.ReactNode 
}) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={loading}
    >
      {loading ? "Loading..." : children}
    </Button>
  );
};

// Aggiungiamo tipi per le informazioni di portafoglio
type PortfolioMetrics = {
  ter: number;
  sri: number;
  horizon: string;
};

// Dialog per visualizzare tutti gli asset in dettaglio
const ViewAllAssetsDialog = ({ assets }: { assets: AssetType[] }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button size="sm" variant="outline" className="flex items-center ml-2" onClick={() => setOpen(true)}>
        <PieChart className="h-4 w-4 mr-1" />
        {t('client.view_all_assets')}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('client.all_assets')}</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('client.isin')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('client.product_name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('client.category')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('client.value')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TER
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SRI
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('client.horizon')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => {
                  const isin = asset.description?.startsWith('ISIN:') 
                    ? asset.description.replace('ISIN:', '').trim() 
                    : asset.description;
                  
                  return (
                    <tr key={asset.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.productName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {t(`asset_categories.${asset.category.toLowerCase().replace(/ /g, '_')}`) || asset.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof asset.ter === 'number' ? `${asset.ter.toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.sri || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.recommendedHoldingPeriod ? `${asset.recommendedHoldingPeriod} anni` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Funzione per formattare i numeri in formato compatto (es. 1k, 1M, etc.)
const formatCompactNumber = (number: number) => {
  if (number < 1000) {
    return number.toString();
  } else if (number < 1000000) {
    return `${(number / 1000).toFixed(0)}k`;
  } else {
    return `${(number / 1000000).toFixed(1)}M`;
  }
};

// Load product details for assets when component mounts or assets change
function usePortfolioProductsData(assets: AssetType[]) {
  const [enrichedAssets, setEnrichedAssets] = useState<AssetType[]>(assets);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPortfolioProducts = async () => {
      if (!assets || assets.length === 0) {
        setEnrichedAssets([]);
        return;
      }
      
      setLoading(true);
      try {
        // Get all ISINs from assets
        const isins = assets.map(asset => {
          if (asset.description?.startsWith('ISIN:')) {
            return asset.description.replace('ISIN:', '').trim();
          }
          return null;
        }).filter(Boolean);
        
        if (isins.length === 0) {
          setEnrichedAssets(assets);
          return;
        }
        
        // Fetch portfolio product data for these ISINs
        const response = await api.get('/api/portfolio-products', {
          params: { isins: isins.join(',') }
        });
        
        if (response.data && Array.isArray(response.data)) {
          // Log the raw product data for debugging
          console.log('Raw product data from API:', JSON.stringify(response.data, null, 2));
          
          // Map product data to assets
          const productMap = response.data.reduce((acc: Record<string, any>, product: any) => {
            if (product.isin) {
              acc[product.isin] = product;
            }
            return acc;
          }, {});
          
          // Enrich assets with product data
          const enriched = assets.map(asset => {
            let isin = '';
            if (asset.description?.startsWith('ISIN:')) {
              isin = asset.description.replace('ISIN:', '').trim();
            }
            
            const product = productMap[isin];
            if (product) {
              console.log('Found product for ISIN:', isin, JSON.stringify(product, null, 2));
              
              // TER calculation from component costs
              const entryFee = parseFloat(product.entry_cost || '0');
              const exitFee = parseFloat(product.exit_cost || '0');
              const ongoingCharge = parseFloat(product.ongoing_cost || '0');
              const transactionCost = parseFloat(product.transaction_cost || '0');
              const holdingPeriod = parseFloat(product.recommended_holding_period || '5');
              
              // Calculate TER: (entry + exit)/holding_period + ongoing + transaction
              const ter = holdingPeriod > 0 
                ? ((entryFee + exitFee) / holdingPeriod) + ongoingCharge + transactionCost
                : 0;
              
              return {
                ...asset,
                productName: product.name || 'N/A',
                entryFee,
                exitFee,
                ongoingCharge,
                transactionCost,
                recommendedHoldingPeriod: holdingPeriod,
                sri: parseInt(product.sri_risk || '0'),
                ter: ter
              };
            }
            return asset;
          });
          
          setEnrichedAssets(enriched as AssetType[]);
        } else {
          setEnrichedAssets(assets);
        }
      } catch (error) {
        console.error('Error fetching portfolio products:', error);
        setEnrichedAssets(assets);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolioProducts();
  }, [assets]);
  
  return { enrichedAssets, loading };
}

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
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get enriched assets with portfolio product data
  const { enrichedAssets, loading: loadingProducts } = usePortfolioProductsData(assets);
  
  // Force refresh when assets are updated
  const handleAssetsUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Calculate total asset value for percentage calculations
  const totalValue = enrichedAssets.reduce((sum: number, asset: AssetType) => sum + asset.value, 0);

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
      case "conservative": return 33.333333333;
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

  // Aggrega gli asset per categoria
  const aggregatedAssets = React.useMemo(() => {
    const assetsByCategory: Record<string, number> = {};
    
    enrichedAssets.forEach(asset => {
      const category = asset.category;
      if (assetsByCategory[category]) {
        assetsByCategory[category] += asset.value;
      } else {
        assetsByCategory[category] = asset.value;
      }
    });
    
    return Object.entries(assetsByCategory).map(([category, value]) => ({
      category,
      value
    }));
  }, [enrichedAssets]);
  
  // Calcola le metriche di portafoglio utilizzando le nuove utility
  const calculatePortfolioMetrics = (assetList: AssetType[]) => {
    // Se non ci sono asset, restituisci valori predefiniti
    if (assetList.length === 0) return null;
    
    try {
      // Utilizza le funzioni di calcolo dal file di utility
      const metrics = calculateAllPortfolioMetrics(assetList as unknown as AssetMetrics[]);
      console.log('Portfolio metrics:', metrics, 'from assets:', assetList);
      return metrics;
    } catch (error) {
      console.error("Errore nel calcolo delle metriche di portafoglio:", error);
      return null;
    }
  };
  
  // Calcola le metriche di portafoglio
  const portfolioMetrics = React.useMemo(() => calculatePortfolioMetrics(enrichedAssets), [enrichedAssets]);

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
                      <span className="text-sm font-medium text-gray-800">{mifid.annualIncome.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.monthly_expenses')}:</span>
                      <span className="text-sm font-medium text-gray-800">{mifid.monthlyExpenses.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Right column - Assets & Net Worth */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.debts')}:</span>
                      <span className="text-sm font-medium text-gray-800">{mifid.debts.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">{t('client.net_worth')}:</span>
                      <span className="text-sm font-medium text-gray-800">{mifid.netWorth.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Client Segment - Centered below */}
                <div className="flex flex-col items-center pt-4 border-t mt-4">
                  <span className="text-sm text-gray-500 mb-2">{t('client.segment')}:</span>
                  <div className="space-y-1 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {client.clientSegment ? 
                          (client.clientSegment === "mass_market" ? "Mass Market" :
                          client.clientSegment === "affluent" ? "Affluent" :
                          client.clientSegment === "hnw" ? "High Net Worth" :
                          client.clientSegment) : 
                          t('client.not_specified')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {[
                        {key: 'mass_market', label: 'Mass'},
                        {key: 'affluent', label: 'Affluent'},
                        {key: 'hnw', label: 'HNW'}
                      ].map((segment) => (
                        <div 
                          key={segment.key}
                          className={`h-2.5 rounded-full ${segment.key === client.clientSegment ? 'bg-blue-800' : 'bg-gray-200'}`}
                          title={segment.label}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500 text-center flex-1">{'<100K'}</span>
                      <span className="text-xs text-gray-500 text-center flex-1">{'100K-500K'}</span>
                      <span className="text-xs text-gray-500 text-center flex-1">{'>500K'}</span>
                        </div>
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
          <CardHeader className="flex flex-row justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <BarChart3 className="h-5 w-5" />
              {t('client.asset_allocation')}
            </CardTitle>
            </div>
            <div className="flex">
              <AddAssetDialog clientId={client.id} onAssetsUpdated={handleAssetsUpdated} existingAssets={enrichedAssets} />
              {enrichedAssets.length > 0 && <ViewAllAssetsDialog assets={enrichedAssets} />}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingProducts ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : enrichedAssets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {/* Pie Chart con buco centrale e totale */}
                <div className="h-64 w-full mx-auto relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={aggregatedAssets}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        innerRadius={60}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="category"
                        label={({ name, percent }) => {
                          const translatedCategory = t(`asset_categories.${name.toLowerCase().replace(/ /g, '_')}`) || name;
                          return `${translatedCategory}: ${(percent * 100).toFixed(0)}%`;
                        }}
                      >
                        {aggregatedAssets.map((entry, index) => (
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
                  
                  {/* Totale al centro */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {formatCompactNumber(totalValue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('client.total_assets')}
                    </div>
                  </div>
                </div>

                {/* Portfolio metrics */}
                {portfolioMetrics && (
                  <div className="mt-4 border-t pt-4 grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">TER Medio</div>
                      <div className="text-xl font-semibold text-blue-800">
                        {typeof portfolioMetrics.ter === 'number' ? `${portfolioMetrics.ter.toFixed(2)}%` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Expense Ratio</div>
                    </div>
                    
                    <div className="flex flex-col items-center p-3 bg-amber-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">SRI Medio</div>
                      <div className="text-xl font-semibold text-amber-800">
                        {portfolioMetrics.sri !== null ? portfolioMetrics.sri : 'N/A'}
                          </div>
                      <div className="text-xs text-gray-500 mt-1">Indicatore di Rischio</div>
                        </div>
                    
                    <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Holding Period</div>
                      <div className="text-xl font-semibold text-emerald-800">
                        {typeof portfolioMetrics.horizon === 'number' && portfolioMetrics.horizon > 0 
                          ? `${portfolioMetrics.horizon.toFixed(1)} anni` 
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Orizzonte consigliato</div>
                    </div>
                  </div>
                )}
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