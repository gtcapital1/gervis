import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart4, 
  DollarSign, 
  LineChart, 
  UserPlus,
  UserCheck,
  Percent,
  Wallet,
  Clock, 
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  FileWarning,
  Edit3,
  Layers,
  TrendingUp,
  Activity,
  PieChart as LucidePieChart,
  CreditCard,
  Info,
  BarChart as LucideBarChart,
  Inbox,
  Bell,
  FileCheck,
  User,
  Circle,
  CalendarRange,
  UsersRound,
  BarChart,
  Users2,
  CircleDollarSign,
  Eye
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Client, RISK_PROFILES, CLIENT_SEGMENTS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { DialogTrend, TrendData } from "@/components/ui/dialog-trend";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from "@/components/ui/hover-card";


// Definizione delle interfacce per i tipi di dati
interface Task {
  id: number;
  title: string;
  dueDate: string;
  priority?: string;
  clientId: number;
  clientName: string;
  completed?: boolean;
}

// Interfaccia per i ClientLog
interface ClientLog {
  id: number;
  clientId: number;
  type: 'email' | 'note' | 'call' | 'meeting';
  title: string;
  content: string;
  emailSubject?: string;
  emailRecipients?: string;
  logDate: string;
  createdAt: string;
  createdBy?: number;
}

interface Event {
  id: number;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  clientId: number;
  clientName: string;
  location: string;
  date: string;
}

interface AssetAllocation {
  category: string;
  percentage: number;
  value: number;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  client: string;
  time: string;
  status: string;
  color?: string;
}

interface MissingDocument {
  clientId: number;
  clientName: string;
  documentType: string;
  daysOverdue: number;
}

interface PortfolioData {
  totalAUM: number;
  aumChange: number;
  aumChangePercent: number;
  averagePortfolioSize: number;
  revenueYTD: number;
  revenueLastYear: number;
  revenueChangePercent: number;
  assetAllocation: AssetAllocation[];
  performanceLastMonth: number;
  performanceYTD: number;
}

// Interfaccia per i periodi di tempo
type TimeframePeriod = '1w' | '1m';

interface Opportunity {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  value: number;
  status: string;
  dueDate?: string;
}

interface AIProfile {
  clientId: number;
  clientName: string;
  lastUpdated: string;
  profiloCliente: {
    descrizione: string;
  };
  opportunitaBusiness: Array<{
    titolo: string;
    descrizione: string;
    priorita: number;
    email: {
      oggetto: string;
      corpo: string;
    };
    azioni: string[];
  }>;
}

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

// Funzione per ottenere il colore del badge in base alla priorità
function getPriorityBadgeColor(priority: number) {
  switch(priority) {
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-orange-500";
    case 3:
      return "bg-yellow-500";
    case 4:
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

// Funzione per ottenere il testo della priorità
function getPriorityText(priority: number) {
  switch(priority) {
    case 1:
      return "MASSIMA";
    case 2:
      return "ALTA";
    case 3:
      return "MEDIA";
    case 4:
      return "BASSA";
    default:
      return "MINIMA";
  }
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState<'1w' | '1m'>('1m'); // Default: 1 mese
  const [showOpportunitiesDialog, setShowOpportunitiesDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [showOpportunityDetailDialog, setShowOpportunityDetailDialog] = useState(false);
  
  // Funzione per calcolare la data di inizio in base al timeframe
  const getStartDateFromTimeframe = () => {
    const now = new Date();
    switch (timeframe) {
      case '1w':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return oneWeekAgo;
      case '1m':
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30);
        return oneMonthAgo;
      default:
        const defaultDate = new Date();
        defaultDate.setDate(now.getDate() - 30);
        return defaultDate;
    }
  };

  // Fetch clients
  const { data: clientsData, isLoading: isLoadingClients } = useQuery<{clients: Client[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch portfolio data
  const { data: portfolioData, isLoading: isLoadingPortfolio } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio/overview'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<{tasks: Task[]}>({
    queryKey: ['/api/tasks/today'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch agenda
  const { data: agendaData, isLoading: isLoadingAgenda } = useQuery<{events: Event[]}>({
    queryKey: ['/api/agenda/today'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch compliance data
  const { data: complianceData, isLoading: isLoadingCompliance } = useQuery<{
    missingDocuments: MissingDocument[],
    complianceRate: number,
    daysToNextAudit: number
  }>({
    queryKey: ['/api/compliance/overview'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch activity feed
  const { data: activityData, isLoading: isLoadingActivity } = useQuery<{activities: Activity[]}>({
    queryKey: ['/api/activity/recent'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  // Fetch assets
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery<{assets: any[]}>({
    queryKey: ['/api/assets'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Fetch della lista degli eventi dal server
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<{events: Event[]} | null>({
    queryKey: ['/api/events'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    queryFn: () => apiRequest('/api/events', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }),
  });

  // Fetch di tutti i client logs
  const { data: allClientLogsData, isLoading: isLoadingClientLogs } = useQuery<{logs: ClientLog[]} | null>({
    queryKey: ['/api/client-logs/all'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    queryFn: () => apiRequest('/api/client-logs/all', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }),
  });

  // Fetch opportunities
  const { data: aiProfilesData, isLoading: isLoadingAIProfiles } = useQuery<{profiles: AIProfile[]}>({
    queryKey: ['/api/ai-profiles'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Prepare client data
  const clients = clientsData?.clients || [];
  const activeClients = clients.filter(client => !client.isArchived && client.active);
  const archivedClients = clients.filter(client => client.isArchived);
  const onboardedClients = clients.filter(client => client.isOnboarded);
  const onboardingRate = clients.length > 0 ? (onboardedClients.length / clients.length) * 100 : 0;
  
  // Corretto l'errore di tipo per la data di creazione del cliente
  const newClientsThisMonth = clients.filter(client => {
    // Verifica che createdAt esista prima di usarlo
    if (!client.createdAt) return false;
    
    const clientDate = new Date(client.createdAt);
    const startDate = getStartDateFromTimeframe();
    return clientDate >= startDate;
  }).length;
  
  // Data for client pipeline
  const leadClients = clients.filter(client => !client.isOnboarded && !client.isArchived).length;
  const prospectClients = clients.filter(client => client.isOnboarded && !client.isArchived && !client.active).length;
  const activeClientCount = clients.filter(client => client.isOnboarded && !client.isArchived && client.active).length;
  
  // Calculate the start date based on selected timeframe
  const startDate = getStartDateFromTimeframe();
  
  // Calculate the previous period start date
  const getPreviousPeriodEndDate = () => {
    const now = new Date();
    // If current timeframe is 1w, previous period ends 7 days ago
    if (timeframe === '1w') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return oneWeekAgo;
    } 
    // If current timeframe is 1m, previous period ends 30 days ago
    else {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      return oneMonthAgo;
    }
  };
  
  const previousPeriodEndDate = getPreviousPeriodEndDate();

  // Calculate previous period stats for comparison by examining client status at the end of the previous period
  const previousLeadClients = clients.filter(client => {
    // Check if client was created before the previous period end
    const wasCreated = client.createdAt && new Date(client.createdAt) <= previousPeriodEndDate;
    // Check if client was not onboarded or was onboarded after previous period end
    const wasNotOnboarded = !client.isOnboarded || (client.onboardedAt && new Date(client.onboardedAt) > previousPeriodEndDate);
    // Check if client was not archived at that time (we don't have archivedAt, so we'll assume current archive status)
    const wasNotArchived = !client.isArchived;
    
    return wasCreated && wasNotOnboarded && wasNotArchived;
  }).length;

  const previousProspectClients = clients.filter(client => {
    // Check if client was onboarded before the previous period end
    const wasOnboarded = client.onboardedAt && new Date(client.onboardedAt) <= previousPeriodEndDate;
    // Check if client was not active (since we don't have activatedAt timestamp)
    const wasNotActive = !client.active;
    // Check if client was not archived
    const wasNotArchived = !client.isArchived;
    
    return wasOnboarded && wasNotActive && wasNotArchived;
  }).length;

  const previousActiveClientCount = clients.filter(client => {
    // Since we don't have activatedAt, we'll use onboardedAt and active flag
    const wasActive = client.active && client.onboardedAt && new Date(client.onboardedAt) <= previousPeriodEndDate;
    // Check if client was not archived
    const wasNotArchived = !client.isArchived;
    
    return wasActive && wasNotArchived;
  }).length;

  // Calculate differences
  const leadDifference = leadClients - previousLeadClients;
  const prospectDifference = prospectClients - previousProspectClients;
  const activeDifference = activeClientCount - previousActiveClientCount;
  
  // Calculate conversion rates for the selected period
  // Clients created in the selected period
  const newClientsInPeriod = clients.filter(client => {
    if (!client.createdAt) return false;
    const createDate = new Date(client.createdAt);
    return createDate >= startDate;
  });
  
  // Clients who became prospects in the selected period
  const newProspectsInPeriod = clients.filter(client => {
    if (!client.onboardedAt) return false;
    const onboardDate = new Date(client.onboardedAt);
    return onboardDate >= startDate;
  });
  
  // Clients who became active in the selected period
  const newActiveClientsInPeriod = clients.filter(client => {
    // Since we don't have activatedAt, we'll use a rough estimate
    if (!client.onboardedAt || !client.active) return false;
    const onboardDate = new Date(client.onboardedAt);
    return onboardDate >= startDate && client.active;
  });
  
  // Calculate period-specific conversion rates
  const totalNewClients = newClientsInPeriod.length;
  const prospectConversionRate = totalNewClients > 0 
    ? (newProspectsInPeriod.length / totalNewClients) * 100 
    : 0;
  
  const activeConversionRate = newProspectsInPeriod.length > 0 
    ? (newActiveClientsInPeriod.length / newProspectsInPeriod.length) * 100 
    : 0;
  
  // Number of days in the selected period
  const daysInSelectedPeriod = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24));
  
  // Leads and prospects per day
  const newLeadsPerDay = parseFloat((newClientsInPeriod.length / daysInSelectedPeriod).toFixed(1));
  const newProspectsPerDay = parseFloat((newProspectsInPeriod.length / daysInSelectedPeriod).toFixed(1));

  // Calculate average time metrics based on client data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // Average time as lead (for clients that became prospects in the selected period)
  const clientsWithOnboardingDate = clients.filter(client => 
    client.onboardedAt && client.createdAt && 
    new Date(client.onboardedAt) >= startDate
  );
  
  const leadTimeTotal = clientsWithOnboardingDate.reduce((total, client) => {
    const createdDate = new Date(client.createdAt!);
    const onboardedDate = new Date(client.onboardedAt!);
    const dayDiff = Math.floor((onboardedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
    return total + dayDiff;
  }, 0);
  
  const avgLeadTime = clientsWithOnboardingDate.length > 0 ? 
    Math.round(leadTimeTotal / clientsWithOnboardingDate.length) : 14;
  
  // Average time as prospect (for clients that became active in the selected period)
  const clientsWithActiveDate = clients.filter(client => 
    client.active && client.onboardedAt && 
    new Date(client.onboardedAt) >= startDate
  );
  
  const prospectTimeTotal = clientsWithActiveDate.reduce((total, client) => {
    const onboardedDate = new Date(client.onboardedAt!);
    // Poiché non abbiamo la data di attivazione, usiamo la data attuale come approssimazione
    const activatedDate = new Date();
    const dayDiff = Math.floor((activatedDate.getTime() - onboardedDate.getTime()) / (1000 * 3600 * 24));
    return total + dayDiff;
  }, 0);
  
  const avgProspectTime = clientsWithActiveDate.length > 0 ? 
    Math.round(prospectTimeTotal / clientsWithActiveDate.length) : 30;
  
  // Calculate average assets per client type based on period selection
  const assets = assetsData?.assets || [];
  
  // Get prospects and active clients within the selected period
  const prospectsInPeriod = clients.filter(client => 
    client.isOnboarded && !client.isArchived && !client.active && 
    client.onboardedAt && new Date(client.onboardedAt) >= startDate
  );
  
  const activeClientsInPeriod = clients.filter(client => 
    client.isOnboarded && !client.isArchived && client.active && 
    client.onboardedAt && new Date(client.onboardedAt) >= startDate
  );
  
  // Filter assets for these clients
  const prospectAssets = assets.filter(asset => {
    const client = prospectsInPeriod.find(c => c.id === asset.clientId);
    return client !== undefined;
  });
  
  const activeClientAssets = assets.filter(asset => {
    const client = activeClientsInPeriod.find(c => c.id === asset.clientId);
    return client !== undefined;
  });
  
  // Calcola la media degli asset dai dati MIFID invece che dalla tabella assets
  const { data: mifidData, isLoading: isLoadingMifid } = useQuery<{mifids: Array<any>}>({
    queryKey: ['/api/mifid'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
  
  const mifids = mifidData?.mifids || [];
  
  // Funzione di supporto per estrarre il valore totale degli asset da un record MIFID
  const getMifidAssetTotal = (clientId: number) => {
    const clientMifid = mifids.find(m => m.clientId === clientId);
    if (!clientMifid) return 0;
    
    try {
      // Se assets è un numero diretto
      if (clientMifid.assets && typeof clientMifid.assets === 'number') {
        return clientMifid.assets;
      }
      // Se assets è un oggetto JSON, estrai il campo total
      else if (clientMifid.assets && typeof clientMifid.assets === 'object') {
        return clientMifid.assets.total || 0;
      }
      // Se assets è una stringa JSON, parsala
      else if (typeof clientMifid.assets === 'string') {
        const parsed = JSON.parse(clientMifid.assets);
        if (typeof parsed === 'number') return parsed;
        return parsed.total || 0;
      }
    } catch (e) {
      
    }
    
    return 0;
  };
  
  // Calcola la media degli asset per i prospect usando total_assets
  const assetsPerProspect = prospectsInPeriod.length > 0 ? 
    parseFloat((prospectsInPeriod.reduce((sum, client) => {
      const assetTotal = client.totalAssets || 0;
      console.log(`Client ${client.id} (${client.name}) - Asset total: ${assetTotal}`);
      return sum + assetTotal;
    }, 0) / prospectsInPeriod.length).toFixed(1)) : 0;
  
  console.log('New prospects in period:', prospectsInPeriod.length);
  console.log('Prospects details:', prospectsInPeriod.map(p => ({
    id: p.id,
    name: p.name,
    onboardedAt: p.onboardedAt,
    totalAssets: p.totalAssets || 0
  })));
  
  // Calcola la media degli asset per i clienti attivi usando MIFID
  const assetsPerActiveClient = activeClientsInPeriod.length > 0 ? 
    parseFloat((activeClientsInPeriod.reduce((sum, client) => sum + getMifidAssetTotal(client.id), 0) / activeClientsInPeriod.length).toFixed(1)) : 0;

  // Prepare portfolio data
  const portfolioStats = portfolioData || {
    totalAUM: 0,
    aumChange: 0,
    aumChangePercent: 0,
    averagePortfolioSize: 0,
    revenueYTD: 0,
    revenueLastYear: 0,
    revenueChangePercent: 0,
    assetAllocation: [],
    performanceLastMonth: 0,
    performanceYTD: 0
  };
  
  // Prepare risk profile distribution
  const riskProfiles = activeClients.reduce((acc, client) => {
    // Usa client.mifidRiskProfile o un valore dal MIFID se disponibile, altrimenti usa 'unknown'
    const profile = (client as any).riskProfile || (client as any).mifidRiskProfile || 'unknown';
    acc[profile] = (acc[profile] || 0) + 1;
    return acc as Record<string, number>;
  }, {} as Record<string, number>);
  
  const lowRiskClients = riskProfiles['conservative'] || 0;
  const mediumRiskClients = (riskProfiles['moderate'] || 0) + (riskProfiles['balanced'] || 0);
  const highRiskClients = (riskProfiles['growth'] || 0) + (riskProfiles['aggressive'] || 0);

  // Prepare tasks data
  const taskData = tasksData?.tasks || { completed: [], pending: [] };
  const isNewTasksFormat = typeof taskData === 'object' && 'completed' in taskData && 'pending' in taskData;
  const completedTasks = isNewTasksFormat ? taskData.completed || [] : [];
  const pendingTasks = isNewTasksFormat ? taskData.pending || [] : [];
  const allTasks = [...completedTasks, ...pendingTasks];
  const tasksDueToday = allTasks.length;
  const highPriorityTasks = allTasks.filter((task: any) => task.priority === 'high').length || 0;

  // Aggiungo uno stato per tenere traccia delle attività completate localmente
  // Quest'array conterrà gli ID delle attività che l'utente ha contrassegnato come completate
  const [localCompletedTaskIds, setLocalCompletedTaskIds] = useState<Set<number>>(new Set());

  // All'inizio, quando arrivano i dati, sincronizziamo lo stato locale 
  useEffect(() => {
    if (isNewTasksFormat && completedTasks && completedTasks.length > 0) {
      // Crea un nuovo Set con gli ID delle attività completate
      const newCompletedIds = new Set((completedTasks as any[]).map(task => task.id));
      setLocalCompletedTaskIds(newCompletedIds);
    }
  }, [completedTasks, isNewTasksFormat]);

  // Modifico la funzione handleTaskCompletion per usare lo stato locale
  const handleTaskCompletion = async (taskId: number, isCompleted: boolean) => {
    try {
      
      
      // Aggiorna immediatamente lo stato locale per un feedback visivo istantaneo
      setLocalCompletedTaskIds(prev => {
        const newSet = new Set(prev);
        if (isCompleted) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
      
      const url = isCompleted 
        ? `/api/tasks/${taskId}/uncomplete`
        : `/api/tasks/${taskId}/complete`;
      
      
      
      // Tenta di chiamare l'API
      try {
        const response = await apiRequest(url, {
          method: 'POST',
        });
        
        
        // Invalida le query rilevanti per aggiornare i dati
        
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/agenda/today'] });
      } catch (e) {
        console.warn('API non funzionante, usando solo lo stato locale:', e);
        // Non serve fare altro perché abbiamo già aggiornato lo stato locale
      }
      
    } catch (error) {
      
      toast({
        title: t('common.error'),
        description: t('dashboard.task_toggle_error'),
        variant: 'destructive'
      });
    }
  };

  // Prepare agenda - filtra per assicurarsi che vengano mostrati solo gli eventi di oggi
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const todayEvents = (agendaData?.events || []).filter(event => event.date === todayDate);
  
  // Prepare compliance data
  const missingDocuments = complianceData?.missingDocuments || [];
  const documentComplianceRate = complianceData?.complianceRate || 92;
  const daysToNextAudit = complianceData?.daysToNextAudit || 15;
  
  // Prepare activity feed
  const recentActivities = activityData?.activities || [];

  // Format asset allocation data
  const assetAllocation = portfolioStats.assetAllocation || [
    { category: "Equities", percentage: 45, value: portfolioStats.totalAUM * 0.45 },
    { category: "Bonds", percentage: 30, value: portfolioStats.totalAUM * 0.30 },
    { category: "ETFs", percentage: 15, value: portfolioStats.totalAUM * 0.15 },
    { category: "Cash", percentage: 10, value: portfolioStats.totalAUM * 0.10 }
  ];

  // Format communication data
  const unreadMessages = 3; // Da sostituire con dati API reali
  const pendingFollowUps = 5; // Da sostituire con dati API reali

  // Prepara i dati di comunicazione dai client logs
  const clientLogs = allClientLogsData?.logs || [];
  
  // Calcola una matrice di log per cliente
  const calculateClientInteractions = (selectedTimeframe: TimeframePeriod = timeframe) => {
    // Se non ci sono clienti o log, ritorna un array vuoto
    if (!clients.length || !clientLogs.length) return [];
    
    // Calcola la data di inizio in base al timeframe selezionato
    const startDate = (() => {
      const now = new Date();
      switch (selectedTimeframe) {
        case '1w': return new Date(now.setDate(now.getDate() - 7));
        case '1m': return new Date(now.setDate(now.getDate() - 30));
        default: return new Date(now.setDate(now.getDate() - 30));
      }
    })();
    
    // Filtra i log in base al periodo selezionato
    const filteredLogs = clientLogs.filter(log => new Date(log.logDate) >= startDate);
    
    // Crea un map di conteggi per cliente
    const interactionCounts = new Map();
    
    // Inizializza il map con tutti i clienti
    clients.forEach(client => {
      interactionCounts.set(client.id, {
        id: client.id,
        name: client.name || `${client.firstName} ${client.lastName}`,
        emails: 0,
        calls: 0,
        meetings: 0,
        total: 0
      });
    });
    
    // Conta i log per ogni cliente
    filteredLogs.forEach(log => {
      if (!interactionCounts.has(log.clientId)) return;
      
      const clientStats = interactionCounts.get(log.clientId);
      
      // Non conteggiare le note nel totale delle interazioni
      if (log.type === 'email') {
        clientStats.emails++;
        clientStats.total++;
      }
      else if (log.type === 'call') {
        clientStats.calls++;
        clientStats.total++;
      }
      else if (log.type === 'meeting') {
        clientStats.meetings++;
        clientStats.total++;
      }
      // Le note non vengono conteggiate nel totale
      
      interactionCounts.set(log.clientId, clientStats);
    });
    
    // Converti il map in array e ordina per totale interazioni
    const result = Array.from(interactionCounts.values())
      .sort((a, b) => b.total - a.total);
      
    return result;
  };
  
  // Calcola i percentili per colorare le interazioni
  const calculatePercentiles = (interactions: any[]) => {
    if (!interactions.length) return { 
      emailP25: 0, emailP50: 0, emailP75: 0, emailP90: 0,
      callsP25: 0, callsP50: 0, callsP75: 0, callsP90: 0,
      meetingsP25: 0, meetingsP50: 0, meetingsP75: 0, meetingsP90: 0
    };
    
    // Estrai tutti i valori di email, chiamate e meeting
    const emails = interactions.map(i => i.emails).sort((a, b) => a - b);
    const calls = interactions.map(i => i.calls).sort((a, b) => a - b);
    const meetings = interactions.map(i => i.meetings).sort((a, b) => a - b);
    
    // Calcola i percentili (25°, 50°, 75°, 90°) per ogni tipo
    const p25Index = Math.floor(interactions.length * 0.25);
    const p50Index = Math.floor(interactions.length * 0.5);
    const p75Index = Math.floor(interactions.length * 0.75);
    const p90Index = Math.floor(interactions.length * 0.9);
    
    return {
      emailP25: emails[p25Index] || 0,
      emailP50: emails[p50Index] || 0,
      emailP75: emails[p75Index] || 0,
      emailP90: emails[p90Index] || 0,
      callsP25: calls[p25Index] || 0,
      callsP50: calls[p50Index] || 0,
      callsP75: calls[p75Index] || 0,
      callsP90: calls[p90Index] || 0,
      meetingsP25: meetings[p25Index] || 0,
      meetingsP50: meetings[p50Index] || 0,
      meetingsP75: meetings[p75Index] || 0,
      meetingsP90: meetings[p90Index] || 0
    };
  };

  // Calcola il numero medio di interazioni per cliente in base al timeframe
  const calculateAverageInteractions = (selectedTimeframe: TimeframePeriod = timeframe) => {
    // Se non ci sono clienti o log, ritorna valori di default
    if (!clients.length || !clientLogs.length) return { emails: 0, calls: 0, meetings: 0 };
    
    // Calcola la data di inizio in base al timeframe selezionato
    const startDate = (() => {
      const now = new Date();
      switch (selectedTimeframe) {
        case '1w': return new Date(now.setDate(now.getDate() - 7));
        case '1m': return new Date(now.setDate(now.getDate() - 30));
        default: return new Date(now.setDate(now.getDate() - 30));
      }
    })();
    
    // Filtra i log in base al periodo selezionato
    const filteredLogs = clientLogs.filter(log => new Date(log.logDate) >= startDate);
    
    // Conta i vari tipi di interazioni per cliente (escluse le note)
    const emailCount = filteredLogs.filter(log => log.type === 'email').length;
    const callCount = filteredLogs.filter(log => log.type === 'call').length;
    const meetingCount = filteredLogs.filter(log => log.type === 'meeting').length;
    
    // Calcola il numero di settimane nel periodo selezionato
    const now = new Date();
    const weeksInPeriod = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    
    // Contiamo solo i clienti attivi per calcolare la media
    const activeClientsCount = clients.filter(client => client.active).length || 1; // evita divisione per zero
    
    // Calcola la media per cliente attivo per settimana, arrotondando a un decimale
    const emailsPerClientPerWeek = (emailCount / activeClientsCount) / weeksInPeriod;
    const callsPerClientPerWeek = (callCount / activeClientsCount) / weeksInPeriod;
    const meetingsPerClientPerWeek = (meetingCount / activeClientsCount) / weeksInPeriod;
    const totalPerClientPerWeek = ((emailCount + callCount + meetingCount) / activeClientsCount) / weeksInPeriod;
    
    // Arrotonda a 1 decimale con Math.round per avere arrotondamento più preciso
    return {
      emails: Math.round(emailsPerClientPerWeek * 10) / 10,
      calls: Math.round(callsPerClientPerWeek * 10) / 10,
      meetings: Math.round(meetingsPerClientPerWeek * 10) / 10,
      total: Math.round(totalPerClientPerWeek * 10) / 10
    };
  };

  // Calcola le statistiche totali per le interazioni in base al timeframe
  const calculateInteractionStats = (selectedTimeframe: TimeframePeriod = timeframe) => {
    // Se non ci sono log, ritorna valori di default
    if (!clientLogs.length) return { emails: 0, calls: 0, meetings: 0, total: 0 };
    
    // Calcola la data di inizio in base al timeframe selezionato
    const startDate = (() => {
      const now = new Date();
      switch (selectedTimeframe) {
        case '1w': return new Date(now.setDate(now.getDate() - 7));
        case '1m': return new Date(now.setDate(now.getDate() - 30));
        default: return new Date(now.setDate(now.getDate() - 30));
      }
    })();
    
    // Filtra i log in base al periodo selezionato
    const filteredLogs = clientLogs.filter(log => new Date(log.logDate) >= startDate);
    
    // Conta i vari tipi di interazioni (escluse le note)
    const emailCount = filteredLogs.filter(log => log.type === 'email').length;
    const callCount = filteredLogs.filter(log => log.type === 'call').length;
    const meetingCount = filteredLogs.filter(log => log.type === 'meeting').length;
    
    return {
      emails: emailCount,
      calls: callCount,
      meetings: meetingCount,
      total: emailCount + callCount + meetingCount
    };
  };
  
  // Stato per il timeframe delle interazioni dei clienti
  const [interactionsTimeframe, setInteractionsTimeframe] = useState<TimeframePeriod>('1m');
  
  // Calcola le statistiche sulle interazioni in base al timeframe
  const interactionStats = calculateInteractionStats(interactionsTimeframe);
  
  // Calcola la media delle interazioni per cliente
  const averageInteractions = calculateAverageInteractions(interactionsTimeframe);
  
  // Calcola le interazioni dei clienti basate sul timeframe selezionato
  const clientInteractions = calculateClientInteractions(interactionsTimeframe);
  
  // Calcola i percentili per la colorazione
  const percentiles = calculatePercentiles(clientInteractions);

  // Stato per il dialog dei trend
  const [showTrendDialog, setShowTrendDialog] = useState(false);
  const [showCommunicationTrendDialog, setShowCommunicationTrendDialog] = useState(false);

  // Genera dati di trend per il dialog
  const generateTrendData = (type: 'conversion' | 'acquisition' | 'assets' | 'time'): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - solo 1m e 1w
    const periods: TimeframePeriod[] = ['1m', '1w'];
    
    periods.forEach(period => {
      // Non generare più dati casuali, ma utilizza solo valori reali o zero
      const result: TrendData = {
        period,
        value1: 0,
        value2: 0
      };
      
      // In una versione futura, qui si possono aggiungere calcoli basati su dati reali
      // per ora restituiamo solo zeri
      
      results.push(result);
    });
    
    return results;
  };

  // Calcolo dinamico della percentuale di completamento in base allo stato locale
  const calculateCompletionPercentage = () => {
    if (allTasks.length === 0) return 0;
    
    // Conta quante attività sono effettivamente completate in base allo stato locale
    const completedCount = allTasks.filter((task: any) => 
      // Un'attività è completata se era originariamente completata e non è stata deselezionata
      // OPPURE se è stata selezionata localmente
      (task.completed && !localCompletedTaskIds.has(task.id)) || 
      (!task.completed && localCompletedTaskIds.has(task.id))
    ).length;
    
    return (completedCount / allTasks.length) * 100;
  };

  // Usa il calcolo dinamico invece del valore statico
  const completionPercentage = calculateCompletionPercentage();

  // Funzione per determinare il colore in base alla percentuale di completamento
  const getCompletionColor = (percentage: number) => {
    if (percentage < 30) return "text-red-500";
    if (percentage < 70) return "text-amber-500";
    return "text-green-500";
  };

  // Nella dashboard, dopo la dichiarazione di forceUpdate
  const [forceUpdate, setForceUpdate] = useState(false);

  // Genera dati per il trend dei nuovi prospect
  const generateProspectTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - solo 1m e 1w
    const periods: TimeframePeriod[] = ['1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          default: return new Date(now.setDate(now.getDate() - 30));
        }
      })();
      
      // Calcola il numero di giorni nel periodo
      const daysInPeriod = Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (1000 * 3600 * 24));
      
      // Filtra i clienti diventati prospect nel periodo
      const prospectsInPeriod = clients.filter(client => 
        client.onboardedAt && new Date(client.onboardedAt) >= tempStartDate
      );
      
      // Calcola la media giornaliera di nuovi prospect
      const newProspectsPerDay = parseFloat((prospectsInPeriod.length / daysInPeriod).toFixed(1));
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: newProspectsPerDay
      });
    });
    
    return results;
  };
  
  // Genera dati per il trend del lead time
  const generateLeadTimeTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - solo 1m e 1w
    const periods: TimeframePeriod[] = ['1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          default: return new Date(now.setDate(now.getDate() - 30));
        }
      })();
      
      // Filtra i clienti che sono diventati prospect nel periodo
      const clientsWithLeadTime = clients.filter(client => 
        client.createdAt && client.onboardedAt && 
        new Date(client.onboardedAt) >= tempStartDate
      );
      
      // Calcola il lead time medio
      let avgLeadTime = 0;
      if (clientsWithLeadTime.length > 0) {
        const totalLeadTime = clientsWithLeadTime.reduce((sum, client) => {
          const createdDate = new Date(client.createdAt!);
          const onboardedDate = new Date(client.onboardedAt!);
          const dayDiff = Math.ceil((onboardedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
          return sum + dayDiff;
        }, 0);
        
        avgLeadTime = parseFloat((totalLeadTime / clientsWithLeadTime.length).toFixed(1));
      }
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: avgLeadTime
      });
    });
    
    return results;
  };
  
  // Genera dati per il trend del prospect time
  const generateProspectTimeTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - solo 1m e 1w
    const periods: TimeframePeriod[] = ['1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          default: return new Date(now.setDate(now.getDate() - 30));
        }
      })();
      
      // Filtra i clienti che sono diventati attivi nel periodo
      const clientsWithProspectTime = clients.filter(client => 
        client.onboardedAt && client.activatedAt && 
        new Date(client.activatedAt) >= tempStartDate
      );
      
      // Calcola il prospect time medio
      let avgProspectTime = 0;
      if (clientsWithProspectTime.length > 0) {
        const totalProspectTime = clientsWithProspectTime.reduce((sum, client) => {
          const onboardedDate = new Date(client.onboardedAt!);
          const activatedDate = new Date(client.activatedAt!);
          const dayDiff = Math.ceil((activatedDate.getTime() - onboardedDate.getTime()) / (1000 * 3600 * 24));
          return sum + dayDiff;
        }, 0);
        
        avgProspectTime = parseFloat((totalProspectTime / clientsWithProspectTime.length).toFixed(1));
      }
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: avgProspectTime
      });
    });
    
    return results;
  };

  // Genera dati per il trend di comunicazione
  const generateCommunicationTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Se non ci sono log, restituisci solo zeri
    if (!clientLogs.length) {
      const periods: TimeframePeriod[] = ['1m', '1w'];
      return periods.map(period => ({
        period,
        value1: 0,
        value2: 0,
        value3: 0
      }));
    }
    
    // Periodi da confrontare - solo 1m e 1w
    const periods: TimeframePeriod[] = ['1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          default: return new Date(now.setDate(now.getDate() - 30));
        }
      })();
      
      // Filtra i log in base al periodo
      const logsInPeriod = clientLogs.filter(log => new Date(log.logDate) >= tempStartDate);
      
      // Conta i vari tipi di log
      const emailsInPeriod = logsInPeriod.filter(log => log.type === 'email').length;
      const callsInPeriod = logsInPeriod.filter(log => log.type === 'call').length;
      const meetingsInPeriod = logsInPeriod.filter(log => log.type === 'meeting').length;
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: emailsInPeriod / (clients.length || 1), // Email medie per cliente
        value2: callsInPeriod / (clients.length || 1),   // Chiamate medie per cliente
        value3: meetingsInPeriod / (clients.length || 1) // Incontri medi per cliente
      });
    });
    
    return results;
  };

  // Prepara i dati del portfolio filtrando solo i clienti attivi
  const calculateActiveClientAUM = () => {
    // Se non ci sono dati sui clienti, usa i dati dall'API
    if (!clients || !clients.length) {
      return portfolioStats.totalAUM;
    }
    
    // Ottieni solo i clienti attivi e non archiviati
    const activeClientsList = clients.filter(client => client.active && !client.isArchived);
    
    // Somma direttamente il campo totalAssets dai clienti attivi
    const totalActiveAUM = activeClientsList.reduce((sum, client) => {
      // Utilizza totalAssets se disponibile, altrimenti 0
      const clientAssets = client.totalAssets || 0;
      return sum + clientAssets;
    }, 0);
    
    
    
    return totalActiveAUM || portfolioStats.totalAUM; // Fallback ai dati dell'API se la somma è zero
  };

  // Usa il valore calcolato invece di quello dell'API
  const activeClientAUM = calculateActiveClientAUM();

  // Funzione per formattare il valore in formato compatto (k, m)
  const formatCompactValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  // Estrai e ordina le opportunità da tutti i profili AI
  const opportunities = useMemo(() => {
    console.log("DEBUG OPPS: aiProfilesData:", aiProfilesData);
    
    if (!aiProfilesData) {
      console.error("DEBUG OPPS: aiProfilesData è nullo o undefined");
      return [];
    }
    
    if (!aiProfilesData.profiles) {
      console.error("DEBUG OPPS: aiProfilesData.profiles è nullo o undefined");
      return [];
    }
    
    console.log("DEBUG OPPS: numero di profili:", aiProfilesData.profiles.length);
    
    try {
      // Esamina la struttura di ciascun profilo
      aiProfilesData.profiles.forEach((profile, index) => {
        console.log(`DEBUG OPPS: Profilo [${index}]:`, profile);
        
        if (!profile.opportunitaBusiness) {
          console.error(`DEBUG OPPS: opportunitaBusiness mancante nel profilo [${index}]`);
        } else if (!Array.isArray(profile.opportunitaBusiness)) {
          console.error(`DEBUG OPPS: opportunitaBusiness non è un array nel profilo [${index}]:`, 
                        typeof profile.opportunitaBusiness);
        } else {
          console.log(`DEBUG OPPS: profilo [${index}] ha ${profile.opportunitaBusiness.length} opportunità`);
          
          // Mostra i primi elementi dell'array opportunità
          if (profile.opportunitaBusiness.length > 0) {
            console.log(`DEBUG OPPS: esempio opportunità:`, profile.opportunitaBusiness[0]);
          }
        }
      });
      
      const allOpportunities = aiProfilesData.profiles.flatMap((profile, profileIndex) => {
        if (!profile.opportunitaBusiness) {
          console.error(`DEBUG OPPS: Salto profilo [${profileIndex}] - opportunitaBusiness mancante`);
          return [];
        }
        
        if (!Array.isArray(profile.opportunitaBusiness)) {
          console.error(`DEBUG OPPS: Salto profilo [${profileIndex}] - opportunitaBusiness non è un array`);
          return [];
        }
        
        return profile.opportunitaBusiness.map((opp, oppIndex) => {
          console.log(`DEBUG OPPS: Mappo opportunità [${profileIndex}][${oppIndex}]:`, opp);
          
          const mappedOpp = {
            id: `${profile.clientId}-${opp.priorita || 'unknown'}`,
            clientId: profile.clientId,
            clientName: profile.clientName || `Cliente #${profile.clientId}`,
            title: opp.titolo,
            description: opp.descrizione,
            priority: opp.priorita,
            email: opp.email,
            azioni: opp.azioni
          };
          
          console.log(`DEBUG OPPS: Opportunità mappata:`, mappedOpp);
          return mappedOpp;
        });
      });
      
      console.log(`DEBUG OPPS: Totale opportunità create: ${allOpportunities.length}`);
      
      // Ordina per priorità (1 = alta, 2 = media, 3 = bassa)
      const sortedOpportunities = allOpportunities.sort((a, b) => a.priority - b.priority);
      console.log(`DEBUG OPPS: Opportunità ordinate:`, sortedOpportunities);
      
      return sortedOpportunities;
    } catch (error) {
      console.error("DEBUG OPPS: Errore durante la creazione delle opportunità:", error);
      return [];
    }
  }, [aiProfilesData]);

  const handleSendEmail = async (clientId: number, emailData: { oggetto: string; corpo: string }) => {
    try {
      // Show loading toast
      toast({
        title: t('common.sending'),
        description: t('common.please_wait'),
      });
      
      // Send the email via API
      const response = await apiRequest(`/api/clients/${clientId}/send-email`, {
        method: 'POST',
        body: JSON.stringify({
          subject: emailData.oggetto,
          message: emailData.corpo,
          language: 'italian' // o 'english' in base alle preferenze
        })
      });
      
      if (response.success) {
        toast({
          title: t('client.email_sent'),
          description: t('client.opportunity_email_sent_success'),
        });
        setShowOpportunityDetailDialog(false);
      } else {
        toast({
          title: t('common.error'),
          description: response.message || t('client.onboarding_email_error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('dashboard.email_error'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
      <PageHeader 
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        />
      </div>

      {/* Opportunities Dialog */}
      <Dialog open={showOpportunitiesDialog} onOpenChange={setShowOpportunitiesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('dashboard.opportunities')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingAIProfiles ? (
              <div className="py-6 text-center text-muted-foreground">
                {t('dashboard.loading')}...
              </div>
            ) : opportunities.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                {t('dashboard.no_opportunities')}
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opportunity) => {
                  const client = clients.find(c => c.id === opportunity.clientId);
                  const clientAUM = client?.totalAssets || 0;
                  
                  return (
                    <div 
                      key={opportunity.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOpportunity(opportunity);
                        setShowOpportunityDetailDialog(true);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-2 h-2 rounded-full ${
                          opportunity.priority === 1 ? 'bg-red-500' :
                          opportunity.priority === 2 ? 'bg-orange-500' :
                          opportunity.priority === 3 ? 'bg-yellow-500' :
                          opportunity.priority === 4 ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="min-w-[150px]">
                          <div className="font-medium">{opportunity.clientName}</div>
                          <div className="text-sm text-muted-foreground">
                            Priorità {
                              opportunity.priority === 1 ? 'MASSIMA' :
                              opportunity.priority === 2 ? 'ALTA' :
                              opportunity.priority === 3 ? 'MEDIA' :
                              opportunity.priority === 4 ? 'BASSA' :
                              'MINIMA'
                            }
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{opportunity.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {opportunity.description}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpportunity(opportunity);
                          setShowOpportunityDetailDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common.view')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per visualizzare il dettaglio dell'opportunità */}
      <Dialog open={showOpportunityDetailDialog} onOpenChange={setShowOpportunityDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              Cliente: {selectedOpportunity?.clientName} - Priorità {
                selectedOpportunity?.priority === 1 ? 'MASSIMA' :
                selectedOpportunity?.priority === 2 ? 'ALTA' :
                selectedOpportunity?.priority === 3 ? 'MEDIA' :
                selectedOpportunity?.priority === 4 ? 'BASSA' :
                'MINIMA'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Descrizione</h3>
              <p className="text-sm">{selectedOpportunity?.description}</p>
            </div>
            
            {selectedOpportunity?.azioni && selectedOpportunity.azioni.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Azioni consigliate</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedOpportunity.azioni.map((azione: string, idx: number) => (
                    <li key={idx}>{azione}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedOpportunity?.email && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Email consigliata</h3>
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Oggetto:</h4>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border rounded-md text-sm" 
                        value={selectedOpportunity.email.oggetto} 
                        onChange={(e) => {
                          if (selectedOpportunity) {
                            const updatedOpportunity = {...selectedOpportunity};
                            updatedOpportunity.email.oggetto = e.target.value;
                            setSelectedOpportunity(updatedOpportunity);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Corpo:</h4>
                      <textarea 
                        className="w-full px-3 py-2 border rounded-md text-sm h-32" 
                        value={selectedOpportunity.email.corpo} 
                        onChange={(e) => {
                          if (selectedOpportunity) {
                            const updatedOpportunity = {...selectedOpportunity};
                            updatedOpportunity.email.corpo = e.target.value;
                            setSelectedOpportunity(updatedOpportunity);
                          }
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="default"
              onClick={() => {
                if (selectedOpportunity) {
                  handleSendEmail(selectedOpportunity.clientId, selectedOpportunity.email);
                  setShowOpportunityDetailDialog(false);
                }
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('dashboard.send_email')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two column layout for main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* 🔷 Dashboard Overview (at-a-glance) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.total_aum')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(activeClientAUM)}</div>
                <div className={`flex items-center text-xs ${portfolioStats.aumChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {portfolioStats.aumChangePercent >= 0 ? <ArrowUpRight className="mr-1 h-4 w-4" /> : <ArrowDownRight className="mr-1 h-4 w-4" />}
                  <span>{formatPercent(Math.abs(portfolioStats.aumChangePercent))}</span>
                  <span className="text-muted-foreground ml-1">{t('dashboard.from_previous_period')}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.active_clients')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(activeClients.length)}</div>
                <p className="text-xs text-muted-foreground">
                  {newClientsThisMonth} {t('dashboard.new_this_month')}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Task Manager */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.todays_agenda')}</CardTitle>
              <CardDescription>{t('dashboard.scheduled_events')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAgenda ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
              ) : todayEvents.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.no_events_today')}
              </div>
              ) : (
                <div className="space-y-4">
                  {todayEvents.slice(0, 3).map((event: Event, index: number) => (
                    <div key={index} className="flex items-start gap-4">
              <Button 
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 rounded-full p-0 mt-2 ${localCompletedTaskIds.has(event.id) ? 'bg-green-100 text-green-500' : 'bg-muted'}`}
                onClick={() => {
                          
                          handleTaskCompletion(event.id, localCompletedTaskIds.has(event.id));
                        }}
                      >
                        {localCompletedTaskIds.has(event.id) ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </Button>
                      <div className="bg-primary/10 p-2 rounded-md">
                        {event.type === 'call' ? (
                          <Phone className="h-5 w-5 text-primary" />
                        ) : event.type === 'meeting' ? (
                          <Users className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${localCompletedTaskIds.has(event.id) ? 'line-through text-muted-foreground' : ''}`}>
                          {event.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.startTime} - {event.endTime} · {event.clientName}
                        </div>
                      </div>
                      <Badge className={
                        event.location === 'zoom' ? "bg-blue-500" :
                        event.location === 'office' ? "bg-green-500" :
                        "bg-amber-500"
                      }>
                        {event.location.charAt(0).toUpperCase() + event.location.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="ghost" className="w-full" onClick={() => setLocation('/calendar')}>
                {t('dashboard.view_calendar')}
              </Button>
            </CardFooter>
          </Card>

          {/* Client Pipeline Snapshot - Temporarily disabled but kept for future use */}
          {false && (
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.client_pipeline')}</CardTitle>
              <CardDescription className="flex justify-between items-center">
                <span>{t('dashboard.conversion_funnel')}</span>
                <div className="flex border rounded-md overflow-hidden">
                  <button 
                    onClick={() => setTimeframe('1w')} 
                    className={`px-1.5 py-0.5 text-xs ${timeframe === '1w' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
                  >
                    {t('dashboard.timeframe_1w')}
                  </button>
                  <button 
                    onClick={() => setTimeframe('1m')} 
                    className={`px-1.5 py-0.5 text-xs ${timeframe === '1m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
                  >
                    {t('dashboard.timeframe_1m')}
                  </button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(leadClients)}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard.leads')}
                    <div className={`text-xs ${leadDifference > 0 ? 'text-green-500' : leadDifference < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {leadDifference > 0 ? `+${leadDifference}` : leadDifference < 0 ? leadDifference : '+0'} {timeframe === '1w' ? "nell'ultima settimana" : "nell'ultimo mese"}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(prospectClients)}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard.prospects')}
                    <div className={`text-xs ${prospectDifference > 0 ? 'text-green-500' : prospectDifference < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {prospectDifference > 0 ? `+${prospectDifference}` : prospectDifference < 0 ? prospectDifference : '+0'} {timeframe === '1w' ? "nell'ultima settimana" : "nell'ultimo mese"}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(activeClientCount)}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard.active_clients')}
                    <div className={`text-xs ${activeDifference > 0 ? 'text-green-500' : activeDifference < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {activeDifference > 0 ? `+${activeDifference}` : activeDifference < 0 ? activeDifference : '+0'} {timeframe === '1w' ? "nell'ultima settimana" : "nell'ultimo mese"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Card className="border shadow-sm">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      {t('dashboard.conversion_rates')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.lead_to_prospect')}</span>
                        <span className="text-sm font-medium">{formatPercent(prospectConversionRate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.prospect_to_active')}</span>
                        <span className="text-sm font-medium">{formatPercent(activeConversionRate)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 italic text-right">
                        {timeframe === '1w' ? t('dashboard.last_week') : t('dashboard.last_month')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border shadow-sm">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      {t('dashboard.daily_acquisition')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.new_leads_per_day')}</span>
                        <span className="text-sm font-medium">{newLeadsPerDay.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.new_prospects_per_day')}</span>
                        <span className="text-sm font-medium">{newProspectsPerDay.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 italic text-right">
                        {timeframe === '1w' ? t('dashboard.last_week') : t('dashboard.last_month')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="border shadow-sm">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {t('dashboard.average_assets')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.per_prospect')}</span>
                        <span className="text-sm font-medium">{formatCompactValue(assetsPerProspect)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.per_active_client')}</span>
                        <span className="text-sm font-medium">{formatCompactValue(assetsPerActiveClient)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 italic text-right">
                        {timeframe === '1w' ? t('dashboard.last_week') : t('dashboard.last_month')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border shadow-sm">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {t('dashboard.average_time')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.as_lead')}</span>
                        <span className="text-sm font-medium">{avgLeadTime} {t('dashboard.days')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.as_prospect')}</span>
                        <span className="text-sm font-medium">{avgProspectTime} {t('dashboard.days')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 italic text-right">
                        {timeframe === '1w' ? t('dashboard.last_week') : t('dashboard.last_month')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setLocation('/trends');
                  }}
                >
                  {t('dashboard.view_trends')}
                </Button>
            </CardFooter>
          </Card>
          )}
        </div>
        
        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Top Opportunità - Allungata fino in alto */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>{t('dashboard.opportunities')}</CardTitle>
              <CardDescription>Top opportunità prioritarie</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingAIProfiles ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
              ) : opportunities.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.no_opportunities')}
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.slice(0, 8).map((opportunity) => (
                    <div 
                      key={opportunity.id}
                      className="flex items-start gap-3 p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOpportunity(opportunity);
                        setShowOpportunityDetailDialog(true);
                      }}
                    >
                      <div className={`w-2 h-full rounded-full ${
                        opportunity.priority === 1 ? 'bg-red-500' :
                        opportunity.priority === 2 ? 'bg-orange-500' :
                        opportunity.priority === 3 ? 'bg-yellow-500' :
                        opportunity.priority === 4 ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm line-clamp-1">{opportunity.title}</div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Cliente: {opportunity.clientName}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {opportunity.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4 mt-auto">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setShowOpportunitiesDialog(true)}
              >
                {t('dashboard.view_opportunities')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* 📊 Client Portfolio Insights - a tutta larghezza */}
      <Card className="col-span-full">
            <CardHeader>
          <CardTitle>{t('dashboard.client_insights')}</CardTitle>
          <CardDescription>{t('dashboard.active_clients_overview')}</CardDescription>
            </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingPortfolio || isLoadingClients ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
          ) : (
            <>
              {/* Distribuzione Clienti per Asset */}
            <div>
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  {t('dashboard.client_segment_distribution')} 
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="ml-1 cursor-help">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 text-xs p-3 shadow-lg">
                      <div className="text-muted-foreground space-y-1.5">
                        <p>Segmenti clienti:</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <span>Mass Market</span> <span>&lt;100.000€</span>
                          <span>Affluent</span> <span>100.000€-500.000€</span>
                          <span>HNW</span> <span>500.000€-2.000.000€</span>
                          <span>VHNW</span> <span>2.000.000€-10.000.000€</span>
                          <span>UHNW</span> <span>&gt;10.000.000€</span>
            </div>
          </div>
                    </HoverCardContent>
                  </HoverCard>
                </h3>
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {(() => {
                    // Definire le fasce di asset con i valori corretti
                    const segments = [
                      { name: 'mass_market', max: 100000, count: 0, percentage: 0 },
                      { name: 'affluent', max: 500000, count: 0, percentage: 0 },
                      { name: 'hnw', max: 2000000, count: 0, percentage: 0 },
                      { name: 'vhnw', max: 10000000, count: 0, percentage: 0 },
                      { name: 'uhnw', max: Infinity, count: 0, percentage: 0 }
                    ];
                    
                    // Conteggio clienti per segmento dalla proprietà clientSegment se disponibile, altrimenti calcola dagli asset
                    activeClients.forEach(client => {
                      if (client.clientSegment && CLIENT_SEGMENTS.includes(client.clientSegment as any)) {
                        // Se il client ha già il segmento definito, usa quello
                        const segmentName = client.clientSegment;
                        const segment = segments.find(s => s.name === segmentName);
                        if (segment) {
                          segment.count++;
                        }
                      } else {
                        // Altrimenti calcola in base al patrimonio
                        const clientId = client.id;
                        const clientTotal = assets
                          .filter(asset => asset.clientId === clientId)
                          .reduce((sum, asset) => sum + asset.value, 0);
                        
                        // Assegna al segmento appropriato
                        for (let i = 0; i < segments.length; i++) {
                          const segment = segments[i];
                          const prevMax = i > 0 ? segments[i - 1].max : 0;
                          
                          if (clientTotal > prevMax && clientTotal <= segment.max) {
                            segment.count++;
                            break;
                          }
                        }
                      }
                    });
                    
                    // Calcolare le percentuali
                    const totalClients = activeClients.length;
                    segments.forEach(segment => {
                      segment.percentage = totalClients > 0 ? (segment.count / totalClients) * 100 : 0;
                    });
                    
                    // Visualizzazione dei segmenti con percentuali e range
                    return segments.map((segment, index) => {                 
                      return (
                        <div key={segment.name} className="text-center">
                          <div className="text-xl font-bold">
                            {segment.count} <span className="text-sm font-normal text-muted-foreground">({segment.percentage.toFixed(0)}%)</span>
                </div>
                          <div className="text-sm text-muted-foreground">
                            {segment.name === 'mass_market' ? 'Mass Market' : 
                              segment.name === 'hnw' ? 'HNW' : 
                              segment.name === 'vhnw' ? 'VHNW' : 
                              segment.name === 'uhnw' ? 'UHNW' : 
                              segment.name.charAt(0).toUpperCase() + segment.name.slice(1)}
                </div>
                    </div>
                      );
                    });
                  })()}
                  </div>
                </div>

              {/* Grafici a torta */}
              <div className="grid grid-cols-2 gap-4">
                {/* Distribuzione Asset per Segmento */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    {t('dashboard.asset_by_segment')}
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="ml-1 cursor-help">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 text-xs p-3 shadow-lg">
                        <div className="text-muted-foreground">
                          <p>Distribuzione degli asset per segmento</p>
                          <p className="mt-1">Mostra come sono distribuiti gli asset tra i diversi segmenti di clientela.</p>
                </div>
                      </HoverCardContent>
                    </HoverCard>
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={(() => {
                          
                          
                          // Oggetto per accumulare i valori totali per segmento
                          const segmentTotals: {[key: string]: number} = {
                            'mass_market': 0,
                            'affluent': 0,
                            'hnw': 0,
                            'vhnw': 0,
                            'uhnw': 0
                          };
                          
                          
                          
                          // Assegna ogni cliente al segmento corretto usando direttamente total_assets
                          activeClients.forEach(client => {
                            // Usa direttamente il campo total_assets dal cliente
                            const totalAsset = client.totalAssets || 0;
                            
                            
                            
                            // Se il cliente ha già un segmento assegnato, usalo
                            if (client.clientSegment && CLIENT_SEGMENTS.includes(client.clientSegment as any)) {
                              segmentTotals[client.clientSegment] += totalAsset;
                              
                            } 
                            // Altrimenti calcola il segmento in base agli asset
                            else {
                              // Assegna al segmento in base agli asset totali
                              let segmentName = 'mass_market'; // Default
                              
                              if (totalAsset <= 100000) {
                                segmentName = 'mass_market';
                              } else if (totalAsset <= 500000) {
                                segmentName = 'affluent';
                              } else if (totalAsset <= 2000000) {
                                segmentName = 'hnw';
                              } else if (totalAsset <= 10000000) {
                                segmentName = 'vhnw';
                              } else {
                                segmentName = 'uhnw';
                              }
                              
                              segmentTotals[segmentName] += totalAsset;
                              
                            }
                          });
                          
                          
                          
                          // Crea l'array finale per il grafico
                          const segmentLabels: {[key: string]: string} = {
                            'mass_market': 'Mass Market',
                            'affluent': 'Affluent',
                            'hnw': 'HNW',
                            'vhnw': 'VHNW',
                            'uhnw': 'UHNW'
                          };
                          
                          const segmentColors: {[key: string]: string} = {
                            'mass_market': '#86efac',
                            'affluent': '#4ade80',
                            'hnw': '#22c55e',
                            'vhnw': '#16a34a',
                            'uhnw': '#15803d'
                          };
                          
                          const result = Object.entries(segmentTotals)
                            .filter(([_, value]) => value > 0)
                            .map(([key, value]) => ({
                              name: key,
                              displayName: segmentLabels[key],
                              value: value,
                              fill: segmentColors[key]
                            }));
                          
                          
                          return result;
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ displayName, percent }) => `${displayName}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={55}
                        innerRadius={0}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="displayName"
                      >
                        {/* Aggiungiamo celle colorate esplicite con scala di verdi */}
                        {[
                          { name: 'mass_market', fill: '#86efac' },
                          { name: 'affluent', fill: '#4ade80' },
                          { name: 'hnw', fill: '#22c55e' },
                          { name: 'vhnw', fill: '#16a34a' },
                          { name: 'uhnw', fill: '#15803d' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Distribuzione Asset per Tipo */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    {t('dashboard.asset_by_type')}
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="ml-1 cursor-help">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 text-xs p-3 shadow-lg">
                        <div className="text-muted-foreground">
                          <p>Distribuzione degli asset per tipo</p>
                          <p className="mt-1">Mostra come sono distribuiti gli asset per categoria di investimento.</p>
                </div>
                      </HoverCardContent>
                    </HoverCard>
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ category, percent, value }) => {
                          // Non mostrare etichette per asset con valore 0
                          return value > 0 ? `${t(`asset_categories.${category}`)}: ${(percent * 100).toFixed(0)}%` : null;
                        }}
                        outerRadius={55}
                        innerRadius={0}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="category"
                      >
                        {
                          assetAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={
                              index === 0 ? '#93c5fd' : // Lightest blue
                              index === 1 ? '#60a5fa' : // Light blue
                              index === 2 ? '#3b82f6' : // Medium blue
                              index === 3 ? '#2563eb' : // Dark blue
                              '#1d4ed8'  // Darkest blue
                            } />
                          ))
                        }
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)} 
                        labelFormatter={(label) => t(`asset_categories.${label}`)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Nuovo grafico: Concentrazione AUM per gruppi di clienti */}
              <div className="border rounded-lg p-3">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  {t('dashboard.aum_concentration')}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="ml-1 cursor-help">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 text-xs p-3 shadow-lg">
                      <div className="text-muted-foreground">
                        <p>{t('dashboard.aum_concentration_desc')}</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </h3>
                
                {/* Barra orizzontale con segmenti colorati */}
                <div className="pt-4 pb-8">
                  {(() => {
                    // Filtra solo i clienti attivi
                    const activeOnlyClients = clients.filter(client => 
                      client.active && !client.isArchived
                    );
                    
                    // Crea un array di clienti con i loro asset totali
                    const clientsWithAssets = activeOnlyClients.map(client => ({
                      id: client.id,
                      name: client.name,
                      totalAssets: client.totalAssets || 0
                    }));
                    
                    // Ordina i clienti per asset totali in ordine decrescente
                    clientsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);
                    
                    // Calcola l'AUM totale
                    const totalAUM = clientsWithAssets.reduce((sum, client) => sum + client.totalAssets, 0);
                    
                    // Calcola i valori per i tre segmenti
                    const top3Assets = clientsWithAssets.slice(0, 3).reduce((sum, client) => sum + client.totalAssets, 0);
                    const next7Assets = clientsWithAssets.slice(3, 10).reduce((sum, client) => sum + client.totalAssets, 0);
                    const next10Assets = clientsWithAssets.slice(10, 20).reduce((sum, client) => sum + client.totalAssets, 0);
                    
                    // Calcola le percentuali
                    const top3Percent = totalAUM > 0 ? (top3Assets / totalAUM * 100) : 0;
                    const next7Percent = totalAUM > 0 ? (next7Assets / totalAUM * 100) : 0;
                    const next10Percent = totalAUM > 0 ? (next10Assets / totalAUM * 100) : 0;
                    
                    const segments = [
                      { 
                        label: `${t('dashboard.top_clients_label').replace('{n}', '3')}`, 
                        value: top3Assets,
                        percent: top3Percent,
                        color: '#3b82f6' // Blu
                      },
                      { 
                        label: `${t('dashboard.top_clients_label').replace('{n}', '4-10')}`, 
                        value: next7Assets,
                        percent: next7Percent,
                        color: '#22c55e' // Verde
                      },
                      { 
                        label: `${t('dashboard.top_clients_label').replace('{n}', '11-20')}`, 
                        value: next10Assets,
                        percent: next10Percent,
                        color: '#eab308' // Giallo
                      }
                    ];
                    
                    return (
                      <div className="space-y-4">
                        {/* Barra segmentata */}
                        <div className="relative h-7 w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {segments.map((segment, index) => (
                            <div
                              key={index}
                              className="absolute top-0 h-full"
                              style={{
                                left: segments.slice(0, index).reduce((sum, s) => sum + s.percent, 0) + '%',
                                width: segment.percent + '%',
                                backgroundColor: segment.color
                              }}
                              title={`${segment.label}: ${formatCurrency(segment.value)} (${segment.percent.toFixed(1)}%)`}
                            ></div>
                          ))}
                        </div>
                        
                        {/* Legenda */}
                        <div className="flex flex-wrap items-center gap-4 justify-center pt-2">
                          {segments.map((segment, index) => (
                            <div key={index} className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-sm mr-1.5" 
                                style={{ backgroundColor: segment.color }}
                              ></div>
                              <span className="text-sm">
                                {segment.label}: {formatCurrency(segment.value)} ({segment.percent.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </>
          )}
            </CardContent>
          </Card>
    </div>
  );
}