import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  PieChart,
  Briefcase,
  Plus,
  Search,
  BarChart4,
  Sparkles,
  Info,
  Edit,
  Trash,
  Eye,
  Bot,
  UploadCloud,
  FileCheck,
  FileUp,
  FileText,
  X,
  Upload,
  FileDown,
  Calendar,
  LayoutGrid,
  List,
  Bug,
  Database,
  User,
  Coins,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

// UI Components
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import { Loader2 } from "lucide-react";

// Import new components
import PortfolioCard from "@/components/PortfolioCard";
import ProductCard from "@/components/ProductCard";
import SimpleAllocationPieChart from "@/components/SimpleAllocationPieChart";

// Interfaces
import { AllocationItem, ModelPortfolio, ISINProduct } from "@/types/portfolio";

// Interfaces locali aggiuntive
interface CreatePortfolioForm {
  name: string;
  description: string;
  clientProfile: string;
  riskLevel: string;
  investmentHorizon: string;
  objectives: string[];
  constraints: string;
  notes: string;
}

interface PublicProduct {
  isin: string;
  name: string;
  category: string;
  description: string;
  entry_cost: number;
  exit_cost: number;
  ongoing_cost: number;
  transaction_cost?: number;
  performance_fee?: number;
  benchmark?: string | null;
  dividend_policy?: string | null;
  currency?: string | null;
  sri_risk?: number | null;
  recommended_holding_period?: string | null;
  target_market?: string | null;
  kid_file_path?: string;
  createdAt: string;
}

const RISK_LEVELS = [
  'conservative',
  'balanced',
  'aggressive'
];

const INVESTMENT_HORIZONS = [
  'short_term',
  'medium_term',
  'long_term'
];

const INVESTMENT_OBJECTIVES = [
  'income',
  'growth',
  'capital_preservation',
];

const ASSET_CATEGORIES = [
  "real_estate",
  "equity",
  "bonds",
  "cash",
  "private_equity",
  "venture_capital",
  "cryptocurrencies",
  "commodities",
  "other"
];

const CATEGORY_COLORS = {
  "equity": "#3b82f6",
  "bonds": "#60a5fa",
  "cash": "#93c5fd",
  "real_estate": "#0ea5e9",
  "private_equity": "#2563eb",
  "venture_capital": "#1d4ed8",
  "cryptocurrencies": "#818cf8",
  "other": "#c7d2fe"
};

// Aggiungiamo uno stato per gestire i diversi passaggi del dialog
type AddProductDialogStep = 'isin' | 'upload';

export default function ModelPortfoliosPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<ModelPortfolio | null>(null);
  const [kidFiles, setKidFiles] = useState<File[]>([]);
  const [isUploadingKID, setIsUploadingKID] = useState(false);
  const [productsViewMode, setProductsViewMode] = useState<"grid" | "list">("list");
  const [addProductStatus, setAddProductStatus] = useState<string>('');
  const [addProductStep, setAddProductStep] = useState<'isin' | 'upload'>('isin');

  // Add a new state for the ISIN input
  const [isinInput, setIsinInput] = useState<string>('');

  // Stato per il form di creazione portfolio
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientProfile: "",
    riskLevel: "balanced",
    investmentHorizon: "medium_term",
    objectives: ["growth"],
    constraints: "",
    notes: ""
  });

  // Stato per il dettaglio prodotto
  const [selectedProduct, setSelectedProduct] = useState<ISINProduct | null>(null);
  const [showProductDetailDialog, setShowProductDetailDialog] = useState(false);

  // Fetch ISINs
  const { data: isinData, isLoading: isLoadingIsins } = useQuery<{products: ISINProduct[]}>({
    queryKey: ['/api/portfolio/products'],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Fetch model portfolios
  const { data: portfoliosData, isLoading: isLoadingPortfolios } = useQuery<{portfolios: ModelPortfolio[]}>({
    queryKey: ['/api/portfolio/models'],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Filtered portfolios based on search query
  const filteredPortfolios = portfoliosData?.portfolios?.filter(portfolio => 
    portfolio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    portfolio.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    portfolio.clientProfile.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filtered products based on search query
  const filteredProducts = isinData?.products?.filter(product => 
    product.isin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Modificare l'handler del pulsante "Aggiungi prodotto"
  const handleAddProductClick = () => {
    // Reset stati
    setKidFiles([]);
    setIsinInput('');
    setAddProductStatus('');
    setAddProductStep('isin'); // Iniziamo sempre dal passo ISIN
    
    // Apri il dialog
    setShowProductDialog(true);
  };

  // Funzione per cercare prodotti tramite ISIN
  const searchByIsin = async () => {
    if (!isinInput) {
      toast({
        title: t('common.error'),
        description: t('portfolio.isin_required'),
        variant: "destructive",
      });
      return;
    }

    setIsUploadingKID(true);
    setAddProductStatus(t('portfolio.searching_product'));

    try {
      // Prima cerchiamo nel database locale
      const response = await apiRequest('/api/portfolio/search-by-isin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isin: isinInput }),
      });
      
      // Il prodotto è disponibile nel DB
      if (response.success) {
        // Se è già nella lista dell'utente
        if (response.alreadyAdded) {
          toast({
            title: t('portfolio.product_already_in_list'),
            description: response.message,
            variant: "default",
          });
        } else {
          // Il prodotto è stato aggiunto
          toast({
            title: t('portfolio.product_added'),
            description: response.message,
            variant: "default",
          });
        }
        
        // Reset form state e refresh dei dati
        setIsinInput('');
        setShowProductDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio/products'] });
        return;
      }
      
      // Il prodotto non esiste nel DB, cerchiamo online
      if (response.callOpenAI) {
        // Cambiamo lo stato per indicare che stiamo cercando su Borsa Italiana
        setAddProductStatus(t('portfolio.searching_borsa'));
        
        // Chiama l'endpoint per la ricerca su Borsa Italiana
        const onlineResponse = await apiRequest('/api/portfolio/search-kid-online', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isin: isinInput }),
        });
        
        // Caso di successo nella ricerca online
        if (onlineResponse.success) {
          toast({
            title: t('portfolio.kid_found_on_borsa'),
            description: onlineResponse.message,
            variant: "default",
          });
          
          // Reset form state
          setIsinInput('');
          setShowProductDialog(false);
          
          // Refresh products list
          queryClient.invalidateQueries({ queryKey: ['/api/portfolio/products'] });
          return;
        } 
                
        // Caso di fallimento nella ricerca online
        if (onlineResponse.needManualUpload) {
          // Passiamo al secondo step per caricare manualmente
          setAddProductStep('upload');
          setAddProductStatus(t('portfolio.manual_upload_required'));
          return;
        }
      }
      
      // Se siamo qui qualcosa è andato storto
      toast({
        title: t('common.error'),
        description: response.message || t('portfolio.product_error'),
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('portfolio.error_searching_product'),
        variant: 'destructive',
      });
    } finally {
      setIsUploadingKID(false);
    }
  };

  // Handle creating a new ISIN product
  const handleCreateProduct = async () => {
    // Ora usiamo direttamente la funzione searchByIsin per lo step ISIN
    if (addProductStep === 'isin') {
      await searchByIsin();
      return;
    }
    
    // Siamo nello step di upload
    // Validate form
    if (!kidFiles.length) {
      toast({
        title: t('common.error'),
        description: t('portfolio.kid_file_required'),
        variant: "destructive",
      });
      return;
    }

    setIsUploadingKID(true);
    
    try {
      // Procediamo con l'upload dei file KID
      // Carichiamo uno per uno i file KID
      const results = await Promise.all(
        kidFiles.map(async (file) => {
          try {
            // Create FormData for KID file upload
            const formData = new FormData();
            
            // Aggiungiamo il file KID
            formData.append('kid', file);
            
            // Aggiungiamo l'ISIN se presente
            if (isinInput) {
              formData.append('isin', isinInput);
            }
            
            // Upload KID file
            // NON utilizzare apiRequest per upload di file, ma fetch diretto
            const response = await fetch('/api/portfolio/upload-kid', {
              method: 'POST',
              credentials: 'include',
              body: formData
              // NON aggiungere Content-Type header, verrà impostato automaticamente
            });
            
            if (!response.ok) {
              let errorMessage = 'Error uploading file';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                // Se non è JSON, usiamo il testo diretto
                errorMessage = await response.text() || errorMessage;
              }
              throw new Error(errorMessage);
            }
            
            const kidUploadResponse = await response.json();
            
            return { success: true, file, response: kidUploadResponse };
          } catch (error) {
            return { 
              success: false, 
              file, 
              error: error instanceof Error ? error.message : `Unknown error with ${file.name}` 
            };
          }
        })
      );
      
      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      // Reset form state
      setKidFiles([]);
      setIsinInput('');
      setShowProductDialog(false);
      
      // Refresh products list
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/products'] });
      
      // Show appropriate message
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: t('portfolio.upload_kid'),
          description: successCount === 1 
            ? t('portfolio.kid_uploaded_success')
            : `${successCount} ${t('portfolio.kids_uploaded_success')}`,
          variant: "default",
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: t('common.partial_success'),
          description: `${successCount} ${t('portfolio.files_uploaded')}. ${errorCount} ${t('portfolio.files_failed')}`,
          variant: "default",
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('portfolio.all_uploads_failed'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('portfolio.error_creating_product'),
        variant: 'destructive',
      });
    } finally {
      setIsUploadingKID(false);
    }
  };

  // Handle deleting a product
  const handleDeleteProduct = async (productId: number) => {
    if (!confirm(t('portfolio.confirm_delete_product'))) {
      return;
    }

    try {
      const response = await apiRequest(`/api/portfolio/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        toast({
          title: t('portfolio.product_deleted'),
          description: t('portfolio.product_deleted_success')
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio/products'] });
      } else {
        toast({
          title: t('common.error'),
          description: response.message || t('portfolio.product_deletion_error'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('portfolio.product_deletion_error'),
        variant: "destructive"
      });
    }
  };

  // Handle deleting a portfolio
  const handleDeletePortfolio = async (portfolioId: number) => {
    try {
      const response = await apiRequest(`/api/portfolio/models/${portfolioId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        toast({
          title: t('portfolio.portfolio_deleted'),
          description: t('portfolio.portfolio_deleted_success')
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio/models'] });
      } else {
        toast({
          title: t('common.error'),
          description: response.message || t('portfolio.portfolio_deletion_error'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('portfolio.portfolio_deletion_error'),
        variant: "destructive"
      });
    }
  };

  // Handle creating a portfolio using AI assistant
  const handleCreatePortfolio = () => {
    // Validate form
    if (!formData.name || !formData.description || !formData.clientProfile) {
      toast({
        title: t('portfolio.validation_error'),
        description: t('portfolio.fill_required_fields'),
        variant: "destructive"
      });
      return;
    }

    // Create prompt for AI assistant
    const prompt = `Per favore aiutami a creare un portafoglio modello con le seguenti caratteristiche:
- Profilo Cliente: ${formData.clientProfile}
- Livello di Rischio: ${formData.riskLevel}
- Orizzonte di Investimento: ${formData.investmentHorizon}
- Obiettivi di Investimento: ${formData.objectives.join(', ')}
${formData.notes ? `- Note sul cliente: ${formData.notes}` : ''}
${formData.constraints ? `- Vincoli: ${formData.constraints}` : ''}

Please use products from our available ISINs and create a balanced allocation that matches these requirements. The portfolio should include detailed allocation percentages and rationale for each selection.`;

    // Save the prompt in local storage to be used in the AI Assistant page
    localStorage.setItem('portfolioCreationPrompt', prompt);
    
    // Close dialog
    setShowCreateDialog(false);
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      clientProfile: "",
      riskLevel: "balanced",
      investmentHorizon: "medium_term",
      objectives: ["growth"],
      constraints: "",
      notes: ""
    });
    
    // Navigate to the AI Assistant page
    setLocation('/agent');
  };

  // Handle viewing portfolio details
  const handleViewPortfolio = (portfolio: ModelPortfolio) => {
    console.log("DEBUG - Original portfolio:", portfolio);
    console.log("DEBUG - construction_logic:", portfolio.construction_logic);
    console.log("DEBUG - has construction_logic:", !!portfolio.construction_logic);
    
    // Qui preserviamo i dati originali, sia l'asset_class_distribution (aggregata) che l'allocation (dettagliata)
    // Nel dialog mostreremo l'allocation dettagliata se presente, altrimenti l'asset_class_distribution
    setSelectedPortfolio({
      ...portfolio,
      // Preserviamo sia l'allocazione dettagliata che quella aggregata
      allocation: portfolio.allocation || [],
      asset_class_distribution: portfolio.asset_class_distribution,
      // Assicuriamoci che il campo construction_logic venga preservato esplicitamente
      construction_logic: portfolio.construction_logic || ""
    });
  };

  // Add a function to handle viewing product details
  const handleViewProduct = (product: ISINProduct) => {
    setSelectedProduct(product);
    setShowProductDetailDialog(true);
  };

  // UI helpers
  const getRiskLevelColor = (riskLevel: string) => {
    // Handle numeric or range risk levels
    if (riskLevel === "3" || riskLevel === "2-3") {
      return 'bg-green-200 text-green-800';
    } else if (riskLevel === "4" || riskLevel === "3-5") {
      return 'bg-yellow-200 text-yellow-800';
    } else if (riskLevel === "5" || riskLevel === "5-6") {
      return 'bg-orange-200 text-orange-800';
    } else if (riskLevel === "6-7" || riskLevel === "6" || riskLevel === "7") {
      return 'bg-red-200 text-red-800';
    } else if (riskLevel === "1-2" || riskLevel === "1" || riskLevel === "2") {
      return 'bg-blue-200 text-blue-800';
    }
    
    // Fall back to named risk levels
    switch(riskLevel) {
      case 'conservative': return 'bg-blue-200 text-blue-800';
      case 'moderate': return 'bg-green-200 text-green-800';
      case 'balanced': return 'bg-yellow-200 text-yellow-800';
      case 'growth': return 'bg-orange-200 text-orange-800';
      case 'aggressive': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    console.log("DEBUG - Getting color for category:", category);
    const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other;
    console.log("DEBUG - Selected color:", color);
    return color;
  };

  // Handle downloading a KID file
  const handleDownloadKID = (productId: number) => {
    // Create a link to download the file and click it
    const downloadUrl = `/api/portfolio/products/${productId}/kid`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'kid_document.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggiungiamo una funzione per calcolare il costo totale
  const calculateTotalCost = (product: ISINProduct) => {
    // Estrai il valore numerico dal periodo di detenzione o usa 5 anni come default
    let holdingPeriodYears = 5; // Valore predefinito
    
    // Se il recommended_holding_period è un numero, usalo direttamente
    if (product.recommended_holding_period) {
      const numericValue = parseFloat(product.recommended_holding_period);
      if (!isNaN(numericValue)) {
        holdingPeriodYears = numericValue;
      }
    }
    
    // Assicurati che tutti i valori siano numeri prima di calcolare
    const entryExitAnnualized = (parseFloat(String(product.entry_cost) || '0') + 
                               parseFloat(String(product.exit_cost) || '0')) / holdingPeriodYears;
    const ongoingCost = parseFloat(String(product.ongoing_cost) || '0');
    const transactionCost = parseFloat(String(product.transaction_cost) || '0');
    
    return entryExitAnnualized + ongoingCost + transactionCost;
  };

  const [debugResult, setDebugResult] = useState<any>(null);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugIsin, setDebugIsin] = useState('');
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  
  // Aggiungiamo una funzione per chiamare l'endpoint di debug
  const handleDebugKidSearch = async (isinToDebug: string) => {
    if (!isinToDebug) {
      toast({
        title: t('common.error'),
        description: t('portfolio.isin_required'),
        variant: "destructive",
      });
      return;
    }
    
    setIsDebugLoading(true);
    
    try {
      const response = await fetch(`/api/portfolio/debug/find-kid/${isinToDebug}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDebugResult(data);
      setShowDebugDialog(true);
      
    } catch (error) {
      console.error('Error debugging KID search:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDebugLoading(false);
    }
  };

  // Stato per il dialog del database pubblico
  const [showPublicDatabaseDialog, setShowPublicDatabaseDialog] = useState<boolean>(false);
  const [publicProducts, setPublicProducts] = useState<PublicProduct[]>([]);
  const [selectedPublicProducts, setSelectedPublicProducts] = useState<string[]>([]);
  const [isLoadingPublicProducts, setIsLoadingPublicProducts] = useState<boolean>(false);
  
  // Funzione per selezionare/deselezionare tutti i prodotti
  const toggleSelectAllProducts = () => {
    if (selectedPublicProducts.length === publicProducts.length) {
      setSelectedPublicProducts([]);
    } else {
      setSelectedPublicProducts(publicProducts.map(product => product.isin));
    }
  };
  
  // Funzione per importare prodotti selezionati dal database pubblico
  const importSelectedProducts = async () => {
    try {
      setIsLoadingPublicProducts(true);
      const response = await apiRequest('/api/portfolio/products/import-from-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isins: selectedPublicProducts })
      });
      
      if (response.success) {
        toast({
          title: "Prodotti importati",
          description: `${selectedPublicProducts.length} prodotti importati con successo.`,
        });
        // Chiudi il dialog e aggiorna la lista
        setShowPublicDatabaseDialog(false);
        setSelectedPublicProducts([]);
        
        // Refresh products list
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio/products'] });
      }
    } catch (error) {
      console.error("Errore durante l'importazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione dei prodotti.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPublicProducts(false);
    }
  };
  
  // Carica i prodotti dal database pubblico
  const fetchPublicProducts = async () => {
    try {
      setIsLoadingPublicProducts(true);
      const response = await apiRequest('/api/portfolio/public-products', {
        method: 'GET'
      });
      
      setPublicProducts(response.products || []);
    } catch (error) {
      console.error("Errore durante il caricamento dei prodotti pubblici:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento dei prodotti dal database pubblico.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPublicProducts(false);
    }
  };

  // Effetto per caricare i prodotti quando si apre il dialog del database pubblico
  useEffect(() => {
    if (showPublicDatabaseDialog) {
      fetchPublicProducts();
    }
  }, [showPublicDatabaseDialog]);

  // Fetch products function
  const fetchProducts = async () => {
    try {
      const result = await apiRequest('/api/portfolio/products', {
        method: 'GET',
      });
      
      if (result && result.products) {
        // We can't update state here as setProducts isn't defined
        // This function appears to be unused or incorrectly implemented
        console.log("Products fetched:", result.products.length);
        return result.products;
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
      return [];
    }
  };

  // Function to ensure allocation data is correctly formatted
  const parseAllocationData = (allocation: any): AllocationItem[] => {
    console.log("DEBUG - Parsing allocation data:", JSON.stringify(allocation));
    
    // Se non c'è allocazione, ritorna array vuoto
    if (!allocation) {
      console.log("DEBUG - Allocation is null or undefined");
      return [];
    }
    
    try {
      // Se è una stringa JSON, convertila in oggetto
      let parsedAllocation = allocation;
      if (typeof allocation === 'string') {
        console.log("DEBUG - Allocation is a string, parsing JSON");
        parsedAllocation = JSON.parse(allocation);
      }
      
      // Se non è un array, ma un oggetto come {"bonds": 18, "equity": 60}, convertilo in array
      if (!Array.isArray(parsedAllocation) && typeof parsedAllocation === 'object') {
        console.log("DEBUG - Converting object to array format");
        parsedAllocation = Object.entries(parsedAllocation).map(([category, percentage]) => ({
          category,
          percentage: Number(percentage)
        }));
      }
      
      // Se è un array ma non ha la struttura corretta, convertilo
      if (Array.isArray(parsedAllocation) && parsedAllocation.length > 0 && !('category' in parsedAllocation[0])) {
        console.log("DEBUG - Array has incorrect format, attempting conversion");
        return [];
      }
      
      // Ora dovrebbe essere un array di oggetti con category e percentage
      if (Array.isArray(parsedAllocation)) {
        console.log("DEBUG - Returning array of allocation items:", JSON.stringify(parsedAllocation));
        // Assicurati che la percentuale sia un numero
        return parsedAllocation.map(item => ({
          category: item.category,
          percentage: Number(item.percentage)
        }));
      }
      
      console.log("DEBUG - Unknown format, returning empty array");
      return [];
    } catch (error) {
      console.error("DEBUG - Error parsing allocation data:", error);
      return [];
    }
  };

  // Funzione per ispezionare la struttura dei dati di allocazione
  function debugInspectAllocation(source: string, data: any) {
    console.log(`DEBUG - [${source}] Inspecting allocation data:`, typeof data);
    
    if (!data) {
      console.log(`DEBUG - [${source}] Data is null or undefined`);
      return;
    }
    
    if (typeof data === 'string') {
      console.log(`DEBUG - [${source}] Data is a string, length:`, data.length);
      console.log(`DEBUG - [${source}] First 100 chars:`, data.substring(0, 100));
      try {
        const parsed = JSON.parse(data);
        console.log(`DEBUG - [${source}] Successfully parsed as JSON, type:`, Array.isArray(parsed) ? 'array' : typeof parsed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`DEBUG - [${source}] Array properties of first item:`, Object.keys(parsed[0]).join(', '));
        } else if (typeof parsed === 'object') {
          console.log(`DEBUG - [${source}] Object keys:`, Object.keys(parsed).join(', '));
        }
      } catch (e) {
        console.log(`DEBUG - [${source}] Not valid JSON:`, e);
      }
    } else if (Array.isArray(data)) {
      console.log(`DEBUG - [${source}] Data is an array with ${data.length} items`);
      if (data.length > 0) {
        console.log(`DEBUG - [${source}] First item:`, JSON.stringify(data[0]));
        console.log(`DEBUG - [${source}] Properties of first item:`, Object.keys(data[0]).join(', '));
      }
    } else if (typeof data === 'object') {
      console.log(`DEBUG - [${source}] Data is an object with keys:`, Object.keys(data).join(', '));
    }
  }

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">{t('portfolio.model_portfolios')}</h1>
          <p className="text-sm text-muted-foreground">{t('portfolio.model_portfolios_description')}</p>
        </div>
      </div>

      <Tabs defaultValue="portfolios" className="mt-6">
        <TabsList>
          <TabsTrigger value="portfolios">
            {t('portfolio.portfolios')}
          </TabsTrigger>
          <TabsTrigger value="products">
            {t('portfolio.base_products')}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center justify-between mb-4 mt-4">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('portfolio.search')}
              className="w-full pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Portfolios Tab */}
        <TabsContent value="portfolios" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('portfolio.create_portfolio')}
            </Button>
          </div>
          
          {isLoadingPortfolios ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('portfolio.loading')}...
            </div>
          ) : filteredPortfolios.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {searchQuery ? t('portfolio.no_search_results') : t('portfolio.no_portfolios')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPortfolios.map((portfolio) => {
                // Verifichiamo il formato dei dati di asset_class_distribution
                console.log(`DEBUG - Portfolio ${portfolio.id} - asset_class_distribution:`, portfolio.asset_class_distribution);
                console.log(`DEBUG - Portfolio ${portfolio.id} - data type:`, typeof portfolio.asset_class_distribution);
                
                // Potrebbe essere che i dati siano in formato stringa JSON e devono essere analizzati
                let assetClassDistribution = portfolio.asset_class_distribution;
                
                // Se è una stringa, proviamo a fare il parsing come JSON
                if (typeof assetClassDistribution === 'string') {
                  try {
                    assetClassDistribution = JSON.parse(assetClassDistribution);
                    console.log(`DEBUG - Portfolio ${portfolio.id} - Parsed JSON:`, assetClassDistribution);
                  } catch (e) {
                    console.error(`DEBUG - Portfolio ${portfolio.id} - Failed to parse JSON:`, e);
                  }
                }
                
                // Se non abbiamo dati aggregati, creiamoli dai dati di allocazione se possibile
                if (!assetClassDistribution && portfolio.allocation && portfolio.allocation.length > 0) {
                  console.log(`DEBUG - Portfolio ${portfolio.id} - Creating asset_class_distribution from allocation`);
                  
                  // Aggreghiamo per categoria
                  const aggregated: Record<string, number> = {};
                  
                  // Se allocation è un array di oggetti con category e percentage
                  if (Array.isArray(portfolio.allocation)) {
                    portfolio.allocation.forEach(item => {
                      if (item.category) {
                        if (!aggregated[item.category]) {
                          aggregated[item.category] = 0;
                        }
                        aggregated[item.category] += Number(item.percentage);
                      }
                    });
                  }
                  
                  assetClassDistribution = aggregated;
                  console.log(`DEBUG - Portfolio ${portfolio.id} - Created aggregation:`, assetClassDistribution);
                }
                
                return (
                  <PortfolioCard
                    key={portfolio.id}
                    portfolio={{
                      ...portfolio,
                      asset_class_distribution: assetClassDistribution
                    }}
                    onViewDetails={handleViewPortfolio}
                    getCategoryColor={getCategoryColor}
                    getRiskLevelColor={getRiskLevelColor}
                    onDeletePortfolio={handleDeletePortfolio}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={handleAddProductClick}>
              <Plus className="h-4 w-4 mr-2" />
              {t('portfolio.add_products')}
            </Button>
          </div>
          
          {isLoadingIsins ? (
            <div className="py-6 text-center text-muted-foreground">
              {t('portfolio.loading')}...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {searchQuery ? t('portfolio.no_search_results') : t('portfolio.no_products')}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <div className="bg-muted rounded-md p-1 flex">
                  <Button 
                    variant={productsViewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setProductsViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={productsViewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setProductsViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {productsViewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id}
                      product={product}
                      onViewProduct={handleViewProduct}
                      onDownloadKID={handleDownloadKID}
                      onDeleteProduct={handleDeleteProduct}
                      calculateTotalCost={calculateTotalCost}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t('portfolio.product_name')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('portfolio.isin')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('portfolio.category')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('portfolio.risk_indicator')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('portfolio.holding_period')}</th>
                        <th className="px-4 py-3 text-left font-medium text-primary">{t('portfolio.total_cost')}</th>
                        <th className="px-4 py-3 text-center font-medium">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr 
                          key={product.id} 
                          className="border-t hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleViewProduct(product)}
                        >
                          <td className="px-4 py-3">{product.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{product.isin}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">
                              {t(`asset_categories.${product.category}`)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {product.sri_risk ? (
                              <Badge className={`${product.sri_risk > 4 ? 'bg-red-500' : product.sri_risk > 2 ? 'bg-amber-500' : 'bg-green-500'}`}>
                                {product.sri_risk}/7
                              </Badge>
                            ) : (
                              "N/D"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {product.recommended_holding_period || "N/D"}
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">
                            {formatPercent(calculateTotalCost(product), 2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProduct(product);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {product.kid_file_path && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title={t('portfolio.download_kid')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadKID(product.id);
                                  }}
                                >
                                  <FileDown className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog per aggiungere un prodotto, ora con approccio a step */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('portfolio.add_products')}</DialogTitle>
            <DialogDescription>
              {addProductStep === 'isin'
                ? t('portfolio.enter_isin_first')
                : t('portfolio.upload_kid_description')
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              {/* Bottoni per scegliere il metodo di aggiunta */}
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant={addProductStep === 'isin' ? "default" : "outline"} 
                  onClick={() => setAddProductStep('isin')}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                >
                  <Search className="h-6 w-6 mb-2" />
                  <span className="text-xs">Cerca ISIN</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Qui andrà la logica per aprire il dialog per selezionare dal database pubblico
                    setShowPublicDatabaseDialog(true);
                  }}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span className="text-xs">Aggiungi da database</span>
                </Button>
                <Button 
                  variant={addProductStep === 'upload' ? "default" : "outline"} 
                  onClick={() => setAddProductStep('upload')}
                  className="flex flex-col items-center justify-center p-4 h-auto"
                >
                  <Upload className="h-6 w-6 mb-2" />
                  <span className="text-xs">Carica KID</span>
                </Button>
              </div>
              
              {/* Mostra stato */}
              {addProductStatus && (
                <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded mb-4">
                  <p className="text-sm">{addProductStatus}</p>
                </div>
              )}
              
              {/* Step 1: Campo ISIN */}
              {addProductStep === 'isin' && (
                <div className="space-y-2">
                  <Label htmlFor="isin" className="text-md font-medium flex items-center">
                    {t('portfolio.isin')} 
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="isin"
                      name="isin"
                      value={isinInput}
                      onChange={(e) => setIsinInput(e.target.value.toUpperCase())}
                      placeholder="es. IT0003132476"
                      autoFocus
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDebugKidSearch(isinInput)}
                      disabled={isDebugLoading || !isinInput}
                      title="Debug KID search"
                    >
                      {isDebugLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('portfolio.isin_description')}
                  </p>
                </div>
              )}
              
              {/* Step 2: Upload KID (mostrato solo quando necessario) */}
              {addProductStep === 'upload' && (
                <>
                  {/* Campo ISIN (modificato per essere editabile ma opzionale) */}
                  <div className="space-y-2">
                    <Label htmlFor="isin" className="text-md font-medium flex items-center">
                      {t('portfolio.isin')} 
                      <span className="text-xs text-muted-foreground ml-2">(opzionale - verrà estratto dal documento)</span>
                    </Label>
                    <Input
                      id="isin"
                      name="isin"
                      value={isinInput}
                      onChange={(e) => setIsinInput(e.target.value.toUpperCase())}
                      placeholder="Opzionale - sarà estratto automaticamente dal KID"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Il sistema estrarrà automaticamente l'ISIN dal documento KID caricato.
                    </p>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <Label htmlFor="kid-file" className="text-md font-medium flex items-center">
                      {t('portfolio.kid_file')}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    
                    <div 
                      className={cn(
                        "border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer hover:bg-muted/50",
                        kidFiles.length > 0 ? "border-primary" : "border-border"
                      )}
                      onClick={() => document.getElementById('kid-file')?.click()}
                    >
                      {isUploadingKID ? (
                        <div className="flex flex-col items-center justify-center py-6">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="mt-4 text-sm text-muted-foreground">{t('common.uploading')}...</p>
                        </div>
                      ) : kidFiles.length > 0 ? (
                        <div className="flex flex-col items-center justify-center py-4">
                          <FileText className="h-12 w-12 text-primary mb-3" />
                          <p className="text-sm font-medium">
                            {kidFiles.length} {kidFiles.length === 1 ? t('portfolio.file_selected') : t('portfolio.files_selected')}
                          </p>
                          <div className="max-h-32 overflow-y-auto mt-2 w-full px-4">
                            {kidFiles.map((file, index) => (
                              <div key={index} className="flex justify-between items-center text-xs py-1 border-b">
                                <span className="truncate max-w-[180px]">{file.name}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setKidFiles(prev => prev.filter((_, i) => i !== index));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setKidFiles([]);
                            }}
                            className="mt-3"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('portfolio.remove_all')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6">
                          <UploadCloud className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-base font-medium">{t('portfolio.drag_drop_or_click')}</p>
                          <p className="text-sm text-muted-foreground mt-2">{t('portfolio.supports_pdf_multiple')}</p>
                        </div>
                      )}
                      
                      <input
                        id="kid-file"
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            // Convert FileList to array and append to existing files
                            const newFiles = Array.from(e.target.files);
                            setKidFiles(prev => [...prev, ...newFiles]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <DialogFooter>
                {addProductStep === 'upload' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setAddProductStep('isin')}
                  >
                    {t('common.back')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleCreateProduct} 
                  disabled={(addProductStep === 'isin' && !isinInput) || 
                           (addProductStep === 'upload' && kidFiles.length === 0) || 
                           isUploadingKID}
                >
                  {isUploadingKID ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.uploading')}
                    </>
                  ) : addProductStep === 'isin' ? (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      {t('common.search')}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      {t('portfolio.upload')} {kidFiles.length > 0 ? `(${kidFiles.length})` : ''}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Portfolio */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crea Portafoglio Modello</DialogTitle>
            <DialogDescription>
              Seleziona i parametri per creare un nuovo portafoglio modello
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Livello di rischio</Label>
              <Select 
                value={formData.riskLevel} 
                onValueChange={(val) => setFormData({...formData, riskLevel: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(risk => (
                    <SelectItem key={risk} value={risk}>
                      {t(`risk_profiles.${risk}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investmentHorizon">Orizzonte di investimento</Label>
              <Select 
                value={formData.investmentHorizon} 
                onValueChange={(val) => setFormData({...formData, investmentHorizon: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_HORIZONS.map(horizon => (
                    <SelectItem key={horizon} value={horizon}>
                      {t(`investment_horizon.${horizon}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Obiettivi di investimento</Label>
              <div className="flex flex-col gap-2 mt-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preservation"
                    checked={formData.objectives.includes('preservation')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({...formData, objectives: [...formData.objectives.filter(o => o !== 'preservation'), 'preservation']});
                      } else {
                        setFormData({...formData, objectives: formData.objectives.filter(o => o !== 'preservation')});
                      }
                    }}
                  />
                  <Label htmlFor="preservation" className="font-normal cursor-pointer">Preservazione del Capitale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="income"
                    checked={formData.objectives.includes('income')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({...formData, objectives: [...formData.objectives.filter(o => o !== 'income'), 'income']});
                      } else {
                        setFormData({...formData, objectives: formData.objectives.filter(o => o !== 'income')});
                      }
                    }}
                  />
                  <Label htmlFor="income" className="font-normal cursor-pointer">Generazione di Reddito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="growth"
                    checked={formData.objectives.includes('growth')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({...formData, objectives: [...formData.objectives.filter(o => o !== 'growth'), 'growth']});
                      } else {
                        setFormData({...formData, objectives: formData.objectives.filter(o => o !== 'growth')});
                      }
                    }}
                  />
                  <Label htmlFor="growth" className="font-normal cursor-pointer">Crescita Patrimoniale</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Note su Cliente</Label>
              <Textarea 
                id="notes"
                placeholder="Esempio: Cliente interessato in investimenti high-tech"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="constraints">Vincoli</Label>
              <Textarea 
                id="constraints"
                placeholder="Esempio: Solo esposizione in EUR"
                value={formData.constraints}
                onChange={(e) => setFormData({...formData, constraints: e.target.value})}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={() => {
              // Imposta dei valori predefiniti per i campi rimossi
              const updatedFormData = {
                ...formData,
                name: "Portafoglio Modello",
                description: `Portafoglio ${t(`risk_profiles.${formData.riskLevel}`)} con orizzonte ${t(`investment_horizon.${formData.investmentHorizon}`)}`,
                clientProfile: `Cliente interessato a ${formData.objectives.map(obj => t(`investment_objectives.${obj}`)).join(', ')}`
              };
              
              // Aggiorna lo stato
              setFormData(updatedFormData);
              
              // Chiamare la funzione handleCreatePortfolio
              handleCreatePortfolio();
            }}>
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Portfolio Details */}
      {selectedPortfolio && (
        <Dialog open={!!selectedPortfolio} onOpenChange={(open) => !open && setSelectedPortfolio(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Rimossi i log temporanei di debug */}
            
            <DialogHeader>
              <DialogTitle>{selectedPortfolio.name}</DialogTitle>
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="whitespace-nowrap">
                  {t('portfolio.created')}: {new Date(selectedPortfolio.createdAt).toLocaleDateString()}
                </Badge>
              </div>
              <DialogDescription>
                {selectedPortfolio.description}
              </DialogDescription>
              {/* Logica di costruzione come semplice paragrafo */}
              {selectedPortfolio.construction_logic && (
                <div className="mt-2">
                  <h3 className="text-lg font-medium mb-2">{t('portfolio.construction_logic') || 'Logica di costruzione'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPortfolio.construction_logic}
                  </p>
                </div>
              )}
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Rimosso il box blu per la logica di costruzione */}
            
              <div className="flex flex-wrap gap-2">
                {/* Rimosso il badge della data di creazione da qui */}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">{t('portfolio.client_profile')}</h3>
                <p className="text-sm text-muted-foreground">{selectedPortfolio.clientProfile}</p>
              </div>
              
              {/* Rimosso il blocco della logica di costruzione da qui */}
                  
                  <div>
                <h3 className="text-lg font-medium mb-2">{t('portfolio.allocation')}</h3>
                
                    <div className="rounded-md border">
                      <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase bg-muted">
                            <tr>
                              <th className="px-4 py-2">ISIN</th>
                              <th className="px-4 py-2">{t('portfolio.product_name')}</th>
                          <th className="px-4 py-2">{t('portfolio.category')}</th>
                              <th className="px-4 py-2">{t('portfolio.percentage')}</th>
                            </tr>
                          </thead>
                          <tbody>
                        {/* Prima proviamo a mostrare i dati dettagliati di allocazione */}
                        {selectedPortfolio.allocation && selectedPortfolio.allocation.length > 0 ? (
                          [...selectedPortfolio.allocation]
                            .sort((a, b) => Number(b.percentage) - Number(a.percentage))
                            .map((item, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2 font-mono">{item.isin || '-'}</td>
                                <td className="px-4 py-2">{item.name || item.category}</td>
                                <td className="px-4 py-2">{t(`asset_categories.${item.category}`)}</td>
                                <td className="px-4 py-2 font-medium">
                                  {formatPercent(item.percentage)}
                                </td>
                              </tr>
                            ))
                        ) : selectedPortfolio.asset_class_distribution ? (
                          // Se non abbiamo allocation dettagliata, falliamo su asset_class_distribution
                          Object.entries(selectedPortfolio.asset_class_distribution)
                            .sort((a, b) => Number(b[1]) - Number(a[1]))
                            .map(([category, percentage], index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2 font-mono">-</td>
                                <td className="px-4 py-2">{t(`asset_categories.${category}`)}</td>
                                <td className="px-4 py-2">{t(`asset_categories.${category}`)}</td>
                                <td className="px-4 py-2 font-medium">
                                  {formatPercent(Number(percentage))}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">
                              {t('portfolio.no_allocation')}
                            </td>
                          </tr>
                        )}
                          </tbody>
                        </table>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  {t('common.close')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={showProductDetailDialog} onOpenChange={setShowProductDetailDialog}>
        <DialogContent className="max-w-3xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize">
                      {t(`asset_categories.${selectedProduct.category}`)}
                    </Badge>
                    {selectedProduct.currency && (
                      <Badge variant="secondary">
                        {selectedProduct.currency}
                      </Badge>
                    )}
                  </div>
                </div>
                <DialogDescription className="font-mono flex items-center gap-2">
                  {selectedProduct.isin}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDebugKidSearch(selectedProduct.isin)}
                    disabled={isDebugLoading}
                    title="Debug KID search"
                    className="h-6 w-6"
                  >
                    {isDebugLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />}
                  </Button>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Product description */}
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('portfolio.description')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description || t('common.no_data')}
                  </p>
                </div>

                {/* Benchmark & Dividend Policy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('portfolio.benchmark')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.benchmark || t('common.no_data')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('portfolio.dividend_policy')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.dividend_policy 
                        ? t(`portfolio.dividend_types.${selectedProduct.dividend_policy}`)
                        : t('common.no_data')}
                    </p>
                  </div>
                </div>
                
                {/* Risk & Target */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('portfolio.risk_indicator')}</h3>
                    <div className="flex items-center gap-2">
                      {selectedProduct.sri_risk ? (
                        <Badge className={`px-3 py-1 ${selectedProduct.sri_risk > 4 ? 'bg-red-500' : selectedProduct.sri_risk > 2 ? 'bg-amber-500' : 'bg-green-500'}`}>
                          {selectedProduct.sri_risk}/7
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t('common.no_data')}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('portfolio.holding_period')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.recommended_holding_period || t('common.no_data')}
                    </p>
                  </div>
                </div>

                {/* Target Market */}
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('portfolio.target_market')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.target_market || t('common.no_data')}
                  </p>
                </div>
                
                {/* Costs section */}
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('portfolio.costs')}</h3>
                  
                  {/* Costo totale evidenziato */}
                  <Card className="mb-4 bg-muted/30 border-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t('portfolio.total_cost')}</CardTitle>
                      <CardDescription>
                        {t('portfolio.total_cost_formula')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {formatPercent(calculateTotalCost(selectedProduct), 2)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('portfolio.total_cost_description')}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground">{t('portfolio.entry')}</div>
                      <div className="text-xl font-bold">{formatPercent(selectedProduct.entry_cost, 2)}</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground">{t('portfolio.exit')}</div>
                      <div className="text-xl font-bold">{formatPercent(selectedProduct.exit_cost, 2)}</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground">{t('portfolio.ongoing')}</div>
                      <div className="text-xl font-bold">{formatPercent(selectedProduct.ongoing_cost, 2)}</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground">{t('portfolio.transaction')}</div>
                      <div className="text-xl font-bold">{formatPercent(selectedProduct.transaction_cost || 0, 2)}</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground">{t('portfolio.performance')}</div>
                      <div className="text-xl font-bold">{formatPercent(selectedProduct.performance_fee || 0, 2)}</div>
                    </Card>
                  </div>
                </div>
                
                {/* File info */}
                {selectedProduct.kid_file_path && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">KID {t('common.document')}</h3>
                    <div className="flex items-center gap-3 border rounded-md p-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium">KID {t('common.document')}</div>
                        <div className="text-xs text-muted-foreground">{selectedProduct.isin}</div>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadKID(selectedProduct.id)}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {t('common.download')}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Creation info */}
                <div className="border-t pt-4 text-sm text-muted-foreground flex justify-between">
                  <div>
                    {t('portfolio.created')}: {new Date(selectedProduct.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    handleDeleteProduct(selectedProduct.id);
                    setShowProductDetailDialog(false);
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </Button>
                <DialogClose asChild>
                  <Button>
                    {t('common.close')}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Results Dialog */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debug KID Search for {debugResult?.isin}</DialogTitle>
            <DialogDescription>
              Results from the debug KID search on Borsa Italiana
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {debugResult && (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">OpenAI Response</h3>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Status:</span>
                      <Badge variant={debugResult.openaiResponse.url !== "NO_URL_FOUND" ? "default" : "destructive"}>
                        {debugResult.openaiResponse.url !== "NO_URL_FOUND" ? "URL Found" : "URL Not Found"}
                      </Badge>
                    </div>
                    
                    {debugResult.openaiResponse.url !== "NO_URL_FOUND" ? (
                      <>
                        <div className="mb-2">
                          <span className="font-medium">URL:</span>
                          <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                            <a href={debugResult.openaiResponse.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              {debugResult.openaiResponse.url}
                            </a>
                          </div>
                        </div>
                        
                        {debugResult.openaiResponse.issuer && (
                          <div className="mb-2">
                            <span className="font-medium">Issuer:</span>
                            <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                              {debugResult.openaiResponse.issuer}
                            </div>
                          </div>
                        )}
                        
                        {debugResult.openaiResponse.productType && (
                          <div className="mb-2">
                            <span className="font-medium">Product Type:</span>
                            <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                              {debugResult.openaiResponse.productType}
                            </div>
                          </div>
                        )}
                        
                        {debugResult.openaiResponse.searchProcess && (
                          <div className="mb-2">
                            <span className="font-medium">Search Process:</span>
                            <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                              {debugResult.openaiResponse.searchProcess}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-end">
                          <Button 
                            onClick={() => window.open(debugResult.openaiResponse.url, "_blank")}
                            disabled={!debugResult.openaiResponse.url || debugResult.openaiResponse.url === "NO_URL_FOUND"}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Open KID URL
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-2">
                          <span className="font-medium">Reason:</span>
                          <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                            {debugResult.openaiResponse.reasonIfNotFound || "No reason provided"}
                          </div>
                        </div>
                        
                        {debugResult.openaiResponse.alternativeSources && (
                          <div className="mb-2">
                            <span className="font-medium">Alternative Sources:</span>
                            <div className="mt-1 break-all bg-background p-2 rounded border text-sm">
                              {debugResult.openaiResponse.alternativeSources}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Prompt Used</h3>
                  <div className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                    <pre className="whitespace-pre-wrap">{debugResult.prompt}</pre>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Technical Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Model:</span>
                      <div className="mt-1 bg-background p-2 rounded border text-sm">
                        {debugResult.openAiModelUsed}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Timestamp:</span>
                      <div className="mt-1 bg-background p-2 rounded border text-sm">
                        {new Date(debugResult.responseTimestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDebugDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per selezionare prodotti dal database pubblico */}
      <Dialog open={showPublicDatabaseDialog} onOpenChange={setShowPublicDatabaseDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleziona prodotti dal database pubblico</DialogTitle>
            <DialogDescription>
              Seleziona i prodotti che desideri importare nel tuo catalogo personale.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4 flex-1 overflow-hidden flex flex-col">
            {isLoadingPublicProducts ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleSelectAllProducts}
                  >
                    {selectedPublicProducts.length === publicProducts.length ? "Deseleziona tutti" : "Seleziona tutti"}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {selectedPublicProducts.length} di {publicProducts.length} selezionati
                  </div>
                </div>
                
                <div className="border rounded-md flex-1 overflow-hidden">
                  <div className="overflow-y-auto max-h-[55vh]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="w-10 p-2 text-left"></th>
                          <th className="p-2 text-left w-24">ISIN</th>
                          <th className="p-2 text-left">Nome</th>
                          <th className="p-2 text-left w-24">Categoria</th>
                          <th className="p-2 text-left w-20">Rischio</th>
                          <th className="p-2 text-left w-24">Periodo</th>
                          <th className="p-2 text-left w-20">Costo</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {publicProducts.map((product) => (
                          <tr 
                            key={product.isin} 
                            className="border-t hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              if (selectedPublicProducts.includes(product.isin)) {
                                setSelectedPublicProducts(prev => prev.filter(isin => isin !== product.isin));
                              } else {
                                setSelectedPublicProducts(prev => [...prev, product.isin]);
                              }
                            }}
                          >
                            <td className="p-2 text-left">
                              <Checkbox 
                                checked={selectedPublicProducts.includes(product.isin)} 
                                onCheckedChange={(checked: boolean) => {
                                  if (checked) {
                                    setSelectedPublicProducts(prev => [...prev, product.isin]);
                                  } else {
                                    setSelectedPublicProducts(prev => prev.filter(isin => isin !== product.isin));
                                  }
                                }}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-2 text-left font-mono text-xs">{product.isin}</td>
                            <td className="p-2 text-left text-sm">{product.name}</td>
                            <td className="p-2 text-left text-sm capitalize">{t(`asset_categories.${product.category}`)}</td>
                            <td className="p-2 text-left text-sm">
                              {product.sri_risk ? (
                                <Badge className="text-xs px-2 py-0.5" variant="outline">
                                  {product.sri_risk}/7
                                </Badge>
                              ) : "N/D"}
                            </td>
                            <td className="p-2 text-left text-sm">
                              {product.recommended_holding_period || "N/D"}
                            </td>
                            <td className="p-2 text-left text-sm">
                              {calculateTotalCost({
                                ...product, 
                                entry_cost: typeof product.entry_cost === 'string' ? parseFloat(product.entry_cost) : product.entry_cost,
                                exit_cost: typeof product.exit_cost === 'string' ? parseFloat(product.exit_cost) : product.exit_cost,
                                ongoing_cost: typeof product.ongoing_cost === 'string' ? parseFloat(product.ongoing_cost) : product.ongoing_cost,
                                transaction_cost: typeof product.transaction_cost === 'string' ? parseFloat(product.transaction_cost) : product.transaction_cost
                              } as ISINProduct) ? formatPercent(calculateTotalCost({
                                ...product, 
                                entry_cost: typeof product.entry_cost === 'string' ? parseFloat(product.entry_cost) : product.entry_cost,
                                exit_cost: typeof product.exit_cost === 'string' ? parseFloat(product.exit_cost) : product.exit_cost,
                                ongoing_cost: typeof product.ongoing_cost === 'string' ? parseFloat(product.ongoing_cost) : product.ongoing_cost,
                                transaction_cost: typeof product.transaction_cost === 'string' ? parseFloat(product.transaction_cost) : product.transaction_cost
                              } as ISINProduct), 2) : "N/D"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPublicDatabaseDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={importSelectedProducts} 
              disabled={selectedPublicProducts.length === 0 || isLoadingPublicProducts}
            >
              {isLoadingPublicProducts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Importa selezionati ({selectedPublicProducts.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 