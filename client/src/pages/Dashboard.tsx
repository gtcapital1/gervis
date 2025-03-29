import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BarChart,
  Inbox,
  Bell,
  FileCheck,
  User
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

// Definizione delle interfacce per i tipi di dati
interface Task {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  clientId: number;
  clientName: string;
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

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const timeRange = "month";

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

  // Prepare client data
  const clients = clientsData?.clients || [];
  const activeClients = clients.filter(client => !client.isArchived);
  const archivedClients = clients.filter(client => client.isArchived);
  const onboardedClients = clients.filter(client => client.isOnboarded);
  const onboardingRate = clients.length > 0 ? (onboardedClients.length / clients.length) * 100 : 0;
  
  // Corretto l'errore di tipo per la data di creazione del cliente
  const newClientsThisMonth = clients.filter(client => {
    // Verifica che createdAt esista prima di usarlo
    if (!client.createdAt) return false;
    
    const clientDate = new Date(client.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return clientDate >= thirtyDaysAgo;
  }).length;
  
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
  
  // Data for client pipeline
  const prospectClients = clients.filter(client => !client.isOnboarded && !client.isArchived).length;
  
  // Prepare risk profile distribution
  const riskProfiles = activeClients.reduce((acc, client) => {
    const profile = client.riskProfile || 'unknown';
    acc[profile] = (acc[profile] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const lowRiskClients = riskProfiles['conservative'] || 0;
  const mediumRiskClients = (riskProfiles['moderate'] || 0) + (riskProfiles['balanced'] || 0);
  const highRiskClients = (riskProfiles['growth'] || 0) + (riskProfiles['aggressive'] || 0);

  // Prepare tasks data
  const tasks = tasksData?.tasks || [];
  const tasksDueToday = tasks.length;
  const highPriorityTasks = tasks.filter((task: Task) => task.priority === 'high').length;
  
  // Prepare agenda
  const todayEvents = agendaData?.events || [];
  
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

  // Format market data
  const marketData = {
    sp500: '+0.8%',
    ftseMib: '+0.5%',
    eurUsd: '-0.2%'
  };

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
            <div className="text-2xl font-bold">{formatCurrency(portfolioStats.totalAUM)}</div>
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
            <div className="text-2xl font-bold">{tasksDueToday}</div>
            <p className="text-xs text-muted-foreground">
              {highPriorityTasks} {t('dashboard.high_priority')}
            </p>
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
                        <div className="font-medium">{event.title}</div>
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
              <CardDescription>{t('dashboard.conversion_funnel')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(prospectClients)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.prospects')}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(onboardedClients.length)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.onboarded')}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">{formatNumber(activeClients.length)}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.active_clients')}</div>
            </div>
              </div>

              {/* Funnel visualization */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>{t('dashboard.prospects')}</span>
                  <span>{formatNumber(prospectClients)}</span>
                </div>
                <Progress value={100} className="h-2" />
                
                <div className="flex justify-between items-center text-sm">
                  <span>{t('dashboard.qualified_leads')}</span>
                  <span>{formatNumber(Math.round(prospectClients * 0.75))}</span>
                </div>
                <Progress value={75} className="h-2" />
                
                <div className="flex justify-between items-center text-sm">
                  <span>{t('dashboard.proposal_sent')}</span>
                  <span>{formatNumber(Math.round(prospectClients * 0.5))}</span>
                </div>
                <Progress value={50} className="h-2" />
                
                <div className="flex justify-between items-center text-sm">
                  <span>{t('dashboard.onboarded')}</span>
                  <span>{formatNumber(onboardedClients.length)}</span>
              </div>
                <Progress value={Math.round((onboardedClients.length / (prospectClients || 1)) * 100)} className="h-2" />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                            <Button
                              variant="ghost"
                className="w-full"
                onClick={() => setLocation('/clients')}
              >
                {t('dashboard.view_all_clients')}
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
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
              <CardDescription>{t('dashboard.latest_updates')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingActivity ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.no_recent_activity')}
                </div>
              ) : (
                recentActivities.slice(0, 4).map((activity: Activity, index: number) => (
                  <div key={index} className={`border-l-4 border-${activity.color || 'blue'}-500 pl-4 py-1`}>
                    <div className="flex items-start gap-2">
                      {activity.type === 'call' ? (
                        <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      ) : activity.type === 'lead' ? (
                        <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                      ) : activity.type === 'document' ? (
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      )}
            <div>
                        <p className="text-sm">{activity.description} <span className="font-medium">{activity.client}</span></p>
                        <p className="text-xs text-muted-foreground">{activity.time} - {activity.status}</p>
                      </div>
            </div>
          </div>
                ))
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="ghost" className="w-full" onClick={() => setLocation('/activity')}>
                {t('dashboard.view_all_activity')}
            </Button>
            </CardFooter>
          </Card>

          {/* 📁 Compliance Quick View */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.compliance')}</CardTitle>
              <CardDescription>{t('dashboard.document_status')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCompliance ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.loading')}...
                </div>
              ) : missingDocuments.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {t('dashboard.all_documents_compliant')}
                </div>
              ) : (
                missingDocuments.slice(0, 3).map((doc: MissingDocument, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <FileWarning className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.missing')}: {doc.documentType} - {doc.daysOverdue} {t('dashboard.days_overdue')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${doc.clientId}`)}>
                      {t('dashboard.remind')}
            </Button>
                  </div>
                ))
              )}
              
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('dashboard.document_compliance')}</span>
                  <span className="font-medium">{documentComplianceRate}%</span>
                </div>
                <Progress value={documentComplianceRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.next_audit')}: {daysToNextAudit} {t('dashboard.days')}
              </p>
            </div>
            </CardContent>
          </Card>

          {/* 💬 Communication & Engagement */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.communication')}</CardTitle>
              <CardDescription>{t('dashboard.client_engagement')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{t('dashboard.unread_messages')}</span>
                </div>
                <Badge>{unreadMessages}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{t('dashboard.pending_follow_ups')}</span>
                </div>
                <Badge>{pendingFollowUps}</Badge>
          </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">{t('dashboard.contact_heatmap')}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div 
                      key={i}
                      className={`h-4 rounded-sm ${
                        i % 3 === 0 ? 'bg-green-500/80' :
                        i % 4 === 0 ? 'bg-green-500/40' :
                        i % 5 === 0 ? 'bg-green-500/20' :
                        'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.last_two_weeks')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market Updates Widget */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.market_updates')}</CardTitle>
              <CardDescription>{t('dashboard.financial_news')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                  <p className="text-sm">S&P 500: <span className="font-medium">{marketData.sp500}</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                  <p className="text-sm">FTSE MIB: <span className="font-medium">{marketData.ftseMib}</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowDownRight className="h-4 w-4 mt-0.5 text-red-500" />
                  <p className="text-sm">EUR/USD: <span className="font-medium">{marketData.eurUsd}</span></p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">{t('dashboard.fed_interest_rate')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">{t('dashboard.quarterly_earnings')}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="ghost" className="w-full" onClick={() => setLocation('/market')}>
                {t('dashboard.view_detailed_report')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}