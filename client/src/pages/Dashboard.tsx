import { useState, useEffect } from "react";
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
  PieChart,
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
  BarChart
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
import { Client } from "@shared/schema";
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
  DialogClose 
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
  Bar
} from "recharts";
import { DialogTrend, TrendData } from "@/components/ui/dialog-trend";

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
type TimeframePeriod = '1w' | '1m' | '3m' | '6m' | '1y';

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState<'1w' | '1m' | '3m' | '6m' | '1y'>('1m'); // Default: 1 mese
  
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
      case '3m':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return threeMonthsAgo;
      case '6m':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return sixMonthsAgo;
      case '1y':
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return oneYearAgo;
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
  
  const assetsPerProspect = prospectsInPeriod.length > 0 ? 
    parseFloat((prospectAssets.reduce((sum, asset) => sum + asset.value, 0) / prospectsInPeriod.length).toFixed(1)) : 0;
  
  const assetsPerActiveClient = activeClientsInPeriod.length > 0 ? 
    parseFloat((activeClientAssets.reduce((sum, asset) => sum + asset.value, 0) / activeClientsInPeriod.length).toFixed(1)) : 0;

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
    const profile = client.riskProfile || 'unknown';
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
      console.log(`Starting task completion toggle: ID=${taskId}, currently completed=${isCompleted}`);
      
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
      
      console.log(`Calling API endpoint: ${url}`);
      
      // Tenta di chiamare l'API
      try {
        const response = await apiRequest(url, {
          method: 'POST',
        });
        console.log(`API response:`, response);
        
        // Invalida le query rilevanti per aggiornare i dati
        console.log('Invalidating queries...');
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/agenda/today'] });
      } catch (e) {
        console.warn('API non funzionante, usando solo lo stato locale:', e);
        // Non serve fare altro perché abbiamo già aggiornato lo stato locale
      }
      
    } catch (error) {
      console.error('Error toggling task completion:', error);
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
        case '3m': return new Date(now.setMonth(now.getMonth() - 3));
        case '6m': return new Date(now.setMonth(now.getMonth() - 6));
        case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
        case '3m': return new Date(now.setMonth(now.getMonth() - 3));
        case '6m': return new Date(now.setMonth(now.getMonth() - 6));
        case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
        default: return new Date(now.setDate(now.getDate() - 30));
      }
    })();
    
    // Filtra i log in base al periodo selezionato
    const filteredLogs = clientLogs.filter(log => new Date(log.logDate) >= startDate);
    
    // Conta i vari tipi di interazioni per cliente (escluse le note)
    const emailCount = filteredLogs.filter(log => log.type === 'email').length;
    const callCount = filteredLogs.filter(log => log.type === 'call').length;
    const meetingCount = filteredLogs.filter(log => log.type === 'meeting').length;
    
    // Calcola la media per cliente
    return {
      emails: parseFloat((emailCount / clients.length).toFixed(1)),
      calls: parseFloat((callCount / clients.length).toFixed(1)),
      meetings: parseFloat((meetingCount / clients.length).toFixed(1)),
      total: parseFloat(((emailCount + callCount + meetingCount) / clients.length).toFixed(1))
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
        case '3m': return new Date(now.setMonth(now.getMonth() - 3));
        case '6m': return new Date(now.setMonth(now.getMonth() - 6));
        case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
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
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          case '3m': return new Date(now.setMonth(now.getMonth() - 3));
          case '6m': return new Date(now.setMonth(now.getMonth() - 6));
          case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          case '3m': return new Date(now.setMonth(now.getMonth() - 3));
          case '6m': return new Date(now.setMonth(now.getMonth() - 6));
          case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          case '3m': return new Date(now.setMonth(now.getMonth() - 3));
          case '6m': return new Date(now.setMonth(now.getMonth() - 6));
          case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
      const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
      return periods.map(period => ({
        period,
        value1: 0,
        value2: 0,
        value3: 0
      }));
    }
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = (() => {
        const now = new Date();
        switch (period) {
          case '1w': return new Date(now.setDate(now.getDate() - 7));
          case '1m': return new Date(now.setDate(now.getDate() - 30));
          case '3m': return new Date(now.setMonth(now.getMonth() - 3));
          case '6m': return new Date(now.setMonth(now.getMonth() - 6));
          case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
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
    // Se non ci sono dati sugli asset o sui clienti, usa i dati dall'API
    if (!assets || !assets.length || !clients || !clients.length) {
      return portfolioStats.totalAUM;
    }
    
    // Ottieni gli ID dei clienti attivi
    const activeClientIds = clients
      .filter(client => client.active && !client.isArchived)
      .map(client => client.id);
    
    // Somma solo gli asset dei clienti attivi
    const totalActiveAUM = assets
      .filter(asset => activeClientIds.includes(asset.clientId))
      .reduce((sum, asset) => sum + asset.value, 0);
    
    return totalActiveAUM || portfolioStats.totalAUM; // Fallback ai dati dell'API se la somma è zero
  };

  // Usa il valore calcolato invece di quello dell'API
  const activeClientAUM = calculateActiveClientAUM();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader 
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      >
      </PageHeader>

      {/* 🔷 Dashboard Overview (at-a-glance) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.tasks_due_today')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">{tasksDueToday}</div>
              <div className={`text-sm font-medium ${getCompletionColor(completionPercentage)}`}>
                {Math.round(completionPercentage)}% {t('dashboard.completed')}
              </div>
            </div>
            <div className="h-2 mb-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  completionPercentage < 30 ? 'bg-red-500' : 
                  completionPercentage < 70 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`} 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two column layout for main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Agenda */}
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
                          console.log('Toggling task completion for event ID:', event.id);
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

          {/* Client Pipeline Snapshot */}
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
                  <button 
                    onClick={() => setTimeframe('3m')} 
                    className={`px-1.5 py-0.5 text-xs ${timeframe === '3m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
                  >
                    {t('dashboard.timeframe_3m')}
                  </button>
                  <button 
                    onClick={() => setTimeframe('6m')} 
                    className={`px-1.5 py-0.5 text-xs ${timeframe === '6m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
                  >
                    {t('dashboard.timeframe_6m')}
                  </button>
                  <button 
                    onClick={() => setTimeframe('1y')} 
                    className={`px-1.5 py-0.5 text-xs ${timeframe === '1y' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
                  >
                    {t('dashboard.timeframe_1y')}
                  </button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(leadClients)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.leads')}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(prospectClients)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.prospects')}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(activeClientCount)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.active_clients')}</div>
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
                        {timeframe === '1w' ? t('dashboard.last_week') : 
                          timeframe === '1m' ? t('dashboard.last_month') :
                          timeframe === '3m' ? t('dashboard.last_3_months') :
                          timeframe === '6m' ? t('dashboard.last_6_months') : 
                          t('dashboard.last_year')}
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
                        {timeframe === '1w' ? t('dashboard.last_week') : 
                          timeframe === '1m' ? t('dashboard.last_month') :
                          timeframe === '3m' ? t('dashboard.last_3_months') :
                          timeframe === '6m' ? t('dashboard.last_6_months') : 
                          t('dashboard.last_year')}
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
                        <span className="text-sm font-medium">{assetsPerProspect.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('dashboard.per_active_client')}</span>
                        <span className="text-sm font-medium">{assetsPerActiveClient.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 italic text-right">
                        {timeframe === '1w' ? t('dashboard.last_week') : 
                          timeframe === '1m' ? t('dashboard.last_month') :
                          timeframe === '3m' ? t('dashboard.last_3_months') :
                          timeframe === '6m' ? t('dashboard.last_6_months') : 
                          t('dashboard.last_year')}
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
                        {timeframe === '1w' ? t('dashboard.last_week') : 
                          timeframe === '1m' ? t('dashboard.last_month') :
                          timeframe === '3m' ? t('dashboard.last_3_months') :
                          timeframe === '6m' ? t('dashboard.last_6_months') : 
                          t('dashboard.last_year')}
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
                onClick={() => setShowTrendDialog(true)}
              >
                {t('dashboard.view_trends')}
                            </Button>
            </CardFooter>
          </Card>

          {/* 📊 Client Portfolio Insights */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.portfolio_insights')}</CardTitle>
              <CardDescription>{t('dashboard.aum_overview')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPortfolio ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
                                ) : (
                                  <>
                  {/* Asset Allocation */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('dashboard.asset_allocation')}</h3>
                    <div className="space-y-2">
                      {assetAllocation.map((asset: AssetAllocation) => (
                        <div key={asset.category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{asset.category}</span>
                            <span>{formatPercent(asset.percentage)}</span>
                          </div>
                          <Progress value={asset.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Distribution */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('dashboard.risk_distribution')}</h3>
                    <div className="h-[20px] w-full rounded-md overflow-hidden flex">
                      <div className="bg-green-500" style={{ width: `${(lowRiskClients / activeClients.length * 100) || 0}%` }}></div>
                      <div className="bg-amber-500" style={{ width: `${(mediumRiskClients / activeClients.length * 100) || 0}%` }}></div>
                      <div className="bg-red-500" style={{ width: `${(highRiskClients / activeClients.length * 100) || 0}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span>{t('dashboard.low_risk')}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                        <span>{t('dashboard.medium_risk')}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                        <span>{t('dashboard.high_risk')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">{t('dashboard.performance_summary')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">{t('dashboard.last_30_days')}</div>
                        <div className="flex items-center mt-1">
                          <span className={`text-xl font-bold ${portfolioStats.performanceLastMonth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {portfolioStats.performanceLastMonth >= 0 ? '+' : ''}{formatPercent(portfolioStats.performanceLastMonth)}
                          </span>
                          {portfolioStats.performanceLastMonth >= 0 ? 
                            <ArrowUpRight className="h-4 w-4 ml-1 text-green-500" /> : 
                            <ArrowDownRight className="h-4 w-4 ml-1 text-red-500" />
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">{t('dashboard.ytd')}</div>
                        <div className="flex items-center mt-1">
                          <span className={`text-xl font-bold ${portfolioStats.performanceYTD >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {portfolioStats.performanceYTD >= 0 ? '+' : ''}{formatPercent(portfolioStats.performanceYTD)}
                          </span>
                          {portfolioStats.performanceYTD >= 0 ? 
                            <ArrowUpRight className="h-4 w-4 ml-1 text-green-500" /> : 
                            <ArrowDownRight className="h-4 w-4 ml-1 text-red-500" />
                          }
                        </div>
                      </div>
                    </div>
              </div>
                </>
            )}
          </CardContent>
        </Card>
      </div>
      
        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Client Interactions */}
          <Card>
            <CardHeader className="pb-2">
              <div>
                <CardTitle>{t('dashboard.client_engagement')}</CardTitle>
                </div>
              <div className="flex border rounded-md overflow-hidden mt-4 w-fit ml-auto">
                <button 
                  onClick={() => setInteractionsTimeframe('1w')} 
                  className={`px-1.5 py-0.5 text-xs ${interactionsTimeframe === '1w' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('dashboard.timeframe_1w')}
                </button>
                <button 
                  onClick={() => setInteractionsTimeframe('1m')} 
                  className={`px-1.5 py-0.5 text-xs ${interactionsTimeframe === '1m' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('dashboard.timeframe_1m')}
                </button>
                <button 
                  onClick={() => setInteractionsTimeframe('3m')} 
                  className={`px-1.5 py-0.5 text-xs ${interactionsTimeframe === '3m' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('dashboard.timeframe_3m')}
                </button>
                <button 
                  onClick={() => setInteractionsTimeframe('6m')} 
                  className={`px-1.5 py-0.5 text-xs ${interactionsTimeframe === '6m' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('dashboard.timeframe_6m')}
                </button>
                <button 
                  onClick={() => setInteractionsTimeframe('1y')} 
                  className={`px-1.5 py-0.5 text-xs ${interactionsTimeframe === '1y' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  {t('dashboard.timeframe_1y')}
                </button>
                </div>
            </CardHeader>
            <CardContent>
              {/* Media di interazioni per cliente */}
              <div className="grid grid-cols-3 gap-2 mb-2 py-1 px-2 bg-muted/10">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t('dashboard.avg_emails')}</div>
                  <div className="text-lg font-semibold">{averageInteractions.emails}</div>
                      </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t('dashboard.avg_calls')}</div>
                  <div className="text-lg font-semibold">{averageInteractions.calls}</div>
            </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t('dashboard.avg_meetings')}</div>
                  <div className="text-lg font-semibold">{averageInteractions.meetings}</div>
          </div>
              </div>
              
              <div className="space-y-4">
                {isLoadingClientLogs ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
                ) : clientInteractions.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                    {t('dashboard.no_recent_activity')}
                </div>
              ) : (
                  <>
                    <div className="mt-4 mb-3 flex justify-between items-center text-sm font-medium">
                      <div>{t('dashboard.clients')}</div>
                      <div className="text-center w-7">{t('dashboard.total_interactions')}</div>
                    </div>
                    <div className="h-[520px] overflow-y-auto pr-2">
                      {clientInteractions.slice(0, 10).map((client) => (
                        <div key={client.id} className="flex items-center mb-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                            {client.name.charAt(0)}
                  </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <div className={`px-1.5 py-0.5 rounded ${
                                client.emails > 5 ? 'bg-green-800 text-green-100 dark:bg-green-900 dark:text-green-50' : 
                                client.emails > 3 ? 'bg-green-600 text-green-100 dark:bg-green-800 dark:text-green-100' : 
                                client.emails > 1 ? 'bg-green-400 text-green-800 dark:bg-green-600 dark:text-green-200' : 
                                client.emails > 0 ? 'bg-green-200 text-green-800 dark:bg-green-400 dark:text-green-900' : 
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                <Mail className="h-3 w-3 inline mr-0.5" /> {client.emails}
                </div>
                              <div className={`px-1.5 py-0.5 rounded ${
                                client.calls > 5 ? 'bg-blue-800 text-blue-100 dark:bg-blue-900 dark:text-blue-50' : 
                                client.calls > 3 ? 'bg-blue-600 text-blue-100 dark:bg-blue-800 dark:text-blue-100' : 
                                client.calls > 1 ? 'bg-blue-400 text-blue-800 dark:bg-blue-600 dark:text-blue-200' : 
                                client.calls > 0 ? 'bg-blue-200 text-blue-800 dark:bg-blue-400 dark:text-blue-900' : 
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                <Phone className="h-3 w-3 inline mr-0.5" /> {client.calls}
            </div>
                              <div className={`px-1.5 py-0.5 rounded ${
                                client.meetings > 5 ? 'bg-purple-800 text-purple-100 dark:bg-purple-900 dark:text-purple-50' : 
                                client.meetings > 3 ? 'bg-purple-600 text-purple-100 dark:bg-purple-800 dark:text-purple-100' : 
                                client.meetings > 1 ? 'bg-purple-400 text-purple-800 dark:bg-purple-600 dark:text-purple-200' : 
                                client.meetings > 0 ? 'bg-purple-200 text-purple-800 dark:bg-purple-400 dark:text-purple-900' : 
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                <CalendarClock className="h-3 w-3 inline mr-0.5" /> {client.meetings}
                </div>
              </div>
                </div>
                          <div className="text-sm font-medium text-center w-7">
                            {client.total}
          </div>
                        </div>
                  ))}
                </div>
                  </>
                )}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => setShowCommunicationTrendDialog(true)}
              >
                {t('dashboard.view_trends')}
              </Button>
            </CardContent>
          </Card>
                </div>
                </div>

      {/* Trend Dialog */}
      <Dialog open={showTrendDialog} onOpenChange={setShowTrendDialog}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto py-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.trend_analysis')}</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 pt-4 pb-4">
            {/* Grafico Tassi di Conversione */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.conversion_rates')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={generateTrendData('conversion')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis unit="%" />
                  <RechartsTooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']} />
                  <Legend />
                  <Bar dataKey="value1" name={t('dashboard.lead_to_prospect')} fill="#4F46E5" />
                  <Bar dataKey="value2" name={t('dashboard.prospect_to_active')} fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Grafico Acquisizione Giornaliera */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.daily_acquisition')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={generateTrendData('acquisition')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => [Number(value).toFixed(1), '']} />
                  <Legend />
                  <Bar dataKey="value1" name={t('dashboard.new_leads_per_day')} fill="#10B981" />
                  <Bar dataKey="value2" name={t('dashboard.new_active_clients_per_day')} fill="#34D399" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            {/* Grafico Media Asset */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.average_assets')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={generateTrendData('assets')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => {
                    const numValue = Number(value);
                    return [numValue >= 1000000 ? 
                      (numValue / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M' : 
                      numValue >= 1000 ? 
                        (numValue / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K' : 
                        numValue.toString(), ''];
                  }} />
                  <Legend />
                  <Bar dataKey="value1" name={t('dashboard.per_prospect')} fill="#F59E0B" />
                  <Bar dataKey="value2" name={t('dashboard.per_active_client')} fill="#FBBF24" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Grafico Tempo Medio */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.average_time')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={generateTrendData('time')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis unit=" d" />
                  <RechartsTooltip formatter={(value: any) => [`${Number(value)} ${t('dashboard.days')}`, '']} />
                  <Legend />
                  <Bar dataKey="value1" name={t('dashboard.as_lead')} fill="#EC4899" />
                  <Bar dataKey="value2" name={t('dashboard.as_prospect')} fill="#F472B6" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Communication Trend Dialog */}
      <Dialog open={showCommunicationTrendDialog} onOpenChange={setShowCommunicationTrendDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto py-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.communication_trend_analysis')}</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 pt-4 pb-4">
            {/* Grafico Email medie per cliente */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.avg_emails_trend')}</h3>
              <ResponsiveContainer width="100%" height={150}>
                <RechartsBarChart data={generateCommunicationTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => [Number(value).toFixed(1), '']} />
                  <Bar dataKey="value1" name={t('dashboard.avg_emails')} fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Grafico Chiamate medie per cliente */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.avg_calls_trend')}</h3>
              <ResponsiveContainer width="100%" height={150}>
                <RechartsBarChart data={generateCommunicationTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => [Number(value).toFixed(1), '']} />
                  <Bar dataKey="value2" name={t('dashboard.avg_calls')} fill="#3B82F6" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Grafico Incontri medi per cliente */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">{t('dashboard.avg_meetings_trend')}</h3>
              <ResponsiveContainer width="100%" height={150}>
                <RechartsBarChart data={generateCommunicationTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: any) => [Number(value).toFixed(1), '']} />
                  <Bar dataKey="value3" name={t('dashboard.avg_meetings')} fill="#F59E0B" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}