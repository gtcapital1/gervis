import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart4, 
  UserPlus,
  UserCheck,
  Percent,
  Clock, 
  CalendarClock,
  Mail,
  Phone,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";

// Definizione delle interfacce per i tipi di dati
type TimeframePeriod = '1w' | '1m' | '3m' | '6m' | '1y';

interface TrendData {
  period: string;
  value1: number;
  value2?: number;
  value3?: number;
}

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

export default function Trends() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("onboarding");
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('3m');
  
  // Fetch clients
  const { data: clientsData, isLoading: isLoadingClients } = useQuery<{clients: Client[]} | null>({
    queryKey: ['/api/clients'],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
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
  
  const clients = clientsData?.clients || [];
  const clientLogs = allClientLogsData?.logs || [];
  
  // Funzione per calcolare la data di inizio in base al timeframe
  const getStartDateFromTimeframe = (selectedTimeframe: TimeframePeriod = timeframe) => {
    const now = new Date();
    switch (selectedTimeframe) {
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
  
  // Genera dati combinati per lead e prospect al giorno
  const generateAcquisitionTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Calcola il numero di giorni nel periodo
      const daysInPeriod = Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (1000 * 3600 * 24));
      
      // Filtra i nuovi lead nel periodo
      const leadsInPeriod = clients.filter(client => 
        client.createdAt && new Date(client.createdAt) >= tempStartDate
      );
      
      // Filtra i clienti diventati prospect nel periodo
      const prospectsInPeriod = clients.filter(client => 
        client.onboardedAt && new Date(client.onboardedAt) >= tempStartDate
      );
      
      // Calcola la media giornaliera di nuovi lead
      const newLeadsPerDay = parseFloat((leadsInPeriod.length / daysInPeriod).toFixed(1));
      
      // Calcola la media giornaliera di nuovi prospect
      const newProspectsPerDay = parseFloat((prospectsInPeriod.length / daysInPeriod).toFixed(1));
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: newLeadsPerDay,
        value2: newProspectsPerDay
      });
    });
    
    return results;
  };
  
  // Genera dati per il trend congiunto dei tempi di lead e prospect
  const generateTimeTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Filtra i clienti che sono diventati prospect nel periodo
      const clientsWithLeadTime = clients.filter(client => 
        client.createdAt && client.onboardedAt && 
        new Date(client.onboardedAt) >= tempStartDate
      );
      
      // Filtra i clienti che sono diventati attivi nel periodo
      const clientsWithProspectTime = clients.filter(client => 
        client.onboardedAt && client.activatedAt && 
        new Date(client.activatedAt) >= tempStartDate
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
        value1: avgLeadTime,
        value2: avgProspectTime
      });
    });
    
    return results;
  };
  
  // Genera dati per il trend della conversion rate
  const generateConversionTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Clients created in the selected period
      const newClientsInPeriod = clients.filter(client => {
        if (!client.createdAt) return false;
        const createDate = new Date(client.createdAt);
        return createDate >= tempStartDate;
      });
      
      // Clients who became prospects in the selected period
      const newProspectsInPeriod = clients.filter(client => {
        if (!client.onboardedAt) return false;
        const onboardDate = new Date(client.onboardedAt);
        return onboardDate >= tempStartDate;
      });
      
      // Clients who became active in the selected period
      const newActiveClientsInPeriod = clients.filter(client => {
        if (!client.onboardedAt || !client.active) return false;
        const onboardDate = new Date(client.onboardedAt);
        return onboardDate >= tempStartDate && client.active;
      });
      
      // Calculate period-specific conversion rates
      const totalNewClients = newClientsInPeriod.length;
      const prospectConversionRate = totalNewClients > 0 
        ? (newProspectsInPeriod.length / totalNewClients) * 100 
        : 0;
      
      const activeConversionRate = newProspectsInPeriod.length > 0 
        ? (newActiveClientsInPeriod.length / newProspectsInPeriod.length) * 100 
        : 0;
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: prospectConversionRate,
        value2: activeConversionRate
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
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Filtra i log in base al periodo
      const logsInPeriod = clientLogs.filter(log => new Date(log.logDate) >= tempStartDate);
      
      // Conta i vari tipi di log
      const emailsInPeriod = logsInPeriod.filter(log => log.type === 'email').length;
      const callsInPeriod = logsInPeriod.filter(log => log.type === 'call').length;
      const meetingsInPeriod = logsInPeriod.filter(log => log.type === 'meeting').length;
      
      // Calcola il numero di clienti attivi nel periodo
      const activeClientsCount = clients.filter(client => client.active).length || 1;
      
      // Calcola la media mensile di interazioni per cliente
      const monthsInPeriod = Math.max(1, Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: emailsInPeriod / (activeClientsCount * monthsInPeriod), // Email medie mensili per cliente
        value2: callsInPeriod / (activeClientsCount * monthsInPeriod),   // Chiamate medie mensili per cliente
        value3: meetingsInPeriod / (activeClientsCount * monthsInPeriod) // Incontri medi mensili per cliente
      });
    });
    
    return results;
  };
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader 
        title={t('dashboard.trends')}
        subtitle={t('dashboard.trends_description')}
      >
        <div className="flex border rounded-md overflow-hidden">
          <button 
            onClick={() => setTimeframe('1w')} 
            className={`px-2 py-1 text-sm ${timeframe === '1w' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
          >
            {t('dashboard.timeframe_1w')}
          </button>
          <button 
            onClick={() => setTimeframe('1m')} 
            className={`px-2 py-1 text-sm ${timeframe === '1m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
          >
            {t('dashboard.timeframe_1m')}
          </button>
          <button 
            onClick={() => setTimeframe('3m')} 
            className={`px-2 py-1 text-sm ${timeframe === '3m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
          >
            {t('dashboard.timeframe_3m')}
          </button>
          <button 
            onClick={() => setTimeframe('6m')} 
            className={`px-2 py-1 text-sm ${timeframe === '6m' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
          >
            {t('dashboard.timeframe_6m')}
          </button>
          <button 
            onClick={() => setTimeframe('1y')} 
            className={`px-2 py-1 text-sm ${timeframe === '1y' ? 'bg-primary text-primary-foreground' : 'bg-transparent hover:bg-muted'}`}
          >
            {t('dashboard.timeframe_1y')}
          </button>
        </div>
      </PageHeader>
      
      <Tabs defaultValue="onboarding" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="onboarding">{t('dashboard.client_onboarding_trends')}</TabsTrigger>
          <TabsTrigger value="interaction">{t('dashboard.client_interaction_trends')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="onboarding" className="space-y-6">
          {isLoadingClients ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('dashboard.loading')}...
            </div>
          ) : (
            <>
              {/* Conversion Rates Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Percent className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.conversion_rates')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.conversion_rates_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateConversionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="value1" name={t('dashboard.lead_to_prospect')} stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.prospect_to_active')} stroke="#82ca9d" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Lead and Prospect Acquisition Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.daily_acquisition')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.prospects_per_day_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={generateAcquisitionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => value.toFixed(1)} />
                        <Legend />
                        <Bar dataKey="value1" name={t('dashboard.new_leads_per_day')} fill="#ff7300" />
                        <Bar dataKey="value2" name={t('dashboard.new_prospects_per_day')} fill="#8884d8" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Combined Lead and Prospect Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.average_time')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.average_days_as_lead')} / {t('dashboard.average_days_as_prospect')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateTimeTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)} ${t('dashboard.days')}`} />
                        <Legend />
                        <Line type="monotone" dataKey="value1" name={t('dashboard.as_lead')} stroke="#ff7300" strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.as_prospect')} stroke="#8884d8" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="interaction" className="space-y-6">
          {isLoadingClientLogs ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('dashboard.loading')}...
            </div>
          ) : (
            <>
              {/* Communication Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.communication_trends')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.monthly_interactions_per_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateCommunicationTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value1" name={t('dashboard.emails')} stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.calls')} stroke="#82ca9d" strokeWidth={2} />
                        <Line type="monotone" dataKey="value3" name={t('dashboard.meetings')} stroke="#ffc658" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Altre card specifiche per le interazioni possono essere aggiunte qui */}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 