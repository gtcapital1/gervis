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
  Layers,
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
import { formatNumber, formatPercent, formatCurrency, formatCompactValue } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/use-auth";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Definizione delle interfacce per i tipi di dati
type TimeframePeriod = '1w' | '1m' | '3m' | '6m' | '1y';

interface TrendData {
  period: string;
  value1: number | null;
  value2?: number | null;
  value3?: number | null;
}

interface TrendResponse {
  type: string;
  value: number | null;
  valueFloat: string | null;
  metadata: {
    timeframe: string;
    [key: string]: any;
  };
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeframe: TimeframePeriod = '1y'; // Keep fixed timeframe
  const { toast } = useToast();
  
  // Fetch trend data from the server
  const { data: trendData, isLoading: isLoadingTrends, refetch } = useQuery({
    queryKey: ['trends', user?.id],
    queryFn: async () => {
      console.log('[Trends Frontend] Richiesta dati per user:', user?.id);
      const response = await apiRequest(`/api/trends/${user?.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('[Trends Frontend] Risposta ricevuta:', JSON.stringify(response, null, 2));
      return response;
    },
    enabled: !!user?.id,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    onSuccess: (data) => {
      console.log('[Trends Frontend] Dati processati:', data);
    },
    onError: (error) => {
      console.error('[Trends Frontend] Errore:', error);
    }
  });

  // Funzione per forzare l'aggiornamento dei dati di trend
  const refreshTrendData = async () => {
    if (!user?.id || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Chiamata diretta per forzare la rigenerazione dei dati
      await apiRequest(`/api/trends/${user.id}?refresh=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Ricarica i dati
      await refetch();
      
      toast({
        title: "Dati aggiornati",
        description: "I dati di trend sono stati rigenerati con successo.",
        variant: "default",
      });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dei dati:', error);
      toast({
        title: "Errore nell'aggiornamento",
        description: "Si è verificato un errore durante l'aggiornamento dei dati.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Funzione per filtrare i dati di trend per tipo e timeframe
  const getTrendDataByType = (type: string, timeframe: string): TrendResponse | null => {
    console.log(`[Trends Frontend] Cerca dati per tipo ${type} e timeframe ${timeframe}`);
    
    if (!trendData?.data) {
      console.log('[Trends Frontend] Nessun dato disponibile');
      return null;
    }

    console.log('[Trends Frontend] Dati disponibili:', JSON.stringify(trendData.data, null, 2));

    const result = trendData.data.find((trend: TrendResponse) => {
      const expectedType = `${type}_${timeframe}`;
      console.log(`[Trends Frontend] Confronto: trend.type=${trend.type}, expectedType=${expectedType}`);
      return trend.type === expectedType;
    }) || null;

    console.log(`[Trends Frontend] Risultato per ${type} (${timeframe}):`, result);
    return result;
  };

  // Funzione per generare dati per il grafico dei lead
  const generateLeadCountTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const data = getTrendDataByType('lead_count', period);
      return {
        period,
        value1: isPeriodValid ? (data?.value !== null ? data?.value || 0 : 0) : null
      };
    });
  };
  
  // Funzione per generare dati per il grafico dei prospect
  const generateProspectCountTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const data = getTrendDataByType('prospect_count', period);
      return {
        period,
        value1: isPeriodValid ? (data?.value !== null ? data?.value || 0 : 0) : null
      };
    });
  };
  
  // Funzione per generare dati per il grafico dei clienti attivi
  const generateActiveClientCountTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const data = getTrendDataByType('active_client_count', period);
      return {
        period,
        value1: isPeriodValid ? (data?.value !== null ? data?.value || 0 : 0) : null
      };
    });
  };

  // Funzione per generare dati per il grafico dei tassi di conversione
  const generateConversionTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const leadToProspect = getTrendDataByType('conversion_rate_lead_to_prospect', period);
      const prospectToClient = getTrendDataByType('conversion_rate_prospect_to_client', period);
      return {
        period,
        value1: isPeriodValid ? (leadToProspect?.value !== null ? leadToProspect?.value || 0 : 0) : null,
        value2: isPeriodValid ? (prospectToClient?.value !== null ? prospectToClient?.value || 0 : 0) : null
      };
    });
  };

  // Funzione per generare dati per il grafico dei tempi medi
  const generateTimeTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const leadTime = getTrendDataByType('average_time_as_lead', period);
      const prospectTime = getTrendDataByType('average_time_as_prospect', period);
      return {
        period,
        value1: isPeriodValid ? (leadTime?.valueFloat ? parseFloat(leadTime.valueFloat) : 0) : null,
        value2: isPeriodValid ? (prospectTime?.valueFloat ? parseFloat(prospectTime.valueFloat) : 0) : null
      };
    });
  };

  // Funzione per generare dati per il grafico delle interazioni
  const generateInteractionTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const emailData = getTrendDataByType('email_per_client', period);
      const callData = getTrendDataByType('call_per_client', period);
      const meetingData = getTrendDataByType('meeting_per_client', period);
      return {
        period,
        value1: isPeriodValid ? (emailData?.valueFloat ? parseFloat(emailData.valueFloat) : 0) : null,
        value2: isPeriodValid ? (callData?.valueFloat ? parseFloat(callData.valueFloat) : 0) : null,
        value3: isPeriodValid ? (meetingData?.valueFloat ? parseFloat(meetingData.valueFloat) : 0) : null
      };
    });
  };

  // Funzione per generare dati per il grafico delle acquisizioni
  const generateAcquisitionTrendData = (): TrendData[] => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const leadsData = getTrendDataByType('new_leads_per_day', period);
      const prospectsData = getTrendDataByType('new_prospects_per_day', period);
      return {
        period,
        value1: isPeriodValid ? (leadsData?.valueFloat ? parseFloat(leadsData.valueFloat) : 0) : null,
        value2: isPeriodValid ? (prospectsData?.valueFloat ? parseFloat(prospectsData.valueFloat) : 0) : null
      };
    });
  };

  // Funzione per generare i dati degli asset medi per clienti attivi
  const generateActiveClientAssetsTrendData = () => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const assetData = getTrendDataByType('assets_per_active_client', period);
      
      return {
        period,
        value: isPeriodValid ? (assetData?.valueFloat ? parseFloat(assetData.valueFloat) : 0) : null
      };
    });
  };

  // Funzione per generare i dati degli asset medi
  const generateAssetsTrendData = () => {
    const periods: TimeframePeriod[] = ['1y', '6m', '3m', '1m', '1w'];
    
    // Ottieni la data di iscrizione dell'utente
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    
    return periods.map(period => {
      // Verifica se il periodo è valido in base alla data di iscrizione
      const isPeriodValid = isPeriodValidForUser(period, userCreatedAt);
      
      const prospectData = getTrendDataByType('assets_per_new_prospect', period);
      const activeData = getTrendDataByType('assets_per_new_active_client', period);
      
      return {
        period,
        prospectValue: isPeriodValid ? (prospectData?.valueFloat ? parseFloat(prospectData.valueFloat) : 0) : null,
        activeValue: isPeriodValid ? (activeData?.valueFloat ? parseFloat(activeData.valueFloat) : 0) : null
      };
    });
  };
  
  // Funzione helper per verificare se un periodo è valido in base alla data di iscrizione dell'utente
  const isPeriodValidForUser = (period: TimeframePeriod, userCreatedAt: Date): boolean => {
    const now = new Date();
    const periodStartDate = new Date();
    
    // Calcola la data di inizio del periodo
      switch (period) {
        case '1y':
        periodStartDate.setFullYear(now.getFullYear() - 1);
          break;
        case '6m':
        periodStartDate.setMonth(now.getMonth() - 6);
          break;
        case '3m':
        periodStartDate.setMonth(now.getMonth() - 3);
          break;
        case '1m':
        periodStartDate.setMonth(now.getMonth() - 1);
          break;
        case '1w':
        periodStartDate.setDate(now.getDate() - 7);
          break;
      }

    // Il periodo è valido se l'utente era già iscritto all'inizio del periodo
    return userCreatedAt <= periodStartDate;
  };
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-row justify-between items-center">
        <PageHeader
          title={t("dashboard.trends")}
          subtitle={t("dashboard.trends_description")}
        />
        <Button 
          onClick={refreshTrendData} 
          disabled={isLoadingTrends || isRefreshing}
          className="mr-4"
        >
          {isRefreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Aggiornamento...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Aggiorna dati
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-4 w-full max-w-[800px] mx-auto text-xs md:text-sm">
          <TabsTrigger value="overview">{t("dashboard.client_overview")}</TabsTrigger>
          <TabsTrigger value="onboarding">{t("dashboard.client_onboarding_trends")}</TabsTrigger>
          <TabsTrigger value="interaction">{t("dashboard.client_interaction_trends")}</TabsTrigger>
          <TabsTrigger value="assets">{t("trends.assets")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoadingTrends ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('dashboard.loading')}...
            </div>
          ) : (
            <>
              {/* Active Client Count Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.active_clients')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.total_active_client_count')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateActiveClientCountTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? value : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.active_clients')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Prospect Count Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.prospects')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.total_prospect_count')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateProspectCountTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? value : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.prospects')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Lead Count Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('dashboard.leads')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.total_lead_count')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateLeadCountTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? value : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.leads')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="onboarding" className="space-y-6">
          {isLoadingTrends ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('dashboard.loading')}...
            </div>
          ) : (
            <>
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
                        <RechartsTooltip formatter={(value: any) => value !== null ? value.toFixed(1) : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.new_leads_per_day')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value2" 
                          name={t('dashboard.new_prospects_per_day')} 
                          stroke="#3b82f6"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

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
                        <RechartsTooltip formatter={(value: any) => value !== null ? `${value.toFixed(1)}%` : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.lead_to_prospect')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value2" 
                          name={t('dashboard.prospect_to_active')} 
                          stroke="#3b82f6"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Lead and Prospect Time Chart */}
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
                        <RechartsTooltip formatter={(value: any) => value !== null ? `${value.toFixed(1)} ${t('dashboard.days')}` : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.as_lead')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value2" 
                          name={t('dashboard.as_prospect')} 
                          stroke="#3b82f6"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="interaction" className="space-y-6">
          {isLoadingTrends ? (
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
                      <RechartsLineChart data={generateInteractionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}` : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value1" 
                          name={t('dashboard.emails_per_client')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
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
                      <RechartsLineChart data={generateInteractionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}` : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value2" 
                          name={t('dashboard.calls_per_client')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
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
                      <RechartsLineChart data={generateInteractionTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: any) => value !== null ? `${value.toFixed(2)} / ${t('dashboard.client')} / ${t('dashboard.week')}` : 'N/A'} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value3" 
                          name={t('dashboard.meetings_per_client')} 
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          {isLoadingTrends ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('dashboard.loading')}...
            </div>
          ) : (
            <>
              {/* Asset medi per cliente attivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('trends.average_assets_active_clients')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.per_active_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateActiveClientAssetsTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period" 
                          tickFormatter={(value) => t(`dashboard.timeframe_${value}`)}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCompactValue(value)}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCompactValue(value)}
                          labelFormatter={(label: string) => t(`dashboard.timeframe_${label}`)}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name={t('trends.active_clients')}
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('trends.average_assets_new_prospects')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.per_new_prospect')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateAssetsTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period" 
                          tickFormatter={(value) => t(`dashboard.timeframe_${value}`)}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCompactValue(value)}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCompactValue(value)}
                          labelFormatter={(label: string) => t(`dashboard.timeframe_${label}`)}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="prospectValue" 
                          name={t('trends.new_prospects')}
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('trends.average_assets_new_active_clients')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.per_new_active_client')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={generateAssetsTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="period" 
                          tickFormatter={(value) => t(`dashboard.timeframe_${value}`)}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCompactValue(value)}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCompactValue(value)}
                          labelFormatter={(label: string) => t(`dashboard.timeframe_${label}`)}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="activeValue" 
                          name={t('trends.new_active_clients')}
                          stroke="#1e40af"
                          strokeWidth={2}
                          connectNulls={true}
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