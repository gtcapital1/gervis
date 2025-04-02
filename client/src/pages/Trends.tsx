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
  Calendar,
  MessageSquare,
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

// Colori standard per i grafici
const COLORS = {
  primary: "#2563eb",    // Blu primario
  secondary: "#38bdf8",  // Azzurro secondario
  tertiary: "#22c55e"    // Verde terziario
};

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
  
  // Genera dati per email settimanali per cliente
  const generateEmailTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Se non ci sono log, restituisci solo zeri
    if (!clientLogs.length) {
      const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
      return periods.map(period => ({
        period,
        value1: 0
      }));
    }
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Filtra i log in base al periodo
      const logsInPeriod = clientLogs.filter(log => new Date(log.logDate) >= tempStartDate);
      
      // Conta le email nel periodo
      const emailsInPeriod = logsInPeriod.filter(log => log.type === 'email').length;
      
      // Calcola il numero di clienti attivi nel periodo
      const activeClientsCount = clients.filter(client => client.active).length || 1;
      
      // Calcola il numero di settimane nel periodo
      const weeksInPeriod = Math.max(1, Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      
      // Calcola la media settimanale per cliente
      const weeksPerClient = emailsInPeriod / (activeClientsCount * weeksInPeriod);
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: parseFloat(weeksPerClient.toFixed(2)) // Email settimanali per cliente
      });
    });
    
    return results;
  };
  
  // Genera dati per chiamate settimanali per cliente
  const generateCallTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Se non ci sono log, restituisci solo zeri
    if (!clientLogs.length) {
      const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
      return periods.map(period => ({
        period,
        value1: 0
      }));
    }
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Filtra i log in base al periodo
      const logsInPeriod = clientLogs.filter(log => new Date(log.logDate) >= tempStartDate);
      
      // Conta le chiamate nel periodo
      const callsInPeriod = logsInPeriod.filter(log => log.type === 'call').length;
      
      // Calcola il numero di clienti attivi nel periodo
      const activeClientsCount = clients.filter(client => client.active).length || 1;
      
      // Calcola il numero di settimane nel periodo
      const weeksInPeriod = Math.max(1, Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      
      // Calcola la media settimanale per cliente
      const weeksPerClient = callsInPeriod / (activeClientsCount * weeksInPeriod);
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: parseFloat(weeksPerClient.toFixed(2)) // Chiamate settimanali per cliente
      });
    });
    
    return results;
  };
  
  // Genera dati per incontri settimanali per cliente
  const generateMeetingTrendData = (): TrendData[] => {
    const results: TrendData[] = [];
    
    // Se non ci sono log, restituisci solo zeri
    if (!clientLogs.length) {
      const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
      return periods.map(period => ({
        period,
        value1: 0
      }));
    }
    
    // Periodi da confrontare - dal più lungo al più breve
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    periods.forEach(period => {
      const tempStartDate = getStartDateFromTimeframe(period);
      
      // Filtra i log in base al periodo
      const logsInPeriod = clientLogs.filter(log => new Date(log.logDate) >= tempStartDate);
      
      // Conta gli incontri nel periodo
      const meetingsInPeriod = logsInPeriod.filter(log => log.type === 'meeting').length;
      
      // Calcola il numero di clienti attivi nel periodo
      const activeClientsCount = clients.filter(client => client.active).length || 1;
      
      // Calcola il numero di settimane nel periodo
      const weeksInPeriod = Math.max(1, Math.ceil((new Date().getTime() - tempStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      
      // Calcola la media settimanale per cliente
      const weeksPerClient = meetingsInPeriod / (activeClientsCount * weeksInPeriod);
      
      // Aggiungi all'array risultati
      results.push({
        period,
        value1: parseFloat(weeksPerClient.toFixed(2)) // Incontri settimanali per cliente
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
                        <Line type="monotone" dataKey="value1" name={t('dashboard.lead_to_prospect')} stroke={COLORS.primary} strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.prospect_to_active')} stroke={COLORS.secondary} strokeWidth={2} />
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
                      <RechartsLineChart data={generateAcquisitionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => value.toFixed(1)} />
                        <Legend />
                        <Line type="monotone" dataKey="value1" name={t('dashboard.new_leads_per_day')} stroke={COLORS.primary} strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.new_prospects_per_day')} stroke={COLORS.secondary} strokeWidth={2} />
                      </RechartsLineChart>
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
                        <Line type="monotone" dataKey="value1" name={t('dashboard.as_lead')} stroke={COLORS.primary} strokeWidth={2} />
                        <Line type="monotone" dataKey="value2" name={t('dashboard.as_prospect')} stroke={COLORS.secondary} strokeWidth={2} />
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
              {/* Email Interactions Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.email_interactions')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.emails_per_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateEmailTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}`} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.emails_per_client')} 
                          stroke={COLORS.primary} 
                          strokeWidth={2} 
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Call Interactions Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.call_interactions')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.calls_per_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateCallTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}`} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.calls_per_client')} 
                          stroke={COLORS.primary} 
                          strokeWidth={2} 
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Meeting Interactions Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.meeting_interactions')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.meetings_per_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateMeetingTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}`} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.meetings_per_client')} 
                          stroke={COLORS.primary} 
                          strokeWidth={2} 
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 